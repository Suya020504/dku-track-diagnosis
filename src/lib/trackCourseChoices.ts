import { courses } from "../data/curriculumData";
import { calculateTrackCompletion, type TrackCompletionScenario } from "./trackCompletion";
import type { CourseSelectionRecord } from "../types";

export type TrackCourseChoice = {
  courseId: string;
  /** A check of this displayed combination, never a graduation-required classification. */
  checked: boolean;
  alternativeCourseIds: string[];
};

/**
 * Replace just one suggested course while keeping all other courses fixed.
 * Reuse the track solver, including cross-module and shared-track constraints.
 * A module-required marker does not affect this module-credit-only comparison.
 * Candidates from separate rows must not be combined without recalculation.
 */
export function getTrackCourseChoices(scenario: TrackCompletionScenario): TrackCourseChoice[] {
  const selectedTrackIds = scenario.trackResults.map(track => track.trackId);
  const proposedIds = scenario.unionRemainingCourseIds;
  if (!selectedTrackIds.length || !proposedIds.length) return [];

  const records = (ids: string[]): CourseSelectionRecord[] =>
    ids.map(courseId => ({ courseId, status: "completed" }));
  const evaluate = (ids: string[]) => calculateTrackCompletion({ selectedTrackIds, courseSelections: records(ids) }).completed;
  const entireCombination = [...new Set([...scenario.assumedCourseIds, ...proposedIds])];
  const occupied = new Set(entireCombination);
  const baselineValid = scenario.canCompleteWithKnownCourses && evaluate(entireCombination).satisfied;

  return proposedIds.map(courseId => {
    if (!baselineValid) return { courseId, checked: false, alternativeCourseIds: [] };
    const withoutCourse = entireCombination.filter(id => id !== courseId);
    const withoutResult = evaluate(withoutCourse);
    const usefulIds = new Set(withoutResult.trackResults.flatMap(track => track.moduleProgress
      .filter(module => module.missingCredits > 0)
      .flatMap(module => module.courseIds)));
    const alternativeCourseIds = courses
      .filter(course => !occupied.has(course.id) && usefulIds.has(course.id))
      .filter(course => evaluate([...withoutCourse, course.id]).satisfied)
      .map(course => course.id);
    return { courseId, checked: true, alternativeCourseIds };
  });
}
