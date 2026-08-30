// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { PdfRuntime, PdfRuntimeDocument } from "./pdfJsRuntime";
import {
  PDF_IMPORT_LIMITS,
  PdfImportError,
  type PdfTextPage,
} from "../types";
import {
  analyzePdfText,
  classifyPdfError,
  validatePdfFile,
} from "./pdfCourseImport";

const PDF_SIGNATURE = new TextEncoder().encode("%PDF-");

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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function fakeRuntime(input?: {
  numPages?: number;
  openError?: unknown;
  pageText?: (pageNumber: number) => Promise<string>;
  texts?: string[];
}) {
  const destroy = vi.fn(async (): Promise<void> => undefined);
  const getPageText = vi.fn(async (pageNumber: number): Promise<string> => {
    if (input?.pageText) return input.pageText(pageNumber);
    return input?.texts?.[pageNumber - 1] ?? "페이지";
  });
  const document: PdfRuntimeDocument = {
    numPages: input?.numPages ?? input?.texts?.length ?? 1,
    destroy,
    getPageText,
  };
  const open = vi.fn(async (): Promise<PdfRuntimeDocument> => {
    if (input?.openError !== undefined) throw input.openError;
    return document;
  });
  const runtime: PdfRuntime = { open };
  return { destroy, document, getPageText, open, runtime };
}

function analyzeWith<T>(input: {
  file?: File;
  runtime: PdfRuntime;
  signal?: AbortSignal;
  consumePages: (pages: PdfTextPage[]) => T;
}) {
  return analyzePdfText({
    file: input.file ?? validPdfFile(),
    runtime: input.runtime,
    signal: input.signal ?? new AbortController().signal,
    consumePages: input.consumePages,
  });
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

  it("allows a blank MIME type when the first 1,024 bytes contain a PDF signature", async () => {
    const file = pdfFile(pdfBytes({ size: 32, signatureOffset: 12 }), {
      type: "",
    });

    await expect(validatePdfFile(file)).resolves.toBeUndefined();
  });

  it("accepts a signature at the last position wholly inside the first 1,024 bytes", async () => {
    const file = pdfFile(
      pdfBytes({
        size: PDF_IMPORT_LIMITS.headerScanBytes + 20,
        signatureOffset:
          PDF_IMPORT_LIMITS.headerScanBytes - PDF_SIGNATURE.length,
      }),
    );
    const slice = vi.spyOn(file, "slice");
    const fullRead = vi.spyOn(file, "arrayBuffer");

    await expect(validatePdfFile(file)).resolves.toBeUndefined();
    expect(slice).toHaveBeenCalledOnce();
    expect(slice).toHaveBeenCalledWith(0, PDF_IMPORT_LIMITS.headerScanBytes);
    expect(fullRead).not.toHaveBeenCalled();
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
});

describe("analyzePdfText", () => {
  it("accepts exactly 50 pages and destroys the document once", async () => {
    const { destroy, getPageText, runtime } = fakeRuntime({ numPages: 50 });

    const summary = await analyzeWith({
      runtime,
      consumePages: (pages) => pages.length,
    });

    expect(summary).toEqual({
      pageCount: 50,
      extractedCharacters: 150,
      result: 50,
    });
    expect(getPageText).toHaveBeenCalledTimes(50);
    expect(getPageText).toHaveBeenNthCalledWith(50, 50);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects page 51 before requesting any page text", async () => {
    const { destroy, getPageText, runtime } = fakeRuntime({ numPages: 51 });
    const consumePages = vi.fn<(pages: PdfTextPage[]) => number>();

    await expect(
      analyzeWith({ runtime, consumePages }),
    ).rejects.toMatchObject({
      code: "page-limit",
      message: "50쪽 이하의 PDF 파일만 사용할 수 있어요.",
    });
    expect(getPageText).not.toHaveBeenCalled();
    expect(consumePages).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("requests page text sequentially in page-number order", async () => {
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

    await analyzeWith({ runtime, consumePages: () => "draft" });

    expect(callOrder).toEqual([1, 2, 3]);
    expect(maximumActivePages).toBe(1);
  });

  it("rejects pages whose combined trimmed text is empty", async () => {
    const { destroy, runtime } = fakeRuntime({ texts: [" \n\t", ""] });
    const consumePages = vi.fn<(pages: PdfTextPage[]) => string>();

    await expect(
      analyzeWith({ runtime, consumePages }),
    ).rejects.toMatchObject({
      code: "no-text-layer",
      message:
        "텍스트를 읽을 수 없는 PDF예요. 과목을 직접 선택해 주세요.",
    });
    expect(consumePages).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects extracted text over 1,000,000 characters", async () => {
    const { destroy, getPageText, runtime } = fakeRuntime({
      texts: ["x".repeat(PDF_IMPORT_LIMITS.maxExtractedCharacters + 1)],
    });
    const consumePages = vi.fn<(pages: PdfTextPage[]) => string>();

    await expect(
      analyzeWith({ runtime, consumePages }),
    ).rejects.toMatchObject({
      code: "text-limit",
      message: "PDF에서 읽은 텍스트가 너무 많아 분석을 중단했어요.",
    });
    expect(getPageText).toHaveBeenCalledOnce();
    expect(consumePages).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("cancels before opening the runtime when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { open, runtime } = fakeRuntime();

    await expect(
      analyzeWith({
        runtime,
        signal: controller.signal,
        consumePages: () => "draft",
      }),
    ).rejects.toMatchObject({
      code: "cancelled",
      message: "PDF 분석을 취소했어요.",
    });
    expect(open).not.toHaveBeenCalled();
  });

  it("destroys once when aborted during page extraction", async () => {
    const pendingPage = deferred<string>();
    const controller = new AbortController();
    const { destroy, getPageText, runtime } = fakeRuntime({
      pageText: () => pendingPage.promise,
    });
    const analysis = analyzeWith({
      runtime,
      signal: controller.signal,
      consumePages: () => "draft",
    });
    await vi.waitFor(() => expect(getPageText).toHaveBeenCalledOnce());

    controller.abort();

    await expect(analysis).rejects.toMatchObject({ code: "cancelled" });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("uses one 15-second timer and destroys once on timeout", async () => {
    vi.useFakeTimers();
    const pendingPage = deferred<string>();
    const { destroy, getPageText, runtime } = fakeRuntime({
      pageText: () => pendingPage.promise,
    });
    const analysis = analyzeWith({
      runtime,
      consumePages: () => "draft",
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(getPageText).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
    const timeoutResult = expect(analysis).rejects.toMatchObject({
      code: "timeout",
      message:
        "PDF 분석 시간이 초과되었어요. 과목을 직접 선택해 주세요.",
    });
    await vi.advanceTimersByTimeAsync(PDF_IMPORT_LIMITS.timeoutMs);

    await timeoutResult;
    expect(destroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("maps a password failure from open without retrying or exposing raw details", async () => {
    const rawMessage = "student-secret.pdf password=raw-secret stack-text";
    const passwordError = Object.assign(new Error(rawMessage), {
      name: "PasswordException",
    });
    const { open, runtime } = fakeRuntime({ openError: passwordError });

    const error = await analyzeWith({
      runtime,
      consumePages: () => "draft",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "password-protected",
      message: "비밀번호가 설정된 PDF는 사용할 수 없어요.",
    });
    expect((error as Error).message).not.toContain(rawMessage);
    expect((error as Error).message).not.toContain("student-secret.pdf");
    expect(open).toHaveBeenCalledOnce();
  });

  it("maps a page parsing failure and destroys without exposing raw details", async () => {
    const rawMessage = "private page text and hidden stack";
    const invalidError = Object.assign(new Error(rawMessage), {
      name: "InvalidPDFException",
    });
    const { destroy, runtime } = fakeRuntime({
      pageText: async () => {
        throw invalidError;
      },
    });

    const error = await analyzeWith({
      runtime,
      consumePages: () => "draft",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "invalid-or-corrupt",
      message: "PDF 파일이 손상되었거나 올바르게 읽을 수 없어요.",
    });
    expect((error as Error).message).not.toContain(rawMessage);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("returns only a sanitized callback result and clears retained page references", async () => {
    const file = validPdfFile();
    const fullRead = vi.spyOn(file, "arrayBuffer");
    const { destroy, open, runtime } = fakeRuntime({
      texts: ["경제원론", "통계"],
    });
    let retainedPages: PdfTextPage[] | undefined;

    const summary = await analyzeWith({
      file,
      runtime,
      consumePages: (pages) => {
        retainedPages = pages;
        return { matchedCourseIds: ["course-1"] };
      },
    });

    expect(summary).toEqual({
      pageCount: 2,
      extractedCharacters: 6,
      result: { matchedCourseIds: ["course-1"] },
    });
    expect(Object.keys(summary).sort()).toEqual([
      "extractedCharacters",
      "pageCount",
      "result",
    ]);
    expect(JSON.stringify(summary)).not.toContain("경제원론");
    expect(retainedPages).toEqual([]);
    expect(fullRead).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe("classifyPdfError", () => {
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
    expect(classified.message).not.toContain("student-secret.pdf");
    expect(classified.message).not.toContain("raw");
  });

  it("preserves an approved code but replaces an unsafe message", () => {
    const classified = classifyPdfError(
      new PdfImportError(
        "worker-unavailable",
        "student-secret.pdf raw worker stack",
      ),
    );

    expect(classified).toMatchObject({
      code: "worker-unavailable",
      message: "PDF 처리용 브라우저 작업자를 사용할 수 없어요.",
    });
  });

  it("maps unknown failures to fixed parse-failed copy", () => {
    const classified = classifyPdfError(
      new Error("student-secret.pdf raw text raw stack"),
    );

    expect(classified).toMatchObject({
      code: "parse-failed",
      message: "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
    });
  });
});
