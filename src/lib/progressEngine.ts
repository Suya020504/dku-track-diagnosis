import { courses } from "../data/curriculumData";
import { getRequirementRule, REQUIRED_COURSE_VARIANTS } from "../data/requirementRules2026";
import { calculateDiagnosis } from "./diagnosis";
import type {
  AdditionalMajorCredit,
  CourseSelectionRecord,
  PathProgressResult,
  StudentProfile,
  TrackId,
} from "../types";

export type PathProgressInput = {
  profile: StudentProfile;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  courseInputReviewedAt?: string;
  targetTrackId?: TrackId;
};

export function calculatePathProgress(input: PathProgressInput): PathProgressResult {
  const completedIds = [...new Set(
    input.courseSelections
      .filter((item) => item.status === "completed")
      .map((item) => item.courseId),
  )];
  const knownCompletedCourses = completedIds
    .map((id) => courses.find((course) => course.id === id))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));
  const unknownIds = completedIds.filter((id) => !knownCompletedCourses.some((course) => course.id === id));
  const majorCredits = knownCompletedCourses
    .filter((course) => course.moduleId !== "A")
    .reduce((sum, course) => sum + course.credits, 0);
  const additionalCredits = input.additionalMajorCredits.reduce((sum, item) => sum + item.credits, 0);
  const rule = getRequirementRule(input.profile, input.targetTrackId);

  const completedIdSet = new Set(knownCompletedCourses.map((course) => course.id));
  const totalCompletedCredits = majorCredits + additionalCredits;
  const totalMajorProgress = {
    completedCredits: totalCompletedCredits,
    requiredCredits: rule.totalMajorCredits,
    missingCredits: Math.max(0, rule.totalMajorCredits - totalCompletedCredits),
  };

  const variant = rule.requiredCourseVariantId
    ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId]
    : undefined;
  const variantCourseIds = new Set<string>(variant?.courseIds ?? []);
  const completedRequiredIds = variant
    ? [...variantCourseIds].filter((id) => completedIdSet.has(id))
    : [];
  const missingRequiredIds = variant
    ? [...variantCourseIds].filter((id) => !completedIdSet.has(id))
    : [];
  const requiredCompletedCredits = knownCompletedCourses
    .filter((course) => completedRequiredIds.includes(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  const requiredProgress = variant
    ? {
        completedCredits: requiredCompletedCredits,
        requiredCredits: variant.requiredCredits,
        missingCredits: Math.max(0, variant.requiredCredits - requiredCompletedCredits),
        completedCourseIds: completedRequiredIds,
        missingCourseIds: missingRequiredIds,
      }
    : "not-applicable";

  const trackProgress = rule.trackRule
    ? calculateDiagnosis({
        trackIds: [input.targetTrackId!],
        completedCourseIds: [...completedIdSet],
        enrollmentType: "primary",
      }).trackResults[0]
    : "not-applicable";

  const reviewItems = [] as PathProgressResult["reviewItems"];
  if (unknownIds.length > 0) {
    reviewItems.push({
      code: "unknown-course",
      message: `교육과정에서 찾지 못한 과목 ${unknownIds.length}개를 확인해 주세요.`,
      evidence: "official-review-required",
    });
  }
  if (input.additionalMajorCredits.some((item) => item.status === "student-entered")) {
    reviewItems.push({
      code: "additional-credit",
      message: "직접 입력한 기타 인정 전공학점은 학과 확인이 필요합니다.",
      evidence: "official-review-required",
    });
  }
  if (rule.forcesOfficialReview) {
    reviewItems.push({
      code: rule.evidence === "official-review-required" ? "document-conflict" : "rule-source",
      message:
        rule.evidence === "official-review-required"
          ? "제공 문서의 최소학점 범위와 계산 결과가 달라 공식 확인이 필요합니다."
          : "제공된 2026 최종안 기준의 참고 계산입니다.",
      evidence: rule.evidence,
    });
  }

  const requiredSatisfied =
    requiredProgress === "not-applicable" || requiredProgress.missingCredits === 0;
  const trackSatisfied =
    trackProgress === "not-applicable" ||
    trackProgress.moduleProgress.every((module) => module.missingCredits === 0);
  const numericSatisfied =
    requiredSatisfied && trackSatisfied && totalMajorProgress.missingCredits === 0;
  const status = !numericSatisfied
    ? "incomplete"
    : rule.evidence === "official-review-required"
      ? "official-review-required"
      : reviewItems.length > 0
        ? "reference-calculation-satisfied"
        : "current-input-satisfied";

  return {
    requiredProgress,
    trackProgress,
    totalMajorProgress,
    reviewItems,
    status,
  };
}
