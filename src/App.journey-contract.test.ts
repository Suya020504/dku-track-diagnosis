import { describe, expect, it } from "vitest";
import { applyPlanningSourceChange, chooseRecommendedTrackTransition, chooseSurveyAudienceTransition, completeProfileTransition, confirmSelectedTracksTransition, routeAfterCourseReview, startEntryFlowTransition, startIntentTransition } from "./App";
import { buildAppHref, resolveAppRoute } from "./lib/appRouting";
import { createEmptyAppState, loadAppState, saveAppState } from "./lib/storage";
import type { SavedAppStateV2, StudentProfile } from "./types";
import { buildTrackSemesterPlan } from "./lib/trackSemesterPlanner";

const profile: StudentProfile = { goal: "check-progress", affiliation: "external-student", studyPath: "minor", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" };
const state = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile });

describe("track journey contract", () => {
  it("starts a returning student at direction without requesting academic information again", () => {
    expect(startEntryFlowTransition(state(), "check-progress").route).toEqual({ view: "diagnosis", step: "profile", profileStage: "direction" });
  });
  it("choosing a recommended track preserves the student's minor role and stages multiple selected tracks", () => {
    const current = { ...state(), targetTrackId: "economics" as const };
    const next = chooseRecommendedTrackTransition(current, "food-marketing");
    expect(next.state.profile).toEqual(profile);
    expect(next.state.profileDraft?.studyPath).toBe("minor");
    expect(next.state.pendingSelectedTrackIds).toEqual(["economics", "food-marketing"]);
    expect(next.route).toEqual({ view: "diagnosis", step: "tracks" });
  });
  it("profile completion preserves selected tracks regardless of academic role and opens direction", () => {
    const next = completeProfileTransition({ ...state(), targetTrackId: "economics", comparisonTrackIds: ["food-marketing"] }, profile);
    expect(next.state.targetTrackId).toBe("economics");
    expect(next.state.comparisonTrackIds).toEqual(["food-marketing"]);
    expect(next.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "direction" });
  });
  it("keeps staged multiple selections separate until the track selection screen confirms them", () => {
    const current = { ...state(), targetTrackId: "economics" as const, courseInputReviewedAt: "2026-09-09" };
    const staged = chooseRecommendedTrackTransition(current, "food-marketing").state;
    const informationSaved = completeProfileTransition(staged, profile).state;
    expect(informationSaved.targetTrackId).toBe("economics");
    expect(informationSaved.pendingSelectedTrackIds).toEqual(["economics", "food-marketing"]);
    const confirmed = confirmSelectedTracksTransition(informationSaved, informationSaved.pendingSelectedTrackIds!);
    expect(confirmed.state.targetTrackId).toBe("economics");
    expect(confirmed.state.comparisonTrackIds).toEqual(["food-marketing"]);
    expect(confirmed.state.profile).toEqual(profile);
    expect(confirmed.route).toEqual({ view: "result", section: "current" });
  });
  it("resumes the chosen home intent after first-time information and skips repeating the direction question", () => {
    const entry = startIntentTransition(createEmptyAppState(), "completed-courses");
    expect(entry.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "affiliation" });
    expect(completeProfileTransition(entry.state, profile).route).toEqual({ view: "diagnosis", step: "courses" });
  });
  it("returns a legacy academic planner recovery to its original scope after selecting tracks", () => {
    const current: SavedAppStateV2 = { ...state(), courseInputReviewedAt: "2026-09-09", profileDraft: { ...profile, goal: "plan-graduation" } };
    expect(confirmSelectedTracksTransition(current, ["economics"]).route).toEqual({ view: "plan", step: "setup", scope: "academic" });
  });
  it("course-based exploration compares tracks for any academic role", () => {
    expect(routeAfterCourseReview({ ...state(), entryIntent: "completed-courses", courseInputReviewedAt: "2026-09-09" })).toEqual({ view: "recommendation", step: "axes", axis: "progress" });
  });
  it("preserves confirmed academic choices when resuming a survey for the same affiliation", () => {
    const current: SavedAppStateV2 = { ...state(), profile: { ...profile, affiliation: "department-student", studyPath: "track-major", majorRole: "primary", otherMajor: "no" } };
    const resumed = chooseSurveyAudienceTransition(current, "department-student").state;
    expect(resumed.profileDraft?.majorRole).toBe("primary");
    expect(resumed.profileDraft?.otherMajor).toBe("no");
    expect(chooseSurveyAudienceTransition(current, "external-student").state.profileDraft?.majorRole).toBeUndefined();
    expect(resumed.profile).toEqual(current.profile);
  });
  it("keeps track selection and direction on refresh and isolates plan route prerequisites", () => {
    const current = state();
    expect(resolveAppRoute("?view=diagnosis&step=tracks", current)).toEqual({ view: "diagnosis", step: "tracks" });
    expect(resolveAppRoute("?view=diagnosis&step=profile&profile=direction", current)).toEqual({ view: "diagnosis", step: "profile", profileStage: "direction" });
    expect(resolveAppRoute("?view=plan&scope=tracks&step=schedule", current)).toEqual({ view: "plan", scope: "tracks", step: "setup" });
    expect(buildAppHref("https://example.test/?view=plan&scope=tracks", { view: "result", section: "current" })).not.toContain("scope=");
  });
  it("invalidates a selected-track plan when a comparison track changes but preserves its editable draft", () => {
    const current: SavedAppStateV2 = { ...state(), trackPlanning: { draft: { version: 1, values: { currentTerm: "2026-2" } }, result: { generatedAt: "old" } as NonNullable<SavedAppStateV2["trackPlanning"]>["result"] } };
    const next = applyPlanningSourceChange(current, { comparisonTrackIds: ["food-marketing"] });
    expect(next.trackPlanning?.result).toBeUndefined();
    expect(next.trackPlanning?.draft).toEqual(current.trackPlanning?.draft);
  });
  it("retains generated plan preferences as a draft when changed source inputs invalidate the result", () => {
    const preferences = { currentTerm: "2026-2" as const, targetGraduationTerm: "2029-2" as const, maxMajorCoursesPerTerm: 3, considerSeasonalTerm: false };
    const result = buildTrackSemesterPlan({ selectedTrackIds: ["economics"], courseSelections: [], preferences, generatedAt: "2026-09-09" });
    const current: SavedAppStateV2 = { ...state(), targetTrackId: "economics", trackPlanning: { result } };
    const next = applyPlanningSourceChange(current, { comparisonTrackIds: ["food-marketing"] });
    expect(next.trackPlanning?.result).toBeUndefined();
    expect(next.trackPlanning?.draft).toEqual({ version: 1, values: preferences });
  });
  it("round-trips new profile choices and unfinished multiple-track selections", () => {
    const values = new Map<string, string>();
    const storage: Storage = { length: 0, clear: () => values.clear(), key: () => null, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
    const current: SavedAppStateV2 = { ...state(), profile: { ...profile, majorRole: "undecided", studyPath: "track-major" }, entryIntent: "known-tracks", pendingSelectedTrackIds: ["economics", "food-marketing"], trackPlanning: { draft: { version: 1, values: { currentTerm: "2026-2" } }, manualTerms: { "b-1": "2027-1" } } };
    expect(saveAppState(current, storage)).toBe(true);
    expect(loadAppState(storage)).toEqual(current);
    expect(saveAppState({ ...current, entryIntent: "invalid" as SavedAppStateV2["entryIntent"] }, storage)).toBe(false);
    expect(saveAppState({ ...current, pendingSelectedTrackIds: ["invalid"] as unknown as SavedAppStateV2["pendingSelectedTrackIds"] }, storage)).toBe(false);
  });
});
