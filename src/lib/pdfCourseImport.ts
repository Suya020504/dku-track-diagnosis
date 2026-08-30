import {
  PDF_IMPORT_LIMITS,
  PdfImportError,
  type PdfImportFailureCode,
  type PdfImportTextSummary,
  type PdfTextPage,
} from "../types";
import type { PdfRuntime, PdfRuntimeDocument } from "./pdfJsRuntime";

const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

const SAFE_ERROR_MESSAGES: Record<PdfImportFailureCode, string> = {
  "file-empty": "빈 PDF 파일은 사용할 수 없어요.",
  "file-too-large": "10MB 이하의 PDF 파일만 사용할 수 있어요.",
  "mime-mismatch": "PDF 파일 형식만 사용할 수 있어요.",
  "signature-mismatch": "올바른 PDF 파일인지 확인해 주세요.",
  "password-protected": "비밀번호가 설정된 PDF는 사용할 수 없어요.",
  "invalid-or-corrupt":
    "PDF 파일이 손상되었거나 올바르게 읽을 수 없어요.",
  "page-limit": "50쪽 이하의 PDF 파일만 사용할 수 있어요.",
  "text-limit": "PDF에서 읽은 텍스트가 너무 많아 분석을 중단했어요.",
  "no-text-layer":
    "텍스트를 읽을 수 없는 PDF예요. 과목을 직접 선택해 주세요.",
  "worker-unavailable": "PDF 처리용 브라우저 작업자를 사용할 수 없어요.",
  timeout: "PDF 분석 시간이 초과되었어요. 과목을 직접 선택해 주세요.",
  cancelled: "PDF 분석을 취소했어요.",
  "parse-failed": "PDF를 분석하지 못했어요. 과목을 직접 선택해 주세요.",
};

function safeError(code: PdfImportFailureCode): PdfImportError {
  return new PdfImportError(code, SAFE_ERROR_MESSAGES[code]);
}

function containsPdfSignature(bytes: Uint8Array): boolean {
  const lastStart = bytes.length - PDF_SIGNATURE.length;
  for (let offset = 0; offset <= lastStart; offset += 1) {
    let matches = true;
    for (let index = 0; index < PDF_SIGNATURE.length; index += 1) {
      if (bytes[offset + index] !== PDF_SIGNATURE[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

export async function validatePdfFile(file: File): Promise<void> {
  if (file.size === 0) {
    throw safeError("file-empty");
  }
  if (file.size > PDF_IMPORT_LIMITS.maxFileBytes) {
    throw safeError("file-too-large");
  }

  const mime = file.type.trim().toLowerCase();
  if (mime !== "" && mime !== "application/pdf") {
    throw safeError("mime-mismatch");
  }

  const header = await file
    .slice(0, PDF_IMPORT_LIMITS.headerScanBytes)
    .arrayBuffer();
  if (!containsPdfSignature(new Uint8Array(header))) {
    throw safeError("signature-mismatch");
  }
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return undefined;
  }
  return typeof error.name === "string" ? error.name : undefined;
}

export function classifyPdfError(error: unknown): PdfImportError {
  if (error instanceof PdfImportError) return safeError(error.code);

  switch (errorName(error)) {
    case "PasswordException":
      return safeError("password-protected");
    case "InvalidPDFException":
    case "ResponseException":
      return safeError("invalid-or-corrupt");
    default:
      return safeError("parse-failed");
  }
}

function clearPages(pages: PdfTextPage[]): void {
  for (const page of pages) page.text = "";
  pages.length = 0;
}

export async function analyzePdfText<T>(input: {
  file: File;
  runtime: PdfRuntime;
  signal: AbortSignal;
  consumePages: (pages: PdfTextPage[]) => T;
}): Promise<PdfImportTextSummary<T>> {
  const pages: PdfTextPage[] = [];
  let data: ArrayBuffer | undefined;
  let document: PdfRuntimeDocument | undefined;
  let destroyPromise: Promise<void> | undefined;
  let stoppedError: PdfImportError | undefined;
  let rejectStopped!: (error: PdfImportError) => void;

  const stopped = new Promise<never>((_resolve, reject) => {
    rejectStopped = reject;
  });

  const destroyDocument = (): Promise<void> => {
    if (!document) return Promise.resolve();
    destroyPromise ??= Promise.resolve().then(() => document?.destroy());
    return destroyPromise;
  };

  const stop = (code: "cancelled" | "timeout"): void => {
    if (stoppedError) return;
    stoppedError = safeError(code);
    rejectStopped(stoppedError);
    void destroyDocument().catch(() => undefined);
  };

  const throwIfStopped = (): void => {
    if (stoppedError) throw stoppedError;
  };

  const onAbort = (): void => stop("cancelled");
  const timeoutId = globalThis.setTimeout(
    () => stop("timeout"),
    PDF_IMPORT_LIMITS.timeoutMs,
  );
  input.signal.addEventListener("abort", onAbort, { once: true });
  if (input.signal.aborted) onAbort();

  const operation = async (): Promise<PdfImportTextSummary<T>> => {
    throwIfStopped();
    await validatePdfFile(input.file);
    throwIfStopped();

    const freshData = await input.file.arrayBuffer();
    throwIfStopped();
    data = freshData;

    const openedDocument = await input.runtime.open(freshData);
    document = openedDocument;
    if (stoppedError) {
      try {
        await destroyDocument();
      } catch {
        // The cancellation remains the only public failure.
      }
      throw stoppedError;
    }

    if (document.numPages > PDF_IMPORT_LIMITS.maxPages) {
      throw safeError("page-limit");
    }

    let extractedCharacters = 0;
    let hasText = false;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const text = await document.getPageText(pageNumber);
      throwIfStopped();
      extractedCharacters += text.length;
      if (extractedCharacters > PDF_IMPORT_LIMITS.maxExtractedCharacters) {
        throw safeError("text-limit");
      }
      if (text.trim().length > 0) hasText = true;
      pages.push({ pageNumber, text });
    }

    if (!hasText) throw safeError("no-text-layer");

    const result = input.consumePages(pages);
    throwIfStopped();
    return { pageCount: document.numPages, extractedCharacters, result };
  };

  let publicError: PdfImportError | undefined;
  try {
    return await Promise.race([operation(), stopped]);
  } catch (error) {
    publicError = classifyPdfError(error);
    throw publicError;
  } finally {
    data = undefined;
    clearPages(pages);
    try {
      await destroyDocument();
    } catch (error) {
      if (!publicError) throw classifyPdfError(error);
    } finally {
      globalThis.clearTimeout(timeoutId);
      input.signal.removeEventListener("abort", onAbort);
    }
  }
}
