import { describe, expect, it } from "vitest";
import { courses, tracks } from "../data/curriculumData";
import { calculateDiagnosis, calculateTrackRecommendations } from "./diagnosis";
import type { TrackId } from "../types";

const requiredIds = courses.filter((course) => course.required).map((course) => course.id);

describe("calculateDiagnosis", () => {
  it("allows no selected tracks without falling back to a default track", () => {
    const result = calculateDiagnosis({ trackIds: [], completedCourseIds: ["f-1"] });

    expect(result.selectedTrackIds).toEqual([]);
    expect(result.trackResults).toHaveLength(0);
    expect(result.trackCredits).toBe(0);
    expect(result.totalCredits).toBe(3);
  });

  it("excludes first-year required courses for double major and minor modes", () => {
    const doubleMajor = calculateDiagnosis({
      trackIds: ["food-marketing"],
      completedCourseIds: [],
      enrollmentType: "double-major",
    });
    const minor = calculateDiagnosis({
      trackIds: ["food-marketing"],
      completedCourseIds: [],
      enrollmentType: "minor",
    });

    expect(doubleMajor.missingRequiredCourses.map((course) => course.id)).not.toContain("b-2");
    expect(minor.missingRequiredCourses.map((course) => course.id)).not.toContain("b-2");
    expect(doubleMajor.excludedRequiredCourses.map((course) => course.id)).toContain("b-2");
    expect(minor.excludedRequiredCourses.map((course) => course.id)).toContain("b-2");
  });

  it.each(tracks)("returns missing requirements for empty state: $name", (track) => {
    const result = calculateDiagnosis({ trackIds: [track.id], completedCourseIds: [] });

    expect(result.passed).toBe(false);
    expect(result.totalCredits).toBe(0);
    expect(result.missingRequiredCourses).toHaveLength(requiredIds.length);
    expect(result.moduleProgress.every((progress) => progress.missingCredits > 0)).toBe(true);
  });

  it("does not double count duplicated course ids", () => {
    const result = calculateDiagnosis({
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1", "f-1", "h-1"],
    });

    expect(result.totalCredits).toBe(6);
  });

  it.each([
    ["food-marketing", ["f-1", "f-2", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"]],
    [
      "regional-development-consulting",
      ["d-1", "d-2", "e-1", "e-2", "h-1", "h-2", "i-1", "i-2", "k-1", "k-2"],
    ],
    ["agri-food-distribution", ["f-1", "f-2", "g-1", "g-2", "j-1", "j-2", "k-1", "k-2", "l-1", "l-2"]],
    ["economics", ["d-1", "d-2", "e-1", "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2"]],
  ] satisfies Array<[TrackId, string[]]>)("passes major module credits for %s", (trackId, ids) => {
    const result = calculateDiagnosis({ trackIds: [trackId], completedCourseIds: [...requiredIds, ...ids] });

    expect(result.passed).toBe(true);
    expect(result.moduleProgress.every((progress) => progress.missingCredits === 0)).toBe(true);
  });

  it("passes food-bio-economy when base and convergence requirements are met", () => {
    const result = calculateDiagnosis({
      trackIds: ["food-bio-economy"],
      completedCourseIds: [
        ...requiredIds,
        "f-1",
        "f-2",
        "h-1",
        "h-2",
        "i-1",
        "m-1",
        "m-2",
        "m-3",
        "m-4",
        "n-1",
        "n-2",
        "o-1",
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.moduleProgress.every((progress) => progress.missingCredits === 0)).toBe(true);
  });

  it("detects missing required courses even when module credits are enough", () => {
    const result = calculateDiagnosis({
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-2", "f-3", "h-2", "h-3", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"],
    });

    expect(result.moduleProgress.every((progress) => progress.missingCredits === 0)).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.missingRequiredCourses.length).toBeGreaterThan(0);
  });

  it("aggregates remaining courses for multiple selected tracks", () => {
    const result = calculateDiagnosis({
      trackIds: ["food-marketing", "economics"],
      completedCourseIds: [...requiredIds, "f-1", "h-1"],
    });

    expect(result.trackResults).toHaveLength(2);
    expect(result.remainingCourses.some((course) => course.moduleId === "D")).toBe(true);
    expect(result.remainingCourses.some((course) => course.moduleId === "F")).toBe(true);
  });

  it("keeps each selected track diagnosis separate", () => {
    const result = calculateDiagnosis({
      trackIds: ["food-marketing", "economics"],
      completedCourseIds: [
        ...requiredIds,
        "f-1",
        "f-2",
        "h-1",
        "h-2",
        "i-1",
        "i-2",
        "j-1",
        "j-2",
        "l-1",
        "l-2",
      ],
    });

    const foodMarketing = result.trackResults.find((trackResult) => trackResult.trackId === "food-marketing");
    const economics = result.trackResults.find((trackResult) => trackResult.trackId === "economics");

    expect(foodMarketing?.passed).toBe(true);
    expect(economics?.passed).toBe(false);
    expect(economics?.moduleProgress.some((progress) => progress.missingCredits > 0)).toBe(true);
  });
});

describe("calculateTrackRecommendations", () => {
  it("returns all tracks with stable ranks", () => {
    const recommendations = calculateTrackRecommendations({ completedCourseIds: [] });

    expect(recommendations).toHaveLength(tracks.length);
    expect(recommendations.map((recommendation) => recommendation.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("recommends the closest track from completed courses", () => {
    const recommendations = calculateTrackRecommendations({
      completedCourseIds: [...requiredIds, "f-1", "f-2", "h-1", "h-2", "i-1", "j-1", "l-1"],
    });

    expect(recommendations[0].trackId).toBe("food-marketing");
    expect(recommendations[0].missingTotalCredits).toBeLessThanOrEqual(recommendations[1].missingTotalCredits);
    expect(recommendations[0].matchedModuleLabels.length).toBeGreaterThan(0);
  });
});
