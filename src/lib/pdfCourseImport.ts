import {
  PDF_IMPORT_LIMITS,
  PdfImportError,
  type PdfAmbiguousCourse,
  type PdfImportCandidateBuilder,
  type PdfImportCandidates,
  type PdfImportDraft,
  type PdfImportFailureCode,
  type PdfMatchedCourse,
  type PdfMatchKind,
  type PdfTextPage,
  type PdfUnmatchedCourse,
} from "../types";
import { buildPdfImportCandidates } from "./pdfCourseMatching";
import {
  realPdfRuntime,
  type PdfRuntime,
  type PdfRuntimeLoadingHandle,
} from "./pdfJsRuntime";

const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const SOURCE_ID_PATTERN = /^p[1-9]\d*-c[1-9]\d*$/;
const COURSE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const MATCH_KINDS = new Set<PdfMatchKind>([
  "internal-code",
  "official-code",
  "exact-name",
  "verified-alias",
]);

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

function errorName(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return undefined;
  }
  return typeof error.name === "string" ? error.name : undefined;
}

export function classifyPdfError(error: unknown): PdfImportError {
  if (
    error instanceof PdfImportError &&
    Object.hasOwn(SAFE_ERROR_MESSAGES, error.code)
  ) {
    return safeError(error.code);
  }

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

type AwaitStep = <T>(promise: Promise<T>) => Promise<T>;

async function validatePdfFileWith(
  file: File,
  awaitStep: AwaitStep,
): Promise<void> {
  if (file.size === 0) throw safeError("file-empty");
  if (file.size > PDF_IMPORT_LIMITS.maxFileBytes) {
    throw safeError("file-too-large");
  }

  const mime = file.type.trim().toLowerCase();
  if (mime !== "" && mime !== "application/pdf") {
    throw safeError("mime-mismatch");
  }

  let header: ArrayBuffer;
  try {
    header = await awaitStep(
      file.slice(0, PDF_IMPORT_LIMITS.headerScanBytes).arrayBuffer(),
    );
  } catch (error) {
    throw classifyPdfError(error);
  }
  if (!containsPdfSignature(new Uint8Array(header))) {
    throw safeError("signature-mismatch");
  }
}

export function validatePdfFile(file: File): Promise<void> {
  return validatePdfFileWith(file, async <T>(promise: Promise<T>) => promise);
}

function clearPages(pages: PdfTextPage[]): void {
  for (const page of pages) page.text = "";
  pages.length = 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  if (Object.getOwnPropertySymbols(value).length > 0) return false;
  const actualKeys = Object.keys(value).sort();
  const sortedExpected = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpected.length &&
    actualKeys.every((key, index) => key === sortedExpected[index])
  );
}

function isSourceId(value: unknown): value is string {
  return typeof value === "string" && SOURCE_ID_PATTERN.test(value);
}

function isCourseId(value: unknown): value is string {
  return typeof value === "string" && COURSE_ID_PATTERN.test(value);
}

function isDisplayLabel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 60 &&
    value === value.trim() &&
    !/[\r\n\u2028\u2029\u0000-\u001f\u007f]/.test(value)
  );
}

function validatedPageNumbers(
  value: unknown,
  pageCount: number,
): number[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const pageNumbers: number[] = [];
  let previous = 0;
  for (const pageNumber of value) {
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pageCount ||
      pageNumber <= previous
    ) {
      return undefined;
    }
    pageNumbers.push(pageNumber);
    previous = pageNumber;
  }
  return pageNumbers;
}

function cloneMatched(
  value: unknown,
  pageCount: number,
): PdfMatchedCourse | undefined {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      "sourceId",
      "courseId",
      "matchKind",
      "pageNumbers",
      "displayLabel",
    ]) ||
    !isSourceId(value.sourceId) ||
    !isCourseId(value.courseId) ||
    typeof value.matchKind !== "string" ||
    !MATCH_KINDS.has(value.matchKind as PdfMatchKind) ||
    !isDisplayLabel(value.displayLabel)
  ) {
    return undefined;
  }
  const pageNumbers = validatedPageNumbers(value.pageNumbers, pageCount);
  if (!pageNumbers) return undefined;
  return {
    sourceId: value.sourceId,
    courseId: value.courseId,
    matchKind: value.matchKind as PdfMatchKind,
    pageNumbers,
    displayLabel: value.displayLabel,
  };
}

function cloneAmbiguous(
  value: unknown,
  pageCount: number,
): PdfAmbiguousCourse | undefined {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, [
      "sourceId",
      "displayLabel",
      "candidateCourseIds",
      "pageNumbers",
    ]) ||
    !isSourceId(value.sourceId) ||
    !isDisplayLabel(value.displayLabel) ||
    !Array.isArray(value.candidateCourseIds) ||
    value.candidateCourseIds.length < 1 ||
    value.candidateCourseIds.length > 3 ||
    !value.candidateCourseIds.every(isCourseId) ||
    new Set(value.candidateCourseIds).size !== value.candidateCourseIds.length
  ) {
    return undefined;
  }
  const pageNumbers = validatedPageNumbers(value.pageNumbers, pageCount);
  if (!pageNumbers) return undefined;
  return {
    sourceId: value.sourceId,
    displayLabel: value.displayLabel,
    candidateCourseIds: [...value.candidateCourseIds],
    pageNumbers,
  };
}

function cloneUnmatched(
  value: unknown,
  pageCount: number,
): PdfUnmatchedCourse | undefined {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["sourceId", "displayLabel", "pageNumbers"]) ||
    !isSourceId(value.sourceId) ||
    !isDisplayLabel(value.displayLabel)
  ) {
    return undefined;
  }
  const pageNumbers = validatedPageNumbers(value.pageNumbers, pageCount);
  if (!pageNumbers) return undefined;
  return {
    sourceId: value.sourceId,
    displayLabel: value.displayLabel,
    pageNumbers,
  };
}

function validateCandidates(
  value: unknown,
  pageCount: number,
): PdfImportCandidates {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["matched", "ambiguous", "unmatched"]) ||
    !Array.isArray(value.matched) ||
    !Array.isArray(value.ambiguous) ||
    !Array.isArray(value.unmatched)
  ) {
    throw safeError("parse-failed");
  }

  const matched = value.matched.map((item) => cloneMatched(item, pageCount));
  const ambiguous = value.ambiguous.map((item) =>
    cloneAmbiguous(item, pageCount),
  );
  const unmatched = value.unmatched.map((item) =>
    cloneUnmatched(item, pageCount),
  );
  if (
    matched.some((item) => item === undefined) ||
    ambiguous.some((item) => item === undefined) ||
    unmatched.some((item) => item === undefined)
  ) {
    throw safeError("parse-failed");
  }

  const sourceIds = [
    ...matched.map((item) => item?.sourceId),
    ...ambiguous.map((item) => item?.sourceId),
    ...unmatched.map((item) => item?.sourceId),
  ];
  if (new Set(sourceIds).size !== sourceIds.length) {
    throw safeError("parse-failed");
  }

  return {
    matched: matched as PdfMatchedCourse[],
    ambiguous: ambiguous as PdfAmbiguousCourse[],
    unmatched: unmatched as PdfUnmatchedCourse[],
  };
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export async function analyzePdfText(input: {
  file: File;
  runtime: PdfRuntime;
  signal: AbortSignal;
  buildCandidates: PdfImportCandidateBuilder;
}): Promise<PdfImportDraft> {
  const pages: PdfTextPage[] = [];
  let bytes: ArrayBuffer | undefined;
  let loading: PdfRuntimeLoadingHandle | undefined;
  let cleanupPromise: Promise<void> | undefined;
  let stoppedError: PdfImportError | undefined;
  let rejectStopped!: (error: PdfImportError) => void;
  const stopped = new Promise<never>((_resolve, reject) => {
    rejectStopped = reject;
  });

  const startCleanup = (): Promise<void> => {
    if (cleanupPromise) return cleanupPromise;
    if (!loading) return Promise.resolve();
    try {
      cleanupPromise = Promise.resolve(loading.destroy());
    } catch (error) {
      cleanupPromise = Promise.reject(error);
    }
    void cleanupPromise.catch(() => undefined);
    return cleanupPromise;
  };

  const stop = (code: "cancelled" | "timeout"): void => {
    if (stoppedError) return;
    stoppedError = safeError(code);
    bytes = undefined;
    rejectStopped(stoppedError);
    void startCleanup();
  };

  const throwIfStopped = (): void => {
    if (stoppedError) throw stoppedError;
  };

  const guard: AwaitStep = async <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([promise, stopped]);

  const onAbort = (): void => stop("cancelled");
  const timeoutId = globalThis.setTimeout(
    () => stop("timeout"),
    PDF_IMPORT_LIMITS.timeoutMs,
  );
  input.signal.addEventListener("abort", onAbort, { once: true });
  if (input.signal.aborted) onAbort();

  const runSteps = async (): Promise<PdfImportDraft> => {
    throwIfStopped();
    await validatePdfFileWith(input.file, guard);
    throwIfStopped();

    bytes = await guard(input.file.arrayBuffer());
    throwIfStopped();
    loading = input.runtime.open(bytes);
    bytes = undefined;
    throwIfStopped();

    const document = await guard(loading.promise);
    throwIfStopped();
    if (document.numPages > PDF_IMPORT_LIMITS.maxPages) {
      throw safeError("page-limit");
    }

    let extractedCharacters = 0;
    let hasText = false;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const text = await guard(document.getPageText(pageNumber));
      throwIfStopped();
      extractedCharacters += text.length;
      if (extractedCharacters > PDF_IMPORT_LIMITS.maxExtractedCharacters) {
        throw safeError("text-limit");
      }
      if (text.trim().length > 0) hasText = true;
      pages.push({ pageNumber, text });
    }
    if (!hasText) throw safeError("no-text-layer");

    const candidateValue: unknown = input.buildCandidates(pages);
    if (isPromiseLike(candidateValue)) {
      void Promise.resolve(candidateValue).catch(() => undefined);
      throw safeError("parse-failed");
    }
    throwIfStopped();
    const candidates = validateCandidates(candidateValue, document.numPages);
    return {
      pageCount: document.numPages,
      extractedCharacters,
      ...candidates,
    };
  };

  const execute = async (): Promise<PdfImportDraft> => {
    let draft: PdfImportDraft | undefined;
    let operationError: PdfImportError | undefined;
    try {
      draft = await runSteps();
    } catch (error) {
      operationError = classifyPdfError(error);
    }

    bytes = undefined;
    clearPages(pages);
    const cleanup = startCleanup();
    if (operationError) throw operationError;

    try {
      await guard(cleanup);
    } catch (error) {
      throw classifyPdfError(error);
    }
    throwIfStopped();
    if (!draft) throw safeError("parse-failed");
    return draft;
  };

  const execution = execute();
  void execution.catch(() => undefined);
  try {
    return await Promise.race([execution, stopped]);
  } catch (error) {
    throw classifyPdfError(error);
  } finally {
    bytes = undefined;
    clearPages(pages);
    void startCleanup();
    globalThis.clearTimeout(timeoutId);
    input.signal.removeEventListener("abort", onAbort);
  }
}

export function analyzePdfCourseFile(
  file: File,
  signal: AbortSignal,
): Promise<PdfImportDraft> {
  return analyzePdfText({
    file,
    signal,
    runtime: realPdfRuntime,
    buildCandidates: buildPdfImportCandidates,
  });
}
