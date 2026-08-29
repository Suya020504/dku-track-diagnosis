import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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

function state(profile: StudentProfile, overrides: Partial<SavedAppStateV2> = {}): SavedAppStateV2 {
  return {
    version: 2,
    profile,
    courseSelections: [],
    additionalMajorCredits: [],
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

describe("path-aware result integration", () => {
  it("renders track-major profile editing without a target track", () => {
    const markup = renderApp(state(trackProfile), "?view=diagnosis&step=profile");

    expect(markup).toContain("이수 경로");
    expect(markup).toContain("진단할 트랙");
  });

  it("hides only track-specific result panels for a minor", () => {
    const markup = renderApp(state(minorProfile), "?view=result&step=result");

    expect(markup).toContain("부전공 전공학점");
    expect(markup).not.toContain("트랙 모듈 진행도");
    expect(markup).not.toContain('id="result-tab-summary"');
    expect(markup).not.toContain('id="result-tab-modules"');
    expect(markup).toContain("맞춤 트랙 추천");
    expect(markup).toContain("추천 과목을 학기 계획에 담기");
    expect(markup).toContain("PDF 저장/인쇄");
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
    expect(markup).toContain('id="result-tab-summary"');
    expect(markup).toContain('id="result-tab-modules"');
    expect(markup).toContain("한눈에 보기");
    expect(markup).toContain("부족 모듈");
  });
});
