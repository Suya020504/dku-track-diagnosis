import { describe, expect, it } from "vitest";
import { courses } from "../data/curriculumData";
import { calculateTrackCompletion } from "./trackCompletion";
import { getTrackCourseChoices } from "./trackCourseChoices";
import type { CourseSelectionRecord, TrackId } from "../types";

const selections = (ids: string[], status: CourseSelectionRecord["status"] = "completed"): CourseSelectionRecord[] =>
  ids.map(courseId => ({ courseId, status }));
const scenario = (trackIds: TrackId[], ids: string[] = []) => calculateTrackCompletion({
  selectedTrackIds: trackIds, courseSelections: selections(ids),
}).completed;

describe("verified one-course alternatives for a track-module combination", () => {
  it("does not turn a module-required marker into an unconditional required course", () => {
    const shown = scenario(["food-marketing"]);
    const choice = getTrackCourseChoices(shown).find(item => item.courseId === "f-1")!;
    expect(courses.find(course => course.id === "f-1")?.required).toBe(true);
    expect(choice).toEqual({ courseId: "f-1", checked: true, alternativeCourseIds: ["f-3"] });
  });

  it("excludes completed courses and courses already present in the combination", () => {
    const shown = scenario(["food-marketing"], ["f-1"]);
    const choice = getTrackCourseChoices(shown).find(item => item.courseId === "f-2")!;
    expect(choice.alternativeCourseIds).toEqual(["f-3"]);
    expect(choice.alternativeCourseIds).not.toContain("f-1");
    expect(choice.alternativeCourseIds.every(id => !shown.unionRemainingCourseIds.includes(id))).toBe(true);
  });

  it("allows cross-module alternatives only when all selected tracks remain satisfied", () => {
    const bioOnly = getTrackCourseChoices(scenario(["food-bio-economy"]));
    expect(bioOnly.find(item => item.courseId === "f-1")?.alternativeCourseIds).toContain("h-2");
    const combined = getTrackCourseChoices(scenario(["food-bio-economy", "food-marketing"]));
    expect(combined.find(item => item.courseId === "f-1")?.alternativeCourseIds).not.toContain("h-3");
  });

  it("does not accept a low-credit N/O substitution that leaves the convergence total short", () => {
    const shown = scenario(["food-bio-economy"]);
    const threeCreditChoice = getTrackCourseChoices(shown).find(item => item.courseId === "n-2")!;
    expect(threeCreditChoice.alternativeCourseIds).not.toContain("o-1");
    expect(threeCreditChoice.alternativeCourseIds).toContain("o-3");
  });

  it("uses the displayed completed or in-progress basis without changing the source records", () => {
    const input = [{ courseId: "f-3", status: "in-progress" as const }];
    const before = JSON.stringify(input);
    const result = calculateTrackCompletion({ selectedTrackIds: ["food-marketing"], courseSelections: input, includeInProgress: true });
    expect(getTrackCourseChoices(result.completed).find(item => item.courseId === "f-1")?.alternativeCourseIds).toContain("f-3");
    expect(getTrackCourseChoices(result.inProgressPreview!).every(item => !item.alternativeCourseIds.includes("f-3"))).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("proves every advertised replacement against the full selected-track conditions", () => {
    const shown = scenario(["food-marketing", "economics", "food-bio-economy"], ["f-1", "m-5", "o-3"]);
    const before = JSON.stringify(shown);
    for (const choice of getTrackCourseChoices(shown)) {
      for (const replacement of choice.alternativeCourseIds) {
        const ids = [...shown.assumedCourseIds, ...shown.unionRemainingCourseIds.filter(id => id !== choice.courseId), replacement];
        expect(calculateTrackCompletion({
          selectedTrackIds: shown.trackResults.map(track => track.trackId), courseSelections: selections(ids),
        }).completed.satisfied).toBe(true);
      }
    }
    expect(JSON.stringify(shown)).toBe(before);
  });

  it("returns no choices for no target, completed targets or an unresolvable catalogue", () => {
    expect(getTrackCourseChoices(scenario([]))).toEqual([]);
    expect(getTrackCourseChoices(scenario(["food-marketing"], courses.map(course => course.id)))).toEqual([]);
    const incomplete = { ...scenario(["food-marketing"]), canCompleteWithKnownCourses: false };
    expect(getTrackCourseChoices(incomplete).every(choice => !choice.checked && !choice.alternativeCourseIds.length)).toBe(true);
  });
});
