// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type {
  ModuleProgress,
  PathProgressResult,
  StudentProfile,
  TrackDiagnosisResult,
} from "../../types";
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

const foodBioProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "track-major",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const satisfiedFoodBioConditions: ModuleProgress[] = [
  { moduleId: "F", label: "푸드바이오경제 · F. 유통무역", requiredCredits: 3, completedCredits: 3, missingCredits: 0, courseIds: ["f-1"] },
  { moduleId: "H", label: "푸드바이오경제 · H. 머천다이징", requiredCredits: 3, completedCredits: 3, missingCredits: 0, courseIds: ["h-1"] },
  { moduleId: "I", label: "푸드바이오경제 · I. 농식품정책", requiredCredits: 3, completedCredits: 3, missingCredits: 0, courseIds: ["i-1"] },
  { moduleId: "F", label: "F/H/I 학과 모듈 합산", requiredCredits: 15, completedCredits: 15, missingCredits: 0, courseIds: ["f-1", "h-1", "i-1"] },
  { moduleId: "M", label: "M. 바이오헬스혁신융합", requiredCredits: 8, completedCredits: 8, missingCredits: 0, courseIds: ["m-1", "m-2", "m-3", "m-4"] },
  { moduleId: "N+O", label: "N+O. 식품영양학/식품공학", requiredCredits: 7, completedCredits: 7, missingCredits: 0, courseIds: ["n-1", "n-2", "o-1"] },
];

function foodBioTrack(moduleProgress: ModuleProgress[]): TrackDiagnosisResult {
  return {
    trackId: "food-bio-economy",
    trackName: "푸드바이오경제",
    trackKind: "융합전공",
    enrollmentType: "primary",
    passed: moduleProgress.every((condition) => condition.missingCredits === 0),
    trackCredits: 30,
    missingRequiredCourses: [],
    excludedRequiredCourses: [],
    moduleProgress,
    recommendedCourses: [],
    remainingCourses: [],
    completionRate: 100,
  };
}

function foodBioPath(trackProgress: TrackDiagnosisResult): PathProgressResult {
  return {
    requiredProgress: "not-applicable",
    trackProgress,
    totalMajorProgress: { completedCredits: 63, requiredCredits: 63, missingCredits: 0 },
    reviewItems: [],
    status: trackProgress.passed ? "reference-calculation-satisfied" : "incomplete",
  };
}

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
  expect(markup).not.toContain("트랙 모듈 진행");
  expect(markup).toContain('class="planner-progress-path"');
});

it("presents percentages as secondary details and keeps reference satisfaction cautious", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary profile={referenceAdvancedMajor} result={referenceSatisfiedResult} />,
  );

  expect(markup).toContain("참고 계산상 충족");
  expect(markup).toContain("제공 최종안 참고");
  expect(markup).toContain("100% 진행");
  expect(markup).toContain("planner-progress-path__percentage");
  expect(markup).not.toContain("현재 입력 기준 충족");
  expect(markup).not.toContain("이수 확정");
});

it("uses department-confirmation wording when personal applicability is unresolved", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={{ ...referenceAdvancedMajor, ruleApplicability: "student-confirmed" }}
      result={{ ...referenceSatisfiedResult, status: "official-review-required" }}
    />,
  );

  expect(markup).toContain("학과 확인 필요");
  expect(markup).not.toContain("공식 확인 필요");
});

it("uses the authoritative 30-credit FoodBio denominator instead of summing overlapping condition rows", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={foodBioProfile}
      result={foodBioPath(foodBioTrack(satisfiedFoodBioConditions))}
    />,
  );

  expect(markup).toContain("트랙 관련 학점 진행");
  expect(markup).toContain("30 / 30학점");
  expect(markup).toContain("100% 진행");
  expect(markup).toContain("참고 계산상 학점 기준 도달");
  expect(markup).not.toContain("30 / 39학점");
});

it("keeps a hard-condition warning visible when FoodBio has 30 credits but one condition is missing", () => {
  const conditionMissing = satisfiedFoodBioConditions.map((condition) => (
    condition.label === "푸드바이오경제 · F. 유통무역"
      ? { ...condition, completedCredits: 0, missingCredits: 3 }
      : condition
  ));
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={foodBioProfile}
      result={foodBioPath(foodBioTrack(conditionMissing))}
    />,
  );

  expect(markup).toContain("30 / 30학점");
  expect(markup).toContain("100% 진행");
  expect(markup).toContain("보완할 트랙 조건이 있어요");
  expect(markup).toContain("F. 유통무역");
  expect(markup).toContain("3학점 보완");
});

it("renders overlapping FoodBio condition rows without duplicate React keys", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <PathProgressSummary
        profile={foodBioProfile}
        result={foodBioPath(foodBioTrack(satisfiedFoodBioConditions))}
      />,
    );
  });

  expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
  await act(async () => root.unmount());
  consoleError.mockRestore();
});
