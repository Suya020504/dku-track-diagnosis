import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../data/curriculumData";
import { emptyState, loadSavedState, saveState } from "./storage";

const values = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  },
});

describe("diagnosis storage", () => {
  beforeEach(() => values.clear());

  it("keeps actual completion and local semester plans separate", () => {
    saveState({
      ...emptyState(),
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1"],
      plannedCourseTerms: { "c-2": "next", "h-1": "following" },
    });

    expect(loadSavedState()).toMatchObject({
      completedCourseIds: ["f-1"],
      plannedCourseTerms: { "c-2": "next", "h-1": "following" },
    });
  });

  it("removes unknown courses and invalid planning terms from stored input", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        curriculumYear: 2026,
        trackIds: ["food-marketing", "unknown-track"],
        completedCourseIds: ["f-1", "not-a-course", "f-1"],
        enrollmentType: "primary",
        plannedCourseTerms: { "c-2": "later", "not-a-course": "next", "h-1": "someday" },
      }),
    );

    expect(loadSavedState()).toEqual({
      curriculumYear: 2026,
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1"],
      enrollmentType: "primary",
      plannedCourseTerms: { "c-2": "later" },
    });
  });

  it("migrates previous saved data without a plan field", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        curriculumYear: 2026,
        trackIds: ["economics"],
        completedCourseIds: ["d-1"],
        enrollmentType: "double-major",
      }),
    );

    expect(loadSavedState().plannedCourseTerms).toEqual({});
  });
});
