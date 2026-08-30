import {
  GlobalWorkerOptions,
  PDFWorker,
  getDocument,
  type PDFDocumentLoadingTask,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PdfImportError } from "../types";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfWorkerHandle = {
  promise: Promise<void>;
  port: unknown;
  destroy(): void;
};

type PdfTextItem = {
  str?: unknown;
  hasEOL?: unknown;
};

type PdfPageHandle = {
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
  cleanup(): void;
};

type PdfDocumentHandle = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageHandle>;
};

type PdfLoadingTaskHandle = {
  promise: Promise<PdfDocumentHandle>;
  destroy(): Promise<void>;
};

type PdfDocumentOptions = {
  data: Uint8Array;
  worker: PdfWorkerHandle;
  stopAtErrors: true;
  useWorkerFetch: false;
  useWasm: false;
  isEvalSupported: false;
};

export type PdfJsRuntimeLifecycle = {
  createWorker(): PdfWorkerHandle;
  isWorkerPort(port: unknown): boolean;
  getDocument(options: PdfDocumentOptions): PdfLoadingTaskHandle;
};

export type PdfRuntimeDocument = {
  numPages: number;
  getPageText(pageNumber: number): Promise<string>;
  destroy(): Promise<void>;
};

export type PdfRuntimeLoadingHandle = {
  promise: Promise<PdfRuntimeDocument>;
  destroy(): Promise<void>;
};

export type PdfRuntime = {
  open(data: ArrayBuffer): PdfRuntimeLoadingHandle;
};

const defaultLifecycle: PdfJsRuntimeLifecycle = {
  createWorker: () => {
    const NamedPdfWorker = PDFWorker as unknown as new (options: {
      name: string;
    }) => PDFWorker;
    return new NamedPdfWorker({ name: "course-import" });
  },
  isWorkerPort: (port) =>
    typeof Worker !== "undefined" && port instanceof Worker,
  getDocument: (options) => {
    const loadingTask: PDFDocumentLoadingTask = getDocument({
      ...options,
      worker: options.worker as PDFWorker,
    });
    return loadingTask as unknown as PdfLoadingTaskHandle;
  },
};

function joinTextItems(items: PdfTextItem[]): string {
  return items
    .filter(
      (item): item is PdfTextItem & { str: string } =>
        typeof item.str === "string",
    )
    .map((item) => `${item.str}${item.hasEOL === true ? "\n" : ""}`)
    .join("");
}

function cancelledError(): PdfImportError {
  return new PdfImportError("cancelled", "PDF 분석을 취소했어요.");
}

export function openPdfDocument(
  data: ArrayBuffer,
  lifecycle: PdfJsRuntimeLifecycle = defaultLifecycle,
): PdfRuntimeLoadingHandle {
  const worker = lifecycle.createWorker();
  let sourceData: ArrayBuffer | undefined = data;
  let loadingTask: PdfLoadingTaskHandle | undefined;
  let destroyed = false;
  let workerDestroyed = false;
  let destroyPromise: Promise<void> | undefined;
  let rejectDestroyed!: (error: PdfImportError) => void;
  const destroyedSignal = new Promise<never>((_resolve, reject) => {
    rejectDestroyed = reject;
  });

  const beginDestroy = (cancelPending: boolean): Promise<void> => {
    if (destroyPromise) return destroyPromise;
    destroyed = true;
    sourceData = undefined;
    if (cancelPending) rejectDestroyed(cancelledError());

    const destroyWorker = (): { failed: boolean; error?: unknown } => {
      if (workerDestroyed) return { failed: false };
      workerDestroyed = true;
      try {
        worker.destroy();
        return { failed: false };
      } catch (error) {
        return { failed: true, error };
      }
    };

    if (!loadingTask) {
      const workerResult = destroyWorker();
      destroyPromise = workerResult.failed
        ? Promise.reject(workerResult.error)
        : Promise.resolve();
    } else {
      let loadingDestroy: Promise<void>;
      try {
        loadingDestroy = loadingTask.destroy();
      } catch (error) {
        loadingDestroy = Promise.reject(error);
      }

      destroyPromise = (async () => {
        let loadingFailed = false;
        let loadingError: unknown;
        try {
          await loadingDestroy;
        } catch (error) {
          loadingFailed = true;
          loadingError = error;
        }

        const workerResult = destroyWorker();
        if (loadingFailed) throw loadingError;
        if (workerResult.failed) throw workerResult.error;
      })();
    }
    void destroyPromise.catch(() => undefined);
    return destroyPromise;
  };

  const destroy = (): Promise<void> => beginDestroy(true);

  const initialize = async (): Promise<PdfRuntimeDocument> => {
    try {
      await worker.promise;
      if (destroyed) throw cancelledError();

      if (!lifecycle.isWorkerPort(worker.port)) {
        throw new PdfImportError(
          "worker-unavailable",
          "PDF 처리용 브라우저 작업자를 사용할 수 없어요.",
        );
      }

      const ownedData = sourceData;
      sourceData = undefined;
      if (!ownedData) throw cancelledError();
      loadingTask = lifecycle.getDocument({
        data: new Uint8Array(ownedData),
        worker,
        stopAtErrors: true,
        useWorkerFetch: false,
        useWasm: false,
        isEvalSupported: false,
      });
      if (destroyed) throw cancelledError();

      const document: PdfDocumentHandle = await loadingTask.promise;
      if (destroyed) throw cancelledError();

      let extractionQueue: Promise<void> = Promise.resolve();

      const getPageText = (pageNumber: number): Promise<string> => {
        if (destroyed) return Promise.reject(cancelledError());
        const extraction = extractionQueue.then(async () => {
          if (destroyed) throw cancelledError();
          const page = await document.getPage(pageNumber);
          try {
            const textContent = await page.getTextContent();
            return joinTextItems(textContent.items);
          } finally {
            page.cleanup();
          }
        });
        extractionQueue = extraction.then(
          () => undefined,
          () => undefined,
        );
        return extraction;
      };

      return {
        numPages: document.numPages,
        getPageText,
        destroy,
      };
    } catch (error) {
      if (!destroyed) void beginDestroy(false);
      throw error;
    }
  };

  const initialization = initialize();
  const promise = Promise.race([initialization, destroyedSignal]);
  void promise.catch(() => undefined);

  return { promise, destroy };
}

export const realPdfRuntime: PdfRuntime = {
  open: openPdfDocument,
};
