import { beforeEach, describe, expect, it } from "vitest";
import { buildTrackSemesterPlan, isTrackSemesterPlan } from "./trackSemesterPlanner";
import { courses } from "../data/curriculumData";
import { calculatePathProgress } from "./progressEngine";
import { calculateTrackCompletion } from "./trackCompletion";
import { createEmptyAppState, loadAppState, saveAppState, STORAGE_KEY_V2 } from "./storage";
import type { SavedAppStateV2, StudentProfile } from "../types";
const profile: StudentProfile = { affiliation: "external-student", studyPath: "minor", majorRole: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" };
const plan = buildTrackSemesterPlan({ selectedTrackIds: ["food-marketing"], courseSelections: [], preferences: { currentTerm: "2026-2", targetGraduationTerm: "2029-2", maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false }, generatedAt: "2026-09-09" });
const values = new Map<string, string>();
const storage: Storage = { length: 0, clear: () => values.clear(), key: () => null, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
const fixture = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile, targetTrackId: "food-marketing", courseInputReviewedAt: "2026-09-09", trackPlanning: { result: plan, draft: { version: 1, values: { maxMajorCoursesPerTerm: "" } } } });
beforeEach(() => values.clear());
describe("isolated track plan persistence", () => {
  it("keeps a frozen archived plan after catalogue changes while invalidating only the current generated plan", () => {
    const state = fixture(); const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    const archived = { id: "frozen", createdAt: "2026-09-09", ruleVersion: profile.curriculumRuleVersion, profile, courseSelections: [], additionalMajorCredits: [], targetTrackId: "food-marketing" as const, comparisonTrackIds: [], result, trackPlan: plan };
    values.set(STORAGE_KEY_V2, JSON.stringify({ ...state, snapshots: [archived] }));
    const changed = courses.find(course => course.id === plan.courseIds[0])!; const oldCredits = changed.credits;
    try {
      changed.credits = 99;
      expect(isTrackSemesterPlan(plan)).toBe(false);
      const restored = loadAppState(storage);
      expect(restored.snapshots[0]?.trackPlan).toEqual(plan);
      expect(restored.trackPlanning?.result).toBeUndefined();
      expect(saveAppState(restored, storage)).toBe(true);
      expect(loadAppState(storage).snapshots[0]?.trackPlan).toEqual(plan);
    } finally { changed.credits = oldCredits; }
  });
  it("round-trips a validated track plan and incomplete draft without creating an academic plan", () => {
    const state = fixture(); expect(saveAppState(state, storage)).toBe(true); expect(loadAppState(storage)).toEqual(state); expect(loadAppState(storage).graduationPlan).toBeUndefined();
  });
  it("discards only a stale generated plan when stored source selections change", () => {
    const state = { ...fixture(), comparisonTrackIds: ["economics" as const] }; values.set(STORAGE_KEY_V2, JSON.stringify(state));
    const loaded = loadAppState(storage); expect(loaded.targetTrackId).toBe("food-marketing"); expect(loaded.comparisonTrackIds).toEqual(["economics"]); expect(loaded.profile).toEqual(profile); expect(loaded.trackPlanning?.result).toBeUndefined(); expect(loaded.trackPlanning?.draft).toEqual(state.trackPlanning?.draft);
  });
  it("recovers the last generated preferences as an editable draft when a stale plan has no separate draft", () => {
    values.set(STORAGE_KEY_V2, JSON.stringify({ ...fixture(), comparisonTrackIds: ["economics"], trackPlanning: { result: plan } }));
    expect(loadAppState(storage).trackPlanning).toEqual({ draft: { version: 1, values: plan.preferences } });
  });
  it("preserves a diagnosis snapshot when only its generated track plan has become invalid", () => {
    const state = fixture(); const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    values.set(STORAGE_KEY_V2, JSON.stringify({ ...state, snapshots: [{ id: "history", createdAt: "2026-09-09", ruleVersion: profile.curriculumRuleVersion, profile, courseSelections: [], additionalMajorCredits: [], targetTrackId: "food-marketing", comparisonTrackIds: [], result, trackPlan: { ...plan, placements: [{ courseId: "invalid", term: "2027-1" }] } }] }));
    const loaded = loadAppState(storage); expect(loaded.snapshots).toHaveLength(1); expect(loaded.snapshots[0].trackPlan).toBeUndefined(); expect(loaded.snapshots[0].result).toEqual(result); expect(loaded.profile).toEqual(profile);
  });
  it("rejects a valid standalone track plan attached to a different snapshot's tracks", () => {
    const state = fixture(); const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    expect(saveAppState({ ...state, snapshots: [{ id: "wrong-source", createdAt: "2026-09-09", ruleVersion: profile.curriculumRuleVersion, profile, courseSelections: [], additionalMajorCredits: [], targetTrackId: "economics", comparisonTrackIds: [], result, trackPlan: plan }] }, storage)).toBe(false);
  });
  it("rejects a course substituted outside the frozen module scope without re-running current curriculum rules", () => {
    const state = fixture(); const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    const trackCompletion = calculateTrackCompletion({ selectedTrackIds: ["food-marketing"], courseSelections: [] }).completed;
    const changedId = plan.placements[0].courseId;
    const forged = { ...plan, courseIds: plan.courseIds.map(id => id === changedId ? "not-in-frozen-modules" : id), placements: plan.placements.map(item => item.courseId === changedId ? { ...item, courseId: "not-in-frozen-modules" } : item) };
    expect(saveAppState({ ...state, snapshots: [{ id: "wrong-module", createdAt: "2026-09-09", ruleVersion: profile.curriculumRuleVersion, profile, courseSelections: [], additionalMajorCredits: [], targetTrackId: "food-marketing", comparisonTrackIds: [], result, trackCompletion, trackPlan: forged }] }, storage)).toBe(false);
  });
  it("rejects a corrupt saved track scenario but retains its legacy diagnosis when loading", () => {
    const state = fixture(); const result = calculatePathProgress({ profile, courseSelections: [], additionalMajorCredits: [] });
    const trackCompletion = { ...calculateTrackCompletion({ selectedTrackIds: ["food-marketing"], courseSelections: [] }).completed, unionRemainingCredits: -1 };
    const withCorruptScenario = { ...state, snapshots: [{ id: "bad-scenario", createdAt: "2026-09-09", ruleVersion: profile.curriculumRuleVersion, profile, courseSelections: [], additionalMajorCredits: [], targetTrackId: "food-marketing" as const, comparisonTrackIds: [], result, trackCompletion }] };
    expect(saveAppState(withCorruptScenario, storage)).toBe(false);
    values.set(STORAGE_KEY_V2, JSON.stringify(withCorruptScenario));
    const restored = loadAppState(storage); expect(restored.profile).toEqual(profile); expect(restored.snapshots).toHaveLength(1); expect(restored.snapshots[0].trackCompletion).toBeUndefined(); expect(restored.snapshots[0].result).toEqual(result);
  });
});
