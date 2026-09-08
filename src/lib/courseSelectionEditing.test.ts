import { describe, expect, it } from "vitest";
import { updateCourseSelection } from "./courseSelectionEditing";
import type { CourseSelectionRecord } from "../types";

describe("course status editing", () => {
  it("stores each status once and clears a stale planned term", () => {
    const original: CourseSelectionRecord[] = [{ courseId: "b-2", status: "planned", plannedTerm: "later" }];
    expect(updateCourseSelection(original, "b-2", "completed")).toEqual([{ courseId: "b-2", status: "completed" }]);
    expect(updateCourseSelection(original, "b-2", "in-progress")).toEqual([{ courseId: "b-2", status: "in-progress" }]);
    expect(updateCourseSelection([], "b-2", "planned")).toEqual([{ courseId: "b-2", status: "planned", plannedTerm: "next" }]);
    expect(updateCourseSelection(original, "b-2", "planned", "following")[0].plannedTerm).toBe("following");
    expect(original[0].plannedTerm).toBe("later");
  });
  it("removes any status and never injects unknown or liberal courses", () => {
    expect(updateCourseSelection([{ courseId: "b-2", status: "planned" }], "b-2", null)).toEqual([]);
    expect(updateCourseSelection([], "unknown", "completed")).toEqual([]);
    expect(updateCourseSelection([], "a-1", "completed")).toEqual([]);
  });
});
