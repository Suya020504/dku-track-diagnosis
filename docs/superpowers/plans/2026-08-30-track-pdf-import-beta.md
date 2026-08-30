# Browser PDF Course Import Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직접 과목 선택을 기본 흐름으로 유지하면서, 텍스트형 PDF에서 알려진 과목을 브라우저 안에서 찾아 학생이 검수·승인한 항목만 완료 과목으로 채우는 선택형 beta를 제공한다.

**Architecture:** PDF.js의 실제 module worker가 로컬 `File`의 bytes를 파싱하고, 앱은 파일 선검사·15초 취소·50쪽 제한·텍스트 수명주기를 통제한다. 파싱 원문은 저장하거나 UI 상태로 넘기지 않고 즉시 과목 매칭 초안으로 축약하며, `matched / ambiguous / unmatched` 검수 뒤 새 과목만 기존 v2 선택값에 병합한다.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Vitest 4, jsdom 30, `pdfjs-dist@6.3.289`, Playwright CLI

**Spec:** `docs/superpowers/specs/2026-08-30-track-diagnosis-service-expansion-design.md`

## Global Constraints

- 기준 브랜치는 `codex/track-service-expansion`, 시작 커밋은 `2c085490712bd4a9883e034e23140e7fad4d94ad`이다.
- 원본 dirty checkout과 사용자 제공 PDF는 읽기 전용이며 수정·이동·삭제·stash하지 않는다.
- 직접 선택은 항상 기본 화면이다. PDF는 접힌 보조 기능이며 실패·취소·새로고침 뒤에도 기존 직접 선택값을 보존한다.
- 정확히 `pdfjs-dist@6.3.289`를 pin한다. API와 worker 버전이 달라질 수 있는 CDN worker는 사용하지 않는다.
- 브라우저의 실제 module worker만 허용한다. fake worker fallback이면 beta 파싱을 중단하고 직접 선택으로 복귀한다.
- PDF 원본, ArrayBuffer, 페이지 원문, 이름, 학번, 성적, 파일명을 localStorage·snapshot·analytics·console에 기록하지 않는다.
- PDF bytes는 외부로 전송하지 않는다. 같은 origin의 Vite worker asset 요청은 허용하되 PDF URL, CMap, font, wasm, CDN 요청은 만들지 않는다.
- 파일 한도는 `10 * 1024 * 1024` bytes, 문서 한도는 50쪽, 전체 분석 한도는 15,000ms, 추출 문자열 한도는 1,000,000자다.
- 빈 MIME은 signature 검사를 전제로 허용하고, 명시된 비-PDF MIME은 거부한다. 첫 1,024 bytes 안의 `%PDF-` signature를 검사한다.
- 암호화·손상·페이지 초과·텍스트 레이어 없음·시간 초과·worker 불가 PDF는 자동 복구 또는 OCR하지 않고 명시적 실패로 종료한다.
- matched도 자동 확정하지 않는다. 학생이 승인한 새 과목만 병합한다.
- 기존 `completed`·`in-progress`·`planned` 상태와 충돌하는 PDF 결과는 자동 승격하지 않고 직접 선택에서 확인할 충돌로 남긴다.
- PDF 검수 초안은 메모리 전용이다. `input=pdf-review` 주소를 새로고침해 초안이 없으면 과목 직접 선택 주소로 replace하고 개인정보 보호 안내를 표시한다.
- 추출 텍스트는 untrusted input이며 React escape를 유지한다. `dangerouslySetInnerHTML`을 사용하지 않는다.
- PDF core와 worker는 파일 선택 뒤 동적 import한다. 랜딩·직접 선택 초기 진입 번들/네트워크에는 PDF.js core/worker를 포함하지 않는다.
- OCR, 포털 로그인/연동, 서버 업로드, 비밀번호 입력 UI, 클라우드 동기화, 공식 성적 인정은 범위 밖이다.
- Fixture generation uses bundled Python `C:\Users\HAPPY\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`, where reportlab/pypdf/pdfplumber are already available; do not install a second Python environment.
- 각 작업은 RED → 최소 구현 → 집중 테스트 → 전체 테스트 → 빌드 → 별도 커밋 순서로 수행한다.

## Official Implementation References

- PDF.js release: https://github.com/mozilla/pdf.js/releases/tag/v6.3.289
- Display API: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- Loading task lifecycle: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentLoadingTask.html
- Worker API: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFWorker.html
- Worker implementation: https://github.com/mozilla/pdf.js/blob/v6.3.289/src/display/api.js
- Text API: https://github.com/mozilla/pdf.js/blob/v6.3.289/src/display/api.js#L1738-L1796
- Security advisory: https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j

## File Responsibility Map

| 파일 | 책임 |
|---|---|
| `src/types.ts` | PDF 실패·매칭·검수·병합 공유 타입 |
| `src/lib/pdfJsRuntime.ts` | PDF.js worker 설정, 문서 열기, 페이지 텍스트 추출, destroy |
| `src/lib/pdfCourseImport.ts` | 파일 선검사, timeout/abort, 분석 orchestration, 오류 분류 |
| `src/data/courseAliases2026.ts` | 과목명·내부코드·공식코드·검증된 별칭 인덱스 |
| `src/lib/pdfCourseMatching.ts` | 원문을 저장하지 않는 exact/fuzzy 매칭과 병합 충돌 계산 |
| `src/features/courses/PdfCourseImportPanel.tsx` | 선택형 beta 진입, 한도·개인정보, 진행·실패·취소 UI |
| `src/features/courses/PdfMatchReview.tsx` | matched·ambiguous·unmatched 검수와 승인 UI |
| `src/lib/appRouting.ts` | 메모리 전용 `input=pdf-review` 주소와 새로고침 복구 |
| `src/App.tsx` | PDF 초안 메모리 상태, 분석 취소, 승인 병합, 기존 저장/계획 무효화 연결 |

---

### Task 1: Pin PDF.js, Define The Runtime Boundary, And Create Synthetic Fixtures

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/types.ts`
- Create: `src/lib/pdfJsRuntime.ts`
- Create: `src/lib/pdfJsRuntime.test.ts`
- Create: `tests/fixtures/pdf/synthetic-course-history.pdf`
- Create: `tests/fixtures/pdf/synthetic-no-text.pdf`
- Create: `tests/fixtures/pdf/synthetic-password.pdf`
- Create: `tests/fixtures/pdf/synthetic-51-pages.pdf`
- Create: `tests/fixtures/pdf/synthetic-corrupt.pdf`
- Create: `tests/fixtures/pdf/README.md`
- Create: `docs/data/pdf-import-fixtures.md`

**Interfaces:**
- Produces: `PDF_IMPORT_LIMITS`, `PdfImportFailureCode`, `PdfImportError`
- Produces: `openPdfDocument(data, lifecycle): PdfRuntimeDocument`
- Produces: synthetic, non-PII browser fixtures with stable SHA-256 values

- [ ] **Step 1: Install one exact runtime dependency**

Run:

```powershell
pnpm.cmd add pdfjs-dist@6.3.289 --save-exact
```

Expected: `dependencies.pdfjs-dist` is exactly `6.3.289`; no CDN, viewer, OCR, or second PDF dependency is added.

- [ ] **Step 2: Add runtime and failure types**

Add:

```ts
export const PDF_IMPORT_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 50,
  timeoutMs: 15_000,
  maxExtractedCharacters: 1_000_000,
  headerScanBytes: 1_024,
} as const;

export type PdfImportFailureCode =
  | "file-empty"
  | "file-too-large"
  | "mime-mismatch"
  | "signature-mismatch"
  | "password-protected"
  | "invalid-or-corrupt"
  | "page-limit"
  | "text-limit"
  | "no-text-layer"
  | "worker-unavailable"
  | "timeout"
  | "cancelled"
  | "parse-failed";

export class PdfImportError extends Error {
  constructor(
    readonly code: PdfImportFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "PdfImportError";
  }
}

export type PdfTextPage = {
  pageNumber: number;
  text: string;
};
```

- [ ] **Step 3: Generate synthetic fixtures under the PDF skill contract**

Use the bundled Python above with `reportlab` and `pypdf` only for fixture generation. `pdftoppm` is already available for rendering. Contents:

```text
synthetic-course-history.pdf
  2 pages; synthetic label only; includes 경제원론, 통계학기초, 마케팅조사분석,
  internal code C-1, official code 553110, and one misspelled course-like line.

synthetic-no-text.pdf
  1 page containing the course list only as a raster image; no hidden text layer.

synthetic-password.pdf
  encrypted copy of the text fixture with test-only password fixture-password;
  the app must reject it without asking for the password.

synthetic-51-pages.pdf
  51 minimal numbered pages with no personal data.

synthetic-corrupt.pdf
  begins with %PDF- but has an invalid body.
```

For Korean fixture text, register and embed `C:\Windows\Fonts\malgun.ttf`; fail fixture generation with an explicit missing-font message rather than producing unreadable squares. The no-text fixture rasterizes the same synthetic page before placing the image into a new PDF.

Render the four valid PDFs to `tmp/pdfs/` PNGs, inspect every page category, and record fixture SHA-256, page count, encryption, and purpose in both README files. Do not commit rendered intermediates.

- [ ] **Step 4: Implement the PDF.js worker runtime**

Use:

```ts
import {
  GlobalWorkerOptions,
  PDFWorker,
  getDocument,
  type PDFDocumentLoadingTask,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
```

`openPdfDocument` must:

1. create `new PDFWorker({ name: "course-import" })`;
2. await `worker.promise`;
3. reject unless `worker.port instanceof Worker`;
4. call `getDocument({ data: new Uint8Array(data), worker, stopAtErrors: true, useWorkerFetch: false, useWasm: false, isEvalSupported: false })`;
5. expose `numPages`, sequential `getPageText(pageNumber)`, and idempotent `destroy()`;
6. call `page.cleanup()`, `loadingTask.destroy()`, and `worker.destroy()` without logging raw content.

The runtime public interface is:

```ts
export type PdfRuntimeDocument = {
  numPages: number;
  getPageText(pageNumber: number): Promise<string>;
  destroy(): Promise<void>;
};

export type PdfRuntime = {
  open(data: ArrayBuffer): Promise<PdfRuntimeDocument>;
};
```

Export the real runtime and permit dependency injection in Task 2 tests.

- [ ] **Step 5: Test cleanup and worker configuration**

Tests must assert:

- imported worker URL is a Vite asset URL, not a CDN URL;
- text items join `str` and `hasEOL` without HTML interpretation;
- page cleanup runs once;
- destroy is idempotent and destroys both task and owned worker;
- fake-worker detection yields `worker-unavailable` through the later classifier.

Run:

```powershell
pnpm.cmd vitest run src/lib/pdfJsRuntime.test.ts
pnpm.cmd run test
pnpm.cmd run build
```

Record generated core/worker asset sizes from `dist/assets`; do not claim gzip values for the source npm files.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-lock.yaml src/types.ts src/lib/pdfJsRuntime.ts src/lib/pdfJsRuntime.test.ts tests/fixtures/pdf docs/data/pdf-import-fixtures.md
git commit -m "feat: add local pdf parsing runtime"
```

---

### Task 2: Enforce File Limits, Cancellation, And Text Lifetime

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/pdfCourseImport.ts`
- Create: `src/lib/pdfCourseImport.test.ts`

**Interfaces:**
- Consumes: injected `PdfRuntime`, `PDF_IMPORT_LIMITS`
- Produces: `analyzePdfText(file, runtime, signal): PdfImportTextSummary`
- Produces: `validatePdfFile(file): Promise<void>`, `classifyPdfError(error)`

- [ ] **Step 1: Write failing file-boundary tests**

Use jsdom `File` objects and assert:

```ts
await expect(validatePdfFile(emptyPdf)).rejects.toMatchObject({ code: "file-empty" });
await expect(validatePdfFile(over10Mb)).rejects.toMatchObject({ code: "file-too-large" });
await expect(validatePdfFile(textMime)).rejects.toMatchObject({ code: "mime-mismatch" });
await expect(validatePdfFile(blankMimeWithSignature)).resolves.toBeUndefined();
await expect(validatePdfFile(signatureWithinFirst1024)).resolves.toBeUndefined();
await expect(validatePdfFile(signatureAfter1024)).rejects.toMatchObject({ code: "signature-mismatch" });
```

The `%PDF-` byte sequence may occur anywhere in the first 1,024 bytes.

- [ ] **Step 2: Implement preflight validation**

Use only `file.slice(0, 1024).arrayBuffer()` before accepting the file. The MIME rule is:

```ts
const mime = file.type.trim().toLowerCase();
if (mime !== "" && mime !== "application/pdf") {
  throw new PdfImportError("mime-mismatch", "PDF 파일 형식만 사용할 수 있어요.");
}
```

Do not use PDF.js `isPdfFile()` because it checks filename extension only.

- [ ] **Step 3: Write failing lifecycle tests with an injected fake runtime**

Cover:

1. 50 pages accepted; 51 pages rejected before page extraction;
2. sequential page calls `1,2,3`, never `Promise.all`;
3. total trimmed text empty → `no-text-layer`;
4. total characters over 1,000,000 → `text-limit`;
5. AbortController before open → `cancelled` and no open call;
6. abort during a page → destroy once;
7. 15-second fake-timer timeout → `timeout` and destroy once;
8. runtime open/page failure → classified safe code, raw error text not returned;
9. a Task 3-style candidate-only builder yields a parser-owned `PdfImportDraft`; returning a full draft or extra count keys is rejected and no ArrayBuffer or page strings are exposed.

- [ ] **Step 4: Implement controlled analysis**

Public orchestration:

```ts
export type PdfImportCandidateBuilder = (
  pages: readonly PdfTextPage[],
) => PdfImportCandidates;

export async function analyzePdfText(input: {
  file: File;
  runtime: PdfRuntime;
  signal: AbortSignal;
  buildCandidates: PdfImportCandidateBuilder;
}): Promise<PdfImportDraft>;
```

Implementation order:

```text
validate file → read fresh ArrayBuffer → open runtime → check numPages →
sequential page text → enforce character total → require some text →
build and validate exact candidate arrays synchronously → add parser-owned counts →
clear page strings/ArrayBuffer references → destroy in finally
```

Race the whole operation against one 15,000ms timer and signal. `destroy()` must be idempotent. Do not retry password-protected documents.

- [ ] **Step 5: Map safe user-facing errors**

Map PDF.js `PasswordException`, `InvalidPDFException`, and `ResponseException` to the approved failure codes. All UI messages are fixed Korean copy; do not include `error.message`, filename, text, or stack.

- [ ] **Step 6: Verify and commit**

```powershell
pnpm.cmd vitest run src/lib/pdfCourseImport.test.ts src/lib/pdfJsRuntime.test.ts
pnpm.cmd run test
pnpm.cmd run build
git diff --check
git add src/types.ts src/lib/pdfCourseImport.ts src/lib/pdfCourseImport.test.ts
git commit -m "feat: enforce private pdf import limits"
```

---

### Task 3: Match Known Courses Without Auto-Confirming Them

**Files:**
- Modify: `src/types.ts`
- Create: `src/data/courseAliases2026.ts`
- Create: `src/data/courseAliases2026.test.ts`
- Create: `src/lib/pdfCourseMatching.ts`
- Create: `src/lib/pdfCourseMatching.test.ts`

**Interfaces:**
- Consumes: `courses`, `courseOfferings2026`, extracted `readonly PdfTextPage[]`, and the review types introduced by Task 2
- Produces: `buildPdfImportCandidates(pages): PdfImportCandidates`
- Produces: `mergeApprovedPdfMatches(current, candidates, approvals): PdfMergeResult`

- [ ] **Step 1: Reuse Task 2 review types and add merge types**

Task 2 already owns `PdfMatchKind`, `PdfMatchedCourse`, `PdfAmbiguousCourse`, `PdfUnmatchedCourse`, `PdfImportCandidates`, `PdfImportCandidateBuilder`, and parser-owned `PdfImportDraft`. Task 3 verifies and uses those types; it does not redefine the draft root or its parser-owned count fields.

```ts
export type PdfImportApproval = {
  sourceId: string;
  courseId: string;
};

export type PdfMergeConflict = {
  courseId: string;
  existingStatus: CourseSelectionStatus;
  message: string;
};

export type PdfMergeResult = {
  courseSelections: CourseSelectionRecord[];
  addedCourseIds: string[];
  conflicts: PdfMergeConflict[];
};
```

No type contains filename, original line, full page text, name, student number, or grade.

- [ ] **Step 2: Build a verified alias index**

Every course gets:

- internal ID and code (`c-1`, `C-1`);
- exact curriculum name;
- historical official course code;
- timetableName when present;
- explicit D-2 wording alias `환경영향과 전과정평가`.

Normalize with NFKC, lowercase, collapsed whitespace, and punctuation removal. Alias tests must reject empty/one-character aliases and report any normalized alias shared by multiple courses as ambiguous instead of overwriting it.

- [ ] **Step 3: Write matching RED tests**

Cover:

- exact Korean name, internal code, official code, verified alias;
- duplicate hits on multiple pages collapse to one matched course with sorted unique pages;
- one text line containing two exact course names yields two matched courses;
- a normalized alias shared by candidates yields one ambiguous item;
- a fuzzy/typo course-like line never becomes matched; it becomes ambiguous candidates or unmatched;
- unrelated headers, dates, names, credit numbers, and short tokens are discarded rather than surfaced;
- deterministic order is page, display label, course code;
- serialized candidates contain no PDF source text in ambiguous or name-like unmatched display labels; matched labels are canonical curriculum names and standalone safe unknown codes are uppercase.

- [ ] **Step 4: Implement conservative matching**

Rules:

1. exact known code/name/verified alias only → matched;
2. multiple exact candidates for one normalized token → ambiguous with fixed generic display copy;
3. fuzzy similarity may suggest up to three candidate IDs only in ambiguous with fixed generic display copy; never matched;
4. no credible course-like candidate → discard;
5. credible but unknown 2–60 character cells → unmatched with fixed generic display copy, except standalone safe letter-hyphen-number codes may display their uppercase code;
6. credible course-like cells must contain either a known code pattern or one of the domain tokens `경제`, `식품`, `유통`, `마케팅`, `정책`, `지역`, `환경`, `영양`, `바이오`, `농업`, `경영`, `통계`; explicit sensitive context, dates, grades, and unrelated text are discarded, while any residual name-like credible cell can produce only generic unmatched copy and is never echoed;
7. source IDs are deterministic positional IDs such as `p2-c3` assigned after candidate sorting, not hashes or copies of original text.

Never return PDF source wording through ambiguous or unmatched `displayLabel`. Matched rows use canonical curriculum course names. The review UI resolves ambiguous `candidateCourseIds` to canonical course names itself, while name-like unmatched rows use generic page-based copy such as `인식하지 못한 과목명`. Multiple generic rows remain distinct through positional source IDs and page numbers.

Use a small internal edit-distance function; do not add a fuzzy-search dependency.

- [ ] **Step 5: Write and implement merge tests**

Contracts:

```text
approved new course → append status completed
same approval twice → one course
course already completed → conflict, no duplicate
course already in-progress → conflict, no status change
course already planned → conflict, no status change
ambiguous source approval must name one candidate course
unknown source/course approval ignored and reported as conflict-safe no-op
input order does not change deterministic output
```

The merge function is pure and never touches storage.

- [ ] **Step 6: Verify and commit**

```powershell
pnpm.cmd vitest run src/data/courseAliases2026.test.ts src/lib/pdfCourseMatching.test.ts
pnpm.cmd run test
pnpm.cmd run build
git diff --check
git add src/types.ts src/data/courseAliases2026.ts src/data/courseAliases2026.test.ts src/lib/pdfCourseMatching.ts src/lib/pdfCourseMatching.test.ts
git commit -m "feat: match pdf courses for student review"
```

---

### Task 4: Add Ephemeral PDF Review Routing And Student Approval UI

**Files:**
- Modify: `src/lib/pdfCourseImport.ts`
- Modify: `src/lib/appRouting.ts`
- Modify: `src/lib/appRouting.test.ts`
- Create: `src/features/courses/PdfCourseImportPanel.tsx`
- Create: `src/features/courses/PdfCourseImportPanel.test.tsx`
- Create: `src/features/courses/PdfMatchReview.tsx`
- Create: `src/features/courses/PdfMatchReview.test.tsx`
- Modify: `src/App.tsx`
- Create: `src/App.pdf-import-integration.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: real `analyzePdfText`, `buildPdfImportCandidates`, `mergeApprovedPdfMatches`
- Produces: direct-selection-first panel and memory-only review route
- Invalidates: reviewed course timestamp and graduation plan only after a successful approved merge

- [ ] **Step 1: Extend only the diagnosis-courses route**

Extend:

```ts
type PdfInputRoute = "pdf-review";

type AppRoute =
  | { view: "diagnosis"; step: DiagnosisStep; input?: PdfInputRoute }
  | { view: "landing" }
  | { view: "recommendation"; step: "survey" | "axes"; axis?: "interest" | "progress" | "plan" }
  | { view: "plan"; step: "setup" | "schedule" | "checks" }
  | { view: "overview" | "resources" | "modules" | "result" | "contact" };
```

Rules:

- `input=pdf-review` is valid only for `diagnosis/courses` and an App-provided `hasPdfImportDraft` context;
- without a draft it resolves to diagnosis/courses, removes `input` with replace, and App shows `개인정보 보호를 위해 PDF 검수 내용은 새로고침 후 저장하지 않았어요. 직접 선택은 그대로 유지됩니다.`;
- every other route write deletes stale `input`;
- unrelated query/hash/history fields remain;
- push opens review, back returns courses with the in-memory draft intact, reload clears draft and canonicalizes.

Add an optional route context parameter with a safe default so all existing callers and tests remain valid.

- [ ] **Step 2: Write panel and review component RED tests**

Panel must render:

- direct selection as the main visible workflow;
- collapsed secondary button `PDF로 선택값 채우기 beta`;
- 10MB, 50쪽, text-PDF, browser-only, no-save/no-upload copy;
- file input with `accept="application/pdf,.pdf"`;
- progress/status and `분석 취소`;
- fixed failure copy plus `직접 선택 계속하기`;
- no filename or extracted source text.

Review must render:

- counts for matched, ambiguous, unmatched;
- matched rows unchecked by default;
- ambiguous candidate radio choice plus approval checkbox, rendering canonical course names from `candidateCourseIds` rather than PDF-derived display text;
- unmatched as generic page-based manual-review rows with direct-search action; never render PDF source wording;
- `승인한 새 과목 N개 적용` primary action;
- conflicts after merge without changing existing status;
- cancel and back actions.

- [ ] **Step 3: Implement abort-safe UI state**

`PdfCourseImportPanel` accepts injected `analyzeFile` for tests but App passes the real analyzer. Starting a new file aborts and destroys the previous analysis. Unmount aborts. Failure preserves course selections and resets the file input value so the same file can be retried.

The default analyzer is loaded only after file selection:

```ts
const { analyzePdfCourseFile } = await import("../../lib/pdfCourseImport");
```

Do not statically import `pdfjs-dist`, `pdfJsRuntime`, or the real analyzer from `App.tsx`.

In this task, add `analyzePdfCourseFile(file, signal)` to `pdfCourseImport.ts` by passing `buildPdfImportCandidates` as the `buildCandidates` callback to real-runtime `analyzePdfText`; Task 2 validates the candidate-only result, adds `pageCount` and `extractedCharacters`, and returns `PdfImportDraft`.

Keep only `PdfImportDraft` in React memory. Do not store `File`, ArrayBuffer, pages, password, or filename after analysis resolves.

- [ ] **Step 4: Integrate App transitions**

Add App memory state:

```ts
const [pdfImportDraft, setPdfImportDraft] = useState<PdfImportDraft>();
const [pdfImportRecoveryNotice, setPdfImportRecoveryNotice] = useState(false);
```

On successful analysis, set draft and push `input=pdf-review`. On approval:

1. call pure merge;
2. if no new course, keep review and show conflicts;
3. if new courses exist, call `applyPlanningSourceChange` with reviewed-source change;
4. call `saveAppState(next)` before mutating in-memory selections;
5. on failure, keep the draft and current selections unchanged, show the existing alert, and allow retry;
6. on success, set the next state and clear the ephemeral draft;
7. replace/push direct course route and focus the course heading.

No snapshot is created from PDF import itself.

- [ ] **Step 5: Add real DOM integration tests**

Use jsdom `File`, injected analyzer, native input change/click/history/popstate. Cover:

- direct selection visible before opening PDF panel;
- success opens review route and displays no filename/raw text;
- approve two new courses preserves existing completed/planned/in-progress values and adds only new completed records;
- conflicts visible, no auto-upgrade;
- failed/cancelled parser leaves state and URL on direct courses;
- refresh review without draft canonicalizes and shows privacy notice;
- back/forward with draft restores review/courses;
- course merge clears `courseInputReviewedAt` and stale graduationPlan but preserves preferences;
- throwing storage shows alert and never shows saved success.

- [ ] **Step 6: Style and verify**

Use existing sky/mint tokens, 44px controls, text labels, `role=alert/status`, visible focus, single-column mobile review, and no modal that traps the direct selection page.

Run:

```powershell
pnpm.cmd vitest run src/features/courses/PdfCourseImportPanel.test.tsx src/features/courses/PdfMatchReview.test.tsx src/App.pdf-import-integration.test.tsx src/lib/appRouting.test.ts
pnpm.cmd run test
pnpm.cmd run build
git diff --check
git add src/lib/pdfCourseImport.ts src/lib/appRouting.ts src/lib/appRouting.test.ts src/features/courses src/App.tsx src/App.pdf-import-integration.test.tsx src/styles.css
git commit -m "feat: add reviewed pdf course import"
```

---

### Task 5: Browser Privacy Gate, Failure Recovery, And Beta Documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `reports/validation/2026-08-30-pdf-import-beta-validation.md`
- Create: `docs/assets/2026-08-30-pdf-import/01-direct-selection-with-pdf-option-desktop.png`
- Create: `docs/assets/2026-08-30-pdf-import/02-pdf-match-review-desktop.png`
- Create: `docs/assets/2026-08-30-pdf-import/03-pdf-failure-recovery-mobile.png`

**Interfaces:**
- Consumes: synthetic fixtures and Tasks 1–4 behavior
- Produces: exact beta evidence and next history/visual plan boundary

- [ ] **Step 1: Run fresh automated and dependency checks**

```powershell
pnpm.cmd run test
pnpm.cmd run build
pnpm.cmd list pdfjs-dist --depth 0
git diff --check
rg -n "PDF.*자동 확정|PDF.*서버|PDF.*업로드|성적.*저장|파일명" src README.md CHANGELOG.md reports
```

Record exact test/build counts and Vite core/worker asset sizes from this run.

- [ ] **Step 2: Run real Chromium flows on an isolated port**

Use Playwright CLI, desktop 1440×900 and mobile 390×844:

1. direct-selection-first screen and optional panel;
2. upload `synthetic-course-history.pdf`, review matched/ambiguous/unmatched, approve only selected new courses;
3. existing planned/in-progress conflict stays unchanged;
4. cancel during analysis;
5. no-text PDF → direct selection recovery;
6. password PDF → direct selection recovery;
7. 51-page PDF → page-limit recovery;
8. corrupt PDF → safe recovery;
9. generated >10MB Blob/File → preflight rejection before parser open;
10. review reload → privacy notice and direct selections preserved;
11. review back/forward while draft exists;
12. keyboard-only panel → file → review → approve → course list.

For each accepted state assert console errors/warnings 0 and overflow 0.

- [ ] **Step 3: Verify network and memory privacy boundaries**

Record browser network requests during a successful import:

- before opening/selecting a PDF, no PDF.js core chunk or worker asset is requested;
- allowed: document/app assets and same-origin hashed PDF worker asset;
- forbidden: blob/file bytes sent by fetch/XHR/beacon/WebSocket, PDF URL request, CDN, CMap/font/wasm supporting asset request;
- no request body contains `%PDF-`, course fixture text, filename, or extracted text;
- after completion/cancel, worker is destroyed and selecting the same file again starts a fresh session.

Inspect localStorage/sessionStorage and snapshot JSON: none contains fixture filename, PDF bytes, raw extracted text, or draft objects.

- [ ] **Step 4: Capture and inspect three current-HEAD screenshots**

Store originals under `output/playwright/pdf-import-20260830/`, inspect all three with `view_image`, copy accepted images to docs assets, and compare SHA-256 3/3. Use only synthetic fixtures.

- [ ] **Step 5: Update honest beta documentation**

README/CHANGELOG/report must state:

- direct selection remains default;
- input import is beta and separate from existing browser print/PDF output;
- only text-layer PDFs are supported;
- no OCR, password UI, portal link, upload, cloud save, or automatic completion;
- known course matching is reference-only and student approval is mandatory;
- file content is processed locally, while the same-origin worker asset loads as an app resource;
- 10MB/50-page/15-second/1,000,000-character limits;
- actual portal transcript format is unverified because no real sample was used;
- PDF.js official version/security/source links;
- diagnosis history and generated explanatory images remain the next plan.

- [ ] **Step 6: Commit and stop at the next-plan boundary**

```powershell
git add README.md CHANGELOG.md reports/validation/2026-08-30-pdf-import-beta-validation.md docs/assets/2026-08-30-pdf-import
git commit -m "docs: validate private pdf import beta"
```

Report exact verification, screenshots, limitations, and the next plan. Do not start diagnosis-history or image integration inside this plan.
