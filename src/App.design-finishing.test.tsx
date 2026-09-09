// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";
let root: Root | undefined;
const fixture = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile: { affiliation: "external-student", studyPath: "minor", majorRole: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" }, targetTrackId: "economics", courseSelections: [{ courseId: "b-1", status: "completed" }], courseInputReviewedAt: "2026-09-09", graduationPlanDraft: { version: 1, values: { currentTerm: "2026-2", targetGraduationTerm: "2028-1" } } });
async function mount(route: string, state = fixture()) { localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); history.replaceState({}, "", route); root = createRoot(document.querySelector('#root')!); await act(async () => root?.render(<App />)); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); });
it("labels legacy planning and explicitly opens selected-track planning without migrating saved inputs", async () => {
  const original = fixture(); await mount('/?view=plan&step=setup', original);
  expect(document.querySelector('#graduation-plan-setup-title')?.textContent?.trim()).toBe('전공 전체 계획');
  expect(new URLSearchParams(location.search).has('scope')).toBe(false);
  const switcher = document.querySelector<HTMLButtonElement>('[data-open-selected-track-plan]'); expect(switcher).not.toBeNull();
  await act(async () => switcher?.click());
  expect(new URLSearchParams(location.search).get('scope')).toBe('tracks');
  expect(document.querySelector('#track-module-plan-title')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!)).toEqual(original);
});
it("pairs meaningful navigation icons with visible text without replacing accessible control labels", async () => {
  await mount('/?view=diagnosis&step=courses');
  for (const button of document.querySelectorAll('.planner-shell-primary-nav button, [data-mobile-primary="true"] button')) {
    expect(button.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(button.textContent?.trim().length).toBeGreaterThan(0);
  }
});
it("opens academic planning for the academic-plan comparison axis instead of an unrelated module plan", async () => {
  const original = fixture(); await mount('/?view=recommendation&step=axes&axis=plan', original);
  const action = document.querySelector<HTMLButtonElement>('[data-recommendation-panel="plan"] .dc-unavailable button'); expect(action).not.toBeNull();
  await act(async () => action?.click());
  expect(new URLSearchParams(location.search).get('scope')).toBe('academic');
  expect(document.querySelector('#graduation-plan-setup-title')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!)).toEqual(original);
});
