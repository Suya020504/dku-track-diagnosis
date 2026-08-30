import { courses } from "../data/curriculumData";
import {
  courseOfferings2026,
  getObservedSemesterNumbers,
} from "../data/courseOfferings2026";
import type {
  AcademicSemesterNumber,
  AcademicTermId,
  GraduationPlanInput,
  GraduationPlanResult,
  GraduationPlanStatus,
  PlanTerm,
  PlannedCoursePlacement,
  PlannedCourseOrigin,
  ReviewItem,
  UnplacedCourse,
} from "../types";
import { findMinimumCourseCombination } from "./courseCombination";
import { calculatePathProgress } from "./progressEngine";

const FUTURE_OFFERING_MESSAGE =
  "2026학년도 개설 이력을 참고한 계획입니다. 이후 학기의 반복 개설을 보장하지 않으며, 실제 개설·폐강·인정 여부는 해당 학기 수강신청 시스템과 학과 안내를 확인해야 합니다.";

const courseById = new Map(courses.map((course) => [course.id, course]));

export type ScheduleCourseCandidate = {
  courseId: string;
  origin: Exclude<PlannedCourseOrigin, "in-progress">;
  plannedTerm?: PlanTerm;
};

export type ElectiveTermAllocation = {
  termId: AcademicTermId;
  slots: number;
  credits: number;
};

export type ScheduleCoursesWithinLoadInput = {
  horizon: AcademicTermId[];
  maxMajorCoursesPerTerm: number;
  candidates: ScheduleCourseCandidate[];
  unallocatedElectiveCredits: number;
};

export type ScheduleCoursesWithinLoadResult = {
  placements: PlannedCoursePlacement[];
  unplacedCourses: UnplacedCourse[];
  electiveAllocations: ElectiveTermAllocation[];
  remainingElectiveCredits: number;
  remainingElectiveSlots: number;
};

function termIndex(termId: AcademicTermId): number {
  const [year, semester] = termId.split("-").map(Number);
  return year * 2 + (semester - 1);
}

function termIdFromIndex(index: number): AcademicTermId {
  const year = Math.floor(index / 2);
  const semester = (index % 2) + 1;
  return `${year}-${semester}` as AcademicTermId;
}

export function compareAcademicTerms(left: AcademicTermId, right: AcademicTermId): number {
  return termIndex(left) - termIndex(right);
}

export function buildRegularTermHorizon(
  currentTerm: AcademicTermId,
  targetTerm: AcademicTermId,
): AcademicTermId[] {
  const current = termIndex(currentTerm);
  const target = termIndex(targetTerm);
  if (target < current) {
    throw new Error("Target graduation term must not be earlier than current term");
  }
  return Array.from(
    { length: target - current },
    (_, index) => termIdFromIndex(current + index + 1),
  );
}

export function scheduleCoursesWithinLoad(
  input: ScheduleCoursesWithinLoadInput,
): ScheduleCoursesWithinLoadResult {
  const termLoads = new Map(input.horizon.map((termId) => [termId, 0]));
  const placements: PlannedCoursePlacement[] = [];
  const unplacedCourses: UnplacedCourse[] = [];
  const candidates = deduplicateCandidates(input.candidates).sort(compareScheduleCandidates);

  for (const candidate of candidates) {
    const offering = courseOfferings2026[candidate.courseId];
    if (!offering || offering.evidence === "unknown") {
      unplacedCourses.push({
        courseId: candidate.courseId,
        reason: "offering-unknown",
        message: `${candidate.courseId} 과목의 개설 학기 근거를 확인할 수 없습니다.`,
      });
      continue;
    }

    const exactIndex = candidate.origin === "user-planned"
      ? exactHorizonIndex(candidate.plannedTerm)
      : undefined;
    if (exactIndex !== undefined) {
      const exactTerm = input.horizon[exactIndex];
      if (!exactTerm) {
        unplacedCourses.push({
          courseId: candidate.courseId,
          reason: "after-target",
          message: `${candidate.courseId} 과목의 지정 학기가 계획 범위를 벗어납니다.`,
        });
        continue;
      }
      if (!isObservedInTerm(candidate.courseId, exactTerm)) {
        unplacedCourses.push({
          courseId: candidate.courseId,
          reason: "user-plan-conflict",
          message: `${candidate.courseId} 과목의 지정 학기와 확인된 개설 학기가 다릅니다.`,
        });
        continue;
      }
      if ((termLoads.get(exactTerm) ?? 0) >= input.maxMajorCoursesPerTerm) {
        unplacedCourses.push({
          courseId: candidate.courseId,
          reason: "user-plan-conflict",
          message: `${candidate.courseId} 과목의 지정 학기에 전공과목 수강 한도가 부족합니다.`,
        });
        continue;
      }
      placeCandidate(candidate, exactTerm, offering.evidence, placements, termLoads);
      continue;
    }

    const eligibleTerms = input.horizon.filter((termId) => isObservedInTerm(candidate.courseId, termId));
    const availableTerm = eligibleTerms.find(
      (termId) => (termLoads.get(termId) ?? 0) < input.maxMajorCoursesPerTerm,
    );
    if (!availableTerm) {
      unplacedCourses.push({
        courseId: candidate.courseId,
        reason: eligibleTerms.length > 0 ? "capacity-before-target" : "after-target",
        message: eligibleTerms.length > 0
          ? `${candidate.courseId} 과목을 졸업 목표 전 수강 한도 안에 배치할 수 없습니다.`
          : `${candidate.courseId} 과목의 확인된 개설 학기가 계획 범위에 없습니다.`,
      });
      continue;
    }
    placeCandidate(candidate, availableTerm, offering.evidence, placements, termLoads);
  }

  const electiveAllocations: ElectiveTermAllocation[] = [];
  let remainingElectiveCredits = input.unallocatedElectiveCredits;
  for (const termId of input.horizon) {
    if (remainingElectiveCredits <= 0) break;
    const availableSlots = Math.max(
      0,
      input.maxMajorCoursesPerTerm - (termLoads.get(termId) ?? 0),
    );
    if (availableSlots === 0) continue;
    const slots = Math.min(availableSlots, Math.ceil(remainingElectiveCredits / 3));
    const credits = Math.min(remainingElectiveCredits, slots * 3);
    electiveAllocations.push({ termId, slots, credits });
    termLoads.set(termId, (termLoads.get(termId) ?? 0) + slots);
    remainingElectiveCredits -= credits;
  }

  return {
    placements,
    unplacedCourses,
    electiveAllocations,
    remainingElectiveCredits,
    remainingElectiveSlots: Math.ceil(remainingElectiveCredits / 3),
  };
}

export function calculateGraduationPlan(input: GraduationPlanInput): GraduationPlanResult {
  const completedSelections = input.courseSelections.filter((item) => item.status === "completed");
  const completedProgress = calculatePathProgress({
    profile: input.profile,
    courseSelections: completedSelections,
    additionalMajorCredits: input.additionalMajorCredits,
    targetTrackId: input.targetTrackId,
  });
  const baseReviewItems = [...completedProgress.reviewItems];
  const inProgressPlacements = uniqueSelectionIds(
    input.courseSelections.filter((item) => item.status === "in-progress"),
  ).map((courseId): PlannedCoursePlacement => ({
    termId: input.preferences.currentTerm,
    courseId,
    origin: "in-progress",
    offeringEvidence: courseOfferings2026[courseId]?.evidence ?? "unknown",
  }));

  if (input.preferences.considerSeasonalTerm) {
    baseReviewItems.push({
      code: "seasonal-term",
      message: "계절학기는 계획 용량에 포함하지 않았습니다. 실제 개설 및 전공 인정 여부를 공식 확인해 주세요.",
      evidence: "project-derived",
    });
  }

  const completedSatisfied = progressNumericallySatisfied(completedProgress);
  const officialRuleConflict = hasOfficialRuleConflict(baseReviewItems);
  if (completedSatisfied) {
    return buildPlanResult({
      input,
      status: officialRuleConflict ? "official-review-required" : "currently-satisfied",
      inProgressPlacements,
      scheduled: emptySchedule(),
      unallocatedElectiveCredits: 0,
      reviewItems: baseReviewItems,
    });
  }

  const assumedCourseIds = uniqueSelectionIds(input.courseSelections);
  const combination = findMinimumCourseCombination({
    profile: input.profile,
    targetTrackId: input.targetTrackId,
    assumedCourseIds,
    additionalMajorCredits: input.additionalMajorCredits,
    schedulableCourseIds: new Set(
      Object.values(courseOfferings2026)
        .filter((record) => record.evidence !== "unknown")
        .map((record) => record.courseId),
    ),
  });
  const candidates: ScheduleCourseCandidate[] = [
    ...uniquePlannedSelections(input.courseSelections).map((item) => ({
      courseId: item.courseId,
      origin: "user-planned" as const,
      plannedTerm: item.plannedTerm,
    })),
    ...combination.courseIds.map((courseId) => ({
      courseId,
      origin: "generated" as const,
    })),
  ];
  const regularHorizon = buildRegularTermHorizon(
    input.preferences.currentTerm,
    input.preferences.targetGraduationTerm,
  );
  const schedule = (horizon: AcademicTermId[], maximum: number) => scheduleCoursesWithinLoad({
    horizon,
    maxMajorCoursesPerTerm: maximum,
    candidates,
    unallocatedElectiveCredits: combination.unallocatedElectiveCredits,
  });
  const succeeds = (result: ScheduleCoursesWithinLoadResult) =>
    combination.hardConditionsSatisfied
    && result.unplacedCourses.length === 0
    && result.remainingElectiveSlots === 0;

  let selectedSchedule = schedule(
    regularHorizon,
    input.preferences.maxMajorCoursesPerTerm,
  );
  let selectedStatus: GraduationPlanStatus = "official-review-required";
  let recommendedMaximum: number | undefined;

  if (succeeds(selectedSchedule)) {
    selectedStatus = "regular-plan-possible";
  } else {
    for (
      let maximum = input.preferences.maxMajorCoursesPerTerm + 1;
      maximum <= 6;
      maximum += 1
    ) {
      const adjusted = schedule(regularHorizon, maximum);
      if (!succeeds(adjusted)) continue;
      selectedSchedule = adjusted;
      selectedStatus = "load-adjustment-needed";
      recommendedMaximum = maximum;
      break;
    }
  }

  const extendedHorizon = [
    ...regularHorizon,
    termIdFromIndex(termIndex(input.preferences.targetGraduationTerm) + 1),
    termIdFromIndex(termIndex(input.preferences.targetGraduationTerm) + 2),
  ];
  if (selectedStatus === "official-review-required") {
    const extended = schedule(extendedHorizon, input.preferences.maxMajorCoursesPerTerm);
    selectedSchedule = extended;
    if (succeeds(extended)) selectedStatus = "extra-term-possible";
  }

  const reviewItems = buildPlanningReviewItems(
    baseReviewItems,
    selectedSchedule,
    combination.hardConditionsSatisfied,
    combination.unallocatedElectiveCredits,
    input.preferences.currentTerm,
  );
  if (hasOfficialRuleConflict(reviewItems)) selectedStatus = "official-review-required";

  return buildPlanResult({
    input,
    status: selectedStatus,
    inProgressPlacements,
    scheduled: selectedSchedule,
    unallocatedElectiveCredits: combination.unallocatedElectiveCredits,
    recommendedMaximum: selectedStatus === "load-adjustment-needed"
      ? recommendedMaximum
      : undefined,
    reviewItems,
  });
}

function deduplicateCandidates(candidates: ScheduleCourseCandidate[]): ScheduleCourseCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.courseId)) return false;
    seen.add(candidate.courseId);
    return true;
  });
}

function exactHorizonIndex(plannedTerm?: PlanTerm): number | undefined {
  if (plannedTerm === "next") return 0;
  if (plannedTerm === "following") return 1;
  return undefined;
}

function compareScheduleCandidates(
  left: ScheduleCourseCandidate,
  right: ScheduleCourseCandidate,
): number {
  return candidateGroup(left) - candidateGroup(right)
    || exactTermRank(left) - exactTermRank(right)
    || requiredRank(left.courseId) - requiredRank(right.courseId)
    || recommendedSemesterRank(left.courseId) - recommendedSemesterRank(right.courseId)
    || courseCode(left.courseId).localeCompare(courseCode(right.courseId));
}

function candidateGroup(candidate: ScheduleCourseCandidate): number {
  if (candidate.origin === "user-planned" && exactHorizonIndex(candidate.plannedTerm) !== undefined) {
    return 0;
  }
  return candidate.origin === "user-planned" ? 1 : 2;
}

function exactTermRank(candidate: ScheduleCourseCandidate): number {
  return exactHorizonIndex(candidate.plannedTerm) ?? 2;
}

function requiredRank(courseId: string): number {
  return courseById.get(courseId)?.required ? 0 : 1;
}

function recommendedSemesterRank(courseId: string): number {
  const semester = courseById.get(courseId)?.recommendedSemester;
  if (!semester) return 99;
  const [year, term] = semester.split("-").map(Number);
  return year * 10 + term;
}

function courseCode(courseId: string): string {
  return courseById.get(courseId)?.code ?? courseId;
}

function isObservedInTerm(courseId: string, termId: AcademicTermId): boolean {
  return getObservedSemesterNumbers(courseId).includes(termSemesterNumber(termId));
}

function termSemesterNumber(termId: AcademicTermId): AcademicSemesterNumber {
  return Number(termId.split("-")[1]) as AcademicSemesterNumber;
}

function placeCandidate(
  candidate: ScheduleCourseCandidate,
  termId: AcademicTermId,
  evidence: PlannedCoursePlacement["offeringEvidence"],
  placements: PlannedCoursePlacement[],
  termLoads: Map<AcademicTermId, number>,
): void {
  placements.push({
    termId,
    courseId: candidate.courseId,
    origin: candidate.origin,
    offeringEvidence: evidence,
  });
  termLoads.set(termId, (termLoads.get(termId) ?? 0) + 1);
}

function uniqueSelectionIds(
  selections: Array<{ courseId: string }>,
): string[] {
  return [...new Set(selections.map((item) => item.courseId))];
}

function uniquePlannedSelections(
  selections: GraduationPlanInput["courseSelections"],
): GraduationPlanInput["courseSelections"] {
  const completedOrInProgress = new Set(
    selections
      .filter((item) => item.status !== "planned")
      .map((item) => item.courseId),
  );
  const seen = new Set<string>();
  return selections.filter((item) => {
    if (item.status !== "planned") return false;
    if (completedOrInProgress.has(item.courseId) || seen.has(item.courseId)) return false;
    seen.add(item.courseId);
    return true;
  });
}

function progressNumericallySatisfied(
  progress: ReturnType<typeof calculatePathProgress>,
): boolean {
  const requiredSatisfied = progress.requiredProgress === "not-applicable"
    || progress.requiredProgress.missingCredits === 0;
  const trackSatisfied = progress.trackProgress === "not-applicable"
    || progress.trackProgress.moduleProgress.every((module) => module.missingCredits === 0);
  return requiredSatisfied && trackSatisfied && progress.totalMajorProgress.missingCredits === 0;
}

function hasOfficialRuleConflict(reviewItems: ReviewItem[]): boolean {
  return reviewItems.some(
    (item) => item.code === "document-conflict" && item.evidence === "official-review-required",
  );
}

function emptySchedule(): ScheduleCoursesWithinLoadResult {
  return {
    placements: [],
    unplacedCourses: [],
    electiveAllocations: [],
    remainingElectiveCredits: 0,
    remainingElectiveSlots: 0,
  };
}

function buildPlanningReviewItems(
  baseReviewItems: ReviewItem[],
  scheduled: ScheduleCoursesWithinLoadResult,
  hardConditionsSatisfied: boolean,
  unallocatedElectiveCredits: number,
  currentTerm: AcademicTermId,
): ReviewItem[] {
  const reviewItems = [...baseReviewItems];
  if (unallocatedElectiveCredits > 0) {
    reviewItems.push({
      code: "elective-placeholder",
      message: `과목이 정해지지 않은 선택 전공 ${unallocatedElectiveCredits}학점은 3학점 과목 기준 익명 슬롯으로만 예약했습니다.`,
      evidence: "project-derived",
    });
  }
  if (!hardConditionsSatisfied) {
    reviewItems.push({
      code: "plan-input",
      message: "현재 교육과정 자료만으로 필수 또는 트랙 조건을 충족하는 과목 조합을 확정할 수 없습니다.",
      evidence: "official-review-required",
    });
  }
  if (scheduled.unplacedCourses.some((item) => item.reason === "offering-unknown")) {
    reviewItems.push({
      code: "future-offering",
      message: "개설 학기 근거가 없는 과목은 배치하지 않았습니다. 실제 개설 여부를 공식 확인해 주세요.",
      evidence: "official-review-required",
    });
  }
  if (scheduled.unplacedCourses.some((item) => item.reason !== "offering-unknown")) {
    reviewItems.push({
      code: "plan-input",
      message: "사용자 지정 학기 또는 목표 학기 안의 수강 한도와 충돌하는 과목이 있습니다.",
      evidence: "official-review-required",
    });
  }
  if (scheduled.remainingElectiveSlots > 0) {
    reviewItems.push({
      code: "plan-input",
      message: "목표 학기와 추가 두 학기 안에도 익명 선택 전공 슬롯을 모두 배치할 수 없습니다.",
      evidence: "official-review-required",
    });
  }
  if (scheduled.placements.some(
    (item) => compareAcademicTerms(item.termId, currentTerm) > 0
      && item.offeringEvidence === "historical-2026-snapshot",
  )) {
    reviewItems.push({
      code: "future-offering",
      message: FUTURE_OFFERING_MESSAGE,
      evidence: "project-derived",
    });
  }
  return deduplicateReviewItems(reviewItems);
}

function deduplicateReviewItems(reviewItems: ReviewItem[]): ReviewItem[] {
  const seen = new Set<string>();
  return reviewItems.filter((item) => {
    const key = `${item.code}|${item.message}|${item.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type BuildPlanResultInput = {
  input: GraduationPlanInput;
  status: GraduationPlanStatus;
  inProgressPlacements: PlannedCoursePlacement[];
  scheduled: ScheduleCoursesWithinLoadResult;
  unallocatedElectiveCredits: number;
  recommendedMaximum?: number;
  reviewItems: ReviewItem[];
};

function buildPlanResult(context: BuildPlanResultInput): GraduationPlanResult {
  const allPlacements = [
    ...context.inProgressPlacements,
    ...context.scheduled.placements,
  ].sort(comparePlacements);
  const placements = allPlacements.filter(
    (item) => compareAcademicTerms(item.termId, context.input.preferences.targetGraduationTerm) <= 0,
  );
  const extraTermPlacements = allPlacements.filter(
    (item) => compareAcademicTerms(item.termId, context.input.preferences.targetGraduationTerm) > 0,
  );
  const neededExtraTerms = context.status === "extra-term-possible"
    ? calculateNeededExtraTerms(
      context.input.preferences.targetGraduationTerm,
      extraTermPlacements,
      context.scheduled.electiveAllocations,
    )
    : 0;

  return {
    status: context.status,
    preferences: context.input.preferences,
    placements,
    extraTermPlacements,
    unplacedCourses: context.scheduled.unplacedCourses,
    unallocatedElectiveCredits: context.unallocatedElectiveCredits,
    unallocatedElectiveSlots: Math.ceil(context.unallocatedElectiveCredits / 3),
    recommendedMaxMajorCoursesPerTerm: context.recommendedMaximum,
    neededExtraTerms,
    reviewItems: deduplicateReviewItems(context.reviewItems),
    generatedAt: context.input.generatedAt,
  };
}

function comparePlacements(
  left: PlannedCoursePlacement,
  right: PlannedCoursePlacement,
): number {
  return compareAcademicTerms(left.termId, right.termId)
    || courseCode(left.courseId).localeCompare(courseCode(right.courseId));
}

function calculateNeededExtraTerms(
  targetTerm: AcademicTermId,
  extraTermPlacements: PlannedCoursePlacement[],
  electiveAllocations: ElectiveTermAllocation[],
): number {
  const usedTerms = [
    ...extraTermPlacements.map((item) => item.termId),
    ...electiveAllocations
      .filter((item) => compareAcademicTerms(item.termId, targetTerm) > 0)
      .map((item) => item.termId),
  ];
  if (usedTerms.length === 0) return 0;
  return Math.max(...usedTerms.map((termId) => compareAcademicTerms(termId, targetTerm)));
}
