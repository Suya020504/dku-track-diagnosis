import { getRequirementRule, REQUIRED_COURSE_VARIANTS } from "../data/requirementRules2026";
import type { StudentProfile, StudyPath, TrackId } from "../types";

export type CourseInputPolicy = {
  title: string;
  totalMajorCredits: number | null;
  requiredCredits: number | null;
  requiredCourseIds: readonly string[];
  marker: string;
  description: string;
};

const pathTitles: Record<StudyPath, string> = {
  "advanced-major": "심화전공 기준",
  "track-major": "트랙형 전공 기준",
  "department-with-other-major": "학과 다전공 기준",
  "double-major": "복수전공 기준",
  minor: "부전공 기준",
};

export function getCourseInputPolicy(profile?: StudentProfile, targetTrackId?: TrackId): CourseInputPolicy {
  if (!profile) {
    return {
      title: "이수 경로 미선택", totalMajorCredits: null, requiredCredits: null, requiredCourseIds: [],
      marker: "이수 경로 선택 후 확인",
      description: "소속과 이수 경로를 선택하면 필요한 전공학점과 필수 과목을 안내합니다. 과목은 먼저 입력해도 됩니다.",
    };
  }
  const title = pathTitles[profile.studyPath];
  if (profile.studyPath === "track-major" && !targetTrackId) {
    const required = REQUIRED_COURSE_VARIANTS["starred-six-2026"];
    return {
      title, totalMajorCredits: null, requiredCredits: required.requiredCredits, requiredCourseIds: required.courseIds,
      marker: `모듈 내 필수 ${required.requiredCredits}학점 · 전체 기준은 트랙 선택 후 확인`,
      description: `모듈 내 필수 ${required.courseIds.length}과목 ${required.requiredCredits}학점을 확인합니다. 전체 기준은 트랙 선택 후 확인할 수 있습니다. 입학연도별 전공필수는 결과에서 따로 확인하세요.`,
    };
  }
  const rule = getRequirementRule(profile, targetTrackId);
  const required = rule.requiredCourseVariantId ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId] : null;
  const requiredCredits = required?.requiredCredits ?? 0;
  const requirementText = required
    ? `모듈 내 필수 ${required.courseIds.length}과목 ${requiredCredits}학점과 전공 ${rule.totalMajorCredits}학점을 확인합니다. 입학연도별 전공필수는 결과에서 따로 확인하세요.`
    : `부전공은 전공 ${rule.totalMajorCredits}학점을 확인하며, 이 계산에는 별도의 모듈필수 조건을 적용하지 않습니다.`;
  return {
    title, totalMajorCredits: rule.totalMajorCredits, requiredCredits, requiredCourseIds: required?.courseIds ?? [],
    marker: `전공 ${rule.totalMajorCredits}학점 · ${required ? `모듈 내 필수 ${requiredCredits}학점` : "모듈필수 조건 없음"}`,
    description: requirementText,
  };
}
