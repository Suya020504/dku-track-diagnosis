// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RecommendationAxes } from "../../types";
import { TrackRecommendationAxes } from "./TrackRecommendationAxes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const callbacks = {
  storageError: false,
  onAxisChange: vi.fn(),
  onOpenInterestSurvey: vi.fn(),
  onOpenCourseInput: vi.fn(),
  onOpenGraduationPlan: vi.fn(),
};

const differingAxes: RecommendationAxes = {
  interest: [
    { trackId: "food-marketing", score: 91, closeLeader: false, reasons: ["소비자 조사"] },
    { trackId: "economics", score: 88, closeLeader: true, reasons: ["자료 분석"] },
    { trackId: "agri-food-distribution", score: 70, closeLeader: false, reasons: ["유통 흐름"] },
    { trackId: "food-bio-economy", score: 64, closeLeader: false, reasons: ["융합 산업"] },
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
    {
      trackId: "agri-food-distribution",
      missingCourseCount: 5,
      missingCredits: 15,
      missingModuleLabels: ["유통무역", "농업경제"],
      assumption: "track-major-hypothesis",
    },
    {
      trackId: "regional-development-consulting",
      missingCourseCount: 6,
      missingCredits: 18,
      missingModuleLabels: ["지역개발"],
      assumption: "track-major-hypothesis",
    },
    {
      trackId: "food-bio-economy",
      missingCourseCount: 7,
      missingCredits: 21,
      missingModuleLabels: ["푸드바이오"],
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
    {
      trackId: "food-marketing",
      status: "official-review-required",
      unplacedCourseCount: 2,
      neededExtraTerms: 1,
      assumption: "track-major-hypothesis",
    },
  ],
  alignedLeaderTrackIds: [],
};

function renderAxes(
  activeAxis: "interest" | "progress" | "plan",
  axes: RecommendationAxes | undefined = differingAxes,
  courseInputReady = true,
) {
  return renderToStaticMarkup(
    <TrackRecommendationAxes
      axes={axes}
      courseInputReady={courseInputReady}
      activeAxis={activeAxis}
      {...callbacks}
    />,
  );
}

describe("TrackRecommendationAxes", () => {
  it("names the academic-plan recovery action and keeps it separate from the track-module joint plan", () => {
    const markup = renderAxes("plan", { progress: [], alignedLeaderTrackIds: [] });
    const view = document.createElement("div");
    view.innerHTML = markup;
    expect(view.querySelector(".dc-unavailable button")?.textContent).toBe("전공 전체 계획 입력하기");
    expect(view.textContent).toContain("전공 전체 학사 기준");
    expect(view.textContent).toContain("선택 트랙 모듈 공동 계획과 별도");
  });
  it("pairs each named comparison destination with a decorative purpose icon without a duplicate English heading", () => {
    const container = document.createElement("div");
    container.innerHTML = renderAxes("interest");
    expect(container.querySelector(".dc-axes-hero")?.textContent).not.toContain("TRACK COMPARISON");
    const destinations = [...container.querySelectorAll("[data-axis-destination]")];
    expect(destinations).toHaveLength(3);
    expect(destinations.every((button) => button.querySelector('svg[aria-hidden="true"]') && button.querySelector("strong")?.textContent)).toBe(true);
  });
  it("does not infer different leaders from zero or one populated axis", () => {
    const empty = renderAxes("interest", { progress: [], alignedLeaderTrackIds: [] });
    const single = renderAxes("interest", { interest: differingAxes.interest, progress: [], alignedLeaderTrackIds: [] });
    expect(empty).toContain("아직 비교에 필요한 입력이 없습니다");
    expect(single).toContain("현재 한 기준만");
    expect(empty + single).not.toContain("기준마다 선두 후보가 다릅니다");
  });
  it("labels partial candidate sets without a fictional count", () => {
    const markup = renderAxes("progress", { progress: differingAxes.progress.slice(0, 2), alignedLeaderTrackIds: [] });
    expect(markup.match(/data-track-id=/g)).toHaveLength(2);
    expect(markup).not.toContain("네 후보");
  });
  it("lets a student select one of five tracks then explicitly open diagnosis confirmation", async () => {
    const onChooseTrack = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<TrackRecommendationAxes axes={differingAxes} courseInputReady activeAxis="progress" {...callbacks} onChooseTrack={onChooseTrack} />));
    const options = [...container.querySelectorAll<HTMLButtonElement>(".dc-row-choice")];
    expect(options).toHaveLength(5);
    expect(container.querySelector<HTMLButtonElement>(".dc-confirm-choice")?.disabled).toBe(true);
    await act(async () => options.find((button) => button.getAttribute("aria-label")?.startsWith("경제학"))?.click());
    expect(onChooseTrack).not.toHaveBeenCalled();
    await act(async () => container.querySelector<HTMLButtonElement>(".dc-confirm-choice")?.click());
    expect(onChooseTrack).toHaveBeenCalledWith("economics");
    await act(async () => root.unmount());
  });
  it("renders three URL page destinations and one normally labelled active section", () => {
    const markup = renderAxes("progress");

    expect(markup).toContain('id="recommendation-axis-destination-progress"');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toContain('aria-labelledby="recommendation-axis-heading-progress"');
    expect(markup).toContain('data-recommendation-panel="progress"');
    expect(markup).toContain("현재 완료 과목");
    expect(markup).toContain("추가로 확인할 과목 2개");
    expect(markup).not.toContain('data-recommendation-panel="interest"');
    expect(markup).not.toContain('data-recommendation-panel="plan"');
    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain('role="tab"');
    expect(markup).not.toContain('role="tabpanel"');
    expect(markup).not.toContain('aria-selected=');
    expect(markup).not.toContain('aria-controls=');
    expect(markup).not.toContain("91%");
  });

  it("shows every available interest candidate without presenting a combined winner", () => {
    const markup = renderAxes("interest");

    expect(markup).toContain('data-lead-track="food-marketing"');
    expect(markup).toContain("소비자 조사");
    expect(markup).toContain("선두와 가까운 후보");
    expect(markup).toContain("자료 분석");
    expect(markup).toContain("유통 흐름");
    expect(markup).toContain("융합 산업");
    expect(markup).not.toContain("전체 1순위");
    expect(markup).not.toContain("종합 순위");
    expect(markup).not.toContain("91%");
  });

  it("shows all five candidates on the current-progress comparison page", () => {
    const markup = renderAxes("progress");

    expect(markup).toContain("푸드마케팅");
    expect(markup).toContain("경제학");
    expect(markup).toContain("농식품유통");
    expect(markup).toContain("지역개발 및 컨설팅");
    expect(markup).toContain("푸드바이오경제");
    expect(markup).toContain("같은 기준으로 비교");
  });

  it("keeps the plan hypothesis in a wheat evidence band on the plan axis", () => {
    const markup = renderAxes("plan");

    expect(markup).toContain('data-recommendation-panel="plan"');
    expect(markup).toContain("정규학기 계획 가능");
    expect(markup).toContain("계획에 못 담은 과목 0개");
    expect(markup).toContain("트랙형전공으로 전환한다고 가정한 비교");
    expect(markup).toContain("dc-hypothesis-band");
    expect(markup).toContain("planner-evidence-band");
  });

  it("shows the one real recovery action for the active unavailable axis", () => {
    const markup = renderAxes("progress", undefined, false);

    expect(markup).toContain("이수 과목 입력하기");
    expect(markup).not.toContain("관심 설문 시작하기");
    expect(markup).not.toContain("전공 전체 계획 입력하기");
    expect(markup).not.toContain("0점");
    expect(markup).not.toContain("0%");
  });

  it("describes different directions without selecting a track for the user", () => {
    const markup = renderAxes("interest");

    expect(markup).toContain("기준마다 선두 후보가 다릅니다");
    expect(markup).toContain("근거를 확인하고 트랙을 직접 선택해 주세요");
    expect(markup).not.toContain("recommendation-axis-summary--aligned");
    expect(markup).not.toContain("Compass Path");
    expect(markup).not.toContain("가장 좋은 트랙");
  });

  it("renders a neutral comparison summary only when two available axes share a real leader", () => {
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

    const markup = renderAxes("interest", alignedAxes);

    expect(markup).toContain("recommendation-axis-summary--aligned");
    expect(markup).toContain("기준 비교 요약");
    expect(markup).not.toContain("Compass Path");
    expect(markup).toContain("두 개 이상의 기준에서 선두로 나타났습니다");
    expect(markup).not.toContain("종합 추천");
  });

  it("does not align against a progress leader hidden by unfinished course input", () => {
    const contaminatedAxes: RecommendationAxes = {
      ...differingAxes,
      progress: [
        { ...differingAxes.progress[1], trackId: "food-marketing", missingCourseCount: 1 },
      ],
      plan: [
        { ...differingAxes.plan![0], trackId: "economics" },
      ],
      alignedLeaderTrackIds: ["food-marketing"],
    };

    const markup = renderAxes("interest", contaminatedAxes, false);

    expect(markup).toContain("기준마다 선두 후보가 다릅니다");
    expect(markup).not.toContain("recommendation-axis-summary--aligned");
  });

  it("labels tied interest leaders without using the stable array order as a rank", () => {
    const tiedAxes: RecommendationAxes = {
      ...differingAxes,
      interest: [
        differingAxes.interest![0],
        { ...differingAxes.interest![1], score: 91 },
        differingAxes.interest![2],
      ],
    };

    const markup = renderAxes("interest", tiedAxes);

    const view = document.createElement("div");
    view.innerHTML = markup;
    const leaderLabels = [...view.querySelectorAll(".dc-track-row > header > span")]
      .filter((node) => node.textContent === "공동 선두 후보");
    expect(leaderLabels).toHaveLength(2);
    expect(markup).toContain("동점 후보 사이에는 우열을 정하지 않습니다");
  });

  it("names tied leaders beyond the three detailed candidates instead of silently hiding them", () => {
    const tiedAxes: RecommendationAxes = {
      ...differingAxes,
      interest: differingAxes.interest!.map((candidate) => ({
        ...candidate,
        score: 91,
        closeLeader: true,
      })),
    };

    const markup = renderAxes("interest", tiedAxes);

    expect(markup).toContain("공동 선두 후보: 푸드마케팅 · 경제학 · 농식품유통 · 푸드바이오경제");
    expect(markup).toContain("융합 산업");
  });

  it("keeps every URL destination in the standard tab order and activates by button click", async () => {
    const onAxisChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TrackRecommendationAxes
          axes={differingAxes}
          courseInputReady
          storageError={false}
          activeAxis="interest"
          onAxisChange={onAxisChange}
          onOpenInterestSurvey={vi.fn()}
          onOpenCourseInput={vi.fn()}
          onOpenGraduationPlan={vi.fn()}
        />,
      );
    });

    const destinations = [...container.querySelectorAll<HTMLButtonElement>("[data-axis-destination]")];
    const interestDestination = container.querySelector<HTMLButtonElement>("#recommendation-axis-destination-interest");
    const progressDestination = container.querySelector<HTMLButtonElement>("#recommendation-axis-destination-progress");

    expect(destinations).toHaveLength(3);
    expect(destinations.every((destination) => destination.tabIndex === 0)).toBe(true);
    expect(interestDestination?.getAttribute("aria-current")).toBe("page");
    expect(progressDestination?.getAttribute("aria-current")).toBeNull();

    await act(async () => {
      progressDestination?.focus();
      progressDestination?.click();
    });

    expect(onAxisChange).toHaveBeenCalledWith("progress");
    await act(async () => root.unmount());
  });

  it("keeps a persistence warning visible on the axes page", () => {
    const markup = renderToStaticMarkup(
      <TrackRecommendationAxes
        axes={undefined}
        courseInputReady={false}
        activeAxis="interest"
        {...callbacks}
        storageError
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("새로고침하면 답변이 사라질 수 있습니다");
  });
});
