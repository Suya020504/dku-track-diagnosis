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
      marker: `필수 ${required.requiredCredits}학점 · 전체 기준은 트랙 선택 후 확인`,
      description: `필수 ${required.courseIds.length}과목 ${required.requiredCredits}학점을 반영합니다. 전체 전공학점과 모듈 기준은 트랙 선택 후 확인할 수 있습니다.`,
    };
  }
  const rule = getRequirementRule(profile, targetTrackId);
  const required = rule.requiredCourseVariantId ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId] : null;
  const requiredCredits = required?.requiredCredits ?? 0;
  const requirementText = required
    ? `필수 ${required.courseIds.length}과목 ${requiredCredits}학점을 포함해 전공 ${rule.totalMajorCredits}학점이 필요합니다.`
    : `전공 ${rule.totalMajorCredits}학점이 필요하며, 별도로 지정된 필수 과목 조건은 없습니다.`;
  return {
    title, totalMajorCredits: rule.totalMajorCredits, requiredCredits, requiredCourseIds: required?.courseIds ?? [],
    marker: `전공 ${rule.totalMajorCredits}학점 · ${required ? `필수 ${requiredCredits}학점` : "필수 과목 조건 없음"}`,
    description: `${requirementText} 제공된 2026 교육과정 안내 기준이며, 개인별 적용과 최종 이수 인정은 학과에서 확인해 주세요.`,
  };
}
