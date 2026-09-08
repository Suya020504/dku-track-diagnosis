// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import { calculatePathProgress } from "./lib/progressEngine";
import { archiveCurrentDiagnosis } from "./lib/diagnosisArchive";
import type { SavedAppStateV2, StudentProfile } from "./types";
let root: Root | undefined;
const profiles: StudentProfile[] = [
  { affiliation: "department-student", studyPath: "advanced-major", majorRole: "primary", otherMajor: "no", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
  { affiliation: "external-student", studyPath: "double-major", majorRole: "double-major", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
  { affiliation: "external-student", studyPath: "minor", majorRole: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
];
function fixture(profile = profiles[0]): SavedAppStateV2 { const state = { ...createEmptyAppState(), profile, targetTrackId: "economics" as const, pendingSelectedTrackIds: ["food-marketing" as const], courseSelections: [{ courseId: "b-1", status: "completed" as const }], courseInputReviewedAt: "2026-09-09" }; return archiveCurrentDiagnosis(state, calculatePathProgress({ profile, courseSelections: state.courseSelections, additionalMajorCredits: [] }), "keep-this-record", "2026-09-09"); }
async function click(selector: string) { const control = document.querySelector<HTMLElement>(selector); expect(control).not.toBeNull(); await act(async () => control?.click()); }
const read = () => JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!) as SavedAppStateV2;
async function mount(state: SavedAppStateV2) { localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); root = createRoot(document.querySelector('#root')!); await act(async () => root?.render(<App />)); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); history.replaceState({}, '', '/?view=diagnosis&step=tracks'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); });
describe("current-input management from the common help tool", () => {
  it.each(profiles)("lets $studyPath reset current input only after confirmation and preserves every archived record", async profile => {
    const original = fixture(profile); await mount(original); await click('[aria-label="도움말 열기"]'); await click('[data-open-current-reset]');
    expect(read()).toEqual(original); expect(document.querySelector('[data-current-reset-confirmation]')?.textContent).toContain('보관한 진단과 계획은 삭제하지 않아요');
    await click('[data-cancel-current-reset]'); expect(read()).toEqual(original); expect(document.querySelector('[data-current-reset-confirmation]')).toBeNull();
    await click('[data-open-current-reset]'); await click('[data-confirm-current-reset]');
    expect(read()).toEqual({ ...createEmptyAppState(), snapshots: original.snapshots });
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(new URLSearchParams(location.search).get('step')).toBe('profile');
    expect(document.querySelector<HTMLInputElement>('input[name="affiliation"]:checked')).toBeNull();
  });
  it("keeps current input and archived records when persistence fails and supports retrying the same confirmation", async () => {
    const original = fixture(profiles[2]); await mount(original); await click('[aria-label="도움말 열기"]'); await click('[data-open-current-reset]');
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('synthetic storage failure'); });
    await click('[data-confirm-current-reset]'); expect(read()).toEqual(original); expect(document.querySelector('[data-current-reset-confirmation] [role="alert"]')).not.toBeNull();
    denied.mockRestore(); await click('[data-confirm-current-reset]'); expect(read().snapshots).toEqual(original.snapshots); expect(read().courseSelections).toEqual([]);
  });
});
