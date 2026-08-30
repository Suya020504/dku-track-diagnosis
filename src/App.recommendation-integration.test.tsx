import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { completeProfileTransition } from "./App";
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

function renderedJourneyState(markup: string, stage: "interest" | "track" | "semester") {
  return markup.match(new RegExp(`data-journey-stage="${stage}" data-state="([^"]+)"`))?.[1];
}

function renderedJourneyAvailable(markup: string, stage: "interest" | "track" | "semester") {
  const item = markup.match(new RegExp(`<li data-journey-stage="${stage}"[\\s\\S]*?</li>`))?.[0];
  return item ? !item.includes("disabled") : undefined;
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

    const primaryActionIndex = markup.indexOf("내 관심 트랙 찾기");
    const secondaryActionIndex = markup.indexOf("이수 과목 바로 진단");

    expect(markup.replaceAll("<br/>", "")).toContain("내 관심을 따라, 전공 로드맵을 완성해요");
    expect(markup).toContain("내 관심 트랙 찾기");
    expect(markup).toContain("이수 과목 바로 진단");
    expect(primaryActionIndex).toBeGreaterThan(-1);
    expect(primaryActionIndex).toBeLessThan(secondaryActionIndex);
    expect(markup.match(/data-journey-stage=/g)).toHaveLength(3);
    expect(markup).not.toContain("현재 예시 60%");
    expect(markup).not.toContain("부족 모듈 2개");
    expect(markup).not.toContain("로그인");
    expect(markup).not.toContain("내 상황에 맞는 이수 기준을 먼저 확인해요");
  });

  it.each([
    {
      name: "empty input",
      state: landingState("empty"),
      journey: ["current", "next", "pending"],
      title: "관심을 찾으면 계획표가 펼쳐져요",
      status: "입력 전 잠김",
      action: undefined,
      trackAvailable: false,
      copy: ["전공 과목 후보", "관심 트랙 선택 후 표시"],
      forbidden: ["학생 유형 입력됨", "이수 과목 검토 완료", "저장한 계획 사용 가능"],
    },
    {
      name: "profile only",
      state: landingState("profile-only"),
      journey: ["current", "next", "pending"],
      title: "다음은 이수 과목을 확인할 차례예요",
      status: "이수 과목 확인 필요",
      action: "이수 과목 확인하기",
      trackAvailable: false,
      copy: ["학생 유형", "입력됨", "이수 경로", "저장됨"],
      forbidden: ["관심 방향", "이수 과목 검토 완료", "저장한 계획 사용 가능"],
    },
    {
      name: "completed interest and selected target",
      state: landingState("interest"),
      journey: ["complete", "current", "pending"],
      title: "다음은 학생 유형을 확인할 차례예요",
      status: "학생 유형 확인 필요",
      action: "진단 정보 이어가기",
      trackAvailable: true,
      copy: ["학생 유형", "입력 필요", "이수 경로", "입력 필요"],
      forbidden: ["학생 유형 입력됨", "이수 과목 검토 완료", "저장한 계획 사용 가능"],
    },
    {
      name: "reviewed courses without target",
      state: landingState("courses-no-target"),
      journey: ["current", "next", "pending"],
      title: "학기 계획 전에 목표 트랙을 골라 주세요",
      status: "트랙 선택 필요",
      action: "트랙 비교 보기",
      trackAvailable: false,
      copy: ["이수 과목", "검토 완료", "목표 트랙", "선택 필요"],
      forbidden: ["관심 방향", "저장한 계획 사용 가능"],
    },
    {
      name: "reviewed courses",
      state: landingState("courses"),
      journey: ["complete", "complete", "current"],
      title: "입력한 상태로 학기 계획을 만들 수 있어요",
      status: "계획 준비 완료",
      action: "학기 계획 열기",
      trackAvailable: true,
      copy: ["이수 과목", "검토 완료", "목표 방향", "선택 완료"],
      forbidden: ["입력 전 잠김", "저장한 계획 사용 가능"],
    },
    {
      name: "saved graduation plan",
      state: landingState("saved-plan"),
      journey: ["complete", "complete", "complete"],
      title: "저장한 학기 계획이 있어요",
      status: "저장한 계획 사용 가능",
      action: "저장한 계획 보기",
      trackAvailable: true,
      copy: ["학기 일정", "다시 열어 확인", "저장한 내용 보기"],
      forbidden: ["입력 전 잠김", "이수 과목 확인 필요"],
    },
  ])("renders the real landing progress for $name", ({
    name,
    state,
    journey,
    title,
    status,
    action,
    trackAvailable,
    copy,
    forbidden,
  }) => {
    const markup = renderApp("", state);

    expect([
      renderedJourneyState(markup, "interest"),
      renderedJourneyState(markup, "track"),
      renderedJourneyState(markup, "semester"),
    ]).toEqual(journey);
    expect(markup).toContain(title);
    expect(markup).toContain(status);
    expect(renderedJourneyAvailable(markup, "track")).toBe(trackAvailable);
    if (action) expect(markup).toContain(action);
    else expect(markup).not.toContain("planner-landing__planner-action");
    if (name !== "empty input") expect(markup).not.toContain("입력 전 잠김");
    copy.forEach((value) => expect(markup).toContain(value));
    forbidden.forEach((value) => expect(markup).not.toContain(value));
    if (!trackAvailable) expect(markup).toContain("관심 질문을 마치면 트랙 비교가 열려요.");
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

    expect(markup).toContain('id="recommendation-axis-destination-interest"');
    expect(markup).toContain('id="recommendation-axis-destination-progress"');
    expect(markup).toContain('id="recommendation-axis-destination-plan"');
    expect(markup).toContain('data-recommendation-panel="progress"');
    expect(markup).not.toContain('data-recommendation-panel="interest"');
    expect(markup).not.toContain('data-recommendation-panel="plan"');
    expect(markup).toContain("이수 과목 입력하기");
  });

  it("shows a completed interest axis without requiring a profile", () => {
    const interestSurvey: InterestSurveyState = {
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

  it("restores a survey-selected target after a non-track path cleared the active target", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      interestSurvey: {
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
    expect(completed.route).toEqual({ view: "diagnosis", step: "courses" });
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
      expect(markup).toContain("추천 비교로 돌아가기");
      expect(markup).toContain("프로필·이수 과목 확인");
      expect(markup).not.toContain("전략 기준 트랙");
      expect(markup).not.toContain("가장 가까운 트랙");
      expect(markup).not.toContain("계획 계산하기");
    }
  });
});
