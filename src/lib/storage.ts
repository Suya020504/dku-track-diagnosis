import { courses, CURRICULUM_YEAR, STORAGE_KEY, tracks } from "../data/curriculumData";
import { getAllowedStudyPaths } from "../data/requirementRules2026";
import type {
  DiagnosisSnapshot,
  EnrollmentType,
  PlanTerm,
  SavedAppStateV2,
  SavedDiagnosisState,
  StudentProfile,
  TrackId,
} from "../types";

const trackIds = new Set(tracks.map((track) => track.id));
const courseIds = new Set(courses.map((course) => course.id));
const enrollmentTypes = new Set<EnrollmentType>(["primary", "double-major", "minor"]);
const planTerms = new Set<PlanTerm>(["next", "following", "later"]);

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

export function migrateV1State(value: unknown): SavedAppStateV2 {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const completed = Array.isArray(source.completedCourseIds)
    ? [...new Set(source.completedCourseIds.filter((item): item is string => typeof item === "string"))]
    : [];
  const legacyTracks = Array.isArray(source.trackIds)
    ? source.trackIds.filter(
        (item): item is TrackId => typeof item === "string" && tracks.some((track) => track.id === item),
      )
    : [];
  const planned = source.plannedCourseTerms && typeof source.plannedCourseTerms === "object"
    ? Object.entries(source.plannedCourseTerms as Record<string, unknown>).filter(
        (entry): entry is [string, PlanTerm] =>
          planTerms.has(String(entry[1]) as PlanTerm) && !completed.includes(entry[0]),
      )
    : [];
  const profile = profileForEnrollmentType(source.enrollmentType);

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
    targetTrackId: legacyTracks[0],
    comparisonTrackIds: legacyTracks.slice(1),
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

function isSavedAppStateV2(value: unknown): value is SavedAppStateV2 {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SavedAppStateV2>;
  if (state.version !== 2) return false;
  if (!Array.isArray(state.courseSelections) || !Array.isArray(state.additionalMajorCredits)) {
    return false;
  }
  if (!Array.isArray(state.comparisonTrackIds) || !Array.isArray(state.snapshots)) return false;
  const validStatuses = new Set(["completed", "in-progress", "planned"]);
  const courseSelectionsValid = state.courseSelections.every(
    (item) =>
      item &&
      typeof item.courseId === "string" &&
      validStatuses.has(item.status) &&
      (item.plannedTerm === undefined || planTerms.has(item.plannedTerm)),
  );
  const additionalCreditsValid = state.additionalMajorCredits.every(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      Number.isFinite(item.credits) &&
      item.credits >= 0 &&
      ["student-entered", "officially-verified"].includes(item.status),
  );
  const tracksValid =
    (state.targetTrackId === undefined || trackIds.has(state.targetTrackId)) &&
    state.comparisonTrackIds.every((id) => trackIds.has(id));
  const profileValid = state.profile === undefined || (
    ["department-student", "external-student"].includes(state.profile.affiliation) &&
    getAllowedStudyPaths(state.profile.affiliation).includes(state.profile.studyPath) &&
    ["learn-track-system", "find-track", "check-progress", "plan-graduation"].includes(
      state.profile.goal,
    ) &&
    ["student-confirmed", "officially-verified", "reference-only"].includes(
      state.profile.ruleApplicability,
    )
  );
  const reviewDateValid =
    state.courseInputReviewedAt === undefined || typeof state.courseInputReviewedAt === "string";
  const profileDraftValid =
    state.profileDraft === undefined ||
    (state.profileDraft !== null && typeof state.profileDraft === "object");
  return courseSelectionsValid && additionalCreditsValid && tracksValid && profileValid && profileDraftValid && reviewDateValid;
}

export function loadAppState(storage: Storage = window.localStorage): SavedAppStateV2 {
  for (const key of [STORAGE_KEY_V2, STORAGE_LAST_VALID_KEY_V2]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
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

export function saveAppState(state: SavedAppStateV2, storage: Storage = window.localStorage): boolean {
  try {
    const normalized = { ...state, snapshots: normalizeSnapshotHistory(state.snapshots) };
    const serialized = JSON.stringify(normalized);
    storage.setItem(STORAGE_KEY_V2, serialized);
    storage.setItem(STORAGE_LAST_VALID_KEY_V2, serialized);
    return true;
  } catch {
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
