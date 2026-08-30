// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, {
  createGraduationPlanTransition,
  saveGraduationPlanSnapshotTransition,
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
});

describe("App graduation plan pages", () => {
  it("shows a working prerequisite action instead of calculating with missing inputs", async () => {
    saveState({
      ...createEmptyAppState(),
      profile: { ...minorProfile, studyPath: "track-major" },
      courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
      graduationPlanPreferences: preferences,
    });
    history.replaceState({}, "", "/?view=plan&step=schedule");

    await mountApp();

    expect(document.body.textContent).toContain("졸업 계획 전에 입력 상태를 확인해 주세요");
    expect(document.body.textContent).toContain("프로필·이수 과목 확인");
    expect(document.body.textContent).not.toContain("계획 저장");
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

  it("keeps schedule and checks as separate canonical pages and restores schedule on back", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();

    expect(document.body.textContent).toContain("계획 저장");
    expect(document.body.textContent).not.toContain("배치하지 못한 과목");
    await click("확인할 항목 보기");
    expect(new URLSearchParams(location.search).get("step")).toBe("checks");
    expect(document.body.textContent).toContain("배치하지 못한 과목");
    expect(document.body.textContent).not.toContain("계획 저장");

    await act(async () => {
      const popped = new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
      });
      history.back();
      await popped;
    });
    expect(new URLSearchParams(location.search).get("step")).toBe("schedule");
    expect(document.body.textContent).toContain("계획 저장");
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
  });

  it("never shows save success when browser storage fails", async () => {
    saveState(stateWithPlan());
    history.replaceState({}, "", "/?view=plan&step=schedule");
    await mountApp();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await click("계획 저장");

    expect(document.body.textContent).toContain("계획을 저장하지 못했습니다");
    expect(document.body.textContent).not.toContain("계획을 이 브라우저에 저장했습니다");
  });
});
