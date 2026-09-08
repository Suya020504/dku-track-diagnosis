import { courses, tracks } from "../data/curriculumData";
import { courseOfferings2026, getObservedSemesterNumbers } from "../data/courseOfferings2026";
import type { AcademicTermId, CourseSelectionRecord, GraduationPlanPreferences, TrackId } from "../types";
import { buildRegularTermHorizon, compareAcademicTerms } from "./graduationPlanner";
import { calculateTrackCompletion } from "./trackCompletion";

const courseById = new Map(courses.map((course) => [course.id, course]));
const SIGNATURE_PREFIX = "track-modules:2026:v1:";

export const MAX_TRACK_PLANNING_FUTURE_TERMS = 12;

export type TrackSemesterPlanInput = {
  selectedTrackIds: readonly TrackId[];
  courseSelections: readonly CourseSelectionRecord[];
  preferences: GraduationPlanPreferences;
  manualTerms?: Readonly<Record<string, string>>;
  generatedAt: string;
};

export type TrackSemesterPlanPlacement = {
  courseId: string;
  term: AcademicTermId;
  trackIds: TrackId[];
  source: "in-progress" | "planned" | "suggested";
  requiresOfferingCheck: boolean;
};

export type TrackSemesterPlanUnplacedReason =
  | "offering-unknown" | "outside-plan-range" | "capacity-exceeded"
  | "planned-term-conflict" | "in-progress-term-conflict";

export type TrackSemesterPlan = {
  version: 1;
  scope: "track-modules";
  selectedTrackIds: TrackId[];
  preferences: GraduationPlanPreferences;
  generatedAt: string;
  inputSignature: string;
  courseIds: string[];
  placements: TrackSemesterPlanPlacement[];
  unplaced: Array<{ courseId: string; reason: TrackSemesterPlanUnplacedReason; message: string }>;
  notes: string[];
};

/** A deterministic stale-result key, not a cryptographic authenticity guarantee. */
export function buildTrackPlanInputSignature(input: TrackSemesterPlanInput): string {
  return SIGNATURE_PREFIX + JSON.stringify({
    selectedTrackIds: tracks.filter((track) => input.selectedTrackIds.includes(track.id)).map((track) => track.id),
    courseSelections: normalizedSelections(input.courseSelections),
    preferences: {
      currentTerm: input.preferences.currentTerm,
      targetGraduationTerm: input.preferences.targetGraduationTerm,
      maxMajorCoursesPerTerm: input.preferences.maxMajorCoursesPerTerm,
      considerSeasonalTerm: input.preferences.considerSeasonalTerm,
    },
    manualTerms: Object.fromEntries(Object.entries(input.manualTerms ?? {}).sort(([left], [right]) => compareText(left, right))),
  });
}

export function buildTrackSemesterPlan(input: TrackSemesterPlanInput): TrackSemesterPlan {
  validatePreferences(input.preferences);
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new RangeError("계획 생성 시각을 확인해 주세요.");
  const selections = normalizedSelections(input.courseSelections);
  // Preserve related active/planned choices, then fill only the remaining module
  // gap under the assumption those choices will pass. Unplaced choices remain
  // visible below; their assumed completion is not an actual completion claim.
  const completion = calculateTrackCompletion({
    selectedTrackIds: input.selectedTrackIds,
    courseSelections: selections.map((selection) => ({ courseId: selection.courseId, status: "completed" })),
  }).completed;
  const selectedTrackIds = completion.trackResults.map((track) => track.trackId);
  const coverage = new Map<string, TrackId[]>();
  for (const result of completion.trackResults) {
    const ids = new Set(result.moduleProgress.flatMap((progress) => progress.courseIds));
    for (const id of ids) coverage.set(id, [...(coverage.get(id) ?? []), result.trackId]);
  }
  const active = selections.filter((selection) => selection.status !== "completed" && coverage.has(selection.courseId));
  const activeById = new Map(active.map((selection) => [selection.courseId, selection]));
  const courseIds = [...new Set([...active.map((selection) => selection.courseId), ...completion.unionRemainingCourseIds])].sort(compareText);
  const horizon = buildRegularTermHorizon(input.preferences.currentTerm, input.preferences.targetGraduationTerm);
  const allTerms = [input.preferences.currentTerm, ...horizon];
  const capacity = input.preferences.maxMajorCoursesPerTerm;
  const loads = new Map(allTerms.map((term) => [term, 0]));
  const placements: TrackSemesterPlanPlacement[] = [];
  const unplaced: TrackSemesterPlan["unplaced"] = [];
  const candidates = courseIds.map((courseId): Candidate => ({
    courseId,
    source: activeById.get(courseId)?.status as "in-progress" | "planned" | undefined ?? "suggested",
    plannedTerm: activeById.get(courseId)?.plannedTerm,
  })).sort((left, right) => candidatePriority(left, input.manualTerms) - candidatePriority(right, input.manualTerms)
    || compareText(left.courseId, right.courseId));

  const makePlacement = (candidate: Candidate, term: AcademicTermId): TrackSemesterPlanPlacement => ({
    courseId: candidate.courseId, term, trackIds: [...(coverage.get(candidate.courseId) ?? [])],
    source: candidate.source,
    // The snapshot is historical even when its semester pattern matches.
    requiresOfferingCheck: true,
  });
  const markUnplaced = (candidate: Candidate, reason: TrackSemesterPlanUnplacedReason): void => {
    const name = courseById.get(candidate.courseId)?.name ?? candidate.courseId;
    unplaced.push({ courseId: candidate.courseId, reason, message: `${name}: ${reasonMessage[reason]}` });
  };
  const placeFixed = (candidate: Candidate, term: AcademicTermId): void => {
    if ((loads.get(term) ?? 0) >= capacity) return markUnplaced(candidate, "capacity-exceeded");
    placements.push(makePlacement(candidate, term));
    loads.set(term, (loads.get(term) ?? 0) + 1);
  };
  const automatic: Array<{ candidate: Candidate; eligible: AcademicTermId[] }> = [];
  for (const candidate of candidates) {
    const hasManualTerm = Object.prototype.hasOwnProperty.call(input.manualTerms ?? {}, candidate.courseId);
    const manual = input.manualTerms?.[candidate.courseId];
    if (hasManualTerm) {
      if (!isAcademicTerm(manual) || !allTerms.includes(manual)) {
        markUnplaced(candidate, "outside-plan-range");
      } else if (candidate.source === "in-progress" && manual !== input.preferences.currentTerm) {
        markUnplaced(candidate, "in-progress-term-conflict");
      } else placeFixed(candidate, manual);
      continue;
    }
    const record = courseOfferings2026[candidate.courseId];
    if (!record || record.evidence === "unknown" || record.observedProgramSemesters.length === 0) {
      markUnplaced(candidate, "offering-unknown");
      continue;
    }
    if (candidate.source === "in-progress") {
      placeFixed(candidate, input.preferences.currentTerm);
      continue;
    }
    const exactIndex = candidate.plannedTerm === "next" ? 0 : candidate.plannedTerm === "following" ? 1 : undefined;
    if (exactIndex !== undefined) {
      const term = horizon[exactIndex];
      if (!term) markUnplaced(candidate, "outside-plan-range");
      else if (!matchesPattern(candidate.courseId, term)) markUnplaced(candidate, "planned-term-conflict");
      else placeFixed(candidate, term);
      continue;
    }
    const eligible = horizon.filter((term) => matchesPattern(candidate.courseId, term));
    if (eligible.length === 0) markUnplaced(candidate, "outside-plan-range");
    else automatic.push({ candidate, eligible });
  }

  // Fixed choices are immovable. For the remainder use deterministic augmenting
  // paths across available term slots, so flexible courses cannot unnecessarily
  // crowd out a course offered in only one semester pattern.
  const slots = horizon.flatMap((term) => Array.from({ length: Math.max(0, capacity - (loads.get(term) ?? 0)) }, () => term));
  automatic.sort((left, right) => left.eligible.length - right.eligible.length
    || candidatePriority(left.candidate) - candidatePriority(right.candidate)
    || compareText(left.candidate.courseId, right.candidate.courseId));
  const owner = new Map<number, number>();
  function assign(candidateIndex: number, visited: Set<number>): boolean {
    for (let slot = 0; slot < slots.length; slot += 1) {
      if (visited.has(slot) || !automatic[candidateIndex].eligible.includes(slots[slot])) continue;
      visited.add(slot);
      const previous = owner.get(slot);
      if (previous === undefined || assign(previous, visited)) {
        owner.set(slot, candidateIndex);
        return true;
      }
    }
    return false;
  }
  for (let index = 0; index < automatic.length; index += 1) {
    if (!assign(index, new Set())) markUnplaced(automatic[index].candidate, "capacity-exceeded");
  }
  for (const [slot, candidateIndex] of owner) placements.push(makePlacement(automatic[candidateIndex].candidate, slots[slot]));
  placements.sort((left, right) => compareAcademicTerms(left.term, right.term) || compareText(left.courseId, right.courseId));
  unplaced.sort((left, right) => compareText(left.courseId, right.courseId));
  const notes = [
    "선택 트랙의 모듈 학점 조건을 위한 공동 수강 계획입니다. 모듈 내 필수, 학번별 전공필수, 전체 전공학점 및 졸업 판정은 별도입니다.",
    "2026학년도 개설 이력을 참고했습니다. 같은 학기의 반복 개설·정원·선수 과목·시간표는 보장하지 않으며 실제 수강신청 전 확인이 필요합니다.",
    "수강 중·수강 예정 과목을 통과한다고 가정해 남은 과목을 계산했습니다. 미배치 과목이 있다면 이 계획만으로 모듈 조건 충족을 예상할 수 없습니다.",
  ];
  if (input.preferences.considerSeasonalTerm) notes.push("계절학기는 계획 용량에 포함하지 않았습니다. 개설·전공 인정 여부를 별도로 확인해 주세요.");
  if (Object.keys(input.manualTerms ?? {}).length > 0) notes.push("직접 지정한 학기는 과거 개설 이력과 달라도 계획에 둘 수 있습니다. 실제 개설 확인 전 수강 가능으로 해석하지 마세요.");
  const unknownCount = selections.filter((selection) => !courseById.has(selection.courseId)).length;
  if (unknownCount > 0) notes.push(`교육과정에 없는 ${unknownCount}개 과목은 계획과 학점 계산에서 제외했습니다.`);
  if (selectedTrackIds.length === 0) notes.push("계획할 트랙이 선택되지 않았습니다.");
  return { version: 1, scope: "track-modules", selectedTrackIds, preferences: { ...input.preferences },
    generatedAt: input.generatedAt, inputSignature: buildTrackPlanInputSignature(input), courseIds, placements, unplaced, notes };
}

/**
 * Validates stored data by reproducing its canonical signed inputs. This checks
 * coverage, counts, ranges and placement/unplaced partitions as well as shape.
 * It does not establish freshness against the user's current state: compare
 * inputSignature with buildTrackPlanInputSignature(currentInput) separately.
 */
export function isTrackSemesterPlan(value: unknown): value is TrackSemesterPlan {
  try {
    if (!isRecord(value) || value.version !== 1 || value.scope !== "track-modules"
      || typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt))
      || typeof value.inputSignature !== "string" || value.inputSignature.length > 64_000
      || !value.inputSignature.startsWith(SIGNATURE_PREFIX)) return false;
    const payload: unknown = JSON.parse(value.inputSignature.slice(SIGNATURE_PREFIX.length));
    if (!isRecord(payload) || !Array.isArray(payload.selectedTrackIds)
      || !payload.selectedTrackIds.every((id) => tracks.some((track) => track.id === id))
      || !Array.isArray(payload.courseSelections) || payload.courseSelections.length > 1_000
      || !payload.courseSelections.every(isSelection) || !isRecord(payload.preferences)
      || !isRecord(payload.manualTerms)
      || !Object.entries(payload.manualTerms).every(([id, term]) => id.length <= 128 && typeof term === "string" && term.length <= 32)) return false;
    validatePreferences(payload.preferences as unknown as GraduationPlanPreferences);
    const input: TrackSemesterPlanInput = {
      selectedTrackIds: payload.selectedTrackIds as TrackId[],
      courseSelections: payload.courseSelections,
      preferences: payload.preferences as unknown as GraduationPlanPreferences,
      manualTerms: payload.manualTerms as Record<string, string>, generatedAt: value.generatedAt,
    };
    if (buildTrackPlanInputSignature(input) !== value.inputSignature) return false;
    const expected = buildTrackSemesterPlan(input);
    if (!Array.isArray(value.placements) || value.placements.length > courses.length
      || !value.placements.every(isRecord) || !Array.isArray(value.unplaced)
      || value.unplaced.length > courses.length || !value.unplaced.every(isRecord)) return false;
    // Key order is not a validity condition. Explicitly project persisted fields
    // so valid JSON objects with reordered property keys still compare equally.
    const canonical = {
      version: value.version, scope: value.scope, selectedTrackIds: value.selectedTrackIds,
      preferences: isRecord(value.preferences) ? {
        currentTerm: value.preferences.currentTerm, targetGraduationTerm: value.preferences.targetGraduationTerm,
        maxMajorCoursesPerTerm: value.preferences.maxMajorCoursesPerTerm,
        considerSeasonalTerm: value.preferences.considerSeasonalTerm,
      } : null,
      generatedAt: value.generatedAt, inputSignature: value.inputSignature, courseIds: value.courseIds,
      placements: value.placements.map((item) => ({ courseId: item.courseId, term: item.term,
        trackIds: item.trackIds, source: item.source, requiresOfferingCheck: item.requiresOfferingCheck })),
      unplaced: value.unplaced.map((item) => ({ courseId: item.courseId, reason: item.reason, message: item.message })),
      notes: value.notes,
    };
    return JSON.stringify(expected) === JSON.stringify(canonical);
  } catch {
    return false;
  }
}

type Candidate = { courseId: string; source: TrackSemesterPlanPlacement["source"]; plannedTerm?: CourseSelectionRecord["plannedTerm"] };

const reasonMessage: Record<TrackSemesterPlanUnplacedReason, string> = {
  "offering-unknown": "개설 학기 근거가 없어 자동 배치하지 않았습니다.",
  "outside-plan-range": "지정 또는 개설 예상 학기가 현재 계획 기간에 없습니다.",
  "capacity-exceeded": "계획 기간의 학기별 최대 수강 과목 수를 초과합니다.",
  "planned-term-conflict": "지정한 수강 예정 학기와 과거 개설 학기가 다릅니다.",
  "in-progress-term-conflict": "수강 중 과목은 현재 학기에만 둘 수 있습니다. 상태를 먼저 확인해 주세요.",
};

function normalizedSelections(selections: readonly CourseSelectionRecord[]): CourseSelectionRecord[] {
  const rank = { completed: 3, "in-progress": 2, planned: 1 };
  const terms = { next: 0, following: 1, later: 2 };
  const unique = new Map<string, CourseSelectionRecord>();
  for (const selection of selections) {
    if (!rank[selection.status]) continue;
    const previous = unique.get(selection.courseId);
    if (!previous || rank[selection.status] > rank[previous.status]
      || (selection.status === "planned" && previous.status === "planned"
        && (terms[selection.plannedTerm ?? "later"] ?? 3) < (terms[previous.plannedTerm ?? "later"] ?? 3))) {
      unique.set(selection.courseId, {
        courseId: selection.courseId, status: selection.status,
        ...(selection.status === "planned" ? { plannedTerm: selection.plannedTerm ?? "later" } : {}),
      });
    }
  }
  return [...unique.values()].sort((left, right) => compareText(left.courseId, right.courseId));
}

function validatePreferences(preferences: GraduationPlanPreferences): void {
  if (!isAcademicTerm(preferences.currentTerm) || !isAcademicTerm(preferences.targetGraduationTerm)) {
    throw new RangeError("현재 학기와 목표 학기는 2026-1과 같은 형식으로 입력해 주세요.");
  }
  const distance = compareAcademicTerms(preferences.targetGraduationTerm, preferences.currentTerm);
  if (distance < 0 || distance > MAX_TRACK_PLANNING_FUTURE_TERMS) {
    throw new RangeError("목표 학기는 현재 학기부터 이후 12개 정규학기 안에서 선택해 주세요.");
  }
  if (!Number.isInteger(preferences.maxMajorCoursesPerTerm)
    || preferences.maxMajorCoursesPerTerm < 1 || preferences.maxMajorCoursesPerTerm > 6
    || typeof preferences.considerSeasonalTerm !== "boolean") {
    throw new RangeError("학기별 최대 과목 수는 1~6개로 입력하고 계절학기 고려 여부를 확인해 주세요.");
  }
}

function candidatePriority(candidate: Candidate, manualTerms?: Readonly<Record<string, string>>): number {
  if (candidate.source === "in-progress") return 0;
  if (Object.prototype.hasOwnProperty.call(manualTerms ?? {}, candidate.courseId)) return 1;
  if (candidate.source === "planned" && (candidate.plannedTerm === "next" || candidate.plannedTerm === "following")) return 2;
  return candidate.source === "planned" ? 3 : 4;
}

function matchesPattern(courseId: string, term: AcademicTermId): boolean {
  return getObservedSemesterNumbers(courseId).some((semester) => semester === Number(term.split("-")[1]));
}

function isAcademicTerm(value: unknown): value is AcademicTermId {
  return typeof value === "string" && /^\d{4}-[12]$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSelection(value: unknown): value is CourseSelectionRecord {
  return isRecord(value) && typeof value.courseId === "string" && value.courseId.length <= 128
    && (value.status === "completed" || value.status === "in-progress" || value.status === "planned")
    && (value.plannedTerm === undefined || value.plannedTerm === "next" || value.plannedTerm === "following" || value.plannedTerm === "later");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
