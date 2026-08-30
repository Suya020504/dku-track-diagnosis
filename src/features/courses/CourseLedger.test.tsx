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
  it("shows every planning status with real course, module, credit, term, and evidence text", () => {
    document.body.innerHTML = renderLedger();

    const rows = [...document.querySelectorAll<HTMLElement>(".course-ledger-row")];
    const rowFor = (courseName: string) => rows.find((row) => row.textContent?.includes(courseName));
    expect(rows).toHaveLength(3);
    expect(rowFor("경제원론")?.textContent).toContain("이수 완료");
    expect(rowFor("미시경제학")?.textContent).toContain("수강 중");
    expect(rowFor("소비자경제학")?.textContent).toContain("수강 계획 · 다음 학기");
    expect(rowFor("소비자경제학")?.textContent).toContain("3학점");
    expect(rowFor("소비자경제학")?.textContent).toContain("2학년 1학기");
    expect(rowFor("소비자경제학")?.textContent).toContain("공개 학기표와 제공 최종안");
    expect(rowFor("소비자경제학")?.querySelector('[data-module-marker="C"]')).toBeTruthy();

    expect(rowFor("경제원론")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(rowFor("미시경제학")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(rowFor("소비자경제학")?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
    expect(rows.every((row) => row.querySelector('[data-touch-target="44"]'))).toBe(true);
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
    expect(moduleMarkup).toContain('aria-label="모듈 그룹 빠른 이동"');
    expect(moduleMarkup).toContain('href="#course-ledger-group-module-c"');
  });

  it.each([
    ["semester", "#course-ledger-group-semester-1-1", "1학년 1학기"],
    ["module", "#course-ledger-group-module-c", "C. 경제학 전문지식"],
  ] as const)("moves %s quick navigation focus to its group heading", async (mode, href, label) => {
    await renderInteractiveLedger(mode);
    const link = document.querySelector<HTMLAnchorElement>(`.course-ledger-index a[href="${href}"]`);
    const target = document.querySelector<HTMLHeadingElement>(`${href} h3`);
    if (!link || !target) throw new Error(`Missing ${mode} quick navigation target`);
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    await act(async () => link.click());

    expect(target.textContent).toBe(label);
    expect(target.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(target);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });
});
