import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { completeProfileTransition } from "./App";
import * as AppModule from "./App";
import { interestSurveyQuestions } from "./lib/interestSurvey";
import { STORAGE_KEY_V2, createEmptyAppState } from "./lib/storage";
import type { InterestSurveyState, SavedAppStateV2, StudentProfile } from "./types";

const findTrackProfile: StudentProfile = {
  goal: "find-track",
  affiliation: "department-student",
  studyPath: "track-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

function createStorage(state?: SavedAppStateV2): Storage {
  const values = new Map<string, string>();
  if (state) values.set(STORAGE_KEY_V2, JSON.stringify(state));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function renderApp(search: string, state?: SavedAppStateV2): string {
  const storage = createStorage(state);
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      history: { state: {}, pushState: () => undefined, replaceState: () => undefined },
      location: { search, href: `https://example.test/${search}` },
      localStorage: storage,
    },
  });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

  try {
    return renderToStaticMarkup(<App />);
  } finally {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else delete (globalThis as { window?: unknown }).window;
    if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

describe("recommendation route integration", () => {
  it("creates distinct landing transitions for diagnosis and interest discovery", () => {
    const startEntryFlowTransition = (
      AppModule as unknown as {
        startEntryFlowTransition?: (
          state: SavedAppStateV2,
          goal: "check-progress" | "find-track",
        ) => { state: SavedAppStateV2; route: unknown };
      }
    ).startEntryFlowTransition;

    expect(startEntryFlowTransition).toBeTypeOf("function");
    if (!startEntryFlowTransition) return;

    const diagnosis = startEntryFlowTransition(createEmptyAppState(), "check-progress");
    const interest = startEntryFlowTransition(createEmptyAppState(), "find-track");

    expect(diagnosis.state.profileDraft?.goal).toBe("check-progress");
    expect(diagnosis.route).toEqual({ view: "diagnosis", step: "profile" });
    expect(interest.state.profileDraft?.goal).toBe("find-track");
    expect(interest.route).toEqual({ view: "recommendation", step: "survey" });
  });

  it("shows the two landing entry actions before asking an empty visitor for a profile", () => {
    const markup = renderApp("");

    expect(markup).toContain("자가진단 바로 시작");
    expect(markup).toContain("내 관심 트랙 찾기");
    expect(markup).not.toContain("내 상황에 맞는 이수 기준을 먼저 확인해요");
  });

  it("allows the interest survey route without a profile and restores its current question", () => {
    const interestSurvey: InterestSurveyState = {
      answers: Object.fromEntries(
        interestSurveyQuestions.slice(0, 4).map((question) => [question.id, 4]),
      ),
      currentIndex: 4,
    };

    const markup = renderApp(
      "?view=recommendation&step=survey",
      { ...createEmptyAppState(), interestSurvey },
    );

    expect(markup).toContain("5 / 10");
    expect(markup).toContain(interestSurveyQuestions[4].statement);
    expect(markup).not.toContain("내 상황에 맞는 이수 기준을 먼저 확인해요");
  });

  it("restores the independent axes route even when profile inputs are not ready", () => {
    const markup = renderApp(
      "?view=recommendation&step=axes&axis=progress",
      createEmptyAppState(),
    );

    expect(markup).toContain("관심에 가까운 트랙");
    expect(markup).toContain("현재 이수 과목으로 가까운 트랙");
    expect(markup).toContain("졸업 전 계획을 만들기 쉬운 트랙");
    expect(markup).toContain("이수 과목 입력하기");
  });

  it("routes a find-track track-major profile to survey when no target was chosen", () => {
    const transition = completeProfileTransition(createEmptyAppState(), findTrackProfile);

    expect((transition as { route?: unknown }).route).toEqual({
      view: "recommendation",
      step: "survey",
    });
    expect(transition.state.profile).toEqual(findTrackProfile);
  });

  it("persists a survey choice, preselects it in profile, and continues to courses", () => {
    const chooseInterestTrackTransition = (
      AppModule as unknown as {
        chooseInterestTrackTransition?: (
          state: SavedAppStateV2,
          trackId: "economics",
        ) => { state: SavedAppStateV2; route: unknown };
      }
    ).chooseInterestTrackTransition;

    expect(chooseInterestTrackTransition).toBeTypeOf("function");
    if (!chooseInterestTrackTransition) return;

    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      interestSurvey: {
        answers: Object.fromEntries(interestSurveyQuestions.map((question) => [question.id, 4])),
        currentIndex: 9,
        completedAt: "2026-08-30T00:00:00.000Z",
      },
    };
    const chosen = chooseInterestTrackTransition(current, "economics");

    expect(chosen.state.targetTrackId).toBe("economics");
    expect(chosen.state.interestSurvey?.selectedTrackId).toBe("economics");
    expect(chosen.state.profileDraft?.goal).toBe("find-track");
    expect(chosen.route).toEqual({ view: "diagnosis", step: "profile" });

    const completed = completeProfileTransition(chosen.state, findTrackProfile);
    expect(completed.state.targetTrackId).toBe("economics");
    expect(completed.step).toBe("courses");
    expect((completed as { route?: unknown }).route).toEqual({
      view: "diagnosis",
      step: "courses",
    });
  });

  it("replaces the active result aggregate with a link to the independent criteria", () => {
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: {
        goal: "check-progress",
        affiliation: "external-student",
        studyPath: "minor",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    };

    const markup = renderApp("?view=result&step=result", state);

    expect(markup).toContain("관심·이수 과목·졸업 계획을 따로 비교해요");
    expect(markup).toContain("세 기준별 트랙 비교 보기");
    expect(markup).not.toContain("1순위");
    expect(markup).not.toContain("가장 가까워요");
  });
});
