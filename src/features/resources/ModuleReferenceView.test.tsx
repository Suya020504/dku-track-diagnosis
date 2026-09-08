// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { courses, modules } from "../../data/curriculumData";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import { ModuleReferenceView } from "./ModuleReferenceView";

let root: Root;
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
  await act(async () => root.render(<ModuleReferenceView />));
});
afterEach(async () => { await act(async () => root.unmount()); });

async function search(value: string) {
  const input = document.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("student module course reference", () => {
  it("preserves all 49 courses with their names, course codes and credits under 15 module disclosures", () => {
    expect(document.querySelectorAll("[data-module-disclosure]")).toHaveLength(15);
    expect(document.querySelectorAll(".dku-resource-module-grid li")).toHaveLength(49);
    for (const course of courses) {
      const module = document.querySelector(`[data-module-disclosure="${course.moduleId}"]`);
      const row = [...(module?.querySelectorAll("li") ?? [])].find((candidate) => candidate.querySelector("strong")?.textContent === course.name);
      expect(row?.textContent).toContain(`${course.credits}학점`);
      expect(row?.textContent).toContain(course.code);
      expect(row?.textContent).toContain(courseOfferings2026[course.id].officialCourseCode);
    }
  });

  it("keeps sourceNote and source discrepancy discussions out of the student DOM", () => {
    expect(document.querySelector(".dku-resource-method")).toBeNull();
    expect(document.body.textContent).not.toMatch(/자료 범위와 주의 사항|코드를 맞추는 문제|과목 수 차이|PDF 트랙 구성표|모듈명 기준으로/);
    for (const module of modules) {
      if (module.sourceNote) expect(document.body.textContent).not.toContain(module.sourceNote);
    }
  });

  it("keeps module disclosures interactive after removing their audit paragraphs", async () => {
    const a = document.querySelector<HTMLDetailsElement>('[data-module-disclosure="A"]')!;
    const m = document.querySelector<HTMLDetailsElement>('[data-module-disclosure="M"]')!;
    expect(a.open).toBe(true);
    await act(async () => m.querySelector("summary")!.click());
    expect(m.open).toBe(true);
    expect(a.open).toBe(false);
    await act(async () => m.querySelector("summary")!.click());
    expect(m.open).toBe(false);
  });

  it("searches official codes and timetable aliases, opens matching modules and recovers from empty results", async () => {
    await search(" 541 990 ");
    expect(document.querySelectorAll(".dku-resource-module-grid li")).toHaveLength(1);
    expect(document.querySelector(".dku-resource-module-grid li")?.textContent).toContain("기초의학");
    expect(document.querySelector<HTMLDetailsElement>("[data-module-disclosure]")?.open).toBe(true);
    await search("바이오헬스기초의학");
    expect(document.querySelectorAll(".dku-resource-module-grid li")).toHaveLength(1);
    await search("없는과목123");
    expect(document.querySelectorAll(".dku-resource-module-grid li")).toHaveLength(0);
    expect(document.body.textContent).toContain("조건에 맞는 과목이 없습니다");
    await search("");
    expect(document.querySelectorAll(".dku-resource-module-grid li")).toHaveLength(49);
  });
});
