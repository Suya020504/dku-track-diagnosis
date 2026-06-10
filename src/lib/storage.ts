import { CURRICULUM_YEAR, STORAGE_KEY, tracks } from "../data/curriculumData";
import type { EnrollmentType, SavedDiagnosisState, TrackId } from "../types";

const trackIds = new Set(tracks.map((track) => track.id));
const enrollmentTypes = new Set<EnrollmentType>(["primary", "double-major", "minor"]);

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

    return {
      curriculumYear: CURRICULUM_YEAR,
      trackIds: hasStoredTrackField ? [...new Set(safeTrackIds)] : [],
      completedCourseIds: Array.isArray(parsed.completedCourseIds)
        ? parsed.completedCourseIds.filter((id): id is string => typeof id === "string")
        : [],
      enrollmentType: enrollmentTypes.has(parsed.enrollmentType as EnrollmentType)
        ? (parsed.enrollmentType as EnrollmentType)
        : "primary",
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
  };
}
