// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";

let root: Root | undefined;
const readState = () => JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!) as SavedAppStateV2;
async function mount() { root = createRoot(document.querySelector('#root')!); await act(async () => root?.render(<App />)); }
async function refresh() { await act(async () => root?.unmount()); root = undefined; await mount(); }
async function click(selector: string) { const target = document.querySelector<HTMLElement>(selector); expect(target).not.toBeNull(); await act(async () => target?.click()); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); history.replaceState({}, '', '/'); Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() }); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); });

it("preserves multiple checkbox drafts through refresh, then confirms the same tracks without changing the major role", async () => {
  const current: SavedAppStateV2 = { ...createEmptyAppState(), profile: { affiliation: 'external-student', studyPath: 'minor', majorRole: 'minor', goal: 'check-progress', curriculumRuleVersion: '2026-provided-final-plan', ruleApplicability: 'reference-only' }, targetTrackId: 'economics', courseSelections: [{ courseId: 'c-1', status: 'completed' }], courseInputReviewedAt: '2026-09-09' };
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(current)); history.replaceState({}, '', '/?view=diagnosis&step=tracks'); await mount();
  await click('input[name="selectedTrackIds"][value="food-marketing"]');
  expect(readState().targetTrackId).toBe('economics');
  expect(readState().pendingSelectedTrackIds).toEqual(['economics', 'food-marketing']);
  await refresh();
  expect(document.querySelector<HTMLInputElement>('input[value="food-marketing"]')?.checked).toBe(true);
  await click('[data-confirm-tracks]');
  expect(location.search).toBe('?view=result&step=result&section=current');
  expect(document.querySelector('#track-completion-title')).not.toBeNull();
  expect(readState().profile).toEqual(current.profile);
  expect(readState().comparisonTrackIds).toEqual(['food-marketing']);
  expect(readState().pendingSelectedTrackIds).toBeUndefined();
  await click('[data-open-track-plan]');
  expect(new URLSearchParams(location.search).get('scope')).toBe('tracks');
  expect(document.querySelector('#track-module-plan-title')).not.toBeNull();
  await refresh();
  expect(document.querySelector('#track-module-plan-title')).not.toBeNull();
  expect(readState().courseSelections).toEqual(current.courseSelections);
});

it("requires one-time information before a first-time selected intent and resumes that intent after refresh", async () => {
  const current = { ...createEmptyAppState(), entryIntent: 'completed-courses' as const, profileDraft: { affiliation: 'external-student' as const, majorRole: 'undecided' as const } };
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(current)); history.replaceState({}, '', '/?view=diagnosis&step=profile&profile=path'); await mount();
  expect(document.querySelector<HTMLInputElement>('input[name="majorRole"][value="undecided"]')?.checked).toBe(true);
  await refresh();
  await click('.study-path-complete');
  expect(new URLSearchParams(location.search).get('step')).toBe('courses');
  expect(readState().profile?.majorRole).toBe('undecided');
  expect(document.querySelector('input[name="entryIntent"]')).toBeNull();
  await click('#diagnosis-result-action');
  expect(new URLSearchParams(location.search).get('axis')).toBe('progress');
  expect(document.querySelector('#track-history-title')).not.toBeNull();
});
it("adds a remaining course to planning without silently assigning its next semester", async () => {
  const current: SavedAppStateV2 = { ...createEmptyAppState(), profile: { affiliation: 'external-student', studyPath: 'minor', majorRole: 'minor', goal: 'check-progress', curriculumRuleVersion: '2026-provided-final-plan', ruleApplicability: 'reference-only' }, targetTrackId: 'economics', courseInputReviewedAt: '2026-09-09' };
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(current)); history.replaceState({}, '', '/?view=result&section=current'); await mount();
  const button = document.querySelector<HTMLButtonElement>('[data-plan-course]'); expect(button).not.toBeNull();
  const courseId = button!.dataset.planCourse;
  await act(async () => button?.click());
  expect(readState().courseSelections).toContainEqual({ courseId, status: 'planned', plannedTerm: 'later' });
});
it.each(['department-student', 'external-student'] as const)("does not expose legacy total-major planning as confirmed for an undecided %s", async affiliation => {
  const current: SavedAppStateV2 = { ...createEmptyAppState(), profile: { affiliation, studyPath: 'track-major', goal: 'check-progress', curriculumRuleVersion: '2026-provided-final-plan', ruleApplicability: 'reference-only' }, targetTrackId: 'economics', courseInputReviewedAt: '2026-09-09' };
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(current)); history.replaceState({}, '', '/?view=plan&step=setup'); await mount();
  expect(document.querySelector('#academic-plan-context-title')).not.toBeNull();
  expect(document.querySelector('#graduation-plan-setup-title')).toBeNull();
  expect(document.body.textContent).not.toContain('63학점');
  expect(readState().profile).toEqual(current.profile);
  await click('[data-switch-track-planning]');
  expect(new URLSearchParams(location.search).get('scope')).toBe('tracks');
  expect(document.querySelector('#track-module-plan-title')).not.toBeNull();
});
