// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { courses } from "../../data/curriculumData";
import type { Course, CourseSelectionRecord, StudentProfile } from "../../types";
import { CourseLedger } from "./CourseLedger";

const ledgerCourses = courses.filter((course) => course.moduleId !== "A");
const doubleMajor: StudentProfile = { affiliation: "external-student", studyPath: "double-major", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "student-confirmed" };
let root: Root | undefined;

function Harness({ profile = doubleMajor, list = ledgerCourses }: { profile?: StudentProfile; list?: Course[] }) {
  const [selections, setSelections] = useState<CourseSelectionRecord[]>([]);
  const [query, setQuery] = useState("");
  return <>
    <button onClick={() => setQuery("존재하지 않는 교과목")}>검색 결과 없음</button>
    <button onClick={() => setQuery("")}>검색 지우기</button>
    <CourseLedger courses={list} courseSelections={selections} selectedTrackIds={[]} enrollmentType="double-major" profile={profile}
      mode="semester" gradeFilter="all" semesterFilter="all" query={query}
      onToggleCourse={(courseId) => setSelections((current) => current.some((item) => item.courseId === courseId)
        ? current.filter((item) => item.courseId !== courseId) : [...current, { courseId, status: "completed" }])}
      onCourseStatusChange={(courseId, status, plannedTerm) => setSelections((current) => [
        ...current.filter((item) => item.courseId !== courseId), ...(status ? [{ courseId, status, ...(status === "planned" ? { plannedTerm } : {}) }] : []),
      ])} />
    <output aria-label="선택 기록">{JSON.stringify(selections)}</output>
  </>;
}

function button(text: string) {
  const control = [...document.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => candidate.textContent?.trim() === text);
  if (!control) throw new Error(`Missing button ${text}`);
  return control;
}
function row(courseId: string) {
  const courseName = courses.find((course) => course.id === courseId)?.name;
  const result = [...document.querySelectorAll<HTMLElement>(".dku-check-row")]
    .find((candidate) => candidate.querySelector(".dku-check-course strong")?.textContent === courseName);
  if (!result) throw new Error(`Missing row ${courseId}`);
  return result;
}
async function select(control: HTMLSelectElement, value: string) {
  await act(async () => { control.value = value; control.dispatchEvent(new Event("change", { bubbles: true })); });
}
async function render(props: React.ComponentProps<typeof Harness> = {}) {
  root = createRoot(document.querySelector("#root")!);
  await act(async () => root?.render(<Harness {...props} />));
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.unstubAllGlobals(); });

describe("course input interactions", () => {
  it("uses six rows on phone screens so checking does not require a long scroll", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    await render();
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(6);
    expect(document.querySelector(".dku-check-pagination")?.textContent).toContain("1 / 8");
    await act(async () => button("다음").click());
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(6);
  });
  it("shows b-2 as required for double majors, but no required badges for minors", async () => {
    await render();
    expect(row("b-2").querySelector(".dku-check-course em")?.textContent).toBe("모듈필수");
    expect(row("b-1").querySelector(".dku-check-course em")).toBeNull();
    await act(async () => root?.render(<Harness profile={{ ...doubleMajor, studyPath: "minor" }} />));
    expect(document.querySelectorAll(".dku-check-course em")).toHaveLength(0);
  });

  it("directly changes an unselected course to every real state and can clear it", async () => {
    await render();
    const control = row("b-1").querySelector<HTMLSelectElement>('[aria-label="경제원론 이수 상태"]')!;
    expect(control).toBeTruthy();
    expect(control.closest("label.dku-check-row-primary")).toBeNull();
    for (const status of ["in-progress", "completed", "planned"]) {
      await select(control, status);
      expect(row("b-1").dataset.courseStatus).toBe(status);
      expect(row("b-1").querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
      expect(document.querySelector("output")?.textContent).toContain(`"status":"${status}"`);
    }
    const term = row("b-1").querySelector<HTMLSelectElement>('[aria-label="경제원론 계획 학기"]')!;
    expect(term.value).toBe("later");
    await select(term, "next");
    expect(document.querySelector("output")?.textContent).toContain('"plannedTerm":"next"');
    await select(term, "following");
    expect(document.querySelector("output")?.textContent).toContain('"plannedTerm":"following"');
    await select(control, "");
    expect(row("b-1").querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
    expect(document.querySelector("output")?.textContent).toBe("[]");
  });

  it("pages 12 rows at a time, preserves selections and focus after a status change", async () => {
    await render();
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(12);
    const firstId = document.querySelector<HTMLElement>(".dku-check-row")!.dataset.courseId!;
    await act(async () => row(firstId).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async () => button("다음").click());
    expect(document.querySelector(".dku-check-pagination")?.textContent).toContain("2 / 4");
    const control = document.querySelector<HTMLSelectElement>(".dku-check-status-select")!;
    control.focus();
    await select(control, "in-progress");
    expect(document.activeElement).toBe(control);
    expect(document.querySelector(".dku-check-pagination")?.textContent).toContain("2 / 4");
    await act(async () => button("이전").click());
    expect(row(firstId).querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    await act(async () => button("다음").click());
    await act(async () => button("다음").click());
    await act(async () => button("다음").click());
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(9);
    expect(button("다음").disabled).toBe(true);
    await act(async () => button("검색 결과 없음").click());
    expect(document.querySelector(".dku-check-empty")?.textContent).toContain("조건에 맞는 과목이 없습니다.");
    await act(async () => button("검색 지우기").click());
    expect(document.querySelector(".dku-check-pagination")?.textContent).toContain("1 / 4");
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(12);
  });

  it("keeps selected-only available across pages and recovers from an empty selection", async () => {
    await render();
    await act(async () => button("다음").click());
    const courseId = document.querySelector<HTMLElement>(".dku-check-row")!.dataset.courseId!;
    await select(row(courseId).querySelector<HTMLSelectElement>(".dku-check-status-select")!, "planned");
    await act(async () => button("선택한 과목만").click());
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(1);
    expect(row(courseId)).toBeTruthy();
    await act(async () => row(courseId).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(document.querySelector(".dku-check-empty")?.textContent).toContain("선택한 과목이 없습니다.");
    await act(async () => button("전체 과목 보기").click());
    expect(document.querySelectorAll(".dku-check-row")).toHaveLength(12);
  });
});
