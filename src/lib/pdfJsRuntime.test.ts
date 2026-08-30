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
    promise: Promise.resolve(),
    port: new BrowserWorkerStub(),
    destroy: vi.fn<() => void>(),
  };
  const document = {
    numPages: pages.length,
    getPage: vi.fn(async (pageNumber: number) => {
      const page = pages[pageNumber - 1];
      if (!page) {
        throw new Error("missing synthetic page");
      }
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
    promise: Promise.resolve(document),
    destroy: vi.fn(async (): Promise<void> => undefined),
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

  it("passes the hardened PDF.js options and keeps text as literal text", async () => {
    const { lifecycle, pages, worker } = createLifecycle();
    const bytes = new Uint8Array([37, 80, 68, 70, 45]).buffer;

    const document = await openPdfDocument(bytes, lifecycle);
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
    const document = await openPdfDocument(new ArrayBuffer(8), lifecycle);

    await Promise.all([document.getPageText(1), document.getPageText(2)]);

    expect(maximumActiveExtractions).toBe(1);
  });

  it("destroys the loading task and owned worker only once", async () => {
    const { lifecycle, loadingTask, worker } = createLifecycle();
    const document = await openPdfDocument(new ArrayBuffer(8), lifecycle);

    await Promise.all([document.destroy(), document.destroy()]);
    await document.destroy();

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects a fake worker with the safe worker-unavailable code", async () => {
    const { lifecycle, worker } = createLifecycle({ isRealWorker: false });

    await expect(
      openPdfDocument(new ArrayBuffer(8), lifecycle),
    ).rejects.toMatchObject({ code: "worker-unavailable" });
    expect(lifecycle.getDocument).not.toHaveBeenCalled();
    expect(worker.destroy).toHaveBeenCalledTimes(1);
  });

  it("exports the real runtime through the injectable PdfRuntime boundary", async () => {
    expect(realPdfRuntime.open).toBe(openPdfDocument);
  });
});
