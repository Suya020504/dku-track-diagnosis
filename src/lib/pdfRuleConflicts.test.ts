import { describe, expect, it } from "vitest";
import { calculatePathProgress } from "./progressEngine";
import type { StudentProfile } from "../types";

describe("provided PDF internal differences", () => {
  it.each([
    ["advanced-major", 63, "45학점", "39학점"],
    ["department-with-other-major", 42, "B·C", "18학점"],
  ] as const)("keeps %s total but reports the actual wording conflict", (studyPath, total, a, b) => {
    const profile: StudentProfile = { affiliation: "department-student", studyPath, goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" };
    const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    expect(result.totalMajorProgress.requiredCredits).toBe(total);
    expect(result.reviewItems.some(item => item.code === "document-conflict" && item.message.includes(a) && item.message.includes(b))).toBe(true);
  });
});
