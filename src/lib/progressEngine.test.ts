import { describe, expect, it } from "vitest";
import { calculatePathProgress } from "./progressEngine";

const externalMinor = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
} as const;

const departmentAdvanced = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
} as const;

const departmentTrack = {
  ...departmentAdvanced,
  studyPath: "track-major",
} as const;

const externalTrack = {
  ...externalMinor,
  studyPath: "track-major",
  ruleApplicability: "reference-only",
} as const;

const completed = (courseIds: string[]) =>
  courseIds.map((courseId) => ({ courseId, status: "completed" as const }));

describe("calculatePathProgress", () => {
  it("passes a minor with 21 completed major credits without track or required rules", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2"]),
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });

    expect(result.requiredProgress).toBe("not-applicable");
    expect(result.trackProgress).toBe("not-applicable");
    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 21, requiredCredits: 21 });
    expect(result.status).toBe("current-input-satisfied");
  });

  it("excludes A-module liberal courses from major credits", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: completed(["a-1", "a-2", "a-3", "a-4", "b-1", "b-2", "c-1"]),
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });

    expect(result.totalMajorProgress.completedCredits).toBe(9);
  });

  it("does not count in-progress or planned courses as completed", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: [
        { courseId: "b-1", status: "completed" },
        { courseId: "b-2", status: "in-progress" },
        { courseId: "c-1", status: "planned", plannedTerm: "next" },
      ],
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });

    expect(result.totalMajorProgress.completedCredits).toBe(3);
  });

  it("keeps ADV-60 incomplete despite completing every required course", () => {
    const result = calculatePathProgress({
      profile: departmentAdvanced,
      courseSelections: completed([
        "b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2", "d-3", "e-1", "e-2",
        "e-3", "e-4", "f-1", "f-2", "f-3", "g-1", "g-2", "g-3", "h-1", "h-2",
      ]),
      additionalMajorCredits: [],
    });

    expect(result.requiredProgress).toMatchObject({ missingCredits: 0 });
    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 60, missingCredits: 3 });
    expect(result.status).toBe("incomplete");
  });

  it("returns reference-calculation-satisfied with review for ADV-63", () => {
    const result = calculatePathProgress({
      profile: departmentAdvanced,
      courseSelections: completed([
        "b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2", "d-3", "e-1", "e-2",
        "e-3", "e-4", "f-1", "f-2", "f-3", "g-1", "g-2", "g-3", "h-1", "h-2", "h-3",
      ]),
      additionalMajorCredits: [],
    });

    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 63, missingCredits: 0 });
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "rule-source" }));
    expect(result.status).toBe("reference-calculation-satisfied");
  });

  it("keeps a department track incomplete when its 30 track credits do not reach 63 major credits", () => {
    const result = calculatePathProgress({
      profile: departmentTrack,
      courseSelections: completed([
        "b-2", "c-1", "c-2", "c-3", "f-1", "f-2", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2",
      ]),
      additionalMajorCredits: [],
      targetTrackId: "food-marketing",
    });

    expect(result.trackProgress).not.toBe("not-applicable");
    const moduleProgress = result.trackProgress === "not-applicable" ? [] : result.trackProgress.moduleProgress;
    expect(moduleProgress.every((module) => module.missingCredits === 0)).toBe(true);
    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 42, missingCredits: 21 });
    expect(result.status).toBe("incomplete");
  });

  it("requires the second three-credit course at a major-track module boundary", () => {
    const result = calculatePathProgress({
      profile: departmentTrack,
      courseSelections: completed(["f-1"]),
      additionalMajorCredits: [],
      targetTrackId: "food-marketing",
    });

    const foodDistribution = result.trackProgress === "not-applicable"
      ? undefined
      : result.trackProgress.moduleProgress.find((module) => module.moduleId === "F");
    expect(foodDistribution).toMatchObject({ completedCredits: 3, requiredCredits: 6, missingCredits: 3 });
  });

  it("enforces the FoodBio F/H/I aggregate even when each individual module has three credits", () => {
    const result = calculatePathProgress({
      profile: departmentTrack,
      courseSelections: completed(["f-1", "h-1", "i-1", "m-1", "m-2", "m-3", "m-4", "n-1", "n-2", "o-1"]),
      additionalMajorCredits: [],
      targetTrackId: "food-bio-economy",
    });

    const moduleProgress = result.trackProgress === "not-applicable" ? [] : result.trackProgress.moduleProgress;
    expect(moduleProgress.find((module) => module.label === "F/H/I 학과 모듈 합산"))
      .toMatchObject({ completedCredits: 9, requiredCredits: 15, missingCredits: 6 });
    expect(moduleProgress.find((module) => module.moduleId === "M")).toMatchObject({ missingCredits: 0 });
    expect(moduleProgress.find((module) => module.moduleId === "N+O")).toMatchObject({ missingCredits: 0 });
  });

  it("marks the external economics track contradiction for official review after all numeric requirements are met", () => {
    const result = calculatePathProgress({
      profile: externalTrack,
      courseSelections: completed([
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-1", "d-2", "e-1", "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ]),
      additionalMajorCredits: [],
      targetTrackId: "economics",
    });

    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 48, missingCredits: 0 });
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "document-conflict" }));
    expect(result.status).toBe("official-review-required");
  });

  it("does not double count duplicate completed course IDs", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: completed(["b-1", "b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2"]),
      additionalMajorCredits: [],
    });

    expect(result.totalMajorProgress.completedCredits).toBe(21);
  });

  it("flags unknown completed course IDs without counting them as major credits", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2", "unknown-1"]),
      additionalMajorCredits: [],
    });

    expect(result.totalMajorProgress.completedCredits).toBe(21);
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "unknown-course" }));
    expect(result.status).toBe("reference-calculation-satisfied");
  });

  it("counts student-entered additional credits but requires their review", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1"]),
      additionalMajorCredits: [{ id: "transfer-1", label: "전과목 인정", credits: 3, status: "student-entered" }],
    });

    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 21, missingCredits: 0 });
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "additional-credit" }));
    expect(result.status).toBe("reference-calculation-satisfied");
  });
});
