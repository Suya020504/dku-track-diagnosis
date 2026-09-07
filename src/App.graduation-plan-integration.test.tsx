// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, {
  applyPlanningSourceChange,
  changePlannedCourseTerm,
  completeProfileTransition,
  createGraduationPlanTransition,
  chooseInterestTrackTransition,
  saveGraduationPlanSnapshotTransition,
  startEntryFlowTransition,
} from "./App";
import { calculateGraduationPlan } from "./lib/graduationPlanner";
import { calculatePathProgress } from "./lib/progressEngine";
import { buildRecommendationAxes } from "./lib/recommendationEngine";
import { STORAGE_KEY_V2, createEmptyAppState } from "./lib/storage";
import type {
  DiagnosisSnapshot,
  GraduationPlanPreferences,
  SavedAppStateV2,
  StudentProfile,
} from "./types";

const minorProfile: StudentProfile = {
  goal: "plan-graduation",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const preferences: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 6,
  considerSeasonalTerm: false,
};

let root: Root | undefined;

function readyState(overrides: Partial<SavedAppStateV2> = {}): SavedAppStateV2 {
  return {
    ...createEmptyAppState(),
    profile: minorProfile,
    courseSelections: [{ courseId: "b-1", status: "completed" }],
    courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    ...overrides,
  };
}

function stateWithPlan(overrides: Partial<SavedAppStateV2> = {}): SavedAppStateV2 {
  const state = readyState();
  const plan = calculateGraduationPlan({
    profile: minorProfile,
    courseSelections: state.courseSelections,
    additionalMajorCredits: [],
    preferences,
    generatedAt: "2026-08-30T09:00:00.000Z",
  });
  return {
    ...state,
    graduationPlanPreferences: preferences,
    graduationPlan: plan,
    ...overrides,
  };
}

function saveState(state: SavedAppStateV2) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
}

async function mountApp() {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
  });
}

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

function input(label: string): HTMLInputElement {
  const match = [...document.querySelectorAll("label")]
    .find((candidate) => candidate.textContent?.includes(label))
    ?.querySelector("input");
  if (!(match instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);
  return match;
}

function checkbox(label: string): HTMLInputElement {
  const match = [...document.querySelectorAll("label")]
    .find((candidate) => candidate.textContent?.includes(label))
    ?.querySelector('input[type="checkbox"]');
  if (!(match instanceof HTMLInputElement)) throw new Error(`Checkbox not found: ${label}`);
  return match;
}

function expectFocusedPlanHeading(text: string) {
  expect(document.activeElement).toBeInstanceOf(HTMLHeadingElement);
  expect(document.activeElement?.tagName).toBe("H1");
  expect(document.activeElement?.textContent).toContain(text);
  expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
}

function planReadinessStates(): Array<[string | undefined, string | undefined]> {
  return [...document.querySelectorAll<HTMLElement>("[data-plan-readiness]")]
    .map((item) => [item.dataset.planReadiness, item.dataset.state]);
}

async function click(label: string) {
  await act(async () => {
    button(label).click();
  });
}

async function change(field: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(history, "scrollRestoration", {
    configurable: true,
    writable: true,
    value: "auto",
  });
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
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

describe("graduation plan pure transitions", () => {
  it("generates with the caller timestamp and never changes completed selections", () => {
    const current = readyState({
      courseSelections: [
        { courseId: "b-1", status: "completed" },
        { courseId: "c-2", status: "planned", plannedTerm: "next" },
      ],
    });
    const before = structuredClone(current.courseSelections);

    const transition = createGraduationPlanTransition(
      current,
      preferences,
      "2026-08-30T11:30:00.000Z",
    );

    expect(transition.state.courseSelections).toEqual(before);
    expect(transition.state.graduationPlanPreferences).toEqual(preferences);
    expect(transition.result.generatedAt).toBe("2026-08-30T11:30:00.000Z");
    expect(transition.route).toEqual({ view: "plan", step: "schedule" });
  });

  it("appends exactly one complete snapshot and keeps only the latest twelve", () => {
    const current = stateWithPlan();
    const pathResult = calculatePathProgress({
      profile: minorProfile,
      courseSelections: current.courseSelections,
      additionalMajorCredits: current.additionalMajorCredits,
      courseInputReviewedAt: current.courseInputReviewedAt,
    });
    const recommendationAxes = buildRecommendationAxes({
      profile: minorProfile,
      courseSelections: current.courseSelections,
      additionalMajorCredits: current.additionalMajorCredits,
      graduationPlanPreferences: preferences,
      generatedAt: current.graduationPlan!.generatedAt,
    });
    const snapshotBase: DiagnosisSnapshot = {
      id: "snapshot-0",
      createdAt: "2026-08-30T00:00:00.000Z",
      ruleVersion: "2026-provided-final-plan",
      profile: minorProfile,
      courseSelections: current.courseSelections,
      additionalMajorCredits: current.additionalMajorCredits,
      comparisonTrackIds: [],
      result: pathResult,
      recommendationAxes,
      graduationPlan: current.graduationPlan,
    };
    const snapshots = Array.from({ length: 12 }, (_, index) => ({
      ...snapshotBase,
      id: `snapshot-${index}`,
      graduationPlan: undefined,
    }));

    const next = saveGraduationPlanSnapshotTransition(
      { ...current, snapshots },
      {
        id: "snapshot-new",
        createdAt: "2026-08-30T12:00:00.000Z",
        pathResult,
        recommendationAxes,
        plan: current.graduationPlan!,
      },
    );

    expect(next.snapshots).toHaveLength(12);
    expect(next.snapshots[0].id).toBe("snapshot-1");
    expect(next.snapshots.at(-1)).toEqual(expect.objectContaining({
      id: "snapshot-new",
      createdAt: "2026-08-30T12:00:00.000Z",
      result: pathResult,
      recommendationAxes,
      graduationPlan: current.graduationPlan,
    }));
  });

  it.each([
    [
      "completed course",
      { courseSelections: [{ courseId: "b-2", status: "completed" as const }] },
      true,
    ],
    [
      "in-progress course",
      { courseSelections: [{ courseId: "b-2", status: "in-progress" as const }] },
      true,
    ],
    [
      "planned term",
      { courseSelections: [{ courseId: "c-2", status: "planned" as const, plannedTerm: "following" as const }] },
      false,
    ],
    [
      "additional major credit",
      { additionalMajorCredits: [{ id: "transfer", label: "인정학점", credits: 3, status: "student-entered" as const }] },
      true,
    ],
    [
      "target track",
      { targetTrackId: "food-marketing" as const },
      false,
    ],
    [
      "profile",
      { profile: { ...minorProfile, entryYear: 2025 } },
      true,
    ],
  ] as const)(
    "preserves preferences but invalidates a generated plan after a %s source change",
    (_label, changes, clearsReview) => {
      const current = stateWithPlan({
        courseSelections: [{ courseId: "c-2", status: "planned", plannedTerm: "next" }],
      });

      const next = applyPlanningSourceChange(
        current,
        changes as unknown as Parameters<typeof applyPlanningSourceChange>[1],
      );

      expect(next.graduationPlanPreferences).toEqual(preferences);
      expect(next.graduationPlan).toBeUndefined();
      expect(next.courseInputReviewedAt).toBe(
        clearsReview ? undefined : current.courseInputReviewedAt,
      );
    },
  );

  it("changes a legacy planned term through the shared invalidation path without clearing review", () => {
    const current = stateWithPlan({
      courseSelections: [{ courseId: "c-2", status: "planned", plannedTerm: "next" }],
    });

    const next = changePlannedCourseTerm(current, "c-2", "following");

    expect(next.courseSelections).toEqual([
      { courseId: "c-2", status: "planned", plannedTerm: "following" },
    ]);
    expect(next.graduationPlan).toBeUndefined();
    expect(next.graduationPlanPreferences).toEqual(preferences);
    expect(next.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
  });

  it("invalidates the old plan when profile completion changes the profile", () => {
    const current = stateWithPlan();

    const transition = completeProfileTransition(current, {
      ...minorProfile,
      entryYear: 2025,
    });

    expect(transition.state.graduationPlanPreferences).toEqual(preferences);
    expect(transition.state.graduationPlan).toBeUndefined();
    expect(transition.state.courseInputReviewedAt).toBeUndefined();
  });

  it("keeps both reviewed courses and the generated plan when only the profile goal changes", () => {
    const current = stateWithPlan();

    const next = applyPlanningSourceChange(current, {
      profile: { ...minorProfile, goal: "check-progress" },
    });

    expect(next.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
    expect(next.graduationPlan).toEqual(current.graduationPlan);
    expect(next.graduationPlanPreferences).toEqual(current.graduationPlanPreferences);
  });

  it("returns a reviewed track-major directly to planner setup after a planning target is selected", () => {
    const current = readyState({
      profile: { ...minorProfile, studyPath: "track-major", goal: "check-progress" },
      targetTrackId: "food-marketing",
    });

    const transition = completeProfileTransition(current, {
      ...current.profile!,
      goal: "plan-graduation",
    });

    expect(transition.state.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
    expect(transition.route).toEqual({ view: "plan", step: "setup" });
  });

  it.each([
    ["find-track", { view: "recommendation", step: "survey" }],
    ["check-progress", { view: "diagnosis", step: "profile" }],
  ] as const)(
    "keeps committed profile, course review, and saved plan intact when the landing starts %s",
    (goal, route) => {
      const current = stateWithPlan();

      const entry = startEntryFlowTransition(current, goal);

      expect(entry.route).toEqual(route);
      expect(entry.state.profile).toEqual(current.profile);
      expect(entry.state.profileDraft).toMatchObject({ goal });
      expect(entry.state.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
      expect(entry.state.graduationPlanPreferences).toEqual(preferences);
      expect(entry.state.graduationPlan).toEqual(current.graduationPlan);
    },
  );

  it("invalidates only the plan when an interest transition changes the target track", () => {
    const current = stateWithPlan();
    const interest = chooseInterestTrackTransition(current, "economics");

    expect(interest.state.graduationPlan).toBeUndefined();
    expect(interest.state.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
    expect(interest.state.graduationPlanPreferences).toEqual(preferences);
  });

  it("requires a current plan and refuses to append the same generated plan twice", () => {
    const current = stateWithPlan();
    const pathResult = calculatePathProgress({
      profile: minorProfile,
      courseSelections: current.courseSelections,
      additionalMajorCredits: current.additionalMajorCredits,
      courseInputReviewedAt: current.courseInputReviewedAt,
    });
    const recommendationAxes = buildRecommendationAxes({
      profile: minorProfile,
      courseSelections: current.courseSelections,
      additionalMajorCredits: current.additionalMajorCredits,
      graduationPlanPreferences: preferences,
      generatedAt: current.graduationPlan!.generatedAt,
    });
    const input = {
      id: "one",
      createdAt: "2026-08-30T12:00:00.000Z",
      pathResult,
      recommendationAxes,
      plan: current.graduationPlan!,
    };
    const once = saveGraduationPlanSnapshotTransition(current, input);
    const twice = saveGraduationPlanSnapshotTransition(once, {
      ...input,
      id: "two",
      createdAt: "2026-08-30T12:01:00.000Z",
    });

    expect(twice).toBe(once);
    expect(twice.snapshots).toHaveLength(1);
    expect(() => saveGraduationPlanSnapshotTransition(
      { ...current, graduationPlan: undefined },
      input,
    )).toThrow("A current graduation plan is required");
  });
});

describe("App graduation plan pages", () => {
  it.each([
    ["empty", createEmptyAppState(), []],
    ["profile only", { ...createEmptyAppState(), profile: minorProfile }, []],
    [
      "reviewed courses with a missing track-major target",
      {
        ...createEmptyAppState(),
        profile: { ...minorProfile, studyPath: "track-major" as const },
        courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
      },
      ["courses", "modules"],
    ],
    [
      "selected target with incomplete course input",
      {
        ...createEmptyAppState(),
        profile: { ...minorProfile, studyPath: "track-major" as const },
        targetTrackId: "food-marketing" as const,
      },
      ["track"],
    ],
    ["saved graduation plan", stateWithPlan(), ["courses", "modules", "track", "semester"]],
  ] as const)(
    "derives Ribbon completion from saved milestones for %s",
    async (_label, state, completedStages) => {
      saveState(state as SavedAppStateV2);
      history.replaceState({}, "", "/?view=plan&step=setup");
      await mountApp();

      const stages = ["interest", "courses", "modules", "track", "semester"];
      const completed = completedStages as readonly string[];
      for (const stage of stages) {
        const item = document.querySelector<HTMLElement>(`[data-journey-stage="${stage}"]`);
        expect(item, stage).not.toBeNull();
        expect(item?.dataset.completed, stage).toBe(completed.includes(stage) ? "true" : "false");
        if (stage !== "semester" && !completed.includes(stage)) {
          expect(item?.dataset.state, stage).toBe("pending");
        }
      }
      expect(document.querySelector('[data-journey-stage="semester"]')?.getAttribute("data-state")).toBe("current");
      expect(document.querySelectorAll("main")).toHaveLength(1);
    },
  );

  it("keeps the plan page under one guidebook shell and one main landmark", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");

    await mountApp();

    expect(document.querySelector(".planner-guidebook-shell")).not.toBeNull();
    expect(document.querySelectorAll("main")).toHaveLength(1);
    const planIndex = [...document.querySelectorAll<HTMLButtonElement>(".planner-shell-primary-nav button")]
      .find((candidate) => candidate.textContent?.includes("학기 플래너"));
    expect(planIndex?.getAttribute("aria-current")).toBe("page");
  });

  it.each([
    [
      "empty",
      createEmptyAppState(),
      [["profile", "pending"], ["courses", "pending"], ["target", "pending"]],
      "프로필 입력 시작",
    ],
    [
      "minor with unreviewed courses",
      { ...createEmptyAppState(), profile: minorProfile },
      [["profile", "ready"], ["courses", "pending"], ["target", "not-applicable"]],
      "프로필·이수 과목 확인",
    ],
    [
      "track-major with a missing target",
      {
        ...createEmptyAppState(),
        profile: { ...minorProfile, studyPath: "track-major" as const },
        courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
        graduationPlanPreferences: preferences,
      },
      [["profile", "ready"], ["courses", "ready"], ["target", "pending"]],
      "목표 트랙 검토로 이동",
    ],
  ] as const)(
    "shows truthful prerequisite states and one recovery action for %s",
    async (_label, state, expectedStates, recoveryLabel) => {
      saveState(state as SavedAppStateV2);
      history.replaceState({}, "", "/?view=plan&step=schedule");

      await mountApp();

      expect(document.body.textContent).toContain("졸업 계획 전에 입력 상태를 확인해 주세요");
      expect(planReadinessStates()).toEqual(expectedStates);
      expect(document.querySelectorAll(".plan-entry-actions button")).toHaveLength(1);
      expect(document.body.textContent).toContain(recoveryLabel);
      expect(document.body.textContent).not.toContain("계획 저장");
      expectFocusedPlanHeading("졸업 계획 전에 입력 상태를 확인해 주세요");
    },
  );

  it("keeps course readiness pending without a profile even when a legacy review timestamp remains", async () => {
    saveState({
      ...createEmptyAppState(),
      courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    });
    history.replaceState({}, "", "/?view=plan&step=setup");

    await mountApp();

    expect(planReadinessStates()).toEqual([
      ["profile", "pending"],
      ["courses", "pending"],
      ["target", "pending"],
    ]);
  });

  it("opens setup for a ready track-major profile without showing the prerequisite boundary", async () => {
    saveState({
      ...createEmptyAppState(),
      profile: { ...minorProfile, studyPath: "track-major" },
      courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
      targetTrackId: "food-marketing",
    });
    history.replaceState({}, "", "/?view=plan&step=setup");

    await mountApp();

    expect(document.querySelectorAll("[data-plan-readiness]")).toHaveLength(0);
    expectFocusedPlanHeading("학기별 참고 계획의 범위를 정해 주세요");
  });

  it("opens direct target selection when the planner is missing a target", async () => {
    saveState({
      ...createEmptyAppState(),
      profile: { ...minorProfile, affiliation: "department-student", studyPath: "track-major" },
      profileDraft: {
        goal: "find-track",
        affiliation: "external-student",
        studyPath: "minor",
      },
      courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    });
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();

    await click("목표 트랙 검토로 이동");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.targetTrackId).toBeUndefined();
    expect(saved.profileDraft?.goal).toBe("plan-graduation");
    expect(saved.profileDraft?.affiliation).toBe("department-student");
    expect(saved.profileDraft?.studyPath).toBe("track-major");
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(new URLSearchParams(location.search).get("profile")).toBe("path");
    expect(document.body.textContent).toContain("확인할 이수 경로를 정해 주세요");
  });

  it.each([
    ["setup", readyState(), "학기별 참고 계획의 범위를 정해 주세요"],
    ["schedule", stateWithPlan(), "목표 학기 안에 참고 계획을 만들었어요"],
    ["checks", stateWithPlan(), "배치하지 못한 과목"],
  ] as const)("renders one main and one focused H1 on the %s step", async (step, state, heading) => {
    saveState(state);
    history.replaceState({}, "", `/?view=plan&step=${step}`);

    await mountApp();

    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expectFocusedPlanHeading(heading);
  });

  it("submits the four-input setup, persists the plan, and routes to schedule", async () => {
    saveState(readyState());
    history.replaceState({}, "", "/?view=plan&step=setup");
    await mountApp();

    expect(input("현재 학기").value).toBe("2026-2");
    await change(input("목표 졸업 학기"), "2027-2");
    await change(input("학기당 최대 전공과목 수"), "6");
    await click("학기별 참고 계획 만들기");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.graduationPlanPreferences).toEqual(preferences);
    expect(saved.graduationPlan?.preferences).toEqual(preferences);
    expect(saved.courseSelections).toEqual([{ courseId: "b-1", status: "completed" }]);
    expect(saved.snapshots).toHaveLength(0);
    expect(new URLSearchParams(location.search).get("step")).toBe("schedule");
    expect(document.body.textContent).toContain("학기별 참고 계획");
  });

  it.each([
    ["schedule", false],
    ["checks", false],
    ["schedule", true],
    ["checks", true],
  ] as const)(
    "canonicalizes a result-less %s URL to setup (saved preferences: %s)",
    async (step, withPreferences) => {
      saveState(readyState(withPreferences ? { graduationPlanPreferences: preferences } : {}));
      history.replaceState({}, "", `/?view=plan&step=${step}`);
      const replaceState = vi.spyOn(history, "replaceState");

      await mountApp();

      expect(new URLSearchParams(location.search).get("step")).toBe("setup");
      expect(history.state).toEqual(expect.objectContaining({ view: "plan", step: "setup" }));
      expect(document.body.textContent).toContain("학기별 참고 계획의 범위를 정해 주세요");
      expect(replaceState).toHaveBeenCalled();
      expectFocusedPlanHeading("학기별 참고 계획의 범위를 정해 주세요");
    },
  );

  it("canonicalizes stale result steps received through popstate", async () => {
    saveState(readyState({ graduationPlanPreferences: preferences }));
    history.replaceState({}, "", "/?view=plan&step=setup");
    await mountApp();

    history.pushState({}, "", "/?view=plan&step=checks");
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });

    expect(new URLSearchParams(location.search).get("step")).toBe("setup");
    expect(history.state).toEqual(expect.objectContaining({ view: "plan", step: "setup" }));
    expect(document.body.textContent).toContain("학기별 참고 계획의 범위를 정해 주세요");
  });

  it("invalidates a generated plan and reviewed input after a completed course changes", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=diagnosis&step=courses");
    await mountApp();

    await act(async () => {
      checkbox("통계학기초").click();
    });

    const changed = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(changed.graduationPlanPreferences).toEqual(preferences);
    expect(changed.graduationPlan).toBeUndefined();
    expect(changed.courseInputReviewedAt).toBeUndefined();

    history.pushState({}, "", "/?view=plan&step=schedule");
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    });
    expect(new URLSearchParams(location.search).get("step")).toBe("setup");
    expect(document.body.textContent).not.toContain("계획 저장");
  });

  it("keeps schedule and checks as separate canonical pages and restores schedule on back", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();

    expect(document.body.textContent).toContain("계획 저장");
    expect(document.body.textContent).not.toContain("배치하지 못한 과목");
    expectFocusedPlanHeading("목표 학기 안에 참고 계획을 만들었어요");
    expect(history.scrollRestoration).toBe("manual");
    vi.mocked(window.scrollTo).mockClear();

    await click("확인");
    expect(new URLSearchParams(location.search).get("step")).toBe("checks");
    expect(document.body.textContent).toContain("배치하지 못한 과목");
    expect(document.body.textContent).not.toContain("계획 저장");
    expectFocusedPlanHeading("배치하지 못한 과목");
    expect(history.scrollRestoration).toBe("manual");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    vi.mocked(window.scrollTo).mockClear();

    await act(async () => {
      const popped = new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
      });
      history.back();
      await popped;
    });
    expect(new URLSearchParams(location.search).get("step")).toBe("schedule");
    expect(document.body.textContent).toContain("계획 저장");
    expectFocusedPlanHeading("목표 학기 안에 참고 계획을 만들었어요");
    expect(history.scrollRestoration).toBe("manual");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("routes between checks, schedule, and condition editing with H1 focus", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=checks");
    await mountApp();

    await click("일정");
    expect(new URLSearchParams(location.search).get("step")).toBe("schedule");
    expectFocusedPlanHeading("목표 학기 안에 참고 계획을 만들었어요");

    await click("조건 수정");
    expect(new URLSearchParams(location.search).get("step")).toBe("setup");
    expectFocusedPlanHeading("학기별 참고 계획의 범위를 정해 주세요");
  });

  it("restores the previous history scroll policy after leaving plan", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();
    expect(history.scrollRestoration).toBe("manual");

    await click("추천 비교로 돌아가기");

    expect(new URLSearchParams(location.search).get("view")).toBe("recommendation");
    expect(history.scrollRestoration).toBe("auto");
  });

  it("restores the previous history scroll policy when App unmounts from plan", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();
    expect(history.scrollRestoration).toBe("manual");

    await act(async () => root?.unmount());
    root = undefined;

    expect(history.scrollRestoration).toBe("auto");
  });

  it("saves one snapshot only on the explicit save action", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null").snapshots).toHaveLength(0);
    await click("계획 저장");

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.snapshots).toHaveLength(1);
    expect(saved.snapshots[0]).toEqual(expect.objectContaining({
      profile: minorProfile,
      result: expect.any(Object),
      recommendationAxes: expect.any(Object),
      graduationPlan: saved.graduationPlan,
    }));
    expect(document.body.textContent).toContain("계획을 이 브라우저에 저장했습니다");
    expect(button("계획 저장").disabled).toBe(true);

    await click("계획 저장");
    const afterSecondClick = JSON.parse(
      localStorage.getItem(STORAGE_KEY_V2) ?? "null",
    ) as SavedAppStateV2;
    expect(afterSecondClick.snapshots).toHaveLength(1);
  });

  it("guards two rapid save clicks so one generated plan appends one snapshot", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();

    await act(async () => {
      button("계획 저장").click();
      button("계획 저장").click();
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(saved.snapshots).toHaveLength(1);
    expect(button("계획 저장").disabled).toBe(true);
  });

  it("never shows save success when browser storage fails", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await click("계획 저장");

    expect(document.body.textContent).toContain("계획을 저장하지 못했습니다");
    expect(document.body.textContent).not.toContain("계획을 이 브라우저에 저장했습니다");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null").snapshots).toHaveLength(0);
    expect(button("계획 저장").disabled).toBe(false);

    setItem.mockRestore();
    await click("계획 저장");
    const savedAfterRetry = JSON.parse(
      localStorage.getItem(STORAGE_KEY_V2) ?? "null",
    ) as SavedAppStateV2;
    expect(savedAfterRetry.snapshots).toHaveLength(1);
  });
});
