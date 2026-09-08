import { describe, expect, it } from "vitest";
import type { CourseSelectionRecord, StudentProfile } from "../types";
import { getAcademicMajorRequirements } from "./academicMajorRequirements";
import { calculatePathProgress } from "./progressEngine";

const profile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2021,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const completed = (ids: string[]): CourseSelectionRecord[] =>
  ids.map((courseId) => ({ courseId, status: "completed" }));

describe("입학연도별 전공필수", () => {
  it("keeps environment economics missing for 2021 even when all six module-required courses are completed", () => {
    const selections = completed(["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"]);
    const academic = getAcademicMajorRequirements(profile, selections);
    expect(academic.status).toBe("known");
    expect(academic.requiredCredits).toBe(15);
    expect(academic.completedCredits).toBe(12);
    expect(academic.missingCourseIds).toEqual(["d-1"]);
    const module = calculatePathProgress({ profile, courseSelections: selections, additionalMajorCredits: [] });
    expect(module.requiredProgress).toMatchObject({ missingCourseIds: [], missingCredits: 0 });
  });

  it("completes the 2021 academic checklist without counting it as the six-course module condition", () => {
    const selections = completed(["c-1", "c-3", "h-1", "f-1", "d-1"]);
    const academic = getAcademicMajorRequirements(profile, selections);
    expect(academic.completedCredits).toBe(15);
    expect(academic.missingCourseIds).toEqual([]);
    const module = calculatePathProgress({ profile, courseSelections: selections, additionalMajorCredits: [] });
    expect(module.requiredProgress).toMatchObject({ missingCourseIds: ["b-2", "c-2"], missingCredits: 6 });
  });

  it.each([2020, 2023])("applies the five-course academic requirement at the %s cohort boundary", (entryYear) => {
    const academic = getAcademicMajorRequirements({ ...profile, entryYear }, []);
    expect(academic.courseIds).toEqual(["c-1", "c-3", "h-1", "f-1", "d-1"]);
    expect(academic.requiredCredits).toBe(15);
  });

  it("does not automatically replace econometrics with marketing research for a 2019 student without a completion year", () => {
    const academic = getAcademicMajorRequirements(
      { ...profile, entryYear: 2019 },
      completed(["c-1", "c-3", "h-1", "f-1", "d-1", "e-1"]),
    );
    expect(academic.courseIds).toEqual(["c-1", "c-3", "l-3", "f-1", "d-1", "e-1"]);
    expect(academic.requiredCredits).toBe(18);
    expect(academic.completedCredits).toBe(15);
    expect(academic.missingCourseIds).toEqual(["l-3"]);
    expect(academic.conditionalNote).toContain("2020~2023년에 들은 마케팅조사분석");
  });

  it("does not show a conditional replacement note after the original old-cohort course is completed", () => {
    const academic = getAcademicMajorRequirements({ ...profile, entryYear: 2019 }, completed(["h-1", "l-3"]));
    expect(academic.completedCourseIds).toEqual(["l-3"]);
    expect(academic.conditionalNote).toBeUndefined();
  });

  it.each([2024, 2026])("reports no academic-major-required courses for the department's %s cohort", (entryYear) => {
    const academic = getAcademicMajorRequirements({ ...profile, entryYear }, completed(["b-2", "c-1"]));
    expect(academic.status).toBe("known");
    expect(academic.courseIds).toEqual([]);
    expect(academic.requiredCredits).toBe(0);
    expect(academic.completedCredits).toBe(0);
  });

  it.each([undefined, 0, 1999, 2027, 2021.5, Number.NaN])("does not confuse a missing or invalid admission year (%s) with zero requirements", (entryYear) => {
    const academic = getAcademicMajorRequirements({ ...profile, entryYear }, []);
    expect(academic.status).toBe("year-needed");
    expect(academic.requiredCredits).toBeNull();
    expect(academic.completedCredits).toBeNull();
  });

  it.each(["double-major", "minor"] as const)("does not apply the department's 2024 zero rule to an external %s", (studyPath) => {
    const academic = getAcademicMajorRequirements(
      { ...profile, affiliation: "external-student", studyPath, entryYear: 2024 },
      [],
    );
    expect(academic.status).toBe("external");
    expect(academic.requiredCredits).toBeNull();
    expect(academic.completedCredits).toBeNull();
  });

  it("counts only completed academic courses once and never mutates selection records", () => {
    const selections: CourseSelectionRecord[] = [
      { courseId: "c-1", status: "completed" },
      { courseId: "c-1", status: "completed" },
      { courseId: "c-3", status: "in-progress" },
      { courseId: "h-1", status: "planned", plannedTerm: "next" },
      { courseId: "unknown", status: "completed" },
    ];
    const original = structuredClone(selections);
    const academic = getAcademicMajorRequirements(profile, selections);
    expect(academic.completedCourseIds).toEqual(["c-1"]);
    expect(academic.completedCredits).toBe(3);
    expect(academic.missingCourseIds).toEqual(["c-3", "h-1", "f-1", "d-1"]);
    expect(selections).toEqual(original);
  });
});
