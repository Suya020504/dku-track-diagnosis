import { describe, expect, it } from "vitest";
import {
  REQUIRED_COURSE_VARIANTS,
  getAllowedStudyPaths,
  getRequirementRule,
} from "./requirementRules2026";

describe("2026 requirement rule contract", () => {
  it("keeps affiliation and study path as separate axes", () => {
    expect(getAllowedStudyPaths("department-student")).toEqual([
      "advanced-major",
      "track-major",
      "department-with-other-major",
    ]);
    expect(getAllowedStudyPaths("external-student")).toEqual([
      "double-major",
      "minor",
      "track-major",
    ]);
  });

  it("keeps the provided starred-six variant non-official", () => {
    expect(REQUIRED_COURSE_VARIANTS["starred-six-2026"]).toMatchObject({
      courseIds: ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"],
      requiredCredits: 18,
      evidence: "provided-final-plan",
      allowsOfficialCompletion: false,
    });
  });

  it("does not apply required or track rules to a minor", () => {
    const rule = getRequirementRule({
      goal: "check-progress",
      affiliation: "external-student",
      studyPath: "minor",
      entryYear: 2026,
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: "reference-only",
    });
    expect(rule.requiredCourseVariantId).toBeNull();
    expect(rule.trackRule).toBeNull();
    expect(rule.totalMajorCredits).toBe(21);
  });

  it("requires an explicit track for track-major profiles", () => {
    expect(() =>
      getRequirementRule({
        goal: "find-track",
        affiliation: "department-student",
        studyPath: "track-major",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      }),
    ).toThrow("A target track is required");
  });

  it("uses track-specific totals for external track students", () => {
    const rule = getRequirementRule(
      {
        goal: "check-progress",
        affiliation: "external-student",
        studyPath: "track-major",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      "economics",
    );
    expect(rule.totalMajorCredits).toBe(48);
    expect(rule.evidence).toBe("official-review-required");
    expect(rule.forcesOfficialReview).toBe(true);
  });
});
