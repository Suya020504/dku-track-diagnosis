import type { CourseSelectionRecord, StudentProfile } from "../types";
import { CURRICULUM_YEAR } from "../data/curriculumData";

type AcademicMajorRequirementsBase = {
  courseIds: readonly string[];
  completedCourseIds: readonly string[];
  missingCourseIds: readonly string[];
  cohortLabel: string;
  conditionalNote?: string;
};

export type AcademicMajorRequirementsResult = AcademicMajorRequirementsBase & (
  | { status: "known"; requiredCredits: number; completedCredits: number }
  | { status: "year-needed"; requiredCredits: null; completedCredits: null }
  | { status: "external"; requiredCredits: null; completedCredits: null }
);

// 학과 공지 「전공 이수구분 및 동일교과목」(2026-01-19, p19347).
// These are academic-major requirements, not the PDF's module-required courses.
const ACADEMIC_REQUIRED_2020_TO_2023 = ["c-1", "c-3", "h-1", "f-1", "d-1"] as const;
const ACADEMIC_REQUIRED_THROUGH_2019 = ["c-1", "c-3", "l-3", "f-1", "d-1", "e-1"] as const;

export function getAcademicMajorRequirements(
  profile: StudentProfile,
  selections: readonly CourseSelectionRecord[],
): AcademicMajorRequirementsResult {
  if (profile.affiliation === "external-student") {
    return {
      status: "external",
      courseIds: [],
      completedCourseIds: [],
      missingCourseIds: [],
      requiredCredits: null,
      completedCredits: null,
      cohortLabel: "타 학과생",
    };
  }

  const entryYear = profile.entryYear;
  // Match the admission-year range accepted by the profile input.
  if (entryYear === undefined || !Number.isInteger(entryYear) || entryYear < 2000 || entryYear > CURRICULUM_YEAR) {
    return {
      status: "year-needed",
      courseIds: [],
      completedCourseIds: [],
      missingCourseIds: [],
      requiredCredits: null,
      completedCredits: null,
      cohortLabel: "입학연도 확인 필요",
    };
  }

  const courseIds = entryYear >= 2024
    ? []
    : entryYear >= 2020
      ? [...ACADEMIC_REQUIRED_2020_TO_2023]
      : [...ACADEMIC_REQUIRED_THROUGH_2019];
  const completedIds = new Set(selections
    .filter((selection) => selection.status === "completed")
    .map((selection) => selection.courseId));
  const completedCourseIds = courseIds.filter((courseId) => completedIds.has(courseId));
  const missingCourseIds = courseIds.filter((courseId) => !completedIds.has(courseId));
  // The required courses in this notice are all 3 credits. Do not infer the
  // conditional H-1 substitution: selections do not retain completion years.
  const conditionalNote = entryYear <= 2019 && completedIds.has("h-1") && missingCourseIds.includes("l-3")
    ? "2020~2023년에 들은 마케팅조사분석은 전공필수 대체인정 여부를 학과에 확인하세요."
    : undefined;

  return {
    status: "known",
    courseIds,
    completedCourseIds,
    missingCourseIds,
    requiredCredits: courseIds.length * 3,
    completedCredits: completedCourseIds.length * 3,
    cohortLabel: entryYear >= 2024 ? "2024학년도 이후 입학생" : entryYear >= 2020 ? "2020~2023학년도 입학생" : "2019학년도 이전 입학생",
    ...(conditionalNote ? { conditionalNote } : {}),
  };
}
