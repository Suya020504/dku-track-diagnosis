// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";
let root: Root | undefined;
const fixture = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile: { affiliation: "external-student", studyPath: "minor", majorRole: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" }, targetTrackId: "economics", courseSelections: [], courseInputReviewedAt: "2026-09-09" });
async function mount(route: string, state = fixture()) { localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); history.replaceState({}, "", route); root = createRoot(document.querySelector("#root")!); await act(async () => root?.render(<App />)); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); });

describe("four-stage selected-track journey", () => {
  it.each([
    ["/?view=diagnosis&step=profile&profile=path", "profile"],
    ["/?view=diagnosis&step=profile&profile=direction", "tracks"],
    ["/?view=diagnosis&step=tracks", "tracks"],
    ["/?view=recommendation&step=survey&audience=external-student", "tracks"],
    ["/?view=recommendation&step=axes&axis=progress", "tracks"],
    ["/?view=diagnosis&step=courses", "courses"],
    ["/?view=result&section=current", "courses"],
    ["/?view=plan&scope=tracks&step=setup", "plan"],
  ])("marks exactly the current stage at %s", async (route, current) => {
    await mount(route);
    expect([...document.querySelectorAll('.planner-compass-path strong')].map(element => element.textContent)).toEqual(["내 정보", "트랙 선택", "이수 현황", "학기 계획 · 선택"]);
    const markers = document.querySelectorAll('.planner-compass-path [aria-current="step"]');
    expect(markers).toHaveLength(1);
    expect(markers[0].closest('[data-journey-stage]')?.getAttribute('data-journey-stage')).toBe(current);
  });
  it.each(["/?view=resources", "/?view=track-guide", "/?view=records", "/?view=contact", "/?view=plan&step=setup", "/"])("does not add the journey ribbon to %s", async route => { await mount(route); expect(document.querySelector('.planner-compass-path')).toBeNull(); });
  it("keeps the pending multi-track draft and committed diagnosis intact when returning from result to selection", async () => {
    const state = { ...fixture(), pendingSelectedTrackIds: ["food-marketing" as const] };
    await mount("/?view=result&section=current", state);
    const choice = document.querySelector<HTMLButtonElement>('[data-journey-stage="tracks"] button'); expect(choice).not.toBeNull();
    await act(async () => choice?.click());
    expect(new URLSearchParams(location.search).get('step')).toBe('tracks');
    expect(document.querySelector<HTMLInputElement>('input[name="selectedTrackIds"][value="food-marketing"]')?.checked).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!)).toEqual(state);
  });
  it("explains a locked planning step without blocking history-first course input", async () => {
    await mount("/?view=diagnosis&step=courses", { ...fixture(), targetTrackId: undefined, courseInputReviewedAt: undefined, entryIntent: "completed-courses" });
    const planning = document.querySelector<HTMLButtonElement>('[data-journey-stage="plan"] button'); expect(planning?.disabled).toBe(true);
    expect(document.querySelector('#compass-path-plan-reason')?.textContent).toContain('트랙');
    expect(document.querySelector('#compass-path-plan-reason')?.textContent).toContain('과목');
    expect(document.querySelector<HTMLButtonElement>('[data-journey-stage="courses"] button')?.disabled).toBe(false);
  });
});
