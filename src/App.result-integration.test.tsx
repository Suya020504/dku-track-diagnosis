// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { calculateDiagnosis } from "./lib/diagnosis";
import { STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2, StudentProfile } from "./types";

const minorProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const advancedProfile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const trackProfile: StudentProfile = {
  ...advancedProfile,
  studyPath: "track-major",
};

const doubleMajorProfile: StudentProfile = {
  ...minorProfile,
  studyPath: "double-major",
  ruleApplicability: "reference-only",
};

let root: Root | undefined;

function state(profile: StudentProfile, overrides: Partial<SavedAppStateV2> = {}): SavedAppStateV2 {
  return {
    version: 2,
    profile,
    courseSelections: [],
    additionalMajorCredits: [],
    courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    comparisonTrackIds: [],
    snapshots: [],
    ...overrides,
  };
}

function createStorage(): Storage {
  const values = new Map<string, string>();
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

function renderApp(savedState: SavedAppStateV2, search: string): string {
  const storage = createStorage();
  storage.setItem(STORAGE_KEY_V2, JSON.stringify(savedState));
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
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

describe("path-aware result integration", () => {
  it("guards a direct result URL until course input has been reviewed", () => {
    const markup = renderApp(
      state(minorProfile, { courseInputReviewedAt: undefined }),
      "?view=result&step=result",
    );

    expect(markup).toContain("지금까지 이수한 과목을 선택하세요.");
    expect(markup).not.toContain("부전공 전공학점");
  });

  it("renders a direct result URL after course input has been reviewed", () => {
    const markup = renderApp(state(minorProfile), "?view=result&step=result");

    expect(markup).toContain("부전공 전공학점");
    expect(markup).not.toContain("지금까지 이수한 과목을 선택하세요.");
  });

  it("renders track-major profile editing without a target track", () => {
    const markup = renderApp(state(trackProfile), "?view=diagnosis&step=profile");

    expect(markup).toContain("이수 경로");
    expect(markup).toContain("진단할 트랙");
  });

  it("hides only track-specific result panels for a minor", () => {
    const markup = renderApp(state(minorProfile), "?view=result&step=result");

    expect(markup).toContain("부전공 전공학점");
    expect(markup).not.toContain("트랙 모듈 진행도");
    expect(markup).not.toContain("<span>전체 진행률</span>");
    expect(markup).not.toContain("<span>트랙 인정 학점</span>");
    expect(markup).not.toContain('id="result-tab-summary"');
    expect(markup).not.toContain('id="result-tab-modules"');
    expect(markup).not.toContain('id="result-tab-required"');
    expect(markup).not.toContain("1학년 필수 제외 적용");
    expect(markup).not.toContain("필수 과목 누락");
    expect(markup).toContain("다음 할 일");
    expect(markup).toContain("추천 과목을 학기 계획에 담기");
    expect(markup).toContain("PDF 저장/인쇄");
  });

  it("uses the starred-six required list for a double major, including B-2", () => {
    const markup = renderApp(state(doubleMajorProfile), "?view=result&step=result");

    expect(markup).toContain('id="result-section-confirm"');
    expect(markup).toContain("B-2 통계학기초");
    expect(markup).not.toContain("1학년 필수 제외 적용");
    expect(markup).not.toContain("이수유형 기준 필수 제외");
  });

  it("does not count in-progress track courses in current result metrics", () => {
    const inProgressCourseIds = [
      "b-2", "c-1", "c-2", "c-3", "f-1", "f-2", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2",
    ];
    const markup = renderApp(
      state(trackProfile, {
        targetTrackId: "food-marketing",
        courseSelections: inProgressCourseIds.map((courseId) => ({
          courseId,
          status: "in-progress" as const,
        })),
      }),
      "?view=result&step=result",
    );

    expect(markup).toContain("0 / 18학점");
    expect(markup).toContain("0 / 63학점");
    expect(markup).toContain("<span>전체 진행률</span><strong>0%</strong>");
    expect(markup).toContain("<span>트랙 인정 학점</span><strong>0학점</strong>");
    expect(markup).not.toContain("<span>전체 진행률</span><strong>100%</strong>");
    expect(markup).not.toContain("<span>트랙 인정 학점</span><strong>30학점</strong>");
  });

  it("uses the path-progress reference status instead of legacy aggregate completion", () => {
    const markup = renderApp(
      state(advancedProfile, {
        courseSelections: [
          "b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2", "d-3", "e-1", "e-2",
          "e-3", "e-4", "f-1", "f-2", "f-3", "g-1", "g-2", "g-3", "h-1", "h-2", "h-3",
        ].map((courseId) => ({ courseId, status: "completed" as const })),
      }),
      "?view=result&step=result",
    );

    expect(markup).toContain("참고 계산상 충족");
    expect(markup).not.toContain("선택한 트랙 조건을 모두 충족했습니다.");
  });

  it("keeps a legacy-passed track-major as a reference calculation", () => {
    const completedCourseIds = [
      "b-2", "c-1", "c-2", "c-3", "f-1", "f-2", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2",
    ];
    const legacyResult = calculateDiagnosis({
      trackIds: ["food-marketing"],
      completedCourseIds,
      enrollmentType: "primary",
    });
    const markup = renderApp(
      state(trackProfile, {
        targetTrackId: "food-marketing",
        courseSelections: completedCourseIds.map((courseId) => ({ courseId, status: "completed" as const })),
        additionalMajorCredits: [{
          id: "verified-transfer-credit",
          label: "공식 인정 전공학점",
          credits: 21,
          status: "officially-verified",
        }],
      }),
      "?view=result&step=result",
    );

    expect(legacyResult.passed).toBe(true);
    expect(markup).toContain("참고 계산상 충족");
    expect(markup).not.toContain("현재 입력 기준 충족");
    expect(markup).not.toContain("선택한 트랙 조건을 모두 충족했습니다.");
  });

  it("retains track detail panels for a track-major with an explicit target", () => {
    const markup = renderApp(
      state(trackProfile, { targetTrackId: "food-marketing" }),
      "?view=result&step=result",
    );

    expect(markup).toContain("트랙 모듈 진행도");
    expect(markup).toContain('id="result-section-current"');
    expect(markup).toContain('id="result-section-next"');
    expect(markup).toContain("현재 현황");
    expect(markup).toContain("다음 할 일");
  });

  it("restores the incumbent result section from deep links and user navigation", async () => {
    saveState(state(trackProfile, { targetTrackId: "food-marketing" }));
    history.replaceState({}, "", "/?view=result&section=next");

    await mountApp();

    expect(document.querySelector('[data-result-section="next"]')?.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-result-panel="next"]')?.textContent).toContain("모듈별 충족 현황");
    expect(document.querySelector('[data-result-panel="current"]')?.hasAttribute("hidden")).toBe(true);

    await act(async () => {
      (document.querySelector<HTMLButtonElement>('[data-result-section="current"]') ??
        (() => { throw new Error("Missing current result control"); })()).click();
    });
    expect(new URLSearchParams(location.search).get("section")).toBe("current");
    expect(document.querySelector('[data-result-panel="current"]')?.hasAttribute("hidden")).toBe(false);

    await setRouteAndPop("/?view=result&section=next");
    expect(document.querySelector('[data-result-section="next"]')?.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-result-panel="next"]')?.textContent).toContain("모듈별 충족 현황");

    await act(async () => {
      (document.querySelector<HTMLButtonElement>('[data-result-section="confirm"]') ??
        (() => { throw new Error("Missing confirm result control"); })()).click();
    });
    expect(new URLSearchParams(location.search).get("section")).toBe("confirm");
    expect(document.querySelector('[data-result-panel="confirm"]')?.hasAttribute("hidden")).toBe(false);
    expect(document.querySelector('[data-result-panel="confirm"]')?.textContent).toContain("공식 확인 전 점검");
  });

  it("keeps confirm selected and visible when a path has no required-course panel", async () => {
    saveState(state(minorProfile));
    history.replaceState({}, "", "/?view=result&section=confirm");

    await mountApp();

    expect(document.querySelector('[data-result-section="confirm"]')?.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-result-panel="confirm"]')?.textContent).toContain("별도 필수 과목 확인 항목이 없습니다");
  });
});
