import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RecommendationAxes } from "../../types";
import { TrackRecommendationAxes } from "./TrackRecommendationAxes";

const callbacks = {
  onOpenInterestSurvey: vi.fn(),
  onOpenCourseInput: vi.fn(),
  onOpenGraduationPlan: vi.fn(),
};

const differingAxes: RecommendationAxes = {
  interest: [
    { trackId: "food-marketing", score: 91, closeLeader: false, reasons: ["소비자 조사"] },
    { trackId: "economics", score: 76, closeLeader: false, reasons: ["자료 분석"] },
  ],
  progress: [
    {
      trackId: "economics",
      missingCourseCount: 2,
      missingCredits: 6,
      missingModuleLabels: ["경제학 전문지식"],
      assumption: "track-major-hypothesis",
    },
    {
      trackId: "food-marketing",
      missingCourseCount: 4,
      missingCredits: 12,
      missingModuleLabels: ["머천다이징", "프라이싱"],
      assumption: "track-major-hypothesis",
    },
  ],
  plan: [
    {
      trackId: "regional-development-consulting",
      status: "regular-plan-possible",
      unplacedCourseCount: 0,
      neededExtraTerms: 0,
      assumption: "track-major-hypothesis",
    },
    {
      trackId: "economics",
      status: "extra-term-possible",
      unplacedCourseCount: 1,
      neededExtraTerms: 1,
      assumption: "track-major-hypothesis",
    },
  ],
  alignedLeaderTrackIds: [],
};

describe("TrackRecommendationAxes", () => {
  it("renders an input CTA for each unavailable axis instead of a zero score", () => {
    const markup = renderToStaticMarkup(
      <TrackRecommendationAxes
        axes={undefined}
        courseInputReady={false}
        {...callbacks}
      />,
    );

    expect(markup).toContain("관심에 가까운 트랙");
    expect(markup).toContain("현재 이수 과목으로 가까운 트랙");
    expect(markup).toContain("졸업 전 계획을 만들기 쉬운 트랙");
    expect(markup).toContain("관심 설문 시작하기");
    expect(markup).toContain("이수 과목 입력하기");
    expect(markup).toContain("졸업 계획 입력하기");
    expect(markup).not.toContain("0점");
    expect(markup).not.toContain("0%");
  });

  it("keeps every ordered result and explanation inside its own axis", () => {
    const markup = renderToStaticMarkup(
      <TrackRecommendationAxes
        axes={differingAxes}
        courseInputReady
        activeAxis="progress"
        {...callbacks}
      />,
    );

    expect(markup).toContain("기준에 따라 결과가 달라요. 중요하게 볼 기준을 선택해 비교하세요.");
    expect(markup).toContain("91%");
    expect(markup).toContain("추가 과목 2개");
    expect(markup).toContain("부족 6학점");
    expect(markup).toContain("정규학기 계획 가능");
    expect(markup).toContain("트랙형전공으로 전환한다고 가정한 비교");
    expect(markup).toContain('aria-current="true"');
    expect(markup).not.toContain("전체 1순위");
    expect(markup).not.toContain("종합 순위");
  });

  it("describes agreement without creating an aggregate winner", () => {
    const alignedAxes: RecommendationAxes = {
      ...differingAxes,
      progress: [
        { ...differingAxes.progress[1], trackId: "food-marketing", missingCourseCount: 1 },
      ],
      plan: [
        { ...differingAxes.plan![0], trackId: "food-marketing" },
      ],
      alignedLeaderTrackIds: ["food-marketing"],
    };

    const markup = renderToStaticMarkup(
      <TrackRecommendationAxes axes={alignedAxes} courseInputReady {...callbacks} />,
    );

    expect(markup).toContain("여러 기준이 같은 방향을 가리켜요");
    expect(markup).not.toContain("종합 추천");
    expect(markup).not.toContain("가장 좋은 트랙");
  });
});
