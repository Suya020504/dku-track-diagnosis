import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { PathProgressResult, StudentProfile } from "../../types";
import { PathProgressSummary } from "./PathProgressSummary";

const externalMinor: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const referenceAdvancedMajor: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const referenceSatisfiedResult: PathProgressResult = {
  requiredProgress: {
    completedCredits: 18,
    requiredCredits: 18,
    missingCredits: 0,
    completedCourseIds: ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"],
    missingCourseIds: [],
  },
  trackProgress: "not-applicable",
  totalMajorProgress: { completedCredits: 63, requiredCredits: 63, missingCredits: 0 },
  reviewItems: [{
    code: "rule-source",
    message: "제공된 2026 최종안 기준의 참고 계산입니다.",
    evidence: "provided-final-plan",
  }],
  status: "reference-calculation-satisfied",
};

it("shows minor credit progress without track-module progress", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={externalMinor}
      result={{
        requiredProgress: "not-applicable",
        trackProgress: "not-applicable",
        totalMajorProgress: { completedCredits: 15, requiredCredits: 21, missingCredits: 6 },
        reviewItems: [],
        status: "incomplete",
      }}
    />,
  );

  expect(markup).toContain("부전공 전공학점");
  expect(markup).toContain("15 / 21학점");
  expect(markup).not.toContain("트랙 모듈 진행도");
});

it("marks reference-only satisfaction as requiring official review", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary profile={referenceAdvancedMajor} result={referenceSatisfiedResult} />,
  );

  expect(markup).toContain("참고 계산상 충족");
  expect(markup).toContain("공식 확인 필요");
  expect(markup).not.toContain("이수 확정");
});
