import { courses, CURRICULUM_YEAR, STORAGE_KEY, tracks } from "../data/curriculumData";
import { getInterestSurveyQuestions } from "../data/interestSurveyQuestions";
import { getAllowedStudyPaths } from "../data/requirementRules2026";
import type {
  AcademicTermId,
  DiagnosisSnapshot,
  EnrollmentType,
  GraduationPlanPreferences,
  InterestSurveyAudience,
  PlanTerm,
  PlannedCoursePlacement,
  SavedAppStateV2,
  SavedDiagnosisState,
  StudentProfile,
  TrackId,
} from "../types";

const trackIds = new Set(tracks.map((track) => track.id));
const courseIds = new Set(courses.map((course) => course.id));
const legacyInterestQuestionIds = new Set([
  "consumer-choice",
  "brand-strategy",
  "regional-problem",
  "sustainable-community",
  "distribution-flow",
  "supply-chain",
  "economic-data",
  "policy-evidence",
  "food-science",
  "future-food",
]);
const enrollmentTypes = new Set<EnrollmentType>(["primary", "double-major", "minor"]);
const planTerms = new Set<PlanTerm>(["next", "following", "later"]);
const planningSemesters = new Set(["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"]);
const studentAffiliations = new Set(["department-student", "external-student"]);
const serviceGoals = new Set(["learn-track-system", "find-track", "check-progress", "plan-graduation"]);
const studyPaths = new Set([
  "advanced-major",
  "track-major",
  "department-with-other-major",
  "double-major",
  "minor",
]);
const ruleApplicabilities = new Set(["student-confirmed", "officially-verified", "reference-only"]);
const courseSelectionStatuses = new Set(["completed", "in-progress", "planned"]);
const additionalCreditStatuses = new Set(["student-entered", "officially-verified"]);
const pathProgressStatuses = new Set([
  "current-input-satisfied",
  "reference-calculation-satisfied",
  "incomplete",
  "official-review-required",
]);
const reviewCodes = new Set([
  "rule-source",
  "unknown-course",
  "additional-credit",
  "document-conflict",
  "future-offering",
  "seasonal-term",
  "plan-input",
  "elective-placeholder",
]);
const evidenceStatuses = new Set([
  "official-public",
  "provided-final-plan",
  "project-derived",
  "official-review-required",
]);
const trackKinds = new Set(["학과전공", "융합전공"]);
const moduleIds = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"]);
const graduationPlanStatuses = new Set([
  "currently-satisfied",
  "regular-plan-possible",
  "load-adjustment-needed",
  "extra-term-possible",
  "official-review-required",
]);
const plannedCourseOrigins = new Set(["in-progress", "user-planned", "generated"]);
const courseOfferingEvidence = new Set(["historical-2026-snapshot", "unknown"]);
const unplacedCourseReasons = new Set([
  "offering-unknown",
  "user-plan-conflict",
  "capacity-before-target",
  "after-target",
]);
const recommendationAssumptions = new Set(["current-path", "track-major-hypothesis"]);

export const STORAGE_KEY_V2 = "track-sim:v2";
export const STORAGE_LAST_VALID_KEY_V2 = "track-sim:v2:last-valid";

export function createEmptyAppState(): SavedAppStateV2 {
  return {
    version: 2,
    profile: undefined,
    profileDraft: undefined,
    courseSelections: [],
    additionalMajorCredits: [],
    courseInputReviewedAt: undefined,
    targetTrackId: undefined,
    comparisonTrackIds: [],
    snapshots: [],
  };
}

export function normalizeSnapshotHistory(items: DiagnosisSnapshot[]): DiagnosisSnapshot[] {
  return items.slice(-12);
}

export function appendDiagnosisSnapshot(
  state: SavedAppStateV2,
  snapshot: DiagnosisSnapshot,
): SavedAppStateV2 {
  return {
    ...state,
    snapshots: normalizeSnapshotHistory([...state.snapshots, snapshot]),
  };
}

export function migrateV1State(value: unknown): SavedAppStateV2 {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (source.curriculumYear !== CURRICULUM_YEAR) return createEmptyAppState();
  const completed = Array.isArray(source.completedCourseIds)
    ? [...new Set(source.completedCourseIds.filter((item): item is string => typeof item === "string" && courseIds.has(item)))]
    : [];
  const sourceTracks = Array.isArray(source.trackIds)
    ? source.trackIds
    : typeof source.trackId === "string"
      ? [source.trackId]
      : [];
  const legacyTracks = sourceTracks.filter(
    (item): item is TrackId => typeof item === "string" && trackIds.has(item as TrackId),
  );
  const uniqueTracks = [...new Set(legacyTracks)];
  const planned = source.plannedCourseTerms && typeof source.plannedCourseTerms === "object"
    ? Object.entries(source.plannedCourseTerms as Record<string, unknown>).filter(
        (entry): entry is [string, PlanTerm] =>
          courseIds.has(entry[0]) && planTerms.has(String(entry[1]) as PlanTerm) && !completed.includes(entry[0]),
      )
    : [];
  const profile = profileForEnrollmentType(
    enrollmentTypes.has(source.enrollmentType as EnrollmentType) ? source.enrollmentType : "primary",
  );

  return {
    version: 2,
    profile,
    profileDraft: undefined,
    courseSelections: [
      ...completed.map((courseId) => ({ courseId, status: "completed" as const })),
      ...planned.map(([courseId, plannedTerm]) => ({
        courseId,
        status: "planned" as const,
        plannedTerm,
      })),
    ],
    additionalMajorCredits: [],
    courseInputReviewedAt: undefined,
    targetTrackId: uniqueTracks[0],
    comparisonTrackIds: uniqueTracks.slice(1),
    snapshots: [],
  };
}

function profileForEnrollmentType(value: unknown): StudentProfile | undefined {
  const base = {
    goal: "check-progress" as const,
    curriculumRuleVersion: "2026-provided-final-plan" as const,
    ruleApplicability: "reference-only" as const,
  };
  if (value === "primary") {
    return { ...base, affiliation: "department-student", studyPath: "track-major" };
  }
  if (value === "double-major") {
    return { ...base, affiliation: "external-student", studyPath: "double-major" };
  }
  if (value === "minor") {
    return { ...base, affiliation: "external-student", studyPath: "minor" };
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTrackId(value: unknown): value is TrackId {
  return typeof value === "string" && trackIds.has(value as TrackId);
}

function isPlanningSemester(value: unknown): boolean {
  return typeof value === "string" && planningSemesters.has(value);
}

function isAcademicTermId(value: unknown): value is AcademicTermId {
  return typeof value === "string" && /^\d{4}-(1|2)$/.test(value);
}

function academicTermIndex(value: AcademicTermId): number {
  const [year, semester] = value.split("-").map(Number);
  return year * 2 + semester - 1;
}

function isInterestSurvey(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.answers)) return false;
  const audience = value.audience;
  if (audience !== undefined && !studentAffiliations.has(String(audience))) return false;
  const questionIds = audience === undefined
    ? legacyInterestQuestionIds
    : new Set(getInterestSurveyQuestions(audience as InterestSurveyAudience).map((question) => question.id));
  if (
    !Number.isInteger(value.currentIndex) ||
    Number(value.currentIndex) < 0 ||
    Number(value.currentIndex) > questionIds.size
  ) {
    return false;
  }
  if (
    value.completedAt !== undefined && typeof value.completedAt !== "string" ||
    value.selectedTrackId !== undefined && !isTrackId(value.selectedTrackId)
  ) {
    return false;
  }
  return Object.entries(value.answers).every(([questionId, answer]) =>
    questionIds.has(questionId) &&
    Number.isInteger(answer) &&
    Number(answer) >= 1 &&
    Number(answer) <= 5,
  );
}

function isGraduationPlanPreferences(value: unknown): value is GraduationPlanPreferences {
  if (!isRecord(value)) return false;
  if (
    !isAcademicTermId(value.currentTerm) ||
    !isAcademicTermId(value.targetGraduationTerm) ||
    !Number.isInteger(value.maxMajorCoursesPerTerm) ||
    Number(value.maxMajorCoursesPerTerm) < 1 ||
    Number(value.maxMajorCoursesPerTerm) > 6 ||
    typeof value.considerSeasonalTerm !== "boolean"
  ) {
    return false;
  }
  return academicTermIndex(value.targetGraduationTerm) >= academicTermIndex(value.currentTerm);
}

function hasMatchingPreferences(
  left: GraduationPlanPreferences,
  right: GraduationPlanPreferences,
): boolean {
  return left.currentTerm === right.currentTerm &&
    left.targetGraduationTerm === right.targetGraduationTerm &&
    left.maxMajorCoursesPerTerm === right.maxMajorCoursesPerTerm &&
    left.considerSeasonalTerm === right.considerSeasonalTerm;
}

function isStudentProfile(value: unknown): value is StudentProfile {
  if (!isRecord(value)) return false;
  if (
    !serviceGoals.has(value.goal as string) ||
    !studentAffiliations.has(value.affiliation as string) ||
    !getAllowedStudyPaths(value.affiliation as StudentProfile["affiliation"]).includes(
      value.studyPath as StudentProfile["studyPath"],
    ) ||
    value.curriculumRuleVersion !== "2026-provided-final-plan" ||
    !ruleApplicabilities.has(value.ruleApplicability as string)
  ) {
    return false;
  }
  return value.entryYear === undefined ||
    (isFiniteNumber(value.entryYear) && Number.isSafeInteger(value.entryYear) && value.entryYear >= 0);
}

function isProfileDraft(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set([
    "goal",
    "affiliation",
    "studyPath",
    "entryYear",
    "curriculumRuleVersion",
    "ruleApplicability",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
  if (value.goal !== undefined && !serviceGoals.has(value.goal as string)) return false;
  if (value.affiliation !== undefined && !studentAffiliations.has(value.affiliation as string)) return false;
  if (value.studyPath !== undefined && !studyPaths.has(value.studyPath as string)) return false;
  if (
    value.affiliation !== undefined &&
    value.studyPath !== undefined &&
    !getAllowedStudyPaths(value.affiliation as StudentProfile["affiliation"]).includes(
      value.studyPath as StudentProfile["studyPath"],
    )
  ) {
    return false;
  }
  if (
    value.entryYear !== undefined &&
    (!isFiniteNumber(value.entryYear) || !Number.isSafeInteger(value.entryYear) || value.entryYear < 0)
  ) {
    return false;
  }
  if (value.curriculumRuleVersion !== undefined && value.curriculumRuleVersion !== "2026-provided-final-plan") {
    return false;
  }
  return value.ruleApplicability === undefined || ruleApplicabilities.has(value.ruleApplicability as string);
}

function isCourseSelections(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    typeof item.courseId === "string" &&
    courseSelectionStatuses.has(item.status as string) &&
    (item.plannedTerm === undefined || planTerms.has(item.plannedTerm as PlanTerm)),
  );
}

function isAdditionalMajorCredits(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    isFiniteNumber(item.credits) &&
    item.credits >= 0 &&
    additionalCreditStatuses.has(item.status as string) &&
    (item.note === undefined || typeof item.note === "string"),
  );
}

function isCreditProgress(value: unknown): boolean {
  return isRecord(value) &&
    isFiniteNumber(value.completedCredits) &&
    isFiniteNumber(value.requiredCredits) &&
    isFiniteNumber(value.missingCredits);
}

function isRequirementProgress(value: unknown): boolean {
  return isCreditProgress(value) &&
    isRecord(value) &&
    isStringArray(value.completedCourseIds) &&
    isStringArray(value.missingCourseIds);
}

function isCourse(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    isFiniteNumber(value.credits) &&
    moduleIds.has(value.moduleId as string) &&
    (value.recommendedSemester === undefined || typeof value.recommendedSemester === "string") &&
    (value.required === undefined || typeof value.required === "boolean") &&
    (value.sourceNote === undefined || typeof value.sourceNote === "string");
}

function isModuleProgress(value: unknown): boolean {
  return isRecord(value) &&
    (moduleIds.has(value.moduleId as string) || value.moduleId === "N+O") &&
    typeof value.label === "string" &&
    isFiniteNumber(value.requiredCredits) &&
    isFiniteNumber(value.completedCredits) &&
    isFiniteNumber(value.missingCredits) &&
    isStringArray(value.courseIds);
}

function isTrackDiagnosisResult(value: unknown): boolean {
  return isRecord(value) &&
    isTrackId(value.trackId) &&
    typeof value.trackName === "string" &&
    trackKinds.has(value.trackKind as string) &&
    enrollmentTypes.has(value.enrollmentType as EnrollmentType) &&
    typeof value.passed === "boolean" &&
    isFiniteNumber(value.trackCredits) &&
    isFiniteNumber(value.completionRate) &&
    Array.isArray(value.missingRequiredCourses) && value.missingRequiredCourses.every(isCourse) &&
    Array.isArray(value.excludedRequiredCourses) && value.excludedRequiredCourses.every(isCourse) &&
    Array.isArray(value.moduleProgress) && value.moduleProgress.every(isModuleProgress) &&
    Array.isArray(value.recommendedCourses) && value.recommendedCourses.every(isCourse) &&
    Array.isArray(value.remainingCourses) && value.remainingCourses.every(isCourse);
}

function isReviewItem(value: unknown): boolean {
  return isRecord(value) &&
    reviewCodes.has(value.code as string) &&
    typeof value.message === "string" &&
    evidenceStatuses.has(value.evidence as string);
}

function isPlannedCoursePlacement(value: unknown): value is PlannedCoursePlacement {
  return isRecord(value) &&
    isAcademicTermId(value.termId) &&
    typeof value.courseId === "string" && courseIds.has(value.courseId) &&
    plannedCourseOrigins.has(value.origin as string) &&
    courseOfferingEvidence.has(value.offeringEvidence as string);
}

function isUnplacedCourse(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.courseId === "string" && courseIds.has(value.courseId) &&
    unplacedCourseReasons.has(value.reason as string) &&
    typeof value.message === "string";
}

function isElectiveTermAllocation(value: unknown): boolean {
  return isRecord(value) &&
    isAcademicTermId(value.termId) &&
    Number.isInteger(value.slots) && Number(value.slots) > 0 &&
    isFiniteNumber(value.credits) && value.credits > 0 &&
    value.credits <= Number(value.slots) * 3;
}

function isGraduationPlan(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !graduationPlanStatuses.has(value.status as string) ||
    !isGraduationPlanPreferences(value.preferences) ||
    !Array.isArray(value.placements) ||
    !value.placements.every(isPlannedCoursePlacement) ||
    !Array.isArray(value.extraTermPlacements) ||
    !value.extraTermPlacements.every(isPlannedCoursePlacement) ||
    !Array.isArray(value.unplacedCourses) ||
    !value.unplacedCourses.every(isUnplacedCourse) ||
    !Array.isArray(value.electiveAllocations) ||
    !value.electiveAllocations.every(isElectiveTermAllocation) ||
    !isFiniteNumber(value.unallocatedElectiveCredits) || value.unallocatedElectiveCredits < 0 ||
    !isNonNegativeInteger(value.unallocatedElectiveSlots) ||
    !isFiniteNumber(value.unplacedElectiveCredits) || value.unplacedElectiveCredits < 0 ||
    !isNonNegativeInteger(value.unplacedElectiveSlots) ||
    value.recommendedMaxMajorCoursesPerTerm !== undefined &&
      (!Number.isInteger(value.recommendedMaxMajorCoursesPerTerm) ||
        Number(value.recommendedMaxMajorCoursesPerTerm) < 1 ||
        Number(value.recommendedMaxMajorCoursesPerTerm) > 6) ||
    !isNonNegativeInteger(value.neededExtraTerms) ||
    !Array.isArray(value.reviewItems) || !value.reviewItems.every(isReviewItem) ||
    typeof value.generatedAt !== "string"
  ) {
    return false;
  }

  const currentIndex = academicTermIndex(value.preferences.currentTerm);
  const targetIndex = academicTermIndex(value.preferences.targetGraduationTerm);
  const normalPlacementsAreInRange = value.placements.every((placement) => {
    const placementIndex = academicTermIndex(placement.termId);
    return placementIndex >= currentIndex && placementIndex <= targetIndex;
  });
  const extraPlacementsAreInRange = value.extraTermPlacements.every((placement) => {
    const placementIndex = academicTermIndex(placement.termId);
    return placementIndex > targetIndex && placementIndex <= targetIndex + 2;
  });
  const allocationTerms = value.electiveAllocations.map((allocation) => allocation.termId as string);
  const allocationTermsAreUnique = new Set(allocationTerms).size === allocationTerms.length;
  const allocationsAreInRange = value.electiveAllocations.every((allocation) => {
    const allocationIndex = academicTermIndex(allocation.termId);
    return allocationIndex > currentIndex && allocationIndex <= targetIndex + 2;
  });
  const allocatedCredits = value.electiveAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.credits),
    0,
  );
  const allocatedSlots = value.electiveAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.slots),
    0,
  );
  const electiveTotalsMatch = allocatedCredits + value.unplacedElectiveCredits
      === value.unallocatedElectiveCredits
    && allocatedSlots + value.unplacedElectiveSlots === value.unallocatedElectiveSlots;
  return normalPlacementsAreInRange &&
    extraPlacementsAreInRange &&
    allocationTermsAreUnique &&
    allocationsAreInRange &&
    electiveTotalsMatch;
}

function isInterestAxisCandidate(value: unknown): boolean {
  return isRecord(value) &&
    isTrackId(value.trackId) &&
    isFiniteNumber(value.score) &&
    typeof value.closeLeader === "boolean" &&
    isStringArray(value.reasons);
}

function isProgressAxisCandidate(value: unknown): boolean {
  return isRecord(value) &&
    isTrackId(value.trackId) &&
    isNonNegativeInteger(value.missingCourseCount) &&
    isFiniteNumber(value.missingCredits) && value.missingCredits >= 0 &&
    isStringArray(value.missingModuleLabels) &&
    recommendationAssumptions.has(value.assumption as string);
}

function isPlanAxisCandidate(value: unknown): boolean {
  return isRecord(value) &&
    isTrackId(value.trackId) &&
    graduationPlanStatuses.has(value.status as string) &&
    isNonNegativeInteger(value.unplacedCourseCount) &&
    isNonNegativeInteger(value.neededExtraTerms) &&
    recommendationAssumptions.has(value.assumption as string);
}

function isRecommendationAxes(value: unknown): boolean {
  return isRecord(value) &&
    (value.interest === undefined ||
      Array.isArray(value.interest) && value.interest.every(isInterestAxisCandidate)) &&
    Array.isArray(value.progress) && value.progress.every(isProgressAxisCandidate) &&
    (value.plan === undefined || Array.isArray(value.plan) && value.plan.every(isPlanAxisCandidate)) &&
    Array.isArray(value.alignedLeaderTrackIds) && value.alignedLeaderTrackIds.every(isTrackId);
}

function isPathProgressResult(value: unknown): boolean {
  return isRecord(value) &&
    (value.requiredProgress === "not-applicable" || isRequirementProgress(value.requiredProgress)) &&
    (value.trackProgress === "not-applicable" || isTrackDiagnosisResult(value.trackProgress)) &&
    isCreditProgress(value.totalMajorProgress) &&
    Array.isArray(value.reviewItems) && value.reviewItems.every(isReviewItem) &&
    pathProgressStatuses.has(value.status as string);
}

function isDiagnosisSnapshot(value: unknown): value is DiagnosisSnapshot {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    value.ruleVersion === "2026-provided-final-plan" &&
    isStudentProfile(value.profile) &&
    isCourseSelections(value.courseSelections) &&
    isAdditionalMajorCredits(value.additionalMajorCredits) &&
    (value.targetTrackId === undefined || isTrackId(value.targetTrackId)) &&
    Array.isArray(value.comparisonTrackIds) && value.comparisonTrackIds.every(isTrackId) &&
    isPathProgressResult(value.result) &&
    (value.recommendationAxes === undefined || isRecommendationAxes(value.recommendationAxes)) &&
    (value.graduationPlan === undefined || isGraduationPlan(value.graduationPlan));
}

function isSavedAppStateV2(value: unknown): value is SavedAppStateV2 {
  if (!isRecord(value)) return false;
  const state = value as Partial<SavedAppStateV2>;
  if (state.version !== 2) return false;
  return isCourseSelections(state.courseSelections) &&
    isAdditionalMajorCredits(state.additionalMajorCredits) &&
    (state.targetTrackId === undefined || isTrackId(state.targetTrackId)) &&
    Array.isArray(state.comparisonTrackIds) && state.comparisonTrackIds.every(isTrackId) &&
    (state.profile === undefined || isStudentProfile(state.profile)) &&
    (state.profileDraft === undefined || isProfileDraft(state.profileDraft)) &&
    (state.courseInputReviewedAt === undefined || typeof state.courseInputReviewedAt === "string") &&
    (state.currentSemester === undefined || isPlanningSemester(state.currentSemester)) &&
    (state.targetGraduationSemester === undefined || isPlanningSemester(state.targetGraduationSemester)) &&
    (state.interestSurvey === undefined || isInterestSurvey(state.interestSurvey)) &&
    (state.graduationPlanPreferences === undefined ||
      isGraduationPlanPreferences(state.graduationPlanPreferences)) &&
    (state.graduationPlan === undefined ||
      state.graduationPlanPreferences !== undefined &&
      isGraduationPlan(state.graduationPlan) &&
      hasMatchingPreferences(state.graduationPlanPreferences, state.graduationPlan.preferences)) &&
    Array.isArray(state.snapshots) && state.snapshots.every(isDiagnosisSnapshot);
}

function hasCurrentElectiveAllocationContract(plan: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(plan, "electiveAllocations") &&
    Object.prototype.hasOwnProperty.call(plan, "unplacedElectiveCredits") &&
    Object.prototype.hasOwnProperty.call(plan, "unplacedElectiveSlots");
}

function migrateLegacyV2PlanningContract(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 2) return value;
  let changed = false;
  const migrated: Record<string, unknown> = { ...value };

  if (isRecord(value.graduationPlan) && !hasCurrentElectiveAllocationContract(value.graduationPlan)) {
    delete migrated.graduationPlan;
    changed = true;
  }

  if (Array.isArray(value.snapshots)) {
    migrated.snapshots = value.snapshots.map((snapshot) => {
      if (!isRecord(snapshot) || !isRecord(snapshot.graduationPlan) ||
        hasCurrentElectiveAllocationContract(snapshot.graduationPlan)) {
        return snapshot;
      }
      const migratedSnapshot = { ...snapshot };
      delete migratedSnapshot.graduationPlan;
      changed = true;
      return migratedSnapshot;
    });
  }

  return changed ? migrated : value;
}

export function loadAppState(storage: Storage = window.localStorage): SavedAppStateV2 {
  for (const key of [STORAGE_KEY_V2, STORAGE_LAST_VALID_KEY_V2]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = migrateLegacyV2PlanningContract(JSON.parse(raw));
      if (isSavedAppStateV2(parsed)) {
        return { ...parsed, snapshots: normalizeSnapshotHistory(parsed.snapshots) };
      }
    } catch {
      continue;
    }
  }
  try {
    const legacyRaw = storage.getItem(STORAGE_KEY);
    return legacyRaw ? migrateV1State(JSON.parse(legacyRaw)) : createEmptyAppState();
  } catch {
    return createEmptyAppState();
  }
}

function restoreStorageValue(
  storage: Storage,
  key: string,
  previousValue: string | null,
): void {
  try {
    if (previousValue === null) storage.removeItem(key);
    else storage.setItem(key, previousValue);
  } catch {
    // Best-effort rollback: the caller still reports the save as failed.
  }
}

export function saveAppState(state: SavedAppStateV2, storage: Storage = window.localStorage): boolean {
  let serialized: string;
  let previousPrimary: string | null;
  let previousLastValid: string | null;
  try {
    const normalized = { ...state, snapshots: normalizeSnapshotHistory(state.snapshots) };
    if (!isSavedAppStateV2(normalized)) return false;
    serialized = JSON.stringify(normalized);
    previousPrimary = storage.getItem(STORAGE_KEY_V2);
    previousLastValid = storage.getItem(STORAGE_LAST_VALID_KEY_V2);
  } catch {
    return false;
  }

  try {
    storage.setItem(STORAGE_LAST_VALID_KEY_V2, serialized);
    storage.setItem(STORAGE_KEY_V2, serialized);
    return true;
  } catch {
    restoreStorageValue(storage, STORAGE_KEY_V2, previousPrimary);
    restoreStorageValue(storage, STORAGE_LAST_VALID_KEY_V2, previousLastValid);
    return false;
  }
}

export function loadSavedState(): SavedDiagnosisState {
  if (typeof localStorage === "undefined") {
    return emptyState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SavedDiagnosisState> & { trackId?: TrackId };
    if (parsed.curriculumYear !== CURRICULUM_YEAR) return emptyState();
    const parsedTrackIds = Array.isArray(parsed.trackIds)
      ? parsed.trackIds
      : parsed.trackId
        ? [parsed.trackId]
        : [];
    const safeTrackIds = parsedTrackIds.filter((id): id is TrackId => trackIds.has(id as TrackId));
    const hasStoredTrackField = Array.isArray(parsed.trackIds) || typeof parsed.trackId === "string";
    const safePlannedCourseTerms = Object.fromEntries(
      Object.entries(parsed.plannedCourseTerms ?? {}).filter(
        ([courseId, term]) => courseIds.has(courseId) && planTerms.has(term as PlanTerm),
      ),
    ) as Record<string, PlanTerm>;

    return {
      curriculumYear: CURRICULUM_YEAR,
      trackIds: hasStoredTrackField ? [...new Set(safeTrackIds)] : [],
      completedCourseIds: Array.isArray(parsed.completedCourseIds)
        ? [...new Set(parsed.completedCourseIds.filter((id): id is string => typeof id === "string" && courseIds.has(id)))]
        : [],
      enrollmentType: enrollmentTypes.has(parsed.enrollmentType as EnrollmentType)
        ? (parsed.enrollmentType as EnrollmentType)
        : "primary",
      plannedCourseTerms: safePlannedCourseTerms,
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: SavedDiagnosisState): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function emptyState(): SavedDiagnosisState {
  return {
    curriculumYear: CURRICULUM_YEAR,
    trackIds: [],
    completedCourseIds: [],
    enrollmentType: "primary",
    plannedCourseTerms: {},
  };
}
