// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { TimetableReferenceView } from "./TimetableReferenceView";

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

function button(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((node) => node.getAttribute("aria-label") === label || node.textContent === label)!;
}
async function click(label: string) {
  expect(button(label), `working ${label} control`).toBeDefined();
  await act(async () => button(label).click());
}

it("opens a weekday table with every simultaneous class visible and asynchronous study separate", async () => {
  await act(async () => root.render(<TimetableReferenceView />));
  const table = document.querySelector<HTMLTableElement>('table[aria-label="요일별 시간표"]');
  expect(table).not.toBeNull();
  expect(Array.from(table!.querySelectorAll("thead th"), (node) => node.textContent)).toEqual(["시작 시각", "월", "화", "수", "목", "금", "토"]);
  expect(table!.querySelectorAll('[data-section-key="553110-1"]')).toHaveLength(1);
  expect(table!.querySelectorAll('[data-section-key="553110-2"]')).toHaveLength(1);
  const firstSection = table!.querySelector('[data-section-key="553110-1"]')!;
  expect(firstSection.closest("td")).toBe(table!.querySelector('[data-section-key="553110-2"]')!.closest("td"));
  expect(table!.querySelector('[data-section-key="369690-1"]')).toBeNull();
  expect(document.querySelector('[aria-label="온라인·시간 미정 수업"]')?.textContent).toContain("식품품질학");
  expect(table!.textContent).toContain("19:50–21:35");
  expect(table!.textContent).toContain("온라인·시간 확인");
});

it("keeps all 37 unique sections accessible in the list and preserves view through search and reset", async () => {
  await act(async () => root.render(<TimetableReferenceView />));
  await click("분반 목록");
  const sectionRows = () => document.querySelectorAll('table[aria-label="분반 목록"] tbody tr');
  expect(sectionRows()).toHaveLength(37);
  expect(new Set(Array.from(sectionRows(), (row) => row.getAttribute("data-section-key"))).size).toBe(37);
  await change(document.querySelector("input")!, " 541 990 ");
  expect(sectionRows()).toHaveLength(2);
  expect(document.querySelector("tbody")?.textContent).toContain("19:50–21:35");
  expect(document.querySelector("tbody")?.textContent).toContain("온라인·시간 확인");
  await change(document.querySelectorAll("select")[0], "토");
  expect(sectionRows()).toHaveLength(0);
  expect(document.body.textContent).toContain("미개설·폐지를 뜻하지 않습니다");
  await click("검색 조건 초기화");
  expect(sectionRows()).toHaveLength(37);
  expect(document.querySelector<HTMLInputElement>("input")?.value).toBe("");
  await change(document.querySelectorAll("select")[0], "토");
  expect(sectionRows()).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("바이오헬스인간과질병");
  await click("요일별 시간표");
  expect(Array.from(document.querySelectorAll("thead th"), (node) => node.textContent)).toEqual(["시작 시각", "토"]);
  expect(document.querySelector("tbody")?.textContent).toContain("12:00–14:00");
});

it("combines delivery and scope filters, searches rooms and restores every filter", async () => {
  await act(async () => root.render(<TimetableReferenceView />));
  await click("분반 목록");
  await change(document.querySelectorAll("select")[1], "원격수업");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(7);
  await change(document.querySelectorAll("select")[2], "D-MAJOR");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
  await click("검색 조건 초기화");
  expect(Array.from(document.querySelectorAll("select"), (node) => node.value)).toEqual(["all", "all", "all"]);
  await change(document.querySelector("input")!, "사회423");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(document.querySelector("tbody")?.textContent).toContain("식품유통경제학");
});

it("opens one course disclosure, exposes full meeting details and closes with Escape without touching saved work", async () => {
  localStorage.setItem("timetable-student-existing-work", "keep");
  await act(async () => root.render(<TimetableReferenceView />));
  const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-expanded]"));
  expect(triggers.length).toBeGreaterThan(1);
  triggers[0].focus();
  expect(document.activeElement).toBe(triggers[0]);
  await act(async () => triggers[0].click());
  expect(triggers[0].getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelectorAll(".dku-tt-detail")).toHaveLength(1);
  await act(async () => triggers[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector(".dku-tt-detail")).toBeNull();
  await act(async () => triggers[0].click());
  expect(document.querySelector(".dku-tt-detail")?.textContent).toContain("학사 과목코드");
  expect(document.querySelector(".dku-tt-detail")?.textContent).toContain("교수");
  await act(async () => triggers[1].click());
  expect(document.querySelectorAll(".dku-tt-detail")).toHaveLength(1);
  expect(triggers[0].getAttribute("aria-expanded")).toBe("false");
  await act(async () => document.querySelector(".dku-tt-detail")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector(".dku-tt-detail")).toBeNull();
  expect(document.activeElement).toBe(triggers[1]);
  expect(localStorage.getItem("timetable-student-existing-work")).toBe("keep");
  localStorage.removeItem("timetable-student-existing-work");
});
