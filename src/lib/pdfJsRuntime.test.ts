import { GlobalWorkerOptions } from "pdfjs-dist";
import { describe, expect, it, vi } from "vitest";
import {
  openPdfDocument,
  realPdfRuntime,
  type PdfJsRuntimeLifecycle,
} from "./pdfJsRuntime";

class BrowserWorkerStub {}

type FixtureTextItem = {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
};

type FixturePage = {
  items: FixtureTextItem[];
  cleanup: () => void;
  getTextContent?: () => Promise<{ items: FixtureTextItem[] }>;
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function textItem(str: string, hasEOL: boolean): FixtureTextItem {
  return {
    str,
    dir: "ltr",
    transform: [1, 0, 0, 1, 0, 0],
    width: str.length,
    height: 12,
    fontName: "FixtureFont",
    hasEOL,
  };
}

function createLifecycle(input?: {
  isRealWorker?: boolean;
  pages?: FixturePage[];
  workerPromise?: Promise<void>;
  documentPromise?: Promise<{
    numPages: number;
    getPage(pageNumber: number): Promise<{
      getTextContent(): Promise<{ items: FixtureTextItem[] }>;
      cleanup(): void;
    }>;
  }>;
  loadingDestroyPromise?: Promise<void>;
  workerDestroyError?: unknown;
}) {
  const pages: FixturePage[] = input?.pages ?? [
    {
      items: [
        textItem("<b>경제원론</b>", true),
        textItem("통계학기초 & 분석", false),
      ],
      cleanup: vi.fn<() => void>(),
    },
  ];
  const worker = {
    promise: input?.workerPromise ?? Promise.resolve(),
    port: new BrowserWorkerStub(),
    destroy: vi.fn((): void => {
      if (input?.workerDestroyError !== undefined) {
        throw input.workerDestroyError;
      }
    }),
  };
  const document = {
    numPages: pages.length,
    getPage: vi.fn(async (pageNumber: number) => {
      const page = pages[pageNumber - 1];
      if (!page) throw new Error("missing synthetic page");
      return {
        getTextContent:
          page.getTextContent ??
          vi.fn(async () => ({
            items: page.items,
          })),
        cleanup: page.cleanup,
      };
    }),
  };
  const loadingTask = {
    promise: input?.documentPromise ?? Promise.resolve(document),
    destroy: vi.fn(
      (): Promise<void> =>
        input?.loadingDestroyPromise ?? Promise.resolve(undefined),
    ),
  };
  const lifecycle = {
    createWorker: vi.fn(() => worker),
    isWorkerPort: vi.fn(() => input?.isRealWorker ?? true),
    getDocument: vi.fn(() => loadingTask),
  } satisfies PdfJsRuntimeLifecycle;

  return { document, lifecycle, loadingTask, pages, worker };
}

describe("pdfJsRuntime", () => {
  it("configures a same-origin Vite worker asset instead of a CDN", () => {
    expect(GlobalWorkerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs/);
    expect(GlobalWorkerOptions.workerSrc).not.toMatch(/^https?:\/\//i);
  });

  it("returns an immediate loading owner and keeps extracted text literal", async () => {
    const { lifecycle, pages, worker } = createLifecycle();
    const bytes = new Uint8Array([37, 80, 68, 70, 45]).buffer;

    const loading = openPdfDocument(bytes, lifecycle);
    expect(loading).not.toBeInstanceOf(Promise);
    expect(loading.destroy).toEqual(expect.any(Function));
    const document = await loading.promise;
    const text = await document.getPageText(1);

    expect(lifecycle.getDocument).toHaveBeenCalledWith({
      data: expect.any(Uint8Array),
      worker,
      stopAtErrors: true,
      useWorkerFetch: false,
      useWasm: false,
      isEvalSupported: false,
    });
    expect(text).toBe("<b>경제원론</b>\n통계학기초 & 분석");
    expect(pages[0].cleanup).toHaveBeenCalledTimes(1);
  });

  it("serializes page extraction even when callers request pages together", async () => {
    let activeExtractions = 0;
    let maximumActiveExtractions = 0;
    const makePage = (label: string) => ({
      items: [textItem(label, false)],
      cleanup: vi.fn<() => void>(),
      getTextContent: vi.fn(async () => {
        activeExtractions += 1;
        maximumActiveExtractions = Math.max(
          maximumActiveExtractions,
          activeExtractions,
        );
        await Promise.resolve();
        activeExtractions -= 1;
        return { items: [textItem(label, false)] };
      }),
    });
    const { lifecycle } = createLifecycle({
      pages: [makePage("1페이지"), makePage("2페이지")],
    });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    const document = await loading.promise;

    await Promise.all([document.getPageText(1), document.getPageText(2)]);

    expect(maximumActiveExtractions).toBe(1);
  });

  it("shares one destroy owner between the loading handle and document", async () => {
    const { lifecycle, loadingTask, worker } = createLifecycle();
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    const document = await loading.promise;

    await Promise.all([
      loading.destroy(),
      document.destroy(),
      document.destroy(),
    ]);

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("cancels before worker readiness and never constructs a loading task", async () => {
    const workerReady = deferred<void>();
    const { lifecycle, worker } = createLifecycle({
      workerPromise: workerReady.promise,
    });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    const cancelled = expect(loading.promise).rejects.toMatchObject({
      code: "cancelled",
    });

    await loading.destroy();
    await cancelled;
    workerReady.resolve();
    await Promise.resolve();

    expect(lifecycle.getDocument).not.toHaveBeenCalled();
    expect(worker.destroy).toHaveBeenCalledTimes(1);
    await loading.destroy();
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys a pending loading task and ignores a document that resolves late", async () => {
    const documentReady = deferred<{
      numPages: number;
      getPage(pageNumber: number): Promise<never>;
    }>();
    const { lifecycle, loadingTask, worker } = createLifecycle({
      documentPromise: documentReady.promise,
    });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    await vi.waitFor(() => expect(lifecycle.getDocument).toHaveBeenCalledOnce());
    const cancelled = expect(loading.promise).rejects.toMatchObject({
      code: "cancelled",
    });

    await loading.destroy();
    await cancelled;
    documentReady.resolve({
      numPages: 1,
      getPage: vi.fn(async (): Promise<never> => {
        throw new Error("late document must stay private");
      }),
    });
    await Promise.resolve();

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("waits for loading-task cleanup before destroying the owned worker", async () => {
    const cleanup = deferred<void>();
    const { lifecycle, loadingTask, worker } = createLifecycle({
      loadingDestroyPromise: cleanup.promise,
    });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    const document = await loading.promise;

    const first = document.destroy();
    const second = loading.destroy();

    expect(first).toBe(second);
    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
    expect(worker.destroy).not.toHaveBeenCalled();
    cleanup.resolve();
    await first;
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys the worker after loading cleanup rejects and preserves the loading error", async () => {
    const cleanup = deferred<void>();
    const loadingError = new Error("loading cleanup failed");
    const workerError = new Error("worker cleanup failed");
    const { lifecycle, loadingTask, worker } = createLifecycle({
      loadingDestroyPromise: cleanup.promise,
      workerDestroyError: workerError,
    });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);
    const document = await loading.promise;

    const cleanupResult = document.destroy();
    void cleanupResult.catch(() => undefined);

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
    expect(worker.destroy).not.toHaveBeenCalled();
    cleanup.reject(loadingError);
    await expect(cleanupResult).rejects.toBe(loadingError);
    expect(worker.destroy).toHaveBeenCalledTimes(1);
    await expect(loading.destroy()).rejects.toBe(loadingError);
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects a fake worker with safe copy and destroys its owner once", async () => {
    const { lifecycle, worker } = createLifecycle({ isRealWorker: false });
    const loading = openPdfDocument(new ArrayBuffer(8), lifecycle);

    await expect(loading.promise).rejects.toMatchObject({
      code: "worker-unavailable",
    });
    expect(lifecycle.getDocument).not.toHaveBeenCalled();
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("exports the real runtime through the injectable loading boundary", () => {
    expect(realPdfRuntime.open).toBe(openPdfDocument);
  });
});
