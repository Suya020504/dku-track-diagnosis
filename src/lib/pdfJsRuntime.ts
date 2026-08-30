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

export type PdfRuntime = {
  open(data: ArrayBuffer): Promise<PdfRuntimeDocument>;
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

async function destroyFailedOpen(
  loadingTask: PdfLoadingTaskHandle,
  worker: PdfWorkerHandle,
): Promise<void> {
  try {
    await loadingTask.destroy();
  } catch {
    // Preserve the parsing error while still releasing the owned worker.
  } finally {
    worker.destroy();
  }
}

export async function openPdfDocument(
  data: ArrayBuffer,
  lifecycle: PdfJsRuntimeLifecycle = defaultLifecycle,
): Promise<PdfRuntimeDocument> {
  const worker = lifecycle.createWorker();

  try {
    await worker.promise;
  } catch (error) {
    worker.destroy();
    throw error;
  }

  if (!lifecycle.isWorkerPort(worker.port)) {
    worker.destroy();
    throw new PdfImportError(
      "worker-unavailable",
      "PDF 처리용 브라우저 작업자를 사용할 수 없어요.",
    );
  }

  let loadingTask: PdfLoadingTaskHandle;
  try {
    loadingTask = lifecycle.getDocument({
      data: new Uint8Array(data),
      worker,
      stopAtErrors: true,
      useWorkerFetch: false,
      useWasm: false,
      isEvalSupported: false,
    });
  } catch (error) {
    worker.destroy();
    throw error;
  }

  let document: PdfDocumentHandle;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    await destroyFailedOpen(loadingTask, worker);
    throw error;
  }

  let extractionQueue: Promise<void> = Promise.resolve();
  let destroyPromise: Promise<void> | undefined;

  const getPageText = (pageNumber: number): Promise<string> => {
    const extraction = extractionQueue.then(async () => {
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

  const destroy = (): Promise<void> => {
    destroyPromise ??= (async () => {
      try {
        await loadingTask.destroy();
      } finally {
        worker.destroy();
      }
    })();
    return destroyPromise;
  };

  return {
    numPages: document.numPages,
    getPageText,
    destroy,
  };
}

export const realPdfRuntime: PdfRuntime = {
  open: openPdfDocument,
};
