import { describe, expect, it } from "vitest";
import { courses } from "../data/curriculumData";
import type {
  CourseCombinationInput,
  StudentProfile,
  TrackId,
} from "../types";
import {
  calculateUnallocatedElectiveCredits,
  findMinimumCourseCombination,
  findMinimumCourseCombinations,
} from "./courseCombination";

const coursesById = Object.fromEntries(courses.map((course) => [course.id, course]));
const baseProfile = {
  goal: "plan-graduation",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
} as const;
const departmentTrackProfile: StudentProfile = {
  ...baseProfile,
  affiliation: "department-student",
  studyPath: "track-major",
};
const departmentAdvancedProfile: StudentProfile = {
  ...baseProfile,
  affiliation: "department-student",
  studyPath: "advanced-major",
};
const externalMinorProfile: StudentProfile = {
  ...baseProfile,
  affiliation: "external-student",
  studyPath: "minor",
};
const foodBioInput: CourseCombinationInput = {
  profile: departmentTrackProfile,
  targetTrackId: "food-bio-economy",
  assumedCourseIds: ["f-1", "h-1", "i-1"],
  additionalMajorCredits: [],
  schedulableCourseIds: new Set(courses.map((course) => course.id)),
};

describe("findMinimumCourseCombination", () => {
  it("exposes every hard-condition match from the first minimum-course layer", () => {
    const results = findMinimumCourseCombinations({
      profile: departmentTrackProfile,
      targetTrackId: "food-marketing",
      assumedCourseIds: [
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "f-2", "h-2",
        "i-1", "i-2", "j-1", "l-1", "l-2",
      ],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(results.map((result) => result.courseIds)).toEqual([
      ["j-2"],
      ["j-3"],
    ]);
    expect(results.every((result) => result.newCourseCount === 1)).toBe(true);
    expect(results.every((result) => result.hardConditionsSatisfied)).toBe(true);
  });

  it("counts a required course that also fills a module only once", () => {
    const result = findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId: "food-marketing",
      assumedCourseIds: ["c-1", "c-2", "c-3"],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(new Set(result.courseIds).size).toBe(result.courseIds.length);
    expect(result.courseIds).toContain("f-1");
    expect(result.newCredits).toBe(
      result.courseIds.reduce((sum, id) => sum + coursesById[id].credits, 0),
    );
  });

  it("returns only unallocated elective credits for a minor without inventing courses", () => {
    const result = findMinimumCourseCombination({
      profile: externalMinorProfile,
      assumedCourseIds: ["b-1", "b-2", "c-1"],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(),
    });

    expect(result.courseIds).toEqual([]);
    expect(result.unallocatedElectiveCredits).toBe(12);
    expect(result.hardConditionsSatisfied).toBe(true);
  });

  it("uses course code as the final stable tie breaker", () => {
    const first = findMinimumCourseCombination(foodBioInput);
    const second = findMinimumCourseCombination(foodBioInput);

    expect(second).toEqual(first);
    expect(first.comparisonKey.split("|")).toHaveLength(5);
    expect(first.comparisonKey.split("|")[4]).toBe(
      first.courseIds.map((id) => coursesById[id].code).sort().join(","),
    );
  });

  it("chooses the lower course code after all earlier comparison fields tie", () => {
    const result = findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId: "economics",
      assumedCourseIds: [
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-2", "e-1",
        "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(result.courseIds).toEqual(["d-1"]);
    expect(result.comparisonKey).toBe("1|3|0|32|D-1");
  });

  it("prefers the schedulable course before recommended semester and course code", () => {
    const result = findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId: "economics",
      assumedCourseIds: [
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-2", "e-1",
        "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(["d-3"]),
    });

    expect(result.courseIds).toEqual(["d-3"]);
    expect(result.comparisonKey).toBe("1|3|0|32|D-3");
  });

  it("prefers the earlier recommended semester when schedulability ties", () => {
    const result = findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId: "economics",
      assumedCourseIds: [
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-1", "d-2",
        "e-1", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(result.courseIds).toEqual(["e-2"]);
    expect(result.comparisonKey).toBe("1|3|0|22|E-2");
  });

  it("does not invent B-1 as part of the starred six required variant", () => {
    const result = findMinimumCourseCombination({
      profile: departmentAdvancedProfile,
      assumedCourseIds: [],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(result.courseIds).toEqual(["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"]);
    expect(result.courseIds).not.toContain("b-1");
  });

  it("selects the minimum 2-credit M and exact 7-credit N/O combination", () => {
    const result = findMinimumCourseCombination(foodBioInput);
    const selected = result.courseIds.map((id) => coursesById[id]);
    const moduleM = selected.filter((course) => course.moduleId === "M");
    const moduleNO = selected.filter((course) => course.moduleId === "N" || course.moduleId === "O");

    expect(moduleM).toHaveLength(4);
    expect(moduleM.reduce((sum, course) => sum + course.credits, 0)).toBe(8);
    expect(moduleNO).toHaveLength(3);
    expect(moduleNO.reduce((sum, course) => sum + course.credits, 0)).toBe(7);
  });

  it("ignores unknown assumed IDs for both allocation and selected courses", () => {
    const input: CourseCombinationInput = {
      profile: externalMinorProfile,
      assumedCourseIds: ["unknown-course"],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(),
    };

    const result = findMinimumCourseCombination(input);

    expect(result.courseIds).toEqual([]);
    expect(result.unallocatedElectiveCredits).toBe(21);
    expect(calculateUnallocatedElectiveCredits(input)).toBe(21);
  });

  it("counts duplicate non-A credits once and excludes A-module credits", () => {
    const result = findMinimumCourseCombination({
      profile: externalMinorProfile,
      assumedCourseIds: ["a-1", "unknown-course", "b-2", "b-2"],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(),
    });

    expect(result.courseIds).toEqual([]);
    expect(result.unallocatedElectiveCredits).toBe(18);
  });

  it("adds a course when total track credits reach 30 but one module remains short", () => {
    const result = findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId: "food-marketing",
      assumedCourseIds: [
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "f-2", "h-2",
        "i-1", "i-2", "j-1", "j-2", "j-3", "l-1",
      ],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    });

    expect(result.courseIds).toEqual(["l-3"]);
    expect(result.hardConditionsSatisfied).toBe(true);
  });

  it("returns identical combinations for all five tracks across repeated runs", () => {
    const trackIds: TrackId[] = [
      "food-marketing",
      "regional-development-consulting",
      "agri-food-distribution",
      "economics",
      "food-bio-economy",
    ];
    const run = () => trackIds.map((targetTrackId) => findMinimumCourseCombination({
      profile: departmentTrackProfile,
      targetTrackId,
      assumedCourseIds: [],
      additionalMajorCredits: [],
      schedulableCourseIds: new Set(courses.map((course) => course.id)),
    }));

    expect(run()).toEqual(run());
  });
});
