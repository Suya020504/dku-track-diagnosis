// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Course, CourseSelectionRecord } from "../../types";
import { CourseLedger } from "./CourseLedger";

const ledgerCourses: Course[] = [
  {
    id: "b-1",
    code: "B-1",
    name: "경제원론",
    credits: 3,
    moduleId: "B",
    recommendedSemester: "1-1",
  },
  {
    id: "c-1",
    code: "C-1",
    name: "미시경제학",
    credits: 3,
    moduleId: "C",
    recommendedSemester: "2-2",
    required: true,
  },
  {
    id: "c-2",
    code: "C-2",
    name: "소비자경제학",
    credits: 3,
    moduleId: "C",
    recommendedSemester: "2-1",
    sourceNote: "공개 학기표와 제공 최종안에서 교과목명을 확인했습니다.",
  },
  {
    id: "d-1",
    code: "D-1",
    name: "환경경제학",
    credits: 3,
    moduleId: "D",
    recommendedSemester: "3-1",
  },
];

const selections: CourseSelectionRecord[] = [
  { courseId: "b-1", status: "completed" },
  { courseId: "c-1", status: "in-progress" },
  { courseId: "c-2", status: "planned", plannedTerm: "next" },
];

let root: Root | undefined;

function renderLedger(overrides: Partial<React.ComponentProps<typeof CourseLedger>> = {}) {
  return renderToStaticMarkup(
    <CourseLedger
      courses={ledgerCourses}
      courseSelections={selections}
      selectedTrackIds={["food-marketing"]}
      enrollmentType="primary"
      mode="semester"
      gradeFilter="all"
      semesterFilter="all"
      query=""
      onToggleCourse={vi.fn()}
      onCourseStatusChange={vi.fn()}
      {...overrides}
    />,
  );
}

async function renderInteractiveLedger(mode: "semester" | "module") {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root");
  root = createRoot(container);
  await act(async () => root?.render(
    <CourseLedger
      courses={ledgerCourses}
      courseSelections={selections}
      selectedTrackIds={["food-marketing"]}
      enrollmentType="primary"
      mode={mode}
      gradeFilter="all"
      semesterFilter="all"
      query=""
      onToggleCourse={vi.fn()}
      onCourseStatusChange={vi.fn()}
    />,
  ));
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

describe("CourseLedger", () => {
  it("matches official codes and ignores whitespace without changing selection semantics", () => {
    const markup = renderLedger({ query: " 345 790 " });
    expect(markup).toContain("미시경제학");
    expect(markup).not.toContain("소비자경제학");
    expect(markup).toContain("학사 과목코드");
    expect(markup).toContain("트랙 자료 코드");
    expect(markup).toContain("수강 중");
    expect(renderLedger({ query: "미 시 경 제 학" })).toContain("미시경제학");
  });
  it("recognizes the existing official timetable alias", () => {
    const course: Course = { id: "m-1", code: "M-1", name: "인체의 신비", credits: 2, moduleId: "M" };
    expect(renderLedger({ courses: [course], query: "바이오 헬스 인체의 신비" })).toContain("인체의 신비");
    expect(renderLedger({ courses: [course], query: "541980" })).toContain("인체의 신비");
  });
  it("shows planning status, course, module, credit, and term without internal audit text", () => {
    document.body.innerHTML = renderLedger();

    const rows = [...document.querySelectorAll<HTMLElement>(".dku-check-row")];
    const rowFor = (courseName: string) => rows.find((row) => row.textContent?.includes(courseName));
    expect(rows).toHaveLength(4);
    expect(rowFor("경제원론")?.textContent).toContain("이수 완료");
    expect(rowFor("미시경제학")?.textContent).toContain("수강 중");
    expect(rowFor("소비자경제학")?.querySelector<HTMLSelectElement>('select[aria-label="소비자경제학 이수 상태"]')?.value).toBe("planned");
    expect(rowFor("소비자경제학")?.textContent).toContain("플래너에서 정한 시작 학기 기준");
    expect(rowFor("소비자경제학")?.textContent).toContain("3학점");
    expect(rowFor("소비자경제학")?.textContent).toContain("2학년 1학기");
    expect(rowFor("소비자경제학")?.textContent).not.toContain("공개 학기표와 제공 최종안");
    expect(rowFor("소비자경제학")?.querySelector('[data-module-marker="C"]')).toBeTruthy();

    expect(rowFor("경제원론")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(rowFor("미시경제학")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(rowFor("소비자경제학")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(rows.every((row) => row.querySelector('[data-touch-target="44"]'))).toBe(true);
    expect(rows.every((row) => row.querySelector("details.dku-check-row-details:not([open])"))).toBe(true);
    expect(rowFor("경제원론")?.querySelector(".dku-check-row-details summary .sr-only")?.textContent)
      .toBe("경제원론 과목 정보");
  });

  it("shows a flat continuous list without semester or module accordions", () => {
    document.body.innerHTML = renderLedger();

    const groups = [...document.querySelectorAll<HTMLDetailsElement>("details.dku-check-group")];
    expect(groups).toHaveLength(0);
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(4);
    expect(document.querySelector(".dku-check-index")).toBeNull();
    expect(document.querySelector(".dku-check-summary")?.textContent).toContain("3");
  });

  it("filters by semester and query without replacing the ledger row structure", () => {
    const semesterMarkup = renderLedger({
      gradeFilter: "2",
      semesterFilter: "1",
    });
    expect(semesterMarkup).toContain("소비자경제학");
    expect(semesterMarkup).not.toContain("경제원론");
    expect(semesterMarkup).not.toContain("미시경제학");

    const moduleMarkup = renderLedger({ mode: "module", query: "미시" });
    expect(moduleMarkup).toContain("미시경제학");
    expect(moduleMarkup).not.toContain("소비자경제학");
    expect(moduleMarkup).toContain('data-dku-check-mode="module"');
    expect(moduleMarkup).toContain('data-module-marker="C"');
  });

  it("can reduce the ledger to courses that already have a saved status", async () => {
    await renderInteractiveLedger("semester");
    const toggle = [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((candidate) => candidate.textContent?.includes("선택한 과목만"));
    if (!toggle) throw new Error("Missing selected-only control");

    await act(async () => toggle.click());

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(3);
    expect(document.body.textContent).not.toContain("환경경제학");
  });
});
