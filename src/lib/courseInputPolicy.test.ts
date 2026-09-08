import { describe, expect, it } from "vitest";
import type { StudentProfile } from "../types";
import { getCourseInputPolicy } from "./courseInputPolicy";

function profile(affiliation: StudentProfile["affiliation"], studyPath: StudentProfile["studyPath"]): StudentProfile {
  return { affiliation, studyPath, goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "student-confirmed" };
}

describe("getCourseInputPolicy", () => {
  it("does not invent a primary-major policy without a selected profile", () => {
    expect(getCourseInputPolicy()).toMatchObject({ totalMajorCredits: null, requiredCredits: null, requiredCourseIds: [] });
  });
  it.each([
    ["department-student", "advanced-major", "심화전공 기준", 63, 18],
    ["department-student", "department-with-other-major", "학과 다전공 기준", 42, 18],
    ["external-student", "double-major", "복수전공 기준", 42, 18],
    ["external-student", "minor", "부전공 기준", 21, 0],
  ] as const)("preserves the actual %s %s policy", (affiliation, studyPath, title, totalMajorCredits, requiredCredits) => {
    const policy = getCourseInputPolicy(profile(affiliation, studyPath));
    expect(policy).toMatchObject({ title, totalMajorCredits, requiredCredits });
    expect(policy.requiredCourseIds).toEqual(requiredCredits ? ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"] : []);
    expect(policy.requiredCourseIds).not.toContain("b-1");
  });
  it("does not choose a default track or throw when the target is still undecided", () => {
    const policy = getCourseInputPolicy(profile("external-student", "track-major"));
    expect(policy).toMatchObject({ title: "전공 이수 형태 미정", totalMajorCredits: null, requiredCredits: null });
    expect(policy.description).toContain("전공 구분을 확인하면");
  });
  it("does not expose a hypothetical academic total until the degree context is known", () => {
    expect(getCourseInputPolicy(profile("external-student", "track-major"), "economics").totalMajorCredits).toBeNull();
    expect(getCourseInputPolicy(profile("department-student", "track-major"), "economics").totalMajorCredits).toBeNull();
    expect(getCourseInputPolicy({...profile("department-student", "track-major"),majorRole:"primary",otherMajor:"no"}, "economics").totalMajorCredits).toBe(63);
  });
});
