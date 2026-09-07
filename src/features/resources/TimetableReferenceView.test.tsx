// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { TimetableReferenceView } from "./TimetableReferenceView";
import { CurriculumReferenceView } from "./CurriculumReferenceView";

let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
});
afterEach(async () => { await act(async () => root.unmount()); });
async function change(node: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const prototype = node.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(node, value);
    node.dispatchEvent(new Event(node.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}

it("filters actual sections by official code, then restores empty combined filters", async () => {
  await act(async () => root.render(<TimetableReferenceView />));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(37);
  await change(document.querySelector("input")!, " 541 990 ");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(document.querySelector("tbody")?.textContent).toContain("19:50–21:35");
  expect(document.querySelector("tbody")?.textContent).toContain("동기식 여부 미표기");
  await change(document.querySelectorAll("select")[0], "토");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
  expect(document.body.textContent).toContain("미개설·폐지를 뜻하지 않습니다");
  await act(async () => document.querySelector<HTMLButtonElement>("button")!.click());
  expect(document.querySelectorAll("tbody tr")).toHaveLength(37);
  expect(document.querySelector<HTMLInputElement>("input")?.value).toBe("");
  await change(document.querySelectorAll("select")[0], "토");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("바이오헬스인간과질병");
});

it("keeps high-credit department rows and grade/search filters separate from input", async () => {
  await act(async () => root.render(<CurriculumReferenceView />));
  expect(document.querySelectorAll("tbody tr")).toHaveLength(47);
  await change(document.querySelector("input")!, " 479 330 ");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("18학점");
  expect(document.querySelector("tbody")?.textContent).toContain("트랙 밖");
  await change(document.querySelector("select")!, "1");
  expect(document.body.textContent).toContain("조건에 맞는 과목이 없습니다");
  expect(document.querySelector("input[type=checkbox]")).toBeNull();
});
