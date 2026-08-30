// @vitest-environment jsdom

import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courses } from "../../data/curriculumData";
import type { CourseSelectionRecord } from "../../types";
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

function Harness({ onSave = vi.fn() }: { onSave?: () => void }) {
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
        onSaveCourses={onSave}
        onPdfAnalyzed={vi.fn()}
      />
      <button id="diagnosis-result-action" ref={resultActionRef} type="button">
        진단 결과 자세히 보기
      </button>
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
  it("keeps the complete 45-course direct ledger ahead of the optional PDF beta", async () => {
    await renderHarness();

    expect(document.querySelectorAll(".course-ledger-row")).toHaveLength(45);
    expect(document.querySelector("h1")?.textContent).toContain("지금까지 이수한 과목을 선택하세요");
    expect(document.body.textContent).toContain("직접 선택만으로 진단을 완료할 수 있어요");

    const ledger = document.querySelector(".course-ledger");
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
    expect(document.querySelector('[aria-label="모듈 그룹 빠른 이동"]')).toBeTruthy();
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

  it("keeps manual save as a working action", async () => {
    const onSave = vi.fn();
    await renderHarness({ onSave });

    await act(async () => button("지금 저장").click());
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
