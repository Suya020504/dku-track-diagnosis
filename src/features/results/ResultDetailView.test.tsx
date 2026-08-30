// @vitest-environment jsdom

import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  DiagnosisResult,
  PathProgressResult,
  StudentProfile,
  TrackDiagnosisResult,
} from "../../types";
import { ResultDetailView } from "./ResultDetailView";

const profile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "track-major",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const trackProgress: TrackDiagnosisResult = {
  trackId: "food-marketing",
  trackName: "푸드마케팅",
  trackKind: "학과전공",
  enrollmentType: "primary",
  passed: false,
  trackCredits: 9,
  missingRequiredCourses: [{
    id: "b-2",
    code: "B-2",
    name: "통계학기초",
    credits: 3,
    moduleId: "B",
    recommendedSemester: "1-2",
    required: true,
  }],
  excludedRequiredCourses: [],
  moduleProgress: [
    {
      moduleId: "F",
      label: "푸드마케팅 · F. 유통무역",
      requiredCredits: 6,
      completedCredits: 3,
      missingCredits: 3,
      courseIds: ["f-1", "f-2", "f-3"],
    },
    {
      moduleId: "H",
      label: "푸드마케팅 · H. 머천다이징",
      requiredCredits: 6,
      completedCredits: 6,
      missingCredits: 0,
      courseIds: ["h-1", "h-2", "h-3"],
    },
  ],
  recommendedCourses: [{
    id: "f-2",
    code: "F-2",
    name: "유통관리론",
    credits: 3,
    moduleId: "F",
    recommendedSemester: "3-1",
  }],
  remainingCourses: [{
    id: "f-2",
    code: "F-2",
    name: "유통관리론",
    credits: 3,
    moduleId: "F",
    recommendedSemester: "3-1",
  }],
  completionRate: 50,
};

const diagnosis: DiagnosisResult = {
  selectedTrackIds: ["food-marketing"],
  enrollmentType: "primary",
  passed: false,
  totalCredits: 36,
  trackCredits: 9,
  requiredCreditsCompleted: 15,
  requiredCreditsTotal: 18,
  missingRequiredCourses: trackProgress.missingRequiredCourses,
  excludedRequiredCourses: [],
  moduleProgress: trackProgress.moduleProgress,
  recommendedCourses: trackProgress.recommendedCourses,
  remainingCourses: trackProgress.remainingCourses,
  completionRate: 50,
  trackResults: [trackProgress],
};

const pathProgress: PathProgressResult = {
  requiredProgress: {
    completedCredits: 15,
    requiredCredits: 18,
    missingCredits: 3,
    completedCourseIds: ["c-1", "c-2", "c-3", "f-1", "h-1"],
    missingCourseIds: ["b-2"],
  },
  trackProgress,
  totalMajorProgress: {
    completedCredits: 36,
    requiredCredits: 63,
    missingCredits: 27,
  },
  reviewItems: [
    {
      code: "document-conflict",
      message: "교육과정표와 시간표의 과목명이 다릅니다.",
      evidence: "official-review-required",
    },
    {
      code: "future-offering",
      message: "향후 학기 개설 여부는 아직 확인되지 않았습니다.",
      evidence: "project-derived",
    },
  ],
  status: "current-input-satisfied",
};

function createFoodBioFixture(trackCredits: number, completionRate: number) {
  const moduleProgress = [
    { moduleId: "F" as const, label: "푸드바이오경제 · F. 유통무역", requiredCredits: 3, completedCredits: trackCredits > 0 ? 3 : 0, missingCredits: trackCredits > 0 ? 0 : 3, courseIds: ["f-1"] },
    { moduleId: "H" as const, label: "푸드바이오경제 · H. 머천다이징", requiredCredits: 3, completedCredits: 0, missingCredits: 3, courseIds: ["h-1"] },
    { moduleId: "I" as const, label: "푸드바이오경제 · I. 농식품정책", requiredCredits: 3, completedCredits: 0, missingCredits: 3, courseIds: ["i-1"] },
    { moduleId: "F" as const, label: "F/H/I 학과 모듈 합산", requiredCredits: 15, completedCredits: trackCredits > 0 ? 9 : 0, missingCredits: trackCredits > 0 ? 6 : 15, courseIds: ["f-1", "h-1", "i-1"] },
    { moduleId: "M" as const, label: "M. 바이오헬스혁신융합", requiredCredits: 8, completedCredits: 0, missingCredits: 8, courseIds: ["m-1"] },
    { moduleId: "N+O" as const, label: "N+O. 식품영양학/식품공학", requiredCredits: 7, completedCredits: 0, missingCredits: 7, courseIds: ["n-1"] },
  ];
  const track: TrackDiagnosisResult = {
    ...trackProgress,
    trackId: "food-bio-economy",
    trackName: "푸드바이오경제",
    trackKind: "융합전공",
    trackCredits,
    moduleProgress,
    completionRate,
    missingRequiredCourses: [],
    recommendedCourses: [],
    remainingCourses: [],
  };

  return {
    diagnosis: {
      ...diagnosis,
      selectedTrackIds: ["food-bio-economy"],
      trackCredits,
      moduleProgress,
      trackResults: [track],
      completionRate,
    } satisfies DiagnosisResult,
    path: {
      ...pathProgress,
      trackProgress: track,
      status: "incomplete",
    } satisfies PathProgressResult,
  };
}

function renderSection(section: "current" | "next" | "confirm") {
  return renderToStaticMarkup(
    <ResultDetailView
      result={diagnosis}
      profile={profile}
      pathProgress={pathProgress}
      section={section}
      headingRef={createRef<HTMLHeadingElement>()}
      onSectionChange={vi.fn()}
      onOpenRecommendations={vi.fn()}
      onGoToPlan={vi.fn()}
      onPrint={vi.fn()}
    />,
  );
}

describe("result decision pages", () => {
  it("renders only the current page with safe status, applied path evidence, and vertical progress", () => {
    const markup = renderSection("current");

    expect(markup.match(/<h1/g) ?? []).toHaveLength(1);
    expect(markup).toContain('data-result-panel="current"');
    expect(markup).not.toContain('data-result-panel="next"');
    expect(markup).not.toContain('data-result-panel="confirm"');
    expect(markup).toContain("참고 계산상 충족");
    expect(markup).toContain("적용 이수 경로");
    expect(markup).toContain("트랙형전공");
    expect(markup).toContain("공식 공개 확인");
    expect(markup).toContain("필수과목 진행");
    expect(markup).toContain("트랙 관련 학점 진행");
    expect(markup).toContain("전체 전공학점 진행");
    expect(markup).toContain("트랙 비교");
    expect(markup).toContain("보완할 트랙 조건이 있어요");
    expect(markup).not.toMatch(/\d+과목 보완/);
    expect(markup).not.toContain("result-top-grid");
    expect(markup).not.toContain("현재 입력 기준 충족");
    expect(markup).toContain('data-result-section="current"');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain('role="tab"');
    expect(markup).not.toContain('role="tabpanel"');
    expect(markup).not.toContain("aria-selected=");
    expect(markup).not.toContain("aria-controls=");
    expect(markup).toContain("다음 수강 후보 확인");
    expect(markup).not.toContain("세 기준별 트랙 비교 보기");
  });

  it("renders only the next page with real course evidence, reasons, module contribution, and next actions", () => {
    const markup = renderSection("next");

    expect(markup.match(/<h1/g) ?? []).toHaveLength(1);
    expect(markup).toContain('data-result-panel="next"');
    expect(markup).toContain("유통관리론");
    expect(markup).toContain("추천 이유");
    expect(markup).toContain("F. 유통무역");
    expect(markup).toContain("모듈 기여");
    expect(markup).toContain("2026 이력");
    expect(markup).toContain("이후 개설을 보장하지 않습니다");
    expect(markup).toContain("모듈별 충족 현황");
    expect(markup).toContain("세 기준별 트랙 비교 보기");
    expect(markup).toContain("추천 과목을 학기 계획에 담기");
  });

  it("renders only the confirm page with document conflicts, official questions, links, and print", () => {
    const markup = renderSection("confirm");

    expect(markup.match(/<h1/g) ?? []).toHaveLength(1);
    expect(markup).toContain('data-result-panel="confirm"');
    expect(markup).toContain("교육과정표와 시간표의 과목명이 다릅니다.");
    expect(markup).toContain("실제 수강 학기에 개설되는가");
    expect(markup).toContain("추가 전공학점");
    expect(markup).toContain("내 입학연도와 이수 경로");
    expect(markup).toContain("2026 공식 교육과정");
    expect(markup).toContain("학과 홈페이지");
    expect(markup).toContain("결과 저장/인쇄");
  });

  it.each(["current", "next", "confirm"] as const)(
    "keeps prohibited certainty language out of the %s page",
    (section) => {
      const markup = renderSection(section);

      expect(markup).not.toContain("졸업 가능");
      expect(markup).not.toContain("이수 확정");
    },
  );

  it.each([
    ["비어 있는 입력", 0, 0],
    ["일부 이수 입력", 12, 45],
  ])("does not invent an exact FoodBio course gap for %s", (_label, trackCredits, completionRate) => {
    const foodBio = createFoodBioFixture(trackCredits, completionRate);
    const markup = renderToStaticMarkup(
      <ResultDetailView
        result={foodBio.diagnosis}
        profile={profile}
        pathProgress={foodBio.path}
        section="current"
        headingRef={createRef<HTMLHeadingElement>()}
        onSectionChange={vi.fn()}
        onOpenRecommendations={vi.fn()}
        onGoToPlan={vi.fn()}
        onPrint={vi.fn()}
      />,
    );

    expect(markup).toContain("보완할 트랙 조건이 있어요");
    expect(markup).not.toMatch(/\d+과목 보완/);
  });

  it("renders overlapping FoodBio conditions in current and next without duplicate React keys", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const container = document.createElement("div");
    const root = createRoot(container);
    const foodBio = createFoodBioFixture(0, 0);

    for (const section of ["current", "next"] as const) {
      await act(async () => {
        root.render(
          <ResultDetailView
            result={foodBio.diagnosis}
            profile={profile}
            pathProgress={foodBio.path}
            section={section}
            headingRef={createRef<HTMLHeadingElement>()}
            onSectionChange={vi.fn()}
            onOpenRecommendations={vi.fn()}
            onGoToPlan={vi.fn()}
            onPrint={vi.fn()}
          />,
        );
      });
    }

    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
    await act(async () => root.unmount());
    consoleError.mockRestore();
  });
});
