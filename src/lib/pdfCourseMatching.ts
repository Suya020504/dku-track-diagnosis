import {
  type CourseSelectionRecord,
  type CourseSelectionStatus,
  type PdfAmbiguousCourse,
  type PdfImportApproval,
  type PdfImportCandidateBuilder,
  type PdfImportCandidates,
  type PdfImportDraft,
  type PdfMatchKind,
  type PdfMatchedCourse,
  type PdfMergeConflict,
  type PdfMergeResult,
  type PdfTextPage,
  type PdfUnmatchedCourse,
} from "../types";
import {
  courseAliasIndex2026,
  normalizeCourseAlias,
  type CourseAlias,
  type CourseAliasIndex,
} from "../data/courseAliases2026";
import { courses } from "../data/curriculumData";

const SOURCE_ID_PATTERN = /^p[1-9]\d*-c[1-9]\d*$/;
export const PDF_COURSE_MATCHING_LIMITS = {
  maxRawCellCharacters: 60,
  maxUniqueCells: 256,
  maxSuggestionCells: 64,
} as const;
const DOMAIN_TOKENS = [
  "경제",
  "식품",
  "유통",
  "마케팅",
  "정책",
  "지역",
  "환경",
  "영양",
  "바이오",
  "농업",
  "경영",
  "통계",
] as const;
const HEADER_PATTERN =
  /^(?:성적표|과목명|교과목명|이수학점|학점|성적|학수번호|학번|성명|이름)$/u;
const HEADER_PHRASE_PATTERN = /(?:성적표|수강내역|이수내역)$/u;
const SENSITIVE_CONTEXT_PATTERN =
  /(?:학과|학부|전공|소속|성명|이름|학번|학생|성적|점수|생년|전화|이메일|대학|교과목명|과목명|학수번호|이수학점|수강내역|이수내역)/u;
const SENSITIVE_CONTROL_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u2028\u2029]/u;
const STUDENT_NUMBER_PATTERN = /(?:^|[^0-9０-９])[0-9０-９]{7,10}(?![0-9０-９])/u;
const DATE_PATTERN =
  /(?:19|20|１９|２０)[0-9０-９]{2}(?:\s*[./-]\s*[0-9０-９]{1,2}\s*[./-]\s*[0-9０-９]{1,2}|[0-9０-９]{4})/u;
const GRADE_PATTERN =
  /(?:^|[\s|,;/])(?:a\+?|b\+?|c\+?|d\+?|f|p|np|수|우|미|양|가)(?=$|[\s|,;/])/iu;
const SCORE_PATTERN = /[0-9０-９]{1,3}(?:[.][0-9０-９]+)?\s*(?:점|\/\s*100)/u;
const UNKNOWN_COURSE_CODE_PATTERN = /^[A-Za-z]-\d{1,3}$/;
const AMBIGUOUS_DISPLAY_LABEL = "유사한 과목 후보";
const UNMATCHED_DISPLAY_LABEL = "인식하지 못한 과목명";
const MATCH_KIND_ORDER: Record<PdfMatchKind, number> = {
  "internal-code": 0,
  "official-code": 1,
  "exact-name": 2,
  "verified-alias": 3,
};
const STATUS_ORDER: Record<CourseSelectionStatus, number> = {
  completed: 0,
  "in-progress": 1,
  planned: 2,
};

const courseById = new Map(courses.map((course) => [course.id, course]));
const courseOrder = new Map(courses.map((course, index) => [course.id, index]));

type BoundedCell = {
  normalizedLabel: string;
  displayLabel: string;
  pageNumbers: Set<number>;
};

type MatchedAccumulator = {
  type: "matched";
  courseId: string;
  displayLabel: string;
  pageNumbers: Set<number>;
  firstHit: {
    pageNumber: number;
    offset: number;
    matchKind: PdfMatchKind;
  };
};

type AmbiguousAccumulator = {
  type: "ambiguous";
  key: string;
  displayLabel: string;
  candidateCourseIds: string[];
  pageNumbers: Set<number>;
};

type UnmatchedAccumulator = {
  type: "unmatched";
  key: string;
  displayLabel: string;
  pageNumbers: Set<number>;
};

type CandidateAccumulator =
  | MatchedAccumulator
  | AmbiguousAccumulator
  | UnmatchedAccumulator;

function compareCourseIds(left: string, right: string): number {
  const leftOrder = courseOrder.get(left);
  const rightOrder = courseOrder.get(right);
  if (leftOrder !== undefined && rightOrder !== undefined) {
    return leftOrder - rightOrder;
  }
  if (leftOrder !== undefined) return -1;
  if (rightOrder !== undefined) return 1;
  return left.localeCompare(right, "en");
}

function sanitizeDisplayLabel(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsSensitiveContext(value: string): boolean {
  return (
    SENSITIVE_CONTEXT_PATTERN.test(value) ||
    SENSITIVE_CONTROL_PATTERN.test(value) ||
    STUDENT_NUMBER_PATTERN.test(value) ||
    DATE_PATTERN.test(value) ||
    GRADE_PATTERN.test(value) ||
    SCORE_PATTERN.test(value)
  );
}

function isHardCellSeparator(value: string): boolean {
  return /[\t|,\/;，、／｜；]/u.test(value);
}

function isInlineWhitespace(value: string): boolean {
  return value !== "\t" && /\s/u.test(value);
}

function collectBoundedCells(pages: readonly PdfTextPage[]): BoundedCell[] {
  const cells = new Map<string, BoundedCell>();
  let budgetExhausted = false;

  const addCell = (
    rawLine: string,
    start: number,
    end: number,
    pageNumber: number,
  ): boolean => {
    const rawLength = end - start;
    if (
      rawLength <= 0 ||
      rawLength > PDF_COURSE_MATCHING_LIMITS.maxRawCellCharacters
    ) {
      return true;
    }
    const displayLabel = sanitizeDisplayLabel(rawLine.slice(start, end));
    if (!displayLabel || displayLabel.length > 60) return true;
    const normalizedLabel = normalizeCourseAlias(displayLabel);
    if (normalizedLabel.length < 2) return true;

    const existing = cells.get(normalizedLabel);
    if (existing) {
      existing.pageNumbers.add(pageNumber);
      if (displayLabel.localeCompare(existing.displayLabel, "ko") < 0) {
        existing.displayLabel = displayLabel;
      }
      return true;
    }
    if (cells.size >= PDF_COURSE_MATCHING_LIMITS.maxUniqueCells) {
      return false;
    }
    cells.set(normalizedLabel, {
      normalizedLabel,
      displayLabel,
      pageNumbers: new Set([pageNumber]),
    });
    return true;
  };

  const segmentLine = (rawLine: string, pageNumber: number): boolean => {
    if (containsSensitiveContext(rawLine)) return true;
    let cellStart = 0;
    let index = 0;
    while (index < rawLine.length) {
      const character = rawLine[index] ?? "";
      if (isHardCellSeparator(character)) {
        if (!addCell(rawLine, cellStart, index, pageNumber)) return false;
        index += 1;
        cellStart = index;
        continue;
      }
      if (isInlineWhitespace(character)) {
        let whitespaceEnd = index + 1;
        while (
          whitespaceEnd < rawLine.length &&
          isInlineWhitespace(rawLine[whitespaceEnd] ?? "")
        ) {
          whitespaceEnd += 1;
        }
        if (whitespaceEnd - index >= 2) {
          if (!addCell(rawLine, cellStart, index, pageNumber)) return false;
          cellStart = whitespaceEnd;
        }
        index = whitespaceEnd;
        continue;
      }
      index += 1;
    }
    return addCell(rawLine, cellStart, rawLine.length, pageNumber);
  };

  for (const page of [...pages].sort(
    (left, right) => left.pageNumber - right.pageNumber,
  )) {
    let lineStart = 0;
    while (lineStart <= page.text.length) {
      let lineEnd = page.text.indexOf("\n", lineStart);
      if (lineEnd < 0) lineEnd = page.text.length;
      const contentEnd =
        lineEnd > lineStart && page.text[lineEnd - 1] === "\r"
          ? lineEnd - 1
          : lineEnd;
      if (!segmentLine(page.text.slice(lineStart, contentEnd), page.pageNumber)) {
        budgetExhausted = true;
        break;
      }
      if (lineEnd >= page.text.length) break;
      lineStart = lineEnd + 1;
    }
    if (budgetExhausted) break;
  }

  return [...cells.values()].sort(
    (left, right) =>
      Math.min(...left.pageNumbers) - Math.min(...right.pageNumbers) ||
      left.displayLabel.localeCompare(right.displayLabel, "ko") ||
      left.normalizedLabel.localeCompare(right.normalizedLabel, "ko"),
  );
}

function chooseMatchKind(aliases: readonly CourseAlias[]): PdfMatchKind {
  return [...aliases].sort(
    (left, right) =>
      MATCH_KIND_ORDER[left.matchKind] - MATCH_KIND_ORDER[right.matchKind],
  )[0]!.matchKind;
}

function isCredibleCourseLabel(label: string): boolean {
  const normalized = normalizeCourseAlias(label);
  if (
    normalized.length < 2 ||
    label.length > 60 ||
    /\p{N}/u.test(label) ||
    HEADER_PATTERN.test(normalized) ||
    HEADER_PHRASE_PATTERN.test(normalized)
  ) {
    return false;
  }
  return DOMAIN_TOKENS.some((token) => normalized.includes(token));
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
}

function fuzzyCandidateCourseIds(
  label: string,
  aliasIndex: CourseAliasIndex,
): string[] {
  const normalizedLabel = normalizeCourseAlias(label).replace(/\s+/gu, "");
  const bestScores = new Map<string, number>();

  for (const [normalizedAlias, aliases] of aliasIndex) {
    if (
      !aliases.some(
        ({ matchKind }) =>
          matchKind === "exact-name" || matchKind === "verified-alias",
      )
    ) {
      continue;
    }
    const comparableAlias = normalizedAlias.replace(/\s+/gu, "");
    const distance = editDistance(normalizedLabel, comparableAlias);
    const maximumDistance = comparableAlias.length <= 4 ? 1 : 2;
    if (
      distance === 0 ||
      distance > maximumDistance ||
      distance / Math.max(normalizedLabel.length, comparableAlias.length) > 0.25
    ) {
      continue;
    }
    for (const { courseId } of aliases) {
      const current = bestScores.get(courseId);
      if (current === undefined || distance < current) {
        bestScores.set(courseId, distance);
      }
    }
  }

  return [...bestScores.entries()]
    .sort(
      ([leftId, leftScore], [rightId, rightScore]) =>
        leftScore - rightScore || compareCourseIds(leftId, rightId),
    )
    .slice(0, 3)
    .map(([courseId]) => courseId);
}

function firstPage(candidate: CandidateAccumulator): number {
  return Math.min(...candidate.pageNumbers);
}

function candidateCourseKey(candidate: CandidateAccumulator): string {
  if (candidate.type === "matched") return candidate.courseId;
  if (candidate.type === "ambiguous") {
    return candidate.candidateCourseIds[0] ?? "";
  }
  return candidate.displayLabel;
}

function compareCandidates(
  left: CandidateAccumulator,
  right: CandidateAccumulator,
): number {
  return (
    firstPage(left) - firstPage(right) ||
    left.displayLabel.localeCompare(right.displayLabel, "ko") ||
    compareCourseIds(candidateCourseKey(left), candidateCourseKey(right))
  );
}

function sortedPages(pageNumbers: Set<number>): number[] {
  return [...pageNumbers].sort((left, right) => left - right);
}

export function createPdfCourseCandidateBuilder(
  aliasIndex: CourseAliasIndex,
): PdfImportCandidateBuilder {
  return (pages: readonly PdfTextPage[]): PdfImportCandidates => {
    const matchedByCourse = new Map<string, MatchedAccumulator>();
    const ambiguousByKey = new Map<string, AmbiguousAccumulator>();
    const unmatchedByKey = new Map<string, UnmatchedAccumulator>();
    let suggestionCellCount = 0;

    for (const cell of collectBoundedCells(pages)) {
      const exactAliases = aliasIndex.get(cell.normalizedLabel);
      if (exactAliases) {
        const allCourseIds = [
          ...new Set(
            exactAliases
              .map(({ courseId }) => courseId)
              .filter((courseId) => courseById.has(courseId)),
          ),
        ].sort(compareCourseIds);
        if (allCourseIds.length === 0) continue;

        if (allCourseIds.length === 1) {
          const courseId = allCourseIds[0]!;
          const course = courseById.get(courseId)!;
          const matchKind = chooseMatchKind(
            exactAliases.filter((alias) => alias.courseId === courseId),
          );
          const pageNumber = Math.min(...cell.pageNumbers);
          const hit = { pageNumber, offset: 0, matchKind };
          const existing = matchedByCourse.get(courseId);
          if (existing) {
            for (const value of cell.pageNumbers) {
              existing.pageNumbers.add(value);
            }
            if (
              hit.pageNumber < existing.firstHit.pageNumber ||
              (hit.pageNumber === existing.firstHit.pageNumber &&
                MATCH_KIND_ORDER[hit.matchKind] <
                  MATCH_KIND_ORDER[existing.firstHit.matchKind])
            ) {
              existing.firstHit = hit;
            }
          } else {
            matchedByCourse.set(courseId, {
              type: "matched",
              courseId,
              displayLabel: course.name,
              pageNumbers: new Set(cell.pageNumbers),
              firstHit: hit,
            });
          }
          continue;
        }

        const candidateCourseIds = allCourseIds.slice(0, 3);
        const key = `${cell.normalizedLabel}|${candidateCourseIds.join(",")}`;
        ambiguousByKey.set(key, {
          type: "ambiguous",
          key,
          displayLabel: AMBIGUOUS_DISPLAY_LABEL,
          candidateCourseIds,
          pageNumbers: new Set(cell.pageNumbers),
        });
        continue;
      }

      if (UNKNOWN_COURSE_CODE_PATTERN.test(cell.displayLabel)) {
        const displayLabel = cell.displayLabel.toUpperCase();
        unmatchedByKey.set(cell.normalizedLabel, {
          type: "unmatched",
          key: cell.normalizedLabel,
          displayLabel,
          pageNumbers: new Set(cell.pageNumbers),
        });
        continue;
      }

      if (
        !isCredibleCourseLabel(cell.displayLabel) ||
        suggestionCellCount >= PDF_COURSE_MATCHING_LIMITS.maxSuggestionCells
      ) {
        continue;
      }
      suggestionCellCount += 1;
      const candidateCourseIds = fuzzyCandidateCourseIds(
        cell.displayLabel,
        aliasIndex,
      );
      if (candidateCourseIds.length > 0) {
        const key = `${cell.normalizedLabel}|${candidateCourseIds.join(",")}`;
        const existing = ambiguousByKey.get(key);
        if (existing) {
          for (const value of cell.pageNumbers) {
            existing.pageNumbers.add(value);
          }
        } else {
          ambiguousByKey.set(key, {
            type: "ambiguous",
            key,
            displayLabel: AMBIGUOUS_DISPLAY_LABEL,
            candidateCourseIds,
            pageNumbers: new Set(cell.pageNumbers),
          });
        }
      } else {
        const existing = unmatchedByKey.get(cell.normalizedLabel);
        if (existing) {
          for (const value of cell.pageNumbers) {
            existing.pageNumbers.add(value);
          }
        } else {
          unmatchedByKey.set(cell.normalizedLabel, {
            type: "unmatched",
            key: cell.normalizedLabel,
            displayLabel: UNMATCHED_DISPLAY_LABEL,
            pageNumbers: new Set(cell.pageNumbers),
          });
        }
      }
    }

    const accumulators: CandidateAccumulator[] = [
      ...matchedByCourse.values(),
      ...ambiguousByKey.values(),
      ...unmatchedByKey.values(),
    ].sort(compareCandidates);
    const pageCounters = new Map<number, number>();
    const matched: PdfMatchedCourse[] = [];
    const ambiguous: PdfAmbiguousCourse[] = [];
    const unmatched: PdfUnmatchedCourse[] = [];

    for (const candidate of accumulators) {
      const pageNumber = firstPage(candidate);
      const position = (pageCounters.get(pageNumber) ?? 0) + 1;
      pageCounters.set(pageNumber, position);
      const sourceId = `p${pageNumber}-c${position}`;
      if (candidate.type === "matched") {
        matched.push({
          sourceId,
          courseId: candidate.courseId,
          matchKind: candidate.firstHit.matchKind,
          pageNumbers: sortedPages(candidate.pageNumbers),
          displayLabel: candidate.displayLabel,
        });
      } else if (candidate.type === "ambiguous") {
        ambiguous.push({
          sourceId,
          displayLabel: candidate.displayLabel,
          candidateCourseIds: candidate.candidateCourseIds,
          pageNumbers: sortedPages(candidate.pageNumbers),
        });
      } else {
        unmatched.push({
          sourceId,
          displayLabel: candidate.displayLabel,
          pageNumbers: sortedPages(candidate.pageNumbers),
        });
      }
    }

    return { matched, ambiguous, unmatched };
  };
}

export const buildPdfImportCandidates = createPdfCourseCandidateBuilder(
  courseAliasIndex2026,
);

function approvalTargetsBySource(
  candidates: PdfImportCandidates,
): ReadonlyMap<string, ReadonlySet<string>> {
  const targets = new Map<string, ReadonlySet<string>>();
  const blockedSources = new Set<string>();

  const register = (sourceId: unknown, courseIds: readonly unknown[]): void => {
    if (
      typeof sourceId !== "string" ||
      !SOURCE_ID_PATTERN.test(sourceId) ||
      blockedSources.has(sourceId) ||
      targets.has(sourceId)
    ) {
      if (typeof sourceId === "string") {
        targets.delete(sourceId);
        blockedSources.add(sourceId);
      }
      return;
    }
    if (
      courseIds.length === 0 ||
      courseIds.some(
        (courseId) => typeof courseId !== "string" || !courseById.has(courseId),
      )
    ) {
      blockedSources.add(sourceId);
      return;
    }
    targets.set(sourceId, new Set(courseIds as string[]));
  };

  if (Array.isArray(candidates.matched)) {
    for (const candidate of candidates.matched) {
      register(candidate?.sourceId, [candidate?.courseId]);
    }
  }
  if (Array.isArray(candidates.ambiguous)) {
    for (const candidate of candidates.ambiguous) {
      register(
        candidate?.sourceId,
        Array.isArray(candidate?.candidateCourseIds)
          ? candidate.candidateCourseIds
          : [],
      );
    }
  }
  if (Array.isArray(candidates.unmatched)) {
    for (const candidate of candidates.unmatched) {
      const sourceId = candidate?.sourceId;
      if (typeof sourceId !== "string") continue;
      targets.delete(sourceId);
      blockedSources.add(sourceId);
    }
  }
  return targets;
}

function cloneAndSortSelections(
  current: readonly CourseSelectionRecord[],
): CourseSelectionRecord[] {
  return current
    .map((selection) => ({ ...selection }))
    .sort(
      (left, right) =>
        compareCourseIds(left.courseId, right.courseId) ||
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
        (left.plannedTerm ?? "").localeCompare(right.plannedTerm ?? "", "en"),
    );
}

function conflictMessage(status: CourseSelectionStatus): string {
  const label: Record<CourseSelectionStatus, string> = {
    completed: "이수 완료",
    "in-progress": "수강 중",
    planned: "수강 예정",
  };
  return `이미 ${label[status]} 상태라 완료로 변경하지 않았어요.`;
}

export function mergeApprovedPdfMatches(
  current: readonly CourseSelectionRecord[],
  candidates: PdfImportCandidates | PdfImportDraft,
  approvals: readonly PdfImportApproval[],
): PdfMergeResult {
  const courseSelections = cloneAndSortSelections(current);
  const targetsBySource = approvalTargetsBySource(candidates);
  const submittedBySource = new Map<string, Set<string>>();
  for (const approval of approvals) {
    if (
      typeof approval !== "object" ||
      approval === null ||
      typeof approval.sourceId !== "string" ||
      typeof approval.courseId !== "string"
    ) {
      continue;
    }
    const values = submittedBySource.get(approval.sourceId) ?? new Set<string>();
    values.add(approval.courseId);
    submittedBySource.set(approval.sourceId, values);
  }

  const approved = new Set<string>();
  for (const [sourceId, submittedCourseIds] of [...submittedBySource].sort(
    ([left], [right]) => left.localeCompare(right, "en"),
  )) {
    const allowedCourseIds = targetsBySource.get(sourceId);
    if (!allowedCourseIds) continue;
    const selectedCourseIds = [...submittedCourseIds]
      .filter(
        (courseId) =>
          allowedCourseIds.has(courseId) && courseById.has(courseId),
      )
      .sort(compareCourseIds);
    if (selectedCourseIds.length !== 1) continue;
    approved.add(selectedCourseIds[0]!);
  }
  const approvedCourseIds = [...approved].sort(compareCourseIds);
  const addedCourseIds: string[] = [];
  const conflicts: PdfMergeConflict[] = [];

  for (const courseId of approvedCourseIds) {
    const existing = courseSelections.find(
      (selection) => selection.courseId === courseId,
    );
    if (existing) {
      conflicts.push({
        courseId,
        existingStatus: existing.status,
        message: conflictMessage(existing.status),
      });
      continue;
    }
    courseSelections.push({ courseId, status: "completed" });
    addedCourseIds.push(courseId);
  }

  courseSelections.sort(
    (left, right) =>
      compareCourseIds(left.courseId, right.courseId) ||
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
      (left.plannedTerm ?? "").localeCompare(right.plannedTerm ?? "", "en"),
  );
  return { courseSelections, addedCourseIds, conflicts };
}
