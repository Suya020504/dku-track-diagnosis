// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PDF_IMPORT_LIMITS,
  PdfImportError,
  type PdfImportCandidateBuilder,
  type PdfImportCandidates,
  type PdfTextPage,
} from "../types";
import type {
  PdfRuntime,
  PdfRuntimeDocument,
  PdfRuntimeLoadingHandle,
} from "./pdfJsRuntime";
import {
  analyzePdfText,
  classifyPdfError,
  validatePdfFile,
} from "./pdfCourseImport";

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");
type StopMode = "abort" | "timeout";
const STOP_MODES = ["abort", "timeout"] as const;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function pdfBytes(input?: {
  size?: number;
  signatureOffset?: number;
}): Uint8Array {
  const size = input?.size ?? PDF_SIGNATURE.length;
  const bytes = new Uint8Array(size);
  const signatureOffset = input?.signatureOffset ?? 0;
  if (signatureOffset + PDF_SIGNATURE.length <= bytes.length) {
    bytes.set(PDF_SIGNATURE, signatureOffset);
  }
  return bytes;
}

function pdfFile(
  bytes: Uint8Array,
  input?: { name?: string; type?: string },
): File {
  const fileBytes = new Uint8Array(bytes.byteLength);
  fileBytes.set(bytes);
  return new File([fileBytes.buffer], input?.name ?? "fixture.pdf", {
    type: input?.type ?? "application/pdf",
  });
}

function validPdfFile(): File {
  return pdfFile(pdfBytes({ size: 64, signatureOffset: 8 }));
}

function emptyCandidates(): PdfImportCandidates {
  return { matched: [], ambiguous: [], unmatched: [] };
}

function validCandidates(): PdfImportCandidates {
  return {
    matched: [
      {
        sourceId: "p1-c1",
        courseId: "course-1",
        matchKind: "exact-name",
        pageNumbers: [1],
        displayLabel: "경제원론",
      },
    ],
    ambiguous: [],
    unmatched: [],
  };
}

function fakeRuntime(input?: {
  numPages?: number;
  openError?: unknown;
  openPromise?: Promise<PdfRuntimeDocument>;
  pageText?: (pageNumber: number) => Promise<string>;
  texts?: string[];
  destroyPromise?: Promise<void>;
}) {
  const cleanup = input?.destroyPromise ?? Promise.resolve();
  const destroy = vi.fn<() => Promise<void>>(() => cleanup);
  const getPageText = vi.fn(async (pageNumber: number): Promise<string> => {
    if (input?.pageText) return input.pageText(pageNumber);
    return input?.texts?.[pageNumber - 1] ?? "페이지";
  });
  const document: PdfRuntimeDocument = {
    numPages: input?.numPages ?? input?.texts?.length ?? 1,
    destroy,
    getPageText,
  };
  const open = vi.fn((): PdfRuntimeLoadingHandle => ({
    promise:
      input?.openPromise ??
      (input?.openError === undefined
        ? Promise.resolve(document)
        : Promise.reject(input.openError)),
    destroy,
  }));
  const runtime: PdfRuntime = { open };
  return { destroy, document, getPageText, open, runtime };
}

function analyzeWith(input: {
  file?: File;
  runtime: PdfRuntime;
  signal?: AbortSignal;
  buildCandidates?: PdfImportCandidateBuilder;
}) {
  return analyzePdfText({
    file: input.file ?? validPdfFile(),
    runtime: input.runtime,
    signal: input.signal ?? new AbortController().signal,
    buildCandidates: input.buildCandidates ?? emptyCandidates,
  });
}

function unsafeBuilder(value: unknown): PdfImportCandidateBuilder {
  return (() => value) as PdfImportCandidateBuilder;
}

async function capturePdfError(
  promise: Promise<unknown>,
): Promise<PdfImportError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PdfImportError) return error;
    throw error;
  }
  throw new Error("Expected PDF operation to reject");
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

async function reach(assertion: () => void): Promise<void> {
  await flushMicrotasks();
  try {
    assertion();
  } catch {
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0);
      assertion();
    } else {
      await vi.waitFor(assertion);
    }
  }
}

async function triggerStop(
  mode: StopMode,
  controller: AbortController,
): Promise<void> {
  if (mode === "abort") {
    controller.abort();
    await flushMicrotasks();
  } else {
    await vi.advanceTimersByTimeAsync(PDF_IMPORT_LIMITS.timeoutMs);
  }
}

function expectedStopCode(mode: StopMode): "cancelled" | "timeout" {
  return mode === "abort" ? "cancelled" : "timeout";
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("validatePdfFile", () => {
  it("rejects an empty file before reading any bytes", async () => {
    const file = pdfFile(new Uint8Array(), { name: "student-secret.pdf" });
    const slice = vi.spyOn(file, "slice");

    await expect(validatePdfFile(file)).rejects.toMatchObject({
      code: "file-empty",
      message: "빈 PDF 파일은 사용할 수 없어요.",
    });
    expect(slice).not.toHaveBeenCalled();
  });

  it("accepts exactly 10 MiB and reads only the first 1,024 bytes", async () => {
    const file = pdfFile(pdfBytes({ size: PDF_IMPORT_LIMITS.maxFileBytes }));
    const slice = vi.spyOn(file, "slice");
    const fullRead = vi.spyOn(file, "arrayBuffer");

    await expect(validatePdfFile(file)).resolves.toBeUndefined();
    expect(slice).toHaveBeenCalledWith(0, PDF_IMPORT_LIMITS.headerScanBytes);
    expect(fullRead).not.toHaveBeenCalled();
  });

  it("rejects a file over 10 MiB before reading any bytes", async () => {
    const file = pdfFile(
      pdfBytes({ size: PDF_IMPORT_LIMITS.maxFileBytes + 1 }),
    );
    const slice = vi.spyOn(file, "slice");

    await expect(validatePdfFile(file)).rejects.toMatchObject({
      code: "file-too-large",
      message: "10MB 이하의 PDF 파일만 사용할 수 있어요.",
    });
    expect(slice).not.toHaveBeenCalled();
  });

  it("rejects an explicit non-PDF MIME type before reading bytes", async () => {
    const file = pdfFile(pdfBytes(), { type: "text/plain" });
    const slice = vi.spyOn(file, "slice");

    await expect(validatePdfFile(file)).rejects.toMatchObject({
      code: "mime-mismatch",
      message: "PDF 파일 형식만 사용할 수 있어요.",
    });
    expect(slice).not.toHaveBeenCalled();
  });

  it("allows blank MIME when the header contains a PDF signature", async () => {
    const file = pdfFile(pdfBytes({ size: 32, signatureOffset: 12 }), {
      type: "",
    });

    await expect(validatePdfFile(file)).resolves.toBeUndefined();
  });

  it("accepts the last signature wholly inside the first 1,024 bytes", async () => {
    const file = pdfFile(
      pdfBytes({
        size: PDF_IMPORT_LIMITS.headerScanBytes + 20,
        signatureOffset:
          PDF_IMPORT_LIMITS.headerScanBytes - PDF_SIGNATURE.length,
      }),
    );

    await expect(validatePdfFile(file)).resolves.toBeUndefined();
  });

  it("rejects a signature that starts after the first 1,024 bytes", async () => {
    const file = pdfFile(
      pdfBytes({
        size: PDF_IMPORT_LIMITS.headerScanBytes + PDF_SIGNATURE.length,
        signatureOffset: PDF_IMPORT_LIMITS.headerScanBytes,
      }),
    );

    await expect(validatePdfFile(file)).rejects.toMatchObject({
      code: "signature-mismatch",
      message: "올바른 PDF 파일인지 확인해 주세요.",
    });
  });

  it("maps a direct header-read failure to fixed safe copy", async () => {
    const file = validPdfFile();
    const header = file.slice(0, 1);
    vi.spyOn(header, "arrayBuffer").mockRejectedValue(
      new Error("student-secret.pdf sentinel-private stack"),
    );
    vi.spyOn(file, "slice").mockReturnValue(header);

    const error = await capturePdfError(validatePdfFile(file));

    expect(error).toMatchObject({
      code: "parse-failed",
      message: "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
    });
    expect(error.message).not.toMatch(/student-secret|sentinel-private|stack/);
  });
});

describe("analyzePdfText limits and output", () => {
  it("accepts exactly 50 pages and destroys the loading owner once", async () => {
    const { destroy, getPageText, runtime } = fakeRuntime({ numPages: 50 });

    const draft = await analyzeWith({ runtime });

    expect(draft).toEqual({
      pageCount: 50,
      extractedCharacters: 150,
      matched: [],
      ambiguous: [],
      unmatched: [],
    });
    expect(getPageText).toHaveBeenCalledTimes(50);
    expect(getPageText).toHaveBeenNthCalledWith(50, 50);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects page 51 before requesting page text", async () => {
    const { destroy, getPageText, runtime } = fakeRuntime({ numPages: 51 });
    const buildCandidates = vi.fn(emptyCandidates);

    await expect(analyzeWith({ runtime, buildCandidates })).rejects.toMatchObject({
      code: "page-limit",
    });
    expect(getPageText).not.toHaveBeenCalled();
    expect(buildCandidates).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("requests pages sequentially in page-number order", async () => {
    let activePages = 0;
    let maximumActivePages = 0;
    const callOrder: number[] = [];
    const { runtime } = fakeRuntime({
      numPages: 3,
      pageText: async (pageNumber) => {
        callOrder.push(pageNumber);
        activePages += 1;
        maximumActivePages = Math.max(maximumActivePages, activePages);
        await Promise.resolve();
        activePages -= 1;
        return `${pageNumber}`;
      },
    });

    await analyzeWith({ runtime });

    expect(callOrder).toEqual([1, 2, 3]);
    expect(maximumActivePages).toBe(1);
  });

  it("rejects pages whose combined trimmed text is empty", async () => {
    const { destroy, runtime } = fakeRuntime({ texts: [" \n\t", ""] });

    await expect(analyzeWith({ runtime })).rejects.toMatchObject({
      code: "no-text-layer",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("accepts exactly 1,000,000 extracted characters", async () => {
    const { runtime } = fakeRuntime({
      texts: ["x".repeat(PDF_IMPORT_LIMITS.maxExtractedCharacters)],
    });

    const draft = await analyzeWith({ runtime });

    expect(draft.extractedCharacters).toBe(1_000_000);
  });

  it("rejects extracted text over 1,000,000 characters", async () => {
    const { destroy, runtime } = fakeRuntime({
      texts: ["x".repeat(PDF_IMPORT_LIMITS.maxExtractedCharacters + 1)],
    });

    await expect(analyzeWith({ runtime })).rejects.toMatchObject({
      code: "text-limit",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("returns only validated candidate arrays and clears retained pages", async () => {
    const file = validPdfFile();
    const fullRead = vi.spyOn(file, "arrayBuffer");
    const { destroy, open, runtime } = fakeRuntime({
      texts: ["경제원론", "통계"],
    });
    let retainedPages: readonly PdfTextPage[] | undefined;

    const draft = await analyzeWith({
      file,
      runtime,
      buildCandidates: (pages) => {
        retainedPages = pages;
        return validCandidates();
      },
    });

    expect(draft).toEqual({
      pageCount: 2,
      extractedCharacters: 6,
      ...validCandidates(),
    });
    expect(Object.keys(draft).sort()).toEqual([
      "ambiguous",
      "extractedCharacters",
      "matched",
      "pageCount",
      "unmatched",
    ]);
    expect(JSON.stringify(draft)).not.toContain("통계");
    expect(retainedPages).toEqual([]);
    expect(fullRead).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe("analyzePdfText strict candidate boundary", () => {
  it.each([
    ["raw string", "private raw page text"],
    ["raw string array", ["private raw page text"]],
    ["full page objects", [{ pageNumber: 1, text: "private raw page text" }]],
    ["extra root field", { ...emptyCandidates(), rawText: "private" }],
    [
      "extra item field",
      {
        ...emptyCandidates(),
        matched: [
          {
            ...validCandidates().matched[0],
            rawText: "private",
          },
        ],
      },
    ],
    [
      "invalid source id",
      {
        ...emptyCandidates(),
        matched: [
          { ...validCandidates().matched[0], sourceId: "student-secret" },
        ],
      },
    ],
    [
      "multiline label",
      {
        ...emptyCandidates(),
        matched: [
          { ...validCandidates().matched[0], displayLabel: "경제원론\n성적" },
        ],
      },
    ],
    [
      "overlong label",
      {
        ...emptyCandidates(),
        matched: [
          { ...validCandidates().matched[0], displayLabel: "x".repeat(61) },
        ],
      },
    ],
    [
      "out-of-range page number",
      {
        ...emptyCandidates(),
        matched: [
          { ...validCandidates().matched[0], pageNumbers: [2] },
        ],
      },
    ],
    [
      "empty candidate course ids",
      {
        ...emptyCandidates(),
        ambiguous: [
          {
            sourceId: "p1-c1",
            displayLabel: "경제원론",
            candidateCourseIds: [],
            pageNumbers: [1],
          },
        ],
      },
    ],
  ])("rejects %s with fixed parse-failed copy", async (_label, value) => {
    const { runtime } = fakeRuntime({ texts: ["private raw page text"] });

    const error = await capturePdfError(
      analyzeWith({
        runtime,
        buildCandidates: unsafeBuilder(value),
      }),
    );

    expect(error).toMatchObject({
      code: "parse-failed",
      message: "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
    });
    expect(error.message).not.toContain("private raw page text");
  });

  it("blanks retained page objects when an unsafe return is rejected", async () => {
    const { runtime } = fakeRuntime({ texts: ["private raw page text"] });
    let retainedPage: PdfTextPage | undefined;

    await expect(
      analyzeWith({
        runtime,
        buildCandidates: (pages) => {
          retainedPage = pages[0];
          return pages as unknown as PdfImportCandidates;
        },
      }),
    ).rejects.toMatchObject({ code: "parse-failed" });

    expect(retainedPage).toEqual({ pageNumber: 1, text: "" });
  });

  it("rejects an asynchronous builder and handles its late raw rejection", async () => {
    const { runtime } = fakeRuntime({ texts: ["private raw page text"] });
    const builderResult = deferred<PdfImportCandidates>();
    const error = await capturePdfError(
      analyzeWith({
        runtime,
        buildCandidates: unsafeBuilder(builderResult.promise),
      }),
    );

    builderResult.reject(new Error("late builder raw rejection"));
    await flushMicrotasks();

    expect(error).toMatchObject({ code: "parse-failed" });
    expect(error.message).not.toContain("late builder raw rejection");
  });

  it("blanks retained page objects and preserves safe copy when builder throws", async () => {
    const cleanup = deferred<void>();
    const { destroy, runtime } = fakeRuntime({
      texts: ["private raw page text"],
      destroyPromise: cleanup.promise,
    });
    let retainedPage: PdfTextPage | undefined;
    let settled = false;
    const analysis = analyzeWith({
      runtime,
      buildCandidates: (pages) => {
        retainedPage = pages[0];
        throw new Error("student-secret.pdf sentinel raw stack");
      },
    });
    const caught = analysis.catch((error: unknown) => {
      settled = true;
      return error as PdfImportError;
    });
    await reach(() => expect(destroy).toHaveBeenCalledOnce());
    await flushMicrotasks();
    const settledBeforeCleanup = settled;

    cleanup.resolve();
    const error = await caught;

    expect(settledBeforeCleanup).toBe(true);
    expect(error).toMatchObject({
      code: "parse-failed",
      message: "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
    });
    expect(retainedPage).toEqual({ pageNumber: 1, text: "" });
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe("Task2 to Task3 candidate-builder integration contract", () => {
  it("accepts a candidate-only builder and adds parser-owned draft counts", async () => {
    const { runtime } = fakeRuntime({ texts: ["경제원론", "통계"] });
    let retainedPage: PdfTextPage | undefined;
    const buildPdfImportCandidates: PdfImportCandidateBuilder = (pages) => {
      retainedPage = pages[0];
      return validCandidates();
    };

    const draft = await analyzePdfText({
      file: validPdfFile(),
      runtime,
      signal: new AbortController().signal,
      buildCandidates: buildPdfImportCandidates,
    });

    expect(draft).toEqual({
      pageCount: 2,
      extractedCharacters: 6,
      ...validCandidates(),
    });
    expect(retainedPage).toEqual({ pageNumber: 1, text: "" });
  });

  it("rejects a builder-owned full draft and still clears retained pages", async () => {
    const { runtime } = fakeRuntime({ texts: ["private raw page text"] });
    let retainedPage: PdfTextPage | undefined;
    const buildFullDraft = (pages: readonly PdfTextPage[]) => {
      retainedPage = pages[0];
      return {
        pageCount: 999,
        extractedCharacters: 999,
        ...validCandidates(),
      };
    };

    await expect(
      analyzePdfText({
        file: validPdfFile(),
        runtime,
        signal: new AbortController().signal,
        buildCandidates: buildFullDraft as unknown as PdfImportCandidateBuilder,
      }),
    ).rejects.toMatchObject({ code: "parse-failed" });
    expect(retainedPage).toEqual({ pageNumber: 1, text: "" });
  });
});

describe("analyzePdfText deferred cancellation races", () => {
  it.each(STOP_MODES)(
    "settles on %s during header read and ignores the late header",
    async (mode) => {
      if (mode === "timeout") vi.useFakeTimers();
      const controller = new AbortController();
      const headerRead = deferred<ArrayBuffer>();
      const file = validPdfFile();
      const header = file.slice(0, 1);
      vi.spyOn(header, "arrayBuffer").mockReturnValue(headerRead.promise);
      vi.spyOn(file, "slice").mockReturnValue(header);
      const { open, runtime } = fakeRuntime();
      const buildCandidates = vi.fn(emptyCandidates);
      const analysis = analyzeWith({
        file,
        runtime,
        signal: controller.signal,
        buildCandidates,
      });
      const stopped = expect(analysis).rejects.toMatchObject({
        code: expectedStopCode(mode),
      });
      if (mode === "timeout") expect(vi.getTimerCount()).toBe(1);

      await triggerStop(mode, controller);
      await stopped;
      if (mode === "timeout") expect(vi.getTimerCount()).toBe(0);
      if (mode === "abort") {
        headerRead.resolve(pdfBytes().buffer as ArrayBuffer);
      } else {
        headerRead.reject(new Error("late header raw rejection"));
      }
      await flushMicrotasks();

      expect(open).not.toHaveBeenCalled();
      expect(buildCandidates).not.toHaveBeenCalled();
    },
  );

  it.each(STOP_MODES)(
    "settles on %s during full read and never opens after late completion",
    async (mode) => {
      if (mode === "timeout") vi.useFakeTimers();
      const controller = new AbortController();
      const fullRead = deferred<ArrayBuffer>();
      const file = validPdfFile();
      const read = vi.spyOn(file, "arrayBuffer").mockReturnValue(fullRead.promise);
      const { open, runtime } = fakeRuntime();
      const buildCandidates = vi.fn(emptyCandidates);
      const analysis = analyzeWith({
        file,
        runtime,
        signal: controller.signal,
        buildCandidates,
      });
      await reach(() => expect(read).toHaveBeenCalledOnce());
      const stopped = expect(analysis).rejects.toMatchObject({
        code: expectedStopCode(mode),
      });

      await triggerStop(mode, controller);
      await stopped;
      if (mode === "abort") {
        fullRead.resolve(pdfBytes().buffer as ArrayBuffer);
      } else {
        fullRead.reject(new Error("late full read raw rejection"));
      }
      await flushMicrotasks();

      expect(open).not.toHaveBeenCalled();
      expect(buildCandidates).not.toHaveBeenCalled();
    },
  );

  it.each(STOP_MODES)(
    "settles on %s during pending open, destroys immediately, and ignores late open",
    async (mode) => {
      if (mode === "timeout") vi.useFakeTimers();
      const controller = new AbortController();
      const opened = deferred<PdfRuntimeDocument>();
      const { destroy, document, getPageText, open, runtime } = fakeRuntime({
        openPromise: opened.promise,
      });
      const buildCandidates = vi.fn(emptyCandidates);
      const analysis = analyzeWith({
        runtime,
        signal: controller.signal,
        buildCandidates,
      });
      await reach(() => expect(open).toHaveBeenCalledOnce());
      const stopped = expect(analysis).rejects.toMatchObject({
        code: expectedStopCode(mode),
      });

      await triggerStop(mode, controller);
      await stopped;
      expect(destroy).toHaveBeenCalledOnce();
      if (mode === "abort") {
        opened.resolve(document);
      } else {
        opened.reject(new Error("late open raw rejection"));
      }
      await flushMicrotasks();

      expect(getPageText).not.toHaveBeenCalled();
      expect(buildCandidates).not.toHaveBeenCalled();
      expect(destroy).toHaveBeenCalledOnce();
    },
  );

  it.each(STOP_MODES)(
    "settles on %s during page extraction and ignores late page completion",
    async (mode) => {
      if (mode === "timeout") vi.useFakeTimers();
      const controller = new AbortController();
      const latePage = deferred<string>();
      const { destroy, getPageText, runtime } = fakeRuntime({
        numPages: 2,
        pageText: (pageNumber) =>
          pageNumber === 1 ? Promise.resolve("first") : latePage.promise,
      });
      const buildCandidates = vi.fn(emptyCandidates);
      const analysis = analyzeWith({
        runtime,
        signal: controller.signal,
        buildCandidates,
      });
      await reach(() => expect(getPageText).toHaveBeenCalledTimes(2));
      const stopped = expect(analysis).rejects.toMatchObject({
        code: expectedStopCode(mode),
      });

      await triggerStop(mode, controller);
      await stopped;
      if (mode === "abort") {
        latePage.resolve("private late page");
      } else {
        latePage.reject(new Error("private late page rejection"));
      }
      await flushMicrotasks();

      expect(buildCandidates).not.toHaveBeenCalled();
      expect(destroy).toHaveBeenCalledOnce();
    },
  );

  it.each(STOP_MODES)(
    "settles on %s while destroy is pending without a second destroy",
    async (mode) => {
      if (mode === "timeout") vi.useFakeTimers();
      const controller = new AbortController();
      const cleanup = deferred<void>();
      const { destroy, runtime } = fakeRuntime({
        destroyPromise: cleanup.promise,
      });
      const buildCandidates = vi.fn(validCandidates);
      let settled = false;
      const analysis = analyzeWith({
        runtime,
        signal: controller.signal,
        buildCandidates,
      });
      const caught = analysis.catch((error: unknown) => {
        settled = true;
        return error as PdfImportError;
      });
      await reach(() => expect(destroy).toHaveBeenCalledOnce());

      await triggerStop(mode, controller);
      const settledBeforeCleanup = settled;
      if (mode === "abort") {
        cleanup.resolve();
      } else {
        cleanup.reject(new Error("late cleanup raw rejection"));
      }
      const error = await caught;

      expect(settledBeforeCleanup).toBe(true);
      expect(error).toMatchObject({ code: expectedStopCode(mode) });
      expect(buildCandidates).toHaveBeenCalledOnce();
      expect(destroy).toHaveBeenCalledOnce();
    },
  );

  it("cancels before runtime open when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { open, runtime } = fakeRuntime();

    await expect(
      analyzeWith({ runtime, signal: controller.signal }),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(open).not.toHaveBeenCalled();
  });
});

describe("safe PDF error classification", () => {
  it("maps a password open failure without retrying or exposing raw details", async () => {
    const passwordError = Object.assign(
      new Error("student-secret.pdf password=raw-secret stack-text"),
      { name: "PasswordException" },
    );
    const { open, runtime } = fakeRuntime({ openError: passwordError });

    const error = await capturePdfError(analyzeWith({ runtime }));

    expect(error).toMatchObject({
      code: "password-protected",
      message: "비밀번호가 설정된 PDF는 사용할 수 없어요.",
    });
    expect(error.message).not.toMatch(/student-secret|raw-secret|stack-text/);
    expect(open).toHaveBeenCalledOnce();
  });

  it("maps a page parsing failure and destroys without exposing raw details", async () => {
    const invalidError = Object.assign(
      new Error("student-secret.pdf private page stack"),
      { name: "InvalidPDFException" },
    );
    const { destroy, runtime } = fakeRuntime({
      pageText: async () => {
        throw invalidError;
      },
    });

    const error = await capturePdfError(analyzeWith({ runtime }));

    expect(error).toMatchObject({
      code: "invalid-or-corrupt",
      message: "PDF 파일이 손상되었거나 올바르게 읽을 수 없어요.",
    });
    expect(error.message).not.toMatch(/student-secret|private page|stack/);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it.each([
    [
      "PasswordException",
      "password-protected",
      "비밀번호가 설정된 PDF는 사용할 수 없어요.",
    ],
    [
      "InvalidPDFException",
      "invalid-or-corrupt",
      "PDF 파일이 손상되었거나 올바르게 읽을 수 없어요.",
    ],
    [
      "ResponseException",
      "invalid-or-corrupt",
      "PDF 파일이 손상되었거나 올바르게 읽을 수 없어요.",
    ],
  ])("maps %s to fixed safe copy", (name, code, message) => {
    const rawError = Object.assign(
      new Error("student-secret.pdf raw text raw stack"),
      { name },
    );

    const classified = classifyPdfError(rawError);

    expect(classified).toBeInstanceOf(PdfImportError);
    expect(classified).toMatchObject({ code, message });
    expect(classified.message).not.toContain("raw");
  });

  it("replaces unsafe PdfImportError copy and maps unknown failures", () => {
    expect(
      classifyPdfError(
        new PdfImportError(
          "worker-unavailable",
          "student-secret.pdf raw worker stack",
        ),
      ),
    ).toMatchObject({
      code: "worker-unavailable",
      message: "PDF 처리용 브라우저 작업자를 사용할 수 없어요.",
    });
    expect(classifyPdfError(new Error("raw stack"))).toMatchObject({
      code: "parse-failed",
      message: "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
    });
  });
});
