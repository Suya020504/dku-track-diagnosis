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

const trackMajorProfile: StudentProfile = {
  goal: "find-track",
  affiliation: "department-student",
  studyPath: "track-major",
  entryYear: 2026,
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

function profileOnlyLandingState(): SavedAppStateV2 {
  return {
    ...createEmptyAppState(),
    profile: trackMajorProfile,
  };
}

function interestTargetLandingState(): SavedAppStateV2 {
  return {
    ...createEmptyAppState(),
    interestSurvey: { ...completeSurvey(), selectedTrackId: "economics" },
    targetTrackId: "economics",
  };
}

function reviewedCoursesWithoutTargetState(): SavedAppStateV2 {
  return {
    ...profileOnlyLandingState(),
    courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
  };
}

let root: Root | undefined;

function completeSurvey(answer: InterestSurveyAnswer = 3): InterestSurveyState {
  return {
    audience: "department-student",
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

async function moveNativeHistory(direction: "back" | "forward") {
  await act(async () => {
    const popped = new Promise<void>((resolve) => {
      window.addEventListener("popstate", () => resolve(), { once: true });
    });
    history[direction]();
    await popped;
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
  it("opens the optional interest route at an affiliation choice before any questions", async () => {
    await mountApp();

    expect(document.querySelector("[data-map-stop]")).toBeNull();
    await click("관심으로 트랙 추천받기");

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("recommendation");
    expect(params.get("step")).toBe("survey");
    expect(document.querySelector("[data-survey-audience-step]")).not.toBeNull();
    expect(document.querySelector(".interest-question-card")).toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.profileDraft?.goal).toBe("find-track");
  });

  it("resumes profile-only diagnosis directly at course selection", async () => {
    saveState(profileOnlyLandingState());
    await mountApp();

    expect(document.querySelector('[data-resume-state="needs-courses"]')).not.toBeNull();
    expect(document.body.textContent).toContain("과목 선택부터 이어가세요");

    await click("이수 과목 확인하기");
    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("diagnosis");
    expect(params.get("step")).toBe("courses");
    expect(params.get("profile")).toBeNull();
    expect(document.body.textContent).toContain("지금까지 이수한 과목을 선택하세요.");
  });

  it("keeps a fresh landing unobstructed and opens or closes help only on request", async () => {
    await mountApp();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(button("내 트랙 확인하기").disabled).toBe(false);

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

  it("keeps saved interest data while letting the student reopen the optional survey", async () => {
    const previous = interestTargetLandingState();
    saveState(previous);
    await mountApp();

    await click("관심으로 트랙 추천받기");

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("recommendation");
    expect(params.get("step")).toBe("survey");
    expect(params.get("audience")).toBe("department-student");
    expect(document.querySelector("[data-survey-audience-step]")).toBeNull();
    expect(document.querySelector(".dku-survey-results")).not.toBeNull();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.interestSurvey).toEqual(previous.interestSurvey);

    await click("기준별 비교");
    await click("관심 설문");
    expect(new URLSearchParams(location.search).get("audience")).toBe("department-student");
    expect(document.querySelector(".dku-survey-results")).not.toBeNull();
  });

  it("opens progress comparison and recovers planner setup through target choice", async () => {
    saveState(reviewedCoursesWithoutTargetState());
    await mountApp();

    const plannerPreview = document.querySelector('[data-resume-state="needs-track"]');
    expect(plannerPreview?.textContent).toContain("현재 결과를 비교할 수 있어요");

    await click("진단 결과");
    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("recommendation");
    expect(params.get("step")).toBe("axes");
    expect(params.get("axis")).toBe("progress");

    history.replaceState({}, "", "/");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    await click("트랙 비교 보기");
    const plannerParams = new URLSearchParams(location.search);
    expect(plannerParams.get("view")).toBe("diagnosis");
    expect(plannerParams.get("step")).toBe("profile");
    expect(plannerParams.get("profile")).toBe("path");
  });

  it("opens an existing saved plan from the landing preview", async () => {
    saveState(savedLandingPlanState());
    await mountApp();
    expect(document.body.textContent).toContain("저장한 학기 계획이 있어요");
    await click("저장한 계획 보기");

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("plan");
    expect(params.get("step")).toBe("schedule");
  });

  it("keeps the saved plan separate from the three required diagnosis steps and resumes it", async () => {
    saveState(savedLandingPlanState());
    await mountApp();

    expect([...document.querySelectorAll(".track-home__steps strong")].map(node => node.textContent))
      .toEqual(["이수 유형", "이수 과목", "진단 결과"]);
    expect(document.querySelectorAll(".track-home__steps [data-step-state='complete']")).toHaveLength(3);
    expect(document.querySelector(".track-home__optional")?.textContent).toContain("필수 진단에 포함되지 않아요");
    expect(document.querySelector('[data-resume-state="saved-plan"]')).not.toBeNull();
    await click("저장한 계획 보기");
    expect(new URLSearchParams(location.search).get("view")).toBe("plan");
    expect(new URLSearchParams(location.search).get("step")).toBe("schedule");
  });

  it("keeps contact reachable and names it as the current utility screen", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=contact");
    await mountApp();

    expect(document.querySelector(".planner-shell-current-step")?.textContent).toContain("문의사항");
    const desktopCurrent = [...document.querySelectorAll<HTMLButtonElement>(".planner-shell-utility button")]
      .find((candidate) => candidate.textContent?.trim() === "문의사항");
    expect(desktopCurrent?.getAttribute("aria-current")).toBe("page");
    const mobileCurrent = [...document.querySelectorAll<HTMLButtonElement>(".planner-mobile-nav__menu button")]
      .find((candidate) => candidate.textContent?.trim() === "문의");
    expect(mobileCurrent?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it("renders contact as one focused H1 page on a direct URL", async () => {
    history.replaceState({}, "", "/?view=contact");
    await mountApp();

    const heading = document.querySelector<HTMLHeadingElement>("#contact-page-title");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(heading?.textContent).toBe("학과 사무실에 물어보세요");
    expect(heading?.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(heading);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("canonicalizes the legacy overview into the evidence-separated track guide", async () => {
    history.replaceState({}, "", "/?view=overview");
    await mountApp();

    const params = new URLSearchParams(location.search);
    expect(params.get("view")).toBe("track-guide");
    expect(params.get("section")).toBe("overview");
    expect(document.querySelector(".dku-guide-page")).not.toBeNull();
    expect(document.querySelector(".planner-overview")).toBeNull();
    expect(document.querySelector(".dku-hero")).toBeNull();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("uses a wide service workspace for recommendation content without a duplicate side index", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=recommendation&step=survey");

    await mountApp();

    expect(document.querySelector(".planner-guidebook-shell")).not.toBeNull();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelector(".planner-shell-layout.is-immersive")).not.toBeNull();
    expect(document.querySelector(".planner-guide-index")).toBeNull();
    expect(document.querySelector('nav[aria-label="주요 서비스"]')).not.toBeNull();
    expect(document.querySelector(".planner-shell-current-step")?.textContent)
      .toContain("관심 트랙 추천");
    const diagnosisNav = [...document.querySelectorAll<HTMLButtonElement>(".planner-shell-primary-nav button")]
      .find((candidate) => candidate.textContent?.trim() === "나의 진단");
    expect(diagnosisNav?.getAttribute("aria-current")).toBe("page");
  });

  it("keeps one official DKU logo across canonical service screens", async () => {
    saveState({
      ...createEmptyAppState(),
      profile: {
        goal: "check-progress",
        affiliation: "external-student",
        studyPath: "minor",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
    });
    history.replaceState({}, "", "/?view=recommendation&step=axes&axis=interest");
    await mountApp();

    expect(document.querySelector(".recommendation-page-header")).toBeNull();
    expect(document.querySelectorAll('img[src="/dku-logo.png"]')).toHaveLength(1);
    expect(document.querySelector('img[src="/dku-seal.svg"]')).toBeNull();
    expect(document.querySelector('img[src="/department-mark.jpg"]')).toBeNull();

    await setRouteAndPop("/?view=diagnosis&step=courses");
    expect(document.querySelector(".service-header")).toBeNull();
    expect(document.querySelectorAll('img[src="/dku-logo.png"]')).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);

    await setRouteAndPop("/?view=overview");
    expect(document.querySelectorAll('img[src="/dku-logo.png"]')).toHaveLength(1);
    await setRouteAndPop("/?view=contact");
    expect(document.querySelectorAll('img[src="/dku-logo.png"]')).toHaveLength(1);
  });

  it("keeps optional survey outside required progress and safely opens diagnosis", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=recommendation&step=survey");
    await mountApp();

    expect(document.querySelector(".planner-compass-path")).toBeNull();
    await act(async () => button("설문을 건너뛰고 자가진단 바로가기").click());

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

    await click("내 트랙 확인하기");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.profileDraft?.goal).toBe("check-progress");
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(new URLSearchParams(location.search).get("step")).toBe("profile");
    expect(pushState).toHaveBeenCalledTimes(1);

    await moveNativeHistory("back");
    expect(location.search).toBe("");
    expect(document.querySelector('[data-resume-state="needs-profile"]')).not.toBeNull();
    expect(document.querySelector("[data-map-stop]")).toBeNull();
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
      audience: "department-student",
      answers: Object.fromEntries(
        interestSurveyQuestions.slice(0, 4).map((question) => [question.id, 4]),
      ) as Record<string, InterestSurveyAnswer>,
      currentIndex: 4,
    };
    saveState({ ...createEmptyAppState(), interestSurvey });
    history.replaceState({}, "", "/?view=recommendation&step=survey&audience=department-student");
    const replaceState = vi.spyOn(history, "replaceState");

    await mountApp();
    expect(document.body.textContent).toContain("5 / 10");

    replaceState.mockClear();
    await setRouteAndPop("/?view=recommendation&step=axes&axis=interest");
    expect(document.querySelector('[data-recommendation-panel="interest"]')).not.toBeNull();
    expect(replaceState).toHaveBeenCalled();

    await setRouteAndPop("/?view=recommendation&step=survey&audience=department-student");
    expect(document.body.textContent).toContain("5 / 10");
  });

  it("writes axis page changes to the URL and moves focus to the new H1", async () => {
    saveState({
      ...profileOnlyLandingState(),
      interestSurvey: completeSurvey(),
      courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
    });
    history.replaceState({}, "", "/?view=recommendation&step=axes&axis=interest");
    await mountApp();

    const heading = document.querySelector<HTMLHeadingElement>("#recommendation-axes-title");
    const progressDestination = document.querySelector<HTMLButtonElement>("#recommendation-axis-destination-progress");
    expect(heading).not.toBeNull();
    expect(document.activeElement).toBe(heading);
    expect(progressDestination?.getAttribute("aria-current")).toBeNull();
    expect([...document.querySelectorAll<HTMLButtonElement>("[data-axis-destination]")]
      .every((destination) => destination.tabIndex === 0)).toBe(true);

    await act(async () => {
      progressDestination?.focus();
      progressDestination?.click();
    });

    expect(new URLSearchParams(location.search).get("axis")).toBe("progress");
    expect(document.querySelector('[data-recommendation-panel="progress"]')).not.toBeNull();
    expect(document.querySelector("#recommendation-axis-destination-progress")?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(heading);

    await setRouteAndPop("/?view=recommendation&step=axes&axis=plan");
    expect(document.querySelector('[data-recommendation-panel="plan"]')).not.toBeNull();
    expect(document.querySelector("#recommendation-axis-destination-plan")?.getAttribute("aria-current")).toBe("page");
    expect(document.activeElement).toBe(heading);
  });

  it("restores all recommendation axes through native back, forward, and mounted reload", async () => {
    saveState({
      ...profileOnlyLandingState(),
      interestSurvey: completeSurvey(),
      courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
    });
    history.replaceState({}, "", "/?view=recommendation&step=axes&axis=interest");
    await mountApp();

    await act(async () => document.querySelector<HTMLButtonElement>(
      "#recommendation-axis-destination-progress",
    )?.click());
    await act(async () => document.querySelector<HTMLButtonElement>(
      "#recommendation-axis-destination-plan",
    )?.click());
    expect(new URLSearchParams(location.search).get("axis")).toBe("plan");

    await moveNativeHistory("back");
    expect(document.querySelector('[data-recommendation-panel="progress"]')).not.toBeNull();
    await moveNativeHistory("back");
    expect(document.querySelector('[data-recommendation-panel="interest"]')).not.toBeNull();
    await moveNativeHistory("forward");
    expect(document.querySelector('[data-recommendation-panel="progress"]')).not.toBeNull();
    await moveNativeHistory("forward");
    expect(document.querySelector('[data-recommendation-panel="plan"]')).not.toBeNull();

    await act(async () => root?.unmount());
    root = undefined;
    await mountApp();
    expect(new URLSearchParams(location.search).get("axis")).toBe("plan");
    expect(document.querySelector('[data-recommendation-panel="plan"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector("#recommendation-axes-title"));
  });

  it("persists an explicit survey track choice and pushes the profile transition", async () => {
    saveState({ ...createEmptyAppState(), interestSurvey: completeSurvey() });
    history.replaceState({}, "", "/?view=recommendation&step=survey&audience=department-student");
    const pushState = vi.spyOn(history, "pushState");

    await mountApp();
    pushState.mockClear();
    await click("푸드마케팅 선택");
    await click("선택한 트랙으로 자가진단 이어가기");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.interestSurvey?.selectedTrackId).toBe("food-marketing");
    expect(saved.targetTrackId).toBeUndefined();
    expect(saved.pendingTargetTrackId).toBe("food-marketing");
    expect(saved.profile).toBeUndefined();
    expect(saved.profileDraft?.goal).toBe("find-track");
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it("keeps a storage failure alert visible after navigating from survey to axes", async () => {
    saveState({
      ...createEmptyAppState(),
      interestSurvey: { audience: "department-student", answers: {}, currentIndex: 0 },
    });
    history.replaceState({}, "", "/?view=recommendation&step=survey&audience=department-student");
    await mountApp();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await act(async () => {
      const answer = document.querySelector<HTMLInputElement>(
        'input[name="interest-consumer-scale"][value="4"]',
      );
      if (!answer) throw new Error("Interest answer radio not found: 4 / 그렇다");
      answer.click();
    });
    await click("기준별 비교");

    const alert = [...document.querySelectorAll<HTMLElement>('[role="alert"]')]
      .find((candidate) => candidate.textContent?.includes("새로고침하면 답변이 사라질 수 있습니다"));
    expect(alert).not.toBeNull();
    expect(alert?.textContent ?? "").toContain("새로고침하면 답변이 사라질 수 있습니다");
    expect(document.body.textContent).toContain("관심이 향하는 트랙");
  });
});
