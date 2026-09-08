// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { departmentCurriculum } from "../../data/officialTimetable2026";
import { CurriculumReferenceView } from "./CurriculumReferenceView";

let root: Root;

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
  await act(async () => root.render(<CurriculumReferenceView />));
});

afterEach(async () => { await act(async () => root.unmount()); });

async function change(node: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const prototype = node.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(node, value);
    node.dispatchEvent(new Event(node.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}

function courseButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>("button[data-curriculum-course]")];
}

describe("curriculum academic roadmap", () => {
  it("places all 47 distinct courses in their exact year and semester within one semantic matrix", () => {
    const table = document.querySelector("table");
    expect(table?.querySelectorAll("thead tr")).toHaveLength(2);
    expect(table?.querySelectorAll('thead th[scope="colgroup"]')).toHaveLength(4);
    expect(table?.querySelectorAll('thead th[scope="col"]')).toHaveLength(8);
    expect(table?.querySelector('thead th[rowspan="2"]')?.textContent).toBe("학습분야");
    expect(courseButtons()).toHaveLength(47);
    expect(new Set(courseButtons().map((button) => button.dataset.curriculumCourse)).size).toBe(47);
    for (const course of departmentCurriculum) {
      const button = document.querySelector<HTMLButtonElement>(`button[data-curriculum-course="${course.officialCourseCode}"]`);
      expect(button?.textContent).toContain(course.courseName);
      expect(button?.textContent).toContain(`${course.credits}학점`);
      expect(button?.closest("td")?.dataset.semester).toBe(`${course.grade}-${course.semester}`);
      const headerNames = button?.closest("td")?.getAttribute("headers")?.split(" ").map((id) => document.getElementById(id)?.textContent);
      expect(headerNames).toContain(`${course.grade}학년`);
    }
  });

  it("keeps ten career and practical courses accessible without assigning them to a graduation track", () => {
    const practiceRow = document.querySelector('[data-learning-area="practice"]');
    expect(practiceRow?.querySelectorAll("button[data-curriculum-course]")).toHaveLength(10);
    expect(practiceRow?.textContent).toContain("진로·실습");
    expect(practiceRow?.textContent).toContain("국내인턴십1(환경자원경제)");
    expect(practiceRow?.textContent).toContain("18학점");
    expect(document.querySelector("input[type=checkbox]")).toBeNull();
  });

  it("reduces the matrix to two semester columns for a selected year and restores all eight", async () => {
    await change(document.querySelector("select")!, "1");
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
    expect(courseButtons()).toHaveLength(6);
    expect(courseButtons().every((button) => button.closest("td")?.dataset.semester?.startsWith("1-"))).toBe(true);
    await change(document.querySelector("select")!, "all");
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(8);
    expect(courseButtons()).toHaveLength(47);
  });

  it("searches exact source course codes and space-normalized names without dropping the matrix headers", async () => {
    await change(document.querySelector("input")!, " 479 330 ");
    expect(courseButtons().map((button) => button.dataset.curriculumCourse)).toEqual(["479330"]);
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(8);
    await change(document.querySelector("input")!, "식품 유통 경제학");
    expect(courseButtons().map((button) => button.dataset.curriculumCourse)).toEqual(["553110"]);
  });

  it("offers an empty-state reset that clears both filters and restores all courses", async () => {
    await change(document.querySelector("input")!, "479330");
    await change(document.querySelector("select")!, "1");
    expect(courseButtons()).toHaveLength(0);
    expect(document.body.textContent).toContain("조건에 맞는 과목이 없습니다");
    const reset = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "전체 교육과정 보기");
    expect(reset).toBeDefined();
    await act(async () => reset?.click());
    expect(document.querySelector<HTMLInputElement>("input")?.value).toBe("");
    expect(document.querySelector<HTMLSelectElement>("select")?.value).toBe("all");
    expect(courseButtons()).toHaveLength(47);
    expect(document.activeElement).toBe(document.querySelector("input"));
  });

  it("opens real course details, closes with Escape, and returns focus to the source course button", async () => {
    const course = document.querySelector<HTMLButtonElement>('button[data-curriculum-course="479330"]');
    expect(course).not.toBeNull();
    await act(async () => course?.click());
    expect(course?.getAttribute("aria-expanded")).toBe("true");
    const detail = document.getElementById(course?.getAttribute("aria-controls") ?? "");
    expect(detail?.getAttribute("role")).toBe("region");
    expect(detail?.textContent).toContain("479330");
    expect(detail?.textContent).toContain("18학점");
    expect(detail?.textContent).toContain("4학년 1학기");
    const close = detail?.querySelector<HTMLButtonElement>("button");
    close?.focus();
    await act(async () => close?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(course?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(course);
    expect(document.getElementById(detail?.id ?? "")).toBeNull();
  });

  it("closes a course disclosure when its search or year context changes", async () => {
    const course = document.querySelector<HTMLButtonElement>('button[data-curriculum-course="479330"]');
    expect(course).not.toBeNull();
    await act(async () => course?.click());
    expect(document.querySelector('[aria-expanded="true"]')).not.toBeNull();
    await change(document.querySelector("input")!, "경제원론");
    expect(document.querySelector('[aria-expanded="true"]')).toBeNull();
    expect(courseButtons()).toHaveLength(1);
  });

  it("makes the horizontal table region keyboard reachable and labels the scroll instructions", () => {
    const region = document.querySelector<HTMLElement>('[data-curriculum-scroll]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute("role")).toBe("region");
    expect(region?.tabIndex).toBe(0);
    expect(region?.getAttribute("aria-label")).toContain("교육과정");
    const description = document.getElementById(region?.getAttribute("aria-describedby") ?? "");
    expect(description?.textContent).toContain("좌우");
    region?.focus();
    expect(document.activeElement).toBe(region);
  });
});
