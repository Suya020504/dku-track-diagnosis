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

describe("diagnosis steps stay separate from optional planning tools", () => {
  it.each([
    ["/?view=diagnosis&step=profile&profile=path", "profile"],
    ["/?view=diagnosis&step=profile&profile=direction", "tracks"],
    ["/?view=diagnosis&step=tracks", "tracks"],
    ["/?view=recommendation&step=survey&audience=external-student", "tracks"],
    ["/?view=recommendation&step=axes&axis=progress", "tracks"],
    ["/?view=diagnosis&step=courses", "courses"],
  ])("marks exactly the current stage at %s", async (route, current) => {
    await mount(route);
    expect([...document.querySelectorAll('.planner-compass-path strong')].map(element => element.textContent)).toEqual(["내 정보", "트랙 선택", "수강 이력"]);
    const markers = document.querySelectorAll('.planner-compass-path [aria-current="step"]');
    expect(markers).toHaveLength(1);
    expect(markers[0].closest('[data-journey-stage]')?.getAttribute('data-journey-stage')).toBe(current);
  });
  it.each(["/?view=resources", "/?view=track-guide", "/?view=records", "/?view=contact", "/?view=plan&step=setup", "/?view=plan&scope=tracks&step=setup", "/?view=result&section=current", "/"])("does not add the journey ribbon to %s", async route => { await mount(route); expect(document.querySelector('.planner-compass-path')).toBeNull(); });
  it("keeps the pending multi-track draft and committed diagnosis intact when returning from result to selection", async () => {
    const state = { ...fixture(), pendingSelectedTrackIds: ["food-marketing" as const] };
    await mount("/?view=result&section=current", state);
    const choice = [...document.querySelectorAll<HTMLButtonElement>('.track-completion-edit button')].find(b=>b.textContent==='트랙 변경'); expect(choice).toBeDefined();
    await act(async () => choice?.click());
    expect(new URLSearchParams(location.search).get('step')).toBe('tracks');
    expect(document.querySelector<HTMLInputElement>('input[name="selectedTrackIds"][value="food-marketing"]')?.checked).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!)).toEqual(state);
  });
  it("keeps planning out of the diagnosis steps and primary navigation", async () => {
    await mount("/?view=diagnosis&step=courses", { ...fixture(), targetTrackId: undefined, courseInputReviewedAt: undefined, entryIntent: "completed-courses" });
    expect(document.querySelector('[data-journey-stage="plan"]')).toBeNull();
    expect(document.querySelector('.planner-shell-primary-nav')?.textContent).not.toContain('계획');
    expect(document.querySelector('.planner-mobile-nav__primary > [data-mobile-primary]')?.textContent).not.toContain('계획');
    expect(document.querySelector('.planner-shell-tool-menu')?.textContent).toContain('수강 계획');
    expect(document.querySelector('.planner-shell-tool-menu')?.hasAttribute('open')).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('[data-journey-stage="courses"] button')?.disabled).toBe(false);
    expect([...document.querySelectorAll('.planner-compass-path strong')].map(element => element.textContent)).toEqual(["내 정보", "수강 이력", "트랙 선택"]);
  });
});
