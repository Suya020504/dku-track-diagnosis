import { describe, expect, it } from "vitest";
import { tracks } from "../../data/curriculumData";
import type { CourseSelectionRecord, GraduationPlanPreferences } from "../../types";
import { compareTrackTimelines } from "./compareTrackTimelines";

const preferences: GraduationPlanPreferences = {
  currentTerm: "2026-2", targetGraduationTerm: "2028-2", maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false,
};
const selections: CourseSelectionRecord[] = ["f-1", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"]
  .map(courseId => ({ courseId, status: "completed" }));

describe("compareTrackTimelines", () => {
  it("compares all five tracks independently without changing the source courses or conditions", () => {
    const before = JSON.stringify({ selections, preferences });
    const results = compareTrackTimelines(selections, preferences);
    expect(results.map(result => result.trackId)).toEqual(tracks.map(track => track.id));
    const food = results.find(result => result.trackId === "food-marketing")!;
    expect(food.status).toBe("placed");
    expect(food.lastTerm).toBe("2027-1");
    expect(food.unplacedCount).toBe(0);
    expect(JSON.stringify({ selections, preferences })).toBe(before);
  });

  it("never claims a completion term when any course cannot be placed before the target", () => {
    const result = compareTrackTimelines(selections, { ...preferences, targetGraduationTerm: "2026-2" })
      .find(result => result.trackId === "food-marketing")!;
    expect(result.status).toBe("unplaced");
    expect(result.unplacedCount).toBe(1);
    expect(result.lastTerm).toBeUndefined();
    expect(result.unplaced[0].courseId).toBe("f-2");
  });

  it("keeps active and planned courses hypothetical and follows their recorded terms", () => {
    const active = compareTrackTimelines([...selections, { courseId: "f-2", status: "in-progress" }], preferences)
      .find(result => result.trackId === "food-marketing")!;
    expect(active.status).toBe("placed");
    expect(active.lastTerm).toBe("2026-2");
    const planned = compareTrackTimelines([...selections, { courseId: "f-2", status: "planned", plannedTerm: "following" }], preferences)
      .find(result => result.trackId === "food-marketing")!;
    expect(planned.status).toBe("unplaced");
    expect(planned.lastTerm).toBeUndefined();
    expect(planned.unplaced[0].reason).toBe("planned-term-conflict");
  });

  it("separates already satisfied module conditions from a hypothetical plan", () => {
    const result = compareTrackTimelines([...selections, { courseId: "f-2", status: "completed" }], preferences)
      .find(result => result.trackId === "food-marketing")!;
    expect(result.status).toBe("satisfied");
    expect(result.lastTerm).toBeUndefined();
  });

  it("keeps completed module conditions satisfied when an extra planned course cannot fit", () => {
    const result = compareTrackTimelines([
      ...selections, { courseId: "f-2", status: "completed" }, { courseId: "f-3", status: "planned", plannedTerm: "following" },
    ], { ...preferences, targetGraduationTerm: "2026-2" }).find(result => result.trackId === "food-marketing")!;
    expect(result.status).toBe("satisfied");
    expect(result.lastTerm).toBeUndefined();
    expect(result.unplacedCount).toBe(0);
    expect(result.unplaced).toEqual([]);
  });

  it("rejects invalid conditions before returning a comparison", () => {
    expect(() => compareTrackTimelines(selections, { ...preferences, maxMajorCoursesPerTerm: 0 })).toThrow(RangeError);
  });
});
