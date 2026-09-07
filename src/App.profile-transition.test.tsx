// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDiagnosisStep } from "./lib/viewRouting";
import {
  EnrollmentProfileSummary,
  completeProfileTransition,
  reviewCourseInputTransition,
  saveCompletedCoursesManually,
} from "./App";
import App from "./App";
import { STORAGE_KEY_V2, createEmptyAppState } from "./lib/storage";
import type { SavedAppStateV2, StudentProfile } from "./types";

const minorProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const trackProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "track-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

let root: Root | undefined;

function state(profile: StudentProfile): SavedAppStateV2 {
  return {
    version: 2,
    profile,
    courseSelections: [],
    additionalMajorCredits: [],
    comparisonTrackIds: [],
    snapshots: [],
  };
}

function saveState(savedState: SavedAppStateV2) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(savedState));
}

async function mountApp() {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => root?.render(<App />));
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
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("profile integration transitions", () => {
  it("lets a minor with no track review direct course input and reach result", () => {
    const current = {
      ...state(minorProfile),
      courseSelections: [{ courseId: "B-1", status: "completed" as const }],
    };
    const reviewed = reviewCourseInputTransition(current, "2026-08-30T12:00:00.000Z");

    expect(reviewed.courseInputReviewedAt).toBe("2026-08-30T12:00:00.000Z");
    expect(reviewed.courseSelections).toEqual(current.courseSelections);
  });

  it("lets a progress-checking track-major continue to courses without an explicit target", () => {
    const withoutTarget = completeProfileTransition(state(trackProfile), trackProfile);
    const withTarget = completeProfileTransition(
      { ...state(trackProfile), targetTrackId: "food-marketing" },
      trackProfile,
    );

    expect(withoutTarget.step).toBe("courses");
    expect(resolveDiagnosisStep("?view=diagnosis&step=courses", withoutTarget.state)).toBe(withoutTarget.step);
    expect(withTarget.step).toBe("courses");
    expect(resolveDiagnosisStep("?view=diagnosis&step=courses", withTarget.state)).toBe(withTarget.step);
    expect(withTarget.state.targetTrackId).toBe("food-marketing");
  });

  it("restores a targetless track-major directly into course input instead of a blocking picker", async () => {
    saveState(state(trackProfile));
    history.replaceState({}, "", "/?view=diagnosis&step=courses");

    await mountApp();

    expect(document.body.textContent).toContain("지금까지 이수한 과목을 선택하세요.");
    expect(document.body.textContent).toContain("선택한 트랙 없음");
    expect(document.body.textContent).toContain("5개 트랙 비교");
    const resultAction = document.querySelector<HTMLButtonElement>("#diagnosis-result-action");
    expect(resultAction).not.toBeNull();
    expect(resultAction?.closest(".course-selection-action-bar")).not.toBeNull();
    expect(document.querySelector(".planner-diagnosis-panel")).toBeNull();

    await act(async () => resultAction?.click());

    const reviewed = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(reviewed.courseInputReviewedAt).toBeTruthy();
    expect(new URLSearchParams(location.search).get("view")).toBe("recommendation");
    expect(new URLSearchParams(location.search).get("axis")).toBe("progress");
    expect(document.querySelector('[data-recommendation-panel="progress"]')).not.toBeNull();
  });

  it("clears target and comparison tracks when track-major changes to minor", () => {
    const current = {
      ...state(trackProfile),
      targetTrackId: "food-marketing" as const,
      comparisonTrackIds: ["economics" as const, "agri-food-distribution" as const],
    };

    const transition = completeProfileTransition(current, minorProfile);

    expect(transition.state.targetTrackId).toBeUndefined();
    expect(transition.state.comparisonTrackIds).toEqual([]);
    expect(transition.step).toBe("courses");
  });

  it("shows legacy enrollment as a non-mutating profile summary", () => {
    const markup = renderToStaticMarkup(
      <EnrollmentProfileSummary enrollmentType="minor" onEditProfile={vi.fn()} />,
    );

    expect(markup).toContain("부전공");
    expect(markup).toContain("이수 경로 변경");
    expect(markup).not.toContain("type=\"radio\"");
    expect(markup).not.toContain("심화전공");
  });

  it("reports a throwing localStorage save as failed without a success time", () => {
    const throwingStorage: Storage = {
      get length() {
        return 0;
      },
      clear: () => undefined,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    const feedback = saveCompletedCoursesManually(
      state(minorProfile),
      new Date(2026, 7, 30, 14, 5),
      throwingStorage,
    );

    expect(feedback).toEqual({ storageError: true, lastManualSaveAt: "" });
  });

  it("restores and updates the profile stage through deep links and popstate", async () => {
    saveState(createEmptyAppState());
    history.replaceState({}, "", "/?view=diagnosis&step=profile&profile=path");

    await mountApp();

    expect(document.querySelector('[data-profile-stage-marker="path"]')?.getAttribute("aria-current")).toBe("step");
    expect(document.querySelector('[data-profile-region="path"]')?.textContent).toContain("소속을 먼저 선택해 주세요");
    expect(document.querySelector('[data-profile-region="affiliation"]')).toBeNull();
    expect(document.querySelector(".study-path-complete")).toBeNull();

    await act(async () => {
      (document.querySelector<HTMLButtonElement>('[data-profile-recover]') ??
        (() => { throw new Error("Missing affiliation recovery control"); })()).click();
    });
    expect(new URLSearchParams(location.search).get("profile")).toBe("affiliation");

    await setRouteAndPop("/?view=diagnosis&step=profile&profile=path");
    expect(document.querySelector('[data-profile-stage-marker="path"]')?.getAttribute("aria-current")).toBe("step");
    expect(document.querySelector('[data-profile-region="path"]')).not.toBeNull();
  });

  it("canonicalizes the legacy modules route and lets the resource index change sections", async () => {
    saveState(state(minorProfile));
    history.replaceState({}, "", "/?view=modules");

    await mountApp();

    expect(new URLSearchParams(location.search).get("view")).toBe("resources");
    expect(new URLSearchParams(location.search).get("section")).toBe("modules");
    expect(location.search).toBe("?view=resources&section=modules");
    expect(document.querySelector('[data-resource-section="modules"]')?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector('[data-resource-section="modules"]')?.getAttribute("aria-selected")).toBeNull();

    await act(async () => {
      (document.querySelector<HTMLButtonElement>('[data-resource-section="official"]') ??
        (() => { throw new Error("Missing official resource control"); })()).click();
    });
    expect(new URLSearchParams(location.search).get("section")).toBe("official");

    await setRouteAndPop("/?view=resources&section=curriculum");
    expect(document.querySelector('[data-resource-section="curriculum"]')?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector('[data-resource-section="curriculum"]')?.getAttribute("aria-selected")).toBeNull();
  });
});
