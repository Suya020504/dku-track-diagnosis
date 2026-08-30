// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { calculateGraduationPlan } from "./lib/graduationPlanner";
import { interestSurveyQuestions } from "./lib/interestSurvey";
import { STORAGE_KEY_V2, createEmptyAppState } from "./lib/storage";
import type {
  GraduationPlanPreferences,
  InterestSurveyAnswer,
  InterestSurveyState,
  SavedAppStateV2,
  StudentProfile,
} from "./types";

const planProfile: StudentProfile = {
  goal: "plan-graduation",
  affiliation: "department-student",
  studyPath: "advanced-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const savedPlanPreferences: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 6,
  considerSeasonalTerm: false,
};

function savedLandingPlanState(): SavedAppStateV2 {
  const ready: SavedAppStateV2 = {
    ...createEmptyAppState(),
    profile: planProfile,
    courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
  };
  return {
    ...ready,
    graduationPlanPreferences: savedPlanPreferences,
    graduationPlan: calculateGraduationPlan({
      profile: planProfile,
      courseSelections: [],
      additionalMajorCredits: [],
      preferences: savedPlanPreferences,
      generatedAt: "2026-08-30T01:00:00.000Z",
    }),
  };
}

let root: Root | undefined;

function completeSurvey(answer: InterestSurveyAnswer = 3): InterestSurveyState {
  return {
    answers: Object.fromEntries(
      interestSurveyQuestions.map((question) => [question.id, answer]),
    ) as Record<string, InterestSurveyAnswer>,
    currentIndex: 9,
    completedAt: "2026-08-30T00:00:00.000Z",
  };
}

function saveState(state: SavedAppStateV2) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
}

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

async function click(label: string) {
  await act(async () => {
    button(label).click();
  });
}

async function mountApp() {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
  });
}

async function setRouteAndPop(href: string) {
  history.pushState({}, "", href);
  await act(async () => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("App recommendation browser interactions", () => {
  it("keeps fresh track exploration locked while interest questions open the survey", async () => {
    await mountApp();

    const interestJourney = [...document.querySelectorAll<HTMLButtonElement>(".planner-compass-path button")]
      .find((candidate) => candidate.textContent?.includes("관심 질문"));
    const trackJourney = [...document.querySelectorAll<HTMLButtonElement>(".planner-compass-path button")]
      .find((candidate) => candidate.textContent?.includes("트랙 탐색"));

    expect(trackJourney?.disabled).toBe(true);
    expect(trackJourney?.getAttribute("aria-describedby")).not.toBeNull();
    await act(async () => interestJourney?.click());

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("recommendation");
    expect(params.get("step")).toBe("survey");
  });

  it("keeps a fresh landing unobstructed and opens or closes help only on request", async () => {
    await mountApp();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(button("내 관심 트랙 찾기").disabled).toBe(false);

    await click("도움말");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const close = document.querySelector<HTMLButtonElement>('[aria-label="사용법 닫기"]');
    await act(async () => close?.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("closes the help dialog when its action navigates to a service screen", async () => {
    await mountApp();
    await click("도움말");
    await click("자가진단 열기");

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
  });

  it("routes landing track exploration to axes after an interest direction is saved", async () => {
    saveState({
      ...createEmptyAppState(),
      interestSurvey: { ...completeSurvey(), selectedTrackId: "economics" },
      targetTrackId: "economics",
    });
    await mountApp();

    const trackJourney = [...document.querySelectorAll<HTMLButtonElement>(".planner-compass-path button")]
      .find((candidate) => candidate.textContent?.includes("트랙 탐색"));
    await act(async () => trackJourney?.click());

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("recommendation");
    expect(params.get("step")).toBe("axes");
  });

  it("opens an existing saved plan from the landing preview", async () => {
    saveState(savedLandingPlanState());
    await mountApp();
    await click("저장한 계획 보기");

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("plan");
    expect(params.get("step")).toBe("schedule");
  });

  it("opens an existing saved plan from the landing semester journey", async () => {
    saveState(savedLandingPlanState());
    await mountApp();

    const semesterJourney = [...document.querySelectorAll<HTMLButtonElement>(".planner-compass-path button")]
      .find((candidate) => candidate.textContent?.includes("학기 계획"));
    await act(async () => semesterJourney?.click());

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("plan");
    expect(params.get("step")).toBe("schedule");
  });

  it.each([
    ["overview", "트랙제 안내", "트랙제 안내", "contact", "문의사항"],
    ["contact", "문의사항", "문의", "overview", "트랙제 안내"],
  ] as const)(
    "keeps %s reachable and names the actual current utility screen",
    async (view, currentLabel, mobileLabel, destinationView, destinationLabel) => {
      saveState(createEmptyAppState());
      history.replaceState({}, "", `/?view=${view}`);
      await mountApp();

      expect(document.querySelector(".planner-shell-current-step")?.textContent).toContain(currentLabel);
      const desktopCurrent = [...document.querySelectorAll<HTMLButtonElement>(".planner-shell-utility button")]
        .find((candidate) => candidate.textContent?.trim() === currentLabel);
      expect(desktopCurrent?.getAttribute("aria-current")).toBe("page");
      const mobileCurrent = [...document.querySelectorAll<HTMLButtonElement>(".planner-mobile-nav__menu button")]
        .find((candidate) => candidate.textContent?.trim() === mobileLabel);
      expect(mobileCurrent?.getAttribute("aria-current")).toBe("page");

      const destination = [...document.querySelectorAll<HTMLButtonElement>(".planner-shell-utility button")]
        .find((candidate) => candidate.textContent?.trim() === destinationLabel);
      expect(destination).not.toBeUndefined();
      await act(async () => destination?.click());
      expect(new URLSearchParams(location.search).get("view")).toBe(destinationView);
      expect(document.querySelector(".planner-shell-current-step")?.textContent).toContain(destinationLabel);
      expect(document.querySelectorAll("main")).toHaveLength(1);

      const mobileReturn = [...document.querySelectorAll<HTMLButtonElement>(".planner-mobile-nav__menu button")]
        .find((candidate) => candidate.textContent?.trim() === mobileLabel);
      await act(async () => mobileReturn?.click());
      expect(new URLSearchParams(location.search).get("view")).toBe(view);
      expect(document.querySelector(".planner-shell-current-step")?.textContent).toContain(currentLabel);
    },
  );

  it("keeps recommendation content under one guidebook shell and one main landmark", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=recommendation&step=survey");

    await mountApp();

    expect(document.querySelector(".planner-guidebook-shell")).not.toBeNull();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    const trackIndex = [...document.querySelectorAll<HTMLButtonElement>(".planner-guide-index button")]
      .find((candidate) => candidate.textContent?.includes("트랙 탐색"));
    expect(trackIndex?.getAttribute("aria-current")).toBe("page");
  });

  it("uses the Compass Path Ribbon as real guarded route navigation", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=recommendation&step=survey");
    await mountApp();

    const courses = [...document.querySelectorAll<HTMLButtonElement>(".planner-compass-path button")]
      .find((candidate) => candidate.textContent?.includes("과목"));
    expect(courses).not.toBeUndefined();
    await act(async () => courses?.click());

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("diagnosis");
    expect(params.get("step")).toBe("profile");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.activeElement?.tagName).toBe("H1");
  });

  it("persists the landing diagnosis goal and uses push history for the user action", async () => {
    const replaceState = vi.spyOn(history, "replaceState");
    const pushState = vi.spyOn(history, "pushState");

    await mountApp();
    expect(replaceState).toHaveBeenCalled();
    pushState.mockClear();

    await click("이수 과목 바로 진단");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.profileDraft?.goal).toBe("check-progress");
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(new URLSearchParams(location.search).get("step")).toBe("profile");
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("canonicalizes the legacy experiment alias with replace and renders the non-aggregate plan entry", async () => {
    saveState({ ...createEmptyAppState(), profile: planProfile });
    history.replaceState({}, "", "/?view=experiment&utm_source=legacy");
    const replaceState = vi.spyOn(history, "replaceState");
    const pushState = vi.spyOn(history, "pushState");

    await mountApp();

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("plan");
    expect(params.get("step")).toBe("setup");
    expect(params.get("utm_source")).toBe("legacy");
    expect(document.body.textContent).toContain("졸업 계획 전에 입력 상태를 확인해 주세요");
    expect(document.body.textContent).not.toContain("전략 기준 트랙");
    expect(replaceState).toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it("restores survey and axes screens from native popstate events", async () => {
    const interestSurvey: InterestSurveyState = {
      answers: Object.fromEntries(
        interestSurveyQuestions.slice(0, 4).map((question) => [question.id, 4]),
      ) as Record<string, InterestSurveyAnswer>,
      currentIndex: 4,
    };
    saveState({ ...createEmptyAppState(), interestSurvey });
    history.replaceState({}, "", "/?view=recommendation&step=survey");
    const replaceState = vi.spyOn(history, "replaceState");

    await mountApp();
    expect(document.body.textContent).toContain("5 / 10");

    replaceState.mockClear();
    await setRouteAndPop("/?view=recommendation&step=axes&axis=interest");
    expect(document.body.textContent).toContain("관심에 가까운 트랙");
    expect(replaceState).toHaveBeenCalled();

    await setRouteAndPop("/?view=recommendation&step=survey");
    expect(document.body.textContent).toContain("5 / 10");
  });

  it("persists an explicit survey track choice and pushes the profile transition", async () => {
    saveState({ ...createEmptyAppState(), interestSurvey: completeSurvey() });
    history.replaceState({}, "", "/?view=recommendation&step=survey");
    const pushState = vi.spyOn(history, "pushState");

    await mountApp();
    pushState.mockClear();
    await click("푸드마케팅 선택");
    await click("선택한 트랙으로 자가진단 이어가기");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.interestSurvey?.selectedTrackId).toBe("food-marketing");
    expect(saved.targetTrackId).toBe("food-marketing");
    expect(saved.profileDraft?.goal).toBe("find-track");
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("keeps a storage failure alert visible after navigating from survey to axes", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=recommendation&step=survey");
    await mountApp();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await click("4그렇다");
    await click("기준별 비교");

    const alert = [...document.querySelectorAll<HTMLElement>('[role="alert"]')]
      .find((candidate) => candidate.textContent?.includes("새로고침하면 답변이 사라질 수 있습니다"));
    expect(alert).not.toBeNull();
    expect(alert?.textContent ?? "").toContain("새로고침하면 답변이 사라질 수 있습니다");
    expect(document.body.textContent).toContain("관심에 가까운 트랙");
  });
});
