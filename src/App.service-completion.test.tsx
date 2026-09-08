// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";

let root: Root | undefined;
function saved(): SavedAppStateV2 { return JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!); }
const fixture = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile: { affiliation: "external-student", studyPath: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" }, courseInputReviewedAt: "2026-09-08T00:00:00Z", courseSelections: [{ courseId: "b-1", status: "completed" }] });
async function mount(state = fixture(), route = "/?view=diagnosis&step=courses") {
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); history.replaceState({}, "", route);
  root = createRoot(document.querySelector("#root")!); await act(async () => root?.render(<App />));
}
async function click(text: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.trim() === text);
  if (!button) throw new Error(`Missing ${text}`);
  await act(async () => button.click());
}
async function select(label: string, value: string) {
  const input = document.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)!;
  await act(async () => { input.value = value; input.dispatchEvent(new Event("change", { bubbles: true })); });
}
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); localStorage.clear(); });

describe("complete student service integration", () => {
  it("saves course statuses, clears review on completed changes and restores after remount", async () => {
    await mount();
    await select("경제원론 이수 상태", "in-progress");
    expect(saved().courseSelections[0].status).toBe("in-progress");
    expect(saved().courseInputReviewedAt).toBeUndefined();
    await select("경제원론 이수 상태", "planned");
    await select("경제원론 계획 학기", "following");
    const next = saved();
    expect(next.courseSelections).toEqual([{ courseId: "b-1", status: "planned", plannedTerm: "following" }]);
    await act(async () => root?.unmount()); root = undefined;
    await mount(next);
    expect(document.querySelector<HTMLSelectElement>('[aria-label="경제원론 계획 학기"]')?.value).toBe("following");
  });
  it("adds completed extra credits without module selections and recalculates the path", async () => {
    await mount();
    const label = [...document.querySelectorAll(".additional-credits__options label")].find(item => item.textContent?.includes("취창업ㆍ진로세미나2"))!;
    await act(async () => label.querySelector<HTMLInputElement>("input")!.click());
    expect(saved().additionalMajorCredits[0]).toMatchObject({ credits: 2, status: "student-entered" });
    expect(saved().courseSelections).toEqual([{ courseId: "b-1", status: "completed" }]);
    expect(saved().courseInputReviewedAt).toBeUndefined();
    await click("진단 결과 확인");
    expect(location.search).toContain("view=result");
    await click("이 진단 보관하기");
    expect(saved().snapshots[0].result.totalMajorProgress.completedCredits).toBe(5);
  });
  it("archives without a planner, avoids duplicates and opens a read-only record by URL", async () => {
    await mount(fixture(), "/?view=result&section=current");
    await click("이 진단 보관하기"); await click("이 진단 보관하기");
    const state = saved();
    expect(state.snapshots).toHaveLength(1); expect(state.graduationPlan).toBeUndefined();
    const id = state.snapshots[0].id;
    history.pushState({}, "", `/?view=records&record=${id}`);
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(document.querySelector("h1")?.textContent).toContain("저장한 진단과 계획");
    expect(saved().courseSelections).toEqual(state.courseSelections);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.title).toContain("저장한 진단과 계획");
    await click("현재 입력으로 돌아가기");
    expect(location.search).toContain("view=diagnosis");
  });
  it("does not increment records or claim a saved record when storage fails", async () => {
    await mount(fixture(), "/?view=result&section=current");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    await click("이 진단 보관하기");
    expect(saved().snapshots).toHaveLength(0);
    expect(document.body.textContent).toContain("기록을 보관하지 못했어요");
  });
});
