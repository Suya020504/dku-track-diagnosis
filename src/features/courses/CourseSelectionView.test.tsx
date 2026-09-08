// @vitest-environment jsdom

import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courses } from "../../data/curriculumData";
import type { CourseSelectionRecord, StudentProfile } from "../../types";
import {
  CourseSelectionView,
  type CourseGradeFilter,
  type CourseGroupMode,
  type CourseSemesterFilter,
} from "./CourseSelectionView";

let root: Root | undefined;

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

function link(label: string): HTMLAnchorElement {
  const match = [...document.querySelectorAll<HTMLAnchorElement>("a")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!match) throw new Error(`Link not found: ${label}`);
  return match;
}

function Harness({ onSave = vi.fn(), profile }: { onSave?: () => void; profile?: StudentProfile }) {
  const [mode, setMode] = useState<CourseGroupMode>("semester");
  const [gradeFilter, setGradeFilter] = useState<CourseGradeFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<CourseSemesterFilter>("all");
  const [query, setQuery] = useState("");
  const resultActionRef = createRef<HTMLButtonElement>();
  const selections: CourseSelectionRecord[] = [
    { courseId: "b-1", status: "completed" },
    { courseId: "c-1", status: "in-progress" },
    { courseId: "c-2", status: "planned", plannedTerm: "next" },
  ];

  return (
    <>
      <CourseSelectionView
        courses={courses.filter((course) => course.moduleId !== "A")}
        courseSelections={selections}
        selectedTrackIds={["food-marketing"]}
        enrollmentType="primary"
        profile={profile}
        additionalCreditsContent={<section aria-label="추가 전공학점">추가 전공학점 입력</section>}
        headingRef={createRef<HTMLHeadingElement>()}
        resultActionRef={resultActionRef}
        mode={mode}
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        query={query}
        lastManualSaveAt=""
        onModeChange={setMode}
        onGradeFilterChange={setGradeFilter}
        onSemesterFilterChange={setSemesterFilter}
        onQueryChange={setQuery}
        onToggleCourse={vi.fn()}
        onCourseStatusChange={vi.fn()}
        onSaveCourses={onSave}
        onShowResult={vi.fn()}
        onPdfAnalyzed={vi.fn()}
      />
    </>
  );
}

async function renderHarness(props: React.ComponentProps<typeof Harness> = {}) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root");
  root = createRoot(container);
  await act(async () => root?.render(<Harness {...props} />));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
});

describe("CourseSelectionView", () => {
  it("announces the real total without confusing planned courses with completed courses", async () => {
    await renderHarness();
    expect(document.querySelector('[aria-label="전체 선택 과목 수"]')?.textContent).toContain("3개");
  });
  it("puts direct-selection controls and the ledger before secondary save metadata", async () => {
    await renderHarness();

    const filters = document.querySelector(".dku-check-filters");
    const ledger = document.querySelector(".dku-check");
    const saveBand = document.querySelector(".dku-check-save-band");
    const policy = document.querySelector(".dku-check-policy");
    if (!filters || !ledger || !saveBand || !policy) throw new Error("Missing course selection regions");

    expect(Boolean(filters.compareDocumentPosition(ledger) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(ledger.compareDocumentPosition(policy) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(policy.compareDocumentPosition(saveBand) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("places one compact result action and saved-status summary before the course controls", async () => {
    await renderHarness();

    const view = document.querySelector(".dku-courses-page");
    const actionBar = view?.querySelector(".dku-courses-actions");
    const filters = view?.querySelector(".dku-check-filters");
    if (!actionBar || !filters) throw new Error("Missing compact course hierarchy");

    expect(actionBar.textContent).toContain("이수 완료 1");
    expect(actionBar.textContent).toContain("수강 중 1");
    expect(actionBar.textContent).toContain("계획 1");
    expect(actionBar.querySelector("#diagnosis-result-action")?.textContent).toContain("진단 결과 확인");
    expect(Boolean(actionBar.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(view?.querySelector(".dku-check-start")).toBeNull();
  });

  it("keeps all grade buttons visible while semester detail is collapsed", async () => {
    await renderHarness();

    const disclosure = document.querySelector<HTMLDetailsElement>(".dku-check-more-filters");
    expect(disclosure).not.toBeNull();
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelector("summary")?.textContent).toContain("추가 필터");
    expect(disclosure?.querySelector('[aria-label="학년 선택"]')).toBeNull();
    expect(document.querySelector('[aria-label="학년 선택"]')?.closest("details")).toBeNull();
    expect(document.querySelectorAll('[aria-label="학년 선택"] button')).toHaveLength(6);
    expect(disclosure?.querySelector('[aria-label="학기 선택"]')).not.toBeNull();
  });

  it("keeps the complete 45-course direct ledger ahead of the optional PDF beta", async () => {
    await renderHarness();

    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(12);
    expect(document.querySelector(".dku-check-pagination")?.textContent).toContain("45개");
    expect(document.querySelector("h1")?.textContent).toContain("지금까지 이수한 과목을 선택하세요");
    expect(document.body.textContent).toContain("직접 선택만으로 진단을 완료할 수 있어요");

    const ledger = document.querySelector(".dku-check");
    const pdf = document.querySelector(".pdf-import-panel");
    expect(ledger).toBeTruthy();
    expect(pdf).toBeTruthy();
    if (!ledger || !pdf) throw new Error("Missing direct ledger or PDF disclosure");
    expect(ledger.compareDocumentPosition(pdf).toString()).not.toBe("0");
    expect(Boolean(ledger.compareDocumentPosition(pdf) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("reflows the semester and module filters into real ledger results", async () => {
    await renderHarness();

    const semesterMode = button("학년·학기별");
    const moduleMode = button("모듈별");
    expect(semesterMode.getAttribute("role")).toBeNull();
    expect(moduleMode.getAttribute("role")).toBeNull();
    expect(semesterMode.getAttribute("aria-pressed")).toBe("true");
    expect(moduleMode.getAttribute("aria-pressed")).toBe("false");

    await act(async () => button("2학년").click());
    expect(document.body.textContent).toContain("소비자경제학");
    expect(document.body.textContent).not.toContain("경제원론");

    await act(async () => button("모듈별").click());
    expect(semesterMode.getAttribute("aria-pressed")).toBe("false");
    expect(moduleMode.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-dku-check-mode="module"]')).toBeTruthy();
    expect(document.body.textContent).toContain("경제학 전문지식");
  });

  it("moves keyboard focus past all course checkboxes to the result action", async () => {
    await renderHarness();

    const resultAction = document.querySelector<HTMLButtonElement>("#diagnosis-result-action");
    if (!resultAction) throw new Error("Missing result action");
    const scrollIntoView = vi.fn();
    resultAction.scrollIntoView = scrollIntoView;
    const skip = link("결과로 건너뛰기");
    expect(skip.getAttribute("href")).toBe("#diagnosis-result-action");
    await act(async () => skip.click());

    expect(document.activeElement).toBe(resultAction);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });

  it("keeps every course detail behind a collapsed disclosure", async () => {
    await renderHarness();

    const details = [...document.querySelectorAll<HTMLDetailsElement>(".dku-check-row-details")];
    expect(details).toHaveLength(12);
    expect(details.every((detail) => !detail.open)).toBe(true);
    expect(details[0]?.querySelector("summary")?.textContent).toContain("과목 정보");
  });

  it("keeps manual save as a working action", async () => {
    const onSave = vi.fn();
    await renderHarness({ onSave });

    await act(async () => button("지금 저장").click());
    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it("keeps applied filters visible and can clear them without reopening the filter panel", async () => {
    await renderHarness();
    await act(async () => button("2학년").click());
    const applied = document.querySelector('[aria-label="적용 중인 필터"]');
    expect(applied?.textContent).toContain("2학년");
    await act(async () => button("필터 초기화").click());
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(12);
    expect(document.querySelector('[aria-label="적용 중인 필터"]')).toBeNull();
  });

  it("searches the whole ledger and clears the visible grade and semester controls", async () => {
    await renderHarness();
    await act(async () => button("2학년").click());
    await act(async () => button("2학기").click());
    const search = document.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "경제원론");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(1);
    expect(document.querySelector(".dku-check-row")?.textContent).toContain("경제원론");
    expect(button("전체").getAttribute("aria-pressed")).toBe("true");
    expect(button("전체 학기").getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[aria-label="적용 중인 필터"]')).toBeNull();
  });

  it("places the additional-credit slot after policy and before save and PDF", async () => {
    await renderHarness();
    const policy = document.querySelector(".dku-check-policy")!;
    const extra = document.querySelector('[aria-label="추가 전공학점"]')!;
    const save = document.querySelector(".dku-check-save-band")!;
    expect(extra).toBeTruthy();
    expect(Boolean(policy.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(extra.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });
});
