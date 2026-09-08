import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { completeProfileTransition, confirmSelectedTracksTransition, startIntentTransition } from "./App";
import * as AppModule from "./App";
import { calculateGraduationPlan } from "./lib/graduationPlanner";
import { interestSurveyQuestions } from "./lib/interestSurvey";
import { STORAGE_KEY_V2, createEmptyAppState } from "./lib/storage";
import type {
  GraduationPlanPreferences,
  InterestSurveyState,
  SavedAppStateV2,
  StudentProfile,
} from "./types";

const findTrackProfile: StudentProfile = {
  goal: "find-track",
  affiliation: "department-student",
  studyPath: "track-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const landingProfile: StudentProfile = {
  ...findTrackProfile,
  entryYear: 2026,
};

const landingPlanPreferences: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 6,
  considerSeasonalTerm: false,
};

const completedInterestSurvey: InterestSurveyState = {
  audience: "department-student",
  answers: Object.fromEntries(
    interestSurveyQuestions.map((question) => [question.id, 3]),
  ),
  currentIndex: 9,
  completedAt: "2026-08-30T00:00:00.000Z",
  selectedTrackId: "economics",
};

function landingState(
  stage: "empty" | "profile-only" | "interest" | "courses-no-target" | "courses" | "saved-plan",
): SavedAppStateV2 {
  const empty = createEmptyAppState();
  if (stage === "empty") return empty;
  if (stage === "profile-only") return { ...empty, profile: landingProfile };

  const interestState: SavedAppStateV2 = {
    ...empty,
    interestSurvey: completedInterestSurvey,
    targetTrackId: "economics",
  };
  if (stage === "interest") return interestState;
  if (stage === "courses-no-target") {
    return {
      ...empty,
      profile: landingProfile,
      courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
    };
  }

  const courseState: SavedAppStateV2 = {
    ...interestState,
    profile: landingProfile,
    courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
  };
  if (stage === "courses") return courseState;

  return {
    ...courseState,
    graduationPlanPreferences: landingPlanPreferences,
    graduationPlan: calculateGraduationPlan({
      profile: landingProfile,
      targetTrackId: "economics",
      courseSelections: [],
      additionalMajorCredits: [],
      preferences: landingPlanPreferences,
      generatedAt: "2026-08-30T01:00:00.000Z",
    }),
  };
}

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
  it("keeps distinct entry goals while requiring profile information before branching", () => {
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
    expect(interest.route).toEqual({ view: "diagnosis", step: "profile" });
  });

  it("shows three real entry choices and an optional guide before profile input", () => {
    const markup = renderApp("");

    const choicesIndex = markup.indexOf("시작 방법 선택");
    const primaryActionIndex = markup.indexOf("선택한 방법으로 시작하기");

    expect(markup.replace(/<[^>]+>/g, "")).toContain("내 수업으로 트랙을 완성해요");
    expect(markup).toContain("선택한 방법으로 시작하기");
    expect(markup).toContain("트랙제 먼저 알아보기");
    expect(markup).toContain("관심으로 찾아볼래요");
    expect(primaryActionIndex).toBeGreaterThan(-1);
    expect(primaryActionIndex).toBeGreaterThan(choicesIndex);
    expect(markup.match(/class="journey-home-start"/g)).toHaveLength(1);
    expect(markup.match(/name="entry-intent"/g)).toHaveLength(3);
    expect(markup).toContain('value="known-tracks"');
    expect(markup).toContain('value="interest-survey"');
    expect(markup).toContain('value="completed-courses"');
    expect(markup).toContain("5개 트랙 자세히 보기");
    expect(markup).not.toContain("data-map-stop");
    expect(markup).not.toContain("지도 범례");
    expect(markup).not.toContain("현재 예시 60%");
    expect(markup).not.toContain("부족 모듈 2개");
    expect(markup).not.toContain("로그인");
    expect(markup).not.toContain("내 상황에 맞는 이수 기준을 먼저 확인해요");
  });

  it.each([
    {
      name: "empty input",
      state: landingState("empty"),
      resumeState: "empty",
      title: "내 수업으로 트랙을 완성해요",
      action: undefined,
      copy: ["내 정보", "트랙 선택", "이수 현황", "학기 계획"],
      forbidden: ["저장한 학기 계획이 있어요"],
    },
    {
      name: "profile only",
      state: landingState("profile-only"),
      resumeState: "needs-courses",
      title: "입력하던 내용이 남아 있어요",
      action: "이전 입력 이어보기",
      copy: ["저장된 정보는 그대로 두고", "이전 입력 이어보기"],
      forbidden: ["저장한 학기 계획이 있어요"],
    },
    {
      name: "completed interest and selected target",
      state: landingState("interest"),
      resumeState: "needs-profile",
      title: "입력하던 내용이 남아 있어요",
      action: "이전 입력 이어보기",
      copy: ["저장된 정보는 그대로 두고", "이전 입력 이어보기"],
      forbidden: ["저장한 학기 계획이 있어요"],
    },
    {
      name: "reviewed courses without target",
      state: landingState("courses-no-target"),
      resumeState: "needs-track",
      title: "이전에 확인한 트랙이 있어요",
      action: "내 결과 다시 보기",
      copy: ["내 결과를 다시 확인하거나", "이번 학기 과목을 반영하세요"],
      forbidden: ["저장한 학기 계획이 있어요"],
    },
    {
      name: "reviewed courses",
      state: landingState("courses"),
      resumeState: "ready",
      title: "이전에 확인한 트랙이 있어요",
      action: "내 결과 다시 보기",
      copy: ["내 결과를 다시 확인하거나", "이번 학기 과목을 반영하세요"],
      forbidden: ["저장한 학기 계획이 있어요"],
    },
    {
      name: "saved graduation plan",
      state: landingState("saved-plan"),
      resumeState: "saved-plan",
      title: "저장한 학기 계획이 있어요",
      action: "저장한 계획 보기",
      copy: ["내 결과를 다시 확인하거나", "저장한 계획 보기", "내 결과 다시 보기"],
      forbidden: ["처음이어도 괜찮아요"],
    },
  ])("renders the real resume state for $name", ({ state, resumeState, title, action, copy, forbidden }) => {
    const markup = renderApp("", state);

    if (resumeState === "empty") {
      expect(markup).not.toContain('aria-label="이전 입력 이어보기"');
      expect(markup).toContain('class="journey-home-footer"');
      expect(markup).toContain('class="journey-home-start"');
    } else {
      expect(markup).toContain('aria-label="이전 입력 이어보기"');
      expect(markup).toContain(`data-resume-state="${resumeState}"`);
    }
    expect(markup).toContain(title);
    if (action) expect(markup).toContain(action);
    copy.forEach((value) => expect(markup).toContain(value));
    forbidden.forEach((value) => expect(markup).not.toContain(value));
    expect(markup).not.toContain("data-map-stop");
  });

  it("allows the interest survey route without a profile and restores its current question", () => {
    const interestSurvey: InterestSurveyState = {
      audience: "department-student",
      answers: Object.fromEntries(
        interestSurveyQuestions.slice(0, 4).map((question) => [question.id, 4]),
      ),
      currentIndex: 4,
    };

    const markup = renderApp(
      "?view=recommendation&step=survey&audience=department-student",
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

    expect(markup).toContain('id="track-history-title"');
    expect(markup).toContain('aria-label="다섯 트랙 이수 이력 비교표"');
    expect(markup.match(/data-history-track=/g)).toHaveLength(5);
    expect(markup).toContain('aria-label="선택한 트랙의 합산 이수"');
    expect(markup).not.toContain('data-recommendation-panel="interest"');
    expect(markup).not.toContain('data-recommendation-panel="plan"');
    expect(markup).toContain("이수 과목 수정");
    expect(markup).toContain("전공 전체 졸업학점이 아닌 트랙 모듈 조건");
  });

  it("canonicalizes a reviewed targetless track-major result to the five-track progress comparison", () => {
    const markup = renderApp(
      "?view=result&step=result",
      {
        ...createEmptyAppState(),
        profile: {
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "track-major",
          entryYear: 2024,
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        },
        courseSelections: [{ courseId: "b-2", status: "completed" }],
        courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
      },
    );

    expect(markup).toContain('id="track-history-title"');
    expect(markup).toContain("들은 과목으로 트랙을 찾아보세요");
    expect(markup.match(/data-history-track=/g)).toHaveLength(5);
    expect(markup).toContain("확인할 트랙을 골라 주세요");
    expect(markup).toMatch(/planner-shell-primary-nav[\s\S]*?aria-current="page"[^>]*>진단 결과<\/button>/);
    expect(markup).toContain("현재 · 트랙 비교");
    expect(markup).not.toContain('data-result-panel="current"');
  });

  it("does not invent a completed interest result when a target came from direct diagnosis", () => {
    const markup = renderApp("", {
      ...createEmptyAppState(),
      profile: { ...landingProfile, goal: "check-progress" },
      targetTrackId: "economics",
      courseInputReviewedAt: "2026-08-30T00:30:00.000Z",
    });

    expect(markup).toContain('aria-label="이전 입력 이어보기"');
    expect(markup).toContain("내 결과 다시 보기");
    expect(markup).not.toContain("관심 적합도 결과");
    expect(markup).not.toContain("data-map-stop");
  });

  it("shows a completed interest axis without requiring a profile", () => {
    const interestSurvey: InterestSurveyState = {
      audience: "department-student",
      answers: Object.fromEntries(
        interestSurveyQuestions.map((question) => [question.id, 3]),
      ),
      currentIndex: 9,
      completedAt: "2026-08-30T00:00:00.000Z",
    };

    const markup = renderApp(
      "?view=recommendation&step=axes&axis=interest",
      { ...createEmptyAppState(), interestSurvey },
    );

    expect(markup).toContain("푸드마케팅");
    expect(markup).toContain('data-recommendation-panel="interest"');
    expect(markup).not.toContain("50%");
    expect(markup).not.toContain("관심 설문 시작하기");
  });

  it("restores the plan axis with its assumption evidence instead of rendering all axes", () => {
    const markup = renderApp(
      "?view=recommendation&step=axes&axis=plan",
      {
        ...landingState("saved-plan"),
        profile: { ...landingProfile, studyPath: "advanced-major" },
      },
    );

    expect(markup).toContain('data-recommendation-panel="plan"');
    expect(markup).not.toContain('data-recommendation-panel="interest"');
    expect(markup).not.toContain('data-recommendation-panel="progress"');
    expect(markup).toContain("트랙형전공으로 전환한다고 가정한 비교");
  });

  it("asks for an entry direction after saving a legacy find-track profile without explicit intent", () => {
    const transition = completeProfileTransition(createEmptyAppState(), findTrackProfile);

    expect((transition as { route?: unknown }).route).toEqual({
      view: "diagnosis", step: "profile", profileStage: "direction",
    });
    expect(transition.state.profile).toEqual(findTrackProfile);
    expect(startIntentTransition(transition.state, "interest-survey").route).toEqual({
      view: "recommendation", step: "survey", audience: "department-student",
    });
  });

  it("keeps a survey choice pending through profile completion until multiple-track confirmation", () => {
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
      profileDraft: {
        affiliation: "department-student",
        goal: "find-track",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      interestSurvey: {
        audience: "department-student",
        answers: Object.fromEntries(interestSurveyQuestions.map((question) => [question.id, 4])),
        currentIndex: 9,
        completedAt: "2026-08-30T00:00:00.000Z",
      },
    };
    const chosen = chooseInterestTrackTransition(current, "economics");

    expect(chosen.state.targetTrackId).toBeUndefined();
    expect(chosen.state.pendingTargetTrackId).toBe("economics");
    expect(chosen.state.interestSurvey?.selectedTrackId).toBe("economics");
    expect(chosen.state.profileDraft?.goal).toBe("check-progress");
    expect(chosen.state.pendingSelectedTrackIds).toEqual(["economics"]);
    expect(chosen.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "path" });

    const completed = completeProfileTransition(chosen.state, findTrackProfile);
    expect(completed.state.targetTrackId).toBeUndefined();
    expect(completed.state.pendingSelectedTrackIds).toEqual(["economics"]);
    expect(completed.step).toBe("courses");
    expect((completed as { route?: unknown }).route).toEqual({
      view: "diagnosis",
      step: "tracks",
    });
    const confirmed = confirmSelectedTracksTransition(completed.state, ["economics", "food-marketing"]);
    expect(confirmed.state.targetTrackId).toBe("economics");
    expect(confirmed.state.comparisonTrackIds).toEqual(["food-marketing"]);
    expect(confirmed.state.pendingSelectedTrackIds).toBeUndefined();
    expect(confirmed.route).toEqual({ view: "diagnosis", step: "courses" });
  });

  it("restores a survey-selected target after a non-track path cleared the active target", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      interestSurvey: {
        audience: "department-student",
        answers: Object.fromEntries(interestSurveyQuestions.map((question) => [question.id, 4])),
        currentIndex: 9,
        completedAt: "2026-08-30T00:00:00.000Z",
        selectedTrackId: "economics",
      },
      targetTrackId: undefined,
    };

    const completed = completeProfileTransition(current, findTrackProfile);

    expect(completed.state.targetTrackId).toBe("economics");
    expect(completed.step).toBe("courses");
    expect(completed.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "direction" });
  });

  it("replaces the active result aggregate with a truthful next-page action", () => {
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

    expect(markup).toContain('class="dku-results-forward no-print"');
    expect(markup).toContain("입력한 완료 과목을 기준으로 계산했어요");
    expect(markup).toContain("다음 수강 후보 확인");
    expect(markup).not.toContain("세 기준별 트랙 비교 보기");
    expect(markup).not.toContain("1순위");
    expect(markup).not.toContain("가장 가까워요");
  });

  it("renders a non-aggregate plan prerequisite boundary for canonical and legacy plan URLs", () => {
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: {
        goal: "plan-graduation",
        affiliation: "department-student",
        studyPath: "advanced-major",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
    };

    for (const search of ["?view=plan&step=setup", "?view=experiment"]) {
      const markup = renderApp(search, state);
      expect(markup).toContain("졸업 계획 전에 입력 상태를 확인해 주세요");
      expect(markup).toContain('data-plan-readiness="profile" data-state="ready"');
      expect(markup).toContain('data-plan-readiness="courses" data-state="pending"');
      expect(markup).toContain('data-plan-readiness="target" data-state="not-applicable"');
      expect(markup).toContain("프로필·이수 과목 확인");
      expect(markup).not.toContain("전략 기준 트랙");
      expect(markup).not.toContain("가장 가까운 트랙");
      expect(markup).not.toContain("계획 계산하기");
    }
  });
});
