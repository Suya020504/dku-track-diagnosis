import { tracks } from "../../data/curriculumData";
import { compareAcademicTerms } from "../../lib/graduationPlanner";
import { calculateTrackCompletion } from "../../lib/trackCompletion";
import { buildTrackSemesterPlan, type TrackSemesterPlan } from "../../lib/trackSemesterPlanner";
import type { AcademicTermId, CourseSelectionRecord, GraduationPlanPreferences, TrackId } from "../../types";

export type TrackTimelineComparison = {
  trackId: TrackId;
  status: "satisfied" | "placed" | "unplaced";
  lastTerm?: AcademicTermId;
  unplacedCount: number;
  unplaced: TrackSemesterPlan["unplaced"];
};

/** A like-for-like comparison of one suggested combination per track, not a minimum-term optimizer. */
export function compareTrackTimelines(
  courseSelections: readonly CourseSelectionRecord[],
  preferences: GraduationPlanPreferences,
): TrackTimelineComparison[] {
  const completed = calculateTrackCompletion({ selectedTrackIds: [], courseSelections }).completed.recommendations;
  return tracks.map(track => {
    const plan = buildTrackSemesterPlan({ selectedTrackIds: [track.id], courseSelections, preferences,
      generatedAt: "2026-09-09T00:00:00.000Z" });
    // An optional future class cannot undo module credits already earned.
    if (completed.find(candidate => candidate.trackId === track.id)?.satisfied) {
      return { trackId: track.id, status: "satisfied", unplacedCount: 0, unplaced: [] };
    }
    const status = plan.unplaced.length > 0 ? "unplaced" : plan.courseIds.length === 0 ? "satisfied" : "placed";
    const lastTerm = status === "placed"
      ? plan.placements.reduce<AcademicTermId | undefined>((latest, placement) =>
        !latest || compareAcademicTerms(placement.term, latest) > 0 ? placement.term : latest, undefined)
      : undefined;
    return { trackId: track.id, status, lastTerm, unplacedCount: plan.unplaced.length, unplaced: plan.unplaced };
  });
}
