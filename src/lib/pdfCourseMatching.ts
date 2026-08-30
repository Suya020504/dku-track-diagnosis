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
const INTERNAL_CODE_PATTERN = /^[a-o][1-9]\d?$/i;
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

type ExactOccurrence = {
  normalizedAlias: string;
  aliases: readonly CourseAlias[];
  start: number;
  end: number;
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

function isStartBoundary(value: string, index: number): boolean {
  return index <= 0 || /\s/u.test(value[index - 1] ?? "");
}

function isEndBoundary(value: string, index: number): boolean {
  return index >= value.length || /\s/u.test(value[index] ?? "");
}

function findExactOccurrences(
  normalizedLine: string,
  aliasIndex: CourseAliasIndex,
): ExactOccurrence[] {
  const occurrences: ExactOccurrence[] = [];
  for (const [normalizedAlias, aliases] of aliasIndex) {
    let start = normalizedLine.indexOf(normalizedAlias);
    while (start >= 0) {
      const end = start + normalizedAlias.length;
      if (
        isStartBoundary(normalizedLine, start) &&
        isEndBoundary(normalizedLine, end)
      ) {
        occurrences.push({ normalizedAlias, aliases, start, end });
      }
      start = normalizedLine.indexOf(normalizedAlias, start + 1);
    }
  }

  const selected: ExactOccurrence[] = [];
  for (const occurrence of occurrences.sort(
    (left, right) =>
      left.start - right.start ||
      right.normalizedAlias.length - left.normalizedAlias.length ||
      left.normalizedAlias.localeCompare(right.normalizedAlias, "ko"),
  )) {
    if (
      selected.some(
        (existing) =>
          occurrence.start < existing.end && occurrence.end > existing.start,
      )
    ) {
      continue;
    }
    selected.push(occurrence);
  }
  return selected;
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
    HEADER_PATTERN.test(normalized) ||
    HEADER_PHRASE_PATTERN.test(normalized)
  ) {
    return false;
  }
  return (
    INTERNAL_CODE_PATTERN.test(normalized) ||
    DOMAIN_TOKENS.some((token) => normalized.includes(token))
  );
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

    for (const page of [...pages].sort(
      (left, right) => left.pageNumber - right.pageNumber,
    )) {
      for (const rawLine of page.text.split(/\r\n?|\n|\u2028|\u2029/gu)) {
        const displayLabel = sanitizeDisplayLabel(rawLine);
        if (!displayLabel) continue;
        const normalizedLine = normalizeCourseAlias(displayLabel);
        const exactOccurrences = findExactOccurrences(
          normalizedLine,
          aliasIndex,
        );

        if (exactOccurrences.length > 0) {
          for (const occurrence of exactOccurrences) {
            const courseIds = [
              ...new Set(occurrence.aliases.map(({ courseId }) => courseId)),
            ].sort(compareCourseIds);
            if (courseIds.length === 1) {
              const courseId = courseIds[0]!;
              const course = courseById.get(courseId);
              if (!course) continue;
              const matchingAliases = occurrence.aliases.filter(
                (alias) => alias.courseId === courseId,
              );
              const matchKind = chooseMatchKind(matchingAliases);
              const existing = matchedByCourse.get(courseId);
              const hit = {
                pageNumber: page.pageNumber,
                offset: occurrence.start,
                matchKind,
              };
              if (existing) {
                existing.pageNumbers.add(page.pageNumber);
                const earlier =
                  hit.pageNumber < existing.firstHit.pageNumber ||
                  (hit.pageNumber === existing.firstHit.pageNumber &&
                    (hit.offset < existing.firstHit.offset ||
                      (hit.offset === existing.firstHit.offset &&
                        MATCH_KIND_ORDER[hit.matchKind] <
                          MATCH_KIND_ORDER[existing.firstHit.matchKind])));
                if (earlier) existing.firstHit = hit;
              } else {
                matchedByCourse.set(courseId, {
                  type: "matched",
                  courseId,
                  displayLabel: course.name,
                  pageNumbers: new Set([page.pageNumber]),
                  firstHit: hit,
                });
              }
              continue;
            }

            const key = `${occurrence.normalizedAlias}|${courseIds.join(",")}`;
            const existing = ambiguousByKey.get(key);
            if (existing) {
              existing.pageNumbers.add(page.pageNumber);
            } else {
              ambiguousByKey.set(key, {
                type: "ambiguous",
                key,
                displayLabel: occurrence.normalizedAlias,
                candidateCourseIds: courseIds,
                pageNumbers: new Set([page.pageNumber]),
              });
            }
          }
          continue;
        }

        if (!isCredibleCourseLabel(displayLabel)) continue;
        const candidateCourseIds = fuzzyCandidateCourseIds(
          displayLabel,
          aliasIndex,
        );
        if (candidateCourseIds.length > 0) {
          const key = `${normalizedLine}|${candidateCourseIds.join(",")}`;
          const existing = ambiguousByKey.get(key);
          if (existing) {
            existing.pageNumbers.add(page.pageNumber);
          } else {
            ambiguousByKey.set(key, {
              type: "ambiguous",
              key,
              displayLabel,
              candidateCourseIds,
              pageNumbers: new Set([page.pageNumber]),
            });
          }
        } else {
          const existing = unmatchedByKey.get(normalizedLine);
          if (existing) {
            existing.pageNumbers.add(page.pageNumber);
            if (displayLabel.localeCompare(existing.displayLabel, "ko") < 0) {
              existing.displayLabel = displayLabel;
            }
          } else {
            unmatchedByKey.set(normalizedLine, {
              type: "unmatched",
              key: normalizedLine,
              displayLabel,
              pageNumbers: new Set([page.pageNumber]),
            });
          }
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
  const approvedCourseIds = [
    ...new Set(
      approvals
        .filter(
          (approval): approval is PdfImportApproval => {
            if (
              typeof approval !== "object" ||
              approval === null ||
              typeof approval.sourceId !== "string" ||
              typeof approval.courseId !== "string"
            ) {
              return false;
            }
            const allowedCourseIds = targetsBySource.get(approval.sourceId);
            return (
              allowedCourseIds?.has(approval.courseId) === true &&
              courseById.has(approval.courseId)
            );
          },
        )
        .map(({ courseId }) => courseId),
    ),
  ].sort(compareCourseIds);
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
