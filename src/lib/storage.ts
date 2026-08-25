import { courses, CURRICULUM_YEAR, STORAGE_KEY, tracks } from "../data/curriculumData";
import type { EnrollmentType, PlanTerm, SavedDiagnosisState, TrackId } from "../types";

const trackIds = new Set(tracks.map((track) => track.id));
const courseIds = new Set(courses.map((course) => course.id));
const enrollmentTypes = new Set<EnrollmentType>(["primary", "double-major", "minor"]);
const planTerms = new Set<PlanTerm>(["next", "following", "later"]);

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
