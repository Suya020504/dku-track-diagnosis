// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateGraduationPlan } from "./lib/graduationPlanner";
import { STORAGE_KEY_V2, STORAGE_LAST_VALID_KEY_V2 } from "./lib/storage";
import type {
  GraduationPlanPreferences,
  PdfImportDraft,
  SavedAppStateV2,
  StudentProfile,
} from "./types";

const profile: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};
const preferences: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 4,
  considerSeasonalTerm: false,
};
const importedDraft: PdfImportDraft = {
  pageCount: 2,
  extractedCharacters: 30,
  matched: [
    {
      sourceId: "p1-c1",
      courseId: "b-1",
      matchKind: "exact-name",
      pageNumbers: [1],
      displayLabel: "경제원론",
    },
    {
      sourceId: "p2-c1",
      courseId: "d-1",
      matchKind: "exact-name",
      pageNumbers: [2],
      displayLabel: "환경경제학",
    },
  ],
  ambiguous: [],
  unmatched: [],
};

let root: Root | undefined;

function readyState(overrides: Partial<SavedAppStateV2> = {}): SavedAppStateV2 {
  const courseSelections = [
    { courseId: "b-2", status: "completed" as const },
    { courseId: "c-1", status: "in-progress" as const },
    { courseId: "c-2", status: "planned" as const, plannedTerm: "next" as const },
  ];
  const graduationPlan = calculateGraduationPlan({
    profile,
    courseSelections,
    additionalMajorCredits: [],
    preferences,
    generatedAt: "2026-08-30T01:00:00.000Z",
  });
  return {
    version: 2,
    profile,
    courseSelections,
    additionalMajorCredits: [],
    courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
    comparisonTrackIds: [],
    graduationPlanPreferences: preferences,
    graduationPlan,
    snapshots: [],
    ...overrides,
  };
}

function saveState(state: SavedAppStateV2) {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
}

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

function labeledCheckbox(label: string): HTMLInputElement {
  const match = [...document.querySelectorAll<HTMLLabelElement>("label")]
    .find((candidate) => candidate.textContent?.includes(label))
    ?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!match) throw new Error(`Checkbox not found: ${label}`);
  return match;
}

async function mountApp(
  analyzePdfCourseFile: (file: File, signal: AbortSignal) => Promise<PdfImportDraft>,
  storage?: Storage,
) {
  vi.doMock("./lib/pdfCourseImport", () => ({ analyzePdfCourseFile }));
  const { default: App } = await import("./App");
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root");
  root = createRoot(container);
  await act(async () => root?.render(<App storage={storage} />));
}

function makeSecondWriteFailingStorage(state: SavedAppStateV2) {
  const serialized = JSON.stringify(state);
  const values = new Map<string, string>([
    [STORAGE_KEY_V2, serialized],
    [STORAGE_LAST_VALID_KEY_V2, serialized],
  ]);
  let armed = false;
  let writes = 0;
  let failed = false;
  const storage: Storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
      if (!armed) return;
      writes += 1;
      if (writes === 2 && !failed) {
        failed = true;
        throw new Error("active commit write failed after persisting");
      }
    },
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  return {
    arm() {
      armed = true;
      writes = 0;
      failed = false;
    },
    serialized,
    storage,
    values,
  };
}

async function click(label: string) {
  await act(async () => button(label).click());
}

async function choosePdf(name = "20261234_홍길동_성적표.pdf") {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("File input not found");
  const file = new File(["private transcript source"], name, { type: "application/pdf" });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
  return file;
}

async function openAndAnalyze() {
  await click("PDF로 선택값 채우기 beta");
  return choosePdf();
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/?view=diagnosis&step=courses");
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
  vi.doUnmock("./lib/pdfJsRuntime");
  vi.doUnmock("./lib/pdfCourseImport");
  vi.restoreAllMocks();
  localStorage.clear();
  vi.resetModules();
});

describe("real PDF analyzer composition", () => {
  it("runs the strict parser with the real course candidate builder", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn(() => ({
      promise: Promise.resolve({
        numPages: 1,
        getPageText: vi.fn().mockResolvedValue("경제원론"),
        destroy,
      }),
      destroy,
    }));
    vi.doMock("./lib/pdfJsRuntime", () => ({ realPdfRuntime: { open } }));

    const { analyzePdfCourseFile } = await import("./lib/pdfCourseImport");
    const file = new File([new TextEncoder().encode("%PDF-fixture")], "private.pdf", {
      type: "application/pdf",
    });

    const result = await analyzePdfCourseFile(file, new AbortController().signal);

    expect(result).toEqual({
      pageCount: 1,
      extractedCharacters: 4,
      matched: [{
        sourceId: "p1-c1",
        courseId: "b-1",
        matchKind: "exact-name",
        pageNumbers: [1],
        displayLabel: "경제원론",
      }],
      ambiguous: [],
      unmatched: [],
    });
    expect(open).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe("App PDF import integration", () => {
  it("keeps direct selection primary and opens a memory-only review without filename or source text", async () => {
    saveState(readyState());
    await mountApp(vi.fn().mockResolvedValue(importedDraft));

    expect(document.body.textContent).toContain("지금까지 이수한 과목을 선택하세요");
    expect(document.body.textContent).toContain("직접 선택만으로 진단을 완료할 수 있어요");
    expect(document.body.textContent).toContain("수강 중");
    expect(document.body.textContent).toContain("수강 계획 · 다음 학기");
    expect(labeledCheckbox("통계학기초").checked).toBe(true);
    const file = await openAndAnalyze();

    expect(location.search).toContain("input=pdf-review");
    expect(document.body.textContent).toContain("추가할 과목을 직접 확인해 주세요");
    expect(document.body.textContent).not.toContain(file.name);
    expect(document.body.textContent).not.toContain("private transcript source");
  });

  it("adds only approved new completed courses after storage succeeds", async () => {
    saveState(readyState());
    await mountApp(vi.fn().mockResolvedValue(importedDraft));
    await openAndAnalyze();

    await act(async () => labeledCheckbox("경제원론").click());
    await act(async () => labeledCheckbox("환경경제학").click());
    await click("승인한 새 과목 2개 적용");

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(stored.courseSelections).toEqual([
      { courseId: "b-1", status: "completed" },
      { courseId: "b-2", status: "completed" },
      { courseId: "c-1", status: "in-progress" },
      { courseId: "c-2", status: "planned", plannedTerm: "next" },
      { courseId: "d-1", status: "completed" },
    ]);
    expect(stored.courseInputReviewedAt).toBeUndefined();
    expect(stored.graduationPlan).toBeUndefined();
    expect(stored.graduationPlanPreferences).toEqual(preferences);
    expect(stored.snapshots).toEqual([]);
    expect(location.search).not.toContain("input=");
    expect(document.body.textContent).toContain("지금까지 이수한 과목을 선택하세요");
  });

  it("shows a conflict and never upgrades an existing status", async () => {
    saveState(readyState());
    const conflictDraft: PdfImportDraft = {
      ...importedDraft,
      matched: [{
        sourceId: "p1-c1",
        courseId: "c-1",
        matchKind: "exact-name",
        pageNumbers: [1],
        displayLabel: "미시경제학",
      }],
    };
    await mountApp(vi.fn().mockResolvedValue(conflictDraft));
    await openAndAnalyze();

    await act(async () => labeledCheckbox("미시경제학").click());
    await click("승인한 새 과목 1개 적용");

    expect(document.body.textContent).toContain("이미 수강 중 상태라 완료로 변경하지 않았어요");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(stored.courseSelections.find((selection) => selection.courseId === "c-1"))
      .toEqual({ courseId: "c-1", status: "in-progress" });
    expect(location.search).toContain("input=pdf-review");
  });

  it("keeps direct selections and the direct URL after parser failure or cancellation", async () => {
    saveState(readyState());
    await mountApp(vi.fn().mockRejectedValue(new Error("raw parser detail")));
    await openAndAnalyze();

    expect(document.body.textContent).toContain("PDF를 분석하지 못했어요");
    expect(document.body.textContent).not.toContain("raw parser detail");
    expect(labeledCheckbox("통계학기초").checked).toBe(true);
    expect(location.search).not.toContain("input=");
  });

  it("returns unmatched review items to the direct search and moves keyboard focus there", async () => {
    saveState(readyState());
    const unmatchedDraft: PdfImportDraft = {
      pageCount: 1,
      extractedCharacters: 12,
      matched: [],
      ambiguous: [],
      unmatched: [{
        sourceId: "p1-c1",
        pageNumbers: [1],
        displayLabel: "민감한 원문 표기",
      }],
    };
    await mountApp(vi.fn().mockResolvedValue(unmatchedDraft));
    await openAndAnalyze();

    await click("직접 검색하기");

    expect(location.search).not.toContain("input=");
    expect(document.activeElement).toBe(document.querySelector('input[type="search"]'));
    expect(document.body.textContent).not.toContain("민감한 원문 표기");
  });

  it("aborts an in-flight parser without changing direct selections or the route", async () => {
    saveState(readyState());
    let signal: AbortSignal | undefined;
    await mountApp(vi.fn((_file: File, nextSignal: AbortSignal) => {
      signal = nextSignal;
      return new Promise<PdfImportDraft>(() => undefined);
    }));
    await click("PDF로 선택값 채우기 beta");
    await choosePdf();

    await click("분석 취소");

    expect(signal?.aborted).toBe(true);
    expect(labeledCheckbox("통계학기초").checked).toBe(true);
    expect(location.search).not.toContain("input=");
  });

  it("canonicalizes a refreshed review URL and explains the memory-only privacy boundary", async () => {
    saveState(readyState());
    history.replaceState(
      { view: "diagnosis", step: "courses", input: "pdf-review" },
      "",
      "/?view=diagnosis&step=courses&input=pdf-review&utm_source=share#review",
    );
    await mountApp(vi.fn().mockResolvedValue(importedDraft));

    expect(location.search).toBe("?view=diagnosis&step=courses&utm_source=share");
    expect(location.hash).toBe("#review");
    expect(document.body.textContent).toContain(
      "개인정보 보호를 위해 PDF 검수 내용은 새로고침 후 저장하지 않았어요. 직접 선택은 그대로 유지됩니다.",
    );
    expect(labeledCheckbox("통계학기초").checked).toBe(true);
  });

  it("restores review with browser back and forward while the draft remains in memory", async () => {
    saveState(readyState());
    await mountApp(vi.fn().mockResolvedValue(importedDraft));
    await openAndAnalyze();

    await act(async () => {
      const popped = new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
      });
      history.back();
      await popped;
    });
    expect(location.search).not.toContain("input=");
    expect(document.body.textContent).toContain("지금까지 이수한 과목을 선택하세요");

    await act(async () => {
      const popped = new Promise<void>((resolve) => {
        window.addEventListener("popstate", () => resolve(), { once: true });
      });
      history.forward();
      await popped;
    });
    expect(location.search).toContain("input=pdf-review");
    expect(document.body.textContent).toContain("추가할 과목을 직접 확인해 주세요");
  });

  it("keeps the draft and approvals when storage throws so applying can be retried", async () => {
    saveState(readyState());
    await mountApp(vi.fn().mockResolvedValue(importedDraft));
    await openAndAnalyze();
    await act(async () => labeledCheckbox("경제원론").click());
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    await click("승인한 새 과목 1개 적용");

    expect(document.body.textContent).toContain("저장하지 못했습니다");
    expect(labeledCheckbox("경제원론").checked).toBe(true);
    expect(button("승인한 새 과목 1개 적용")).toBeTruthy();
    expect(location.search).toContain("input=pdf-review");

    setItem.mockRestore();
    await click("승인한 새 과목 1개 적용");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY_V2) ?? "null") as SavedAppStateV2;
    expect(stored.courseSelections).toContainEqual({ courseId: "b-1", status: "completed" });
    expect(location.search).not.toContain("input=");
  });

  it("rolls back a persisted first write when the active commit write throws", async () => {
    const initial = readyState();
    saveState(initial);
    const failing = makeSecondWriteFailingStorage(initial);
    failing.arm();
    await mountApp(vi.fn().mockResolvedValue(importedDraft), failing.storage);
    await openAndAnalyze();
    await act(async () => labeledCheckbox("경제원론").click());

    await click("승인한 새 과목 1개 적용");

    expect(document.body.textContent).toContain("저장하지 못했습니다");
    expect(document.body.textContent).toContain("추가할 과목을 직접 확인해 주세요");
    expect(labeledCheckbox("경제원론").checked).toBe(true);
    expect(location.search).toContain("input=pdf-review");
    expect(failing.values.get(STORAGE_KEY_V2)).toBe(failing.serialized);
    expect(failing.values.get(STORAGE_LAST_VALID_KEY_V2)).toBe(failing.serialized);

    await act(async () => root?.unmount());
    root = undefined;
    await mountApp(vi.fn().mockResolvedValue(importedDraft), failing.storage);

    expect(location.search).not.toContain("input=");
    expect(labeledCheckbox("경제원론").checked).toBe(false);
    expect(labeledCheckbox("통계학기초").checked).toBe(true);
  });
});
