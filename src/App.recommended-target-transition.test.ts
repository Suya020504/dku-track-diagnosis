import { describe, expect, it } from "vitest";
import { chooseRecommendedTrackTransition, chooseInterestTrackTransition, completeProfileTransition, confirmSelectedTracksTransition } from "./App";
import { createEmptyAppState } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";

describe("recommended target confirmation", () => {
  it.each([null, "economics"] as const)("commits explicit pending %s without resurrecting a survey target", (pendingTargetTrackId) => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: { affiliation: "department-student", goal: "find-track", studyPath: "track-major", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
      targetTrackId: "economics",
      pendingTargetTrackId,
      interestSurvey: { answers: {}, currentIndex: 0, selectedTrackId: "food-marketing" },
      graduationPlan: { marker: "saved" } as unknown as SavedAppStateV2["graduationPlan"],
    };
    const next = completeProfileTransition(current, current.profile!).state;
    expect(next.targetTrackId).toBe(pendingTargetTrackId ?? undefined);
    expect(next.pendingTargetTrackId).toBeUndefined();
    expect(next.graduationPlan).toEqual(pendingTargetTrackId === "economics" ? current.graduationPlan : undefined);
    expect(next.interestSurvey).toEqual(current.interestSurvey);
  });
  it.each([chooseRecommendedTrackTransition, chooseInterestTrackTransition])("defers a verified target and plan change until confirmation (%s)", (choose) => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: { affiliation: "department-student", goal: "check-progress", studyPath: "track-major", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "officially-verified" },
      targetTrackId: "economics",
      courseInputReviewedAt: "2026-09-08",
      graduationPlan: { marker: "saved" } as unknown as SavedAppStateV2["graduationPlan"],
    };
    const staged = choose(current, "food-marketing").state;
    expect(staged.targetTrackId).toBe("economics");
    expect(staged.profile).toEqual(current.profile);
    expect(staged.graduationPlan).toEqual(current.graduationPlan);
    expect(staged.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
    const confirmed = confirmSelectedTracksTransition(staged, staged.pendingSelectedTrackIds!).state;
    expect(confirmed.targetTrackId).toBe("economics");
    expect(confirmed.comparisonTrackIds).toEqual(["food-marketing"]);
    expect(confirmed.profile?.ruleApplicability).toBe("officially-verified");
    expect(confirmed.graduationPlan).toEqual(current.graduationPlan);
    expect(confirmed).toHaveProperty("pendingTargetTrackId", undefined);
    expect(confirmed.profileDraft).toBeUndefined();
  });
  it.each(["economics", "food-marketing"] as const)("stages %s without changing committed inputs", (trackId) => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: { affiliation: "department-student", goal: "check-progress", studyPath: "advanced-major", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
      targetTrackId: "economics",
      courseSelections: [{ courseId: "b-1", status: "completed" }],
      courseInputReviewedAt: "2026-09-08",
      interestSurvey: { audience: "external-student", answers: { "external-consumer-choice": 4 }, currentIndex: 1 },
      graduationPlan: { marker: "saved" } as unknown as SavedAppStateV2["graduationPlan"],
    };
    const next = chooseRecommendedTrackTransition(current, trackId);
    expect(next.state.profile).toEqual(current.profile);
    expect(next.state.courseSelections).toEqual(current.courseSelections);
    expect(next.state.interestSurvey).toEqual(current.interestSurvey);
    expect(next.state.courseInputReviewedAt).toBe(current.courseInputReviewedAt);
    expect(next.state.profileDraft).toEqual({ ...current.profile, goal: "check-progress" });
    expect(next.state.targetTrackId).toBe(current.targetTrackId);
    expect(next.state).toHaveProperty("pendingTargetTrackId", trackId);
    expect(next.state.graduationPlan).toEqual(current.graduationPlan);
    expect(next.route).toEqual({ view: "diagnosis", step: "tracks" });
  });
  it("asks for affiliation when none has been entered", () => {
    const next = chooseRecommendedTrackTransition(createEmptyAppState(), "economics");
    expect(next.state.profile).toBeUndefined();
    expect(next.state.interestSurvey).toBeUndefined();
    expect(next.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "affiliation" });
  });
  it("does not carry a verified old path into the new trial draft", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: { affiliation: "department-student", goal: "check-progress", studyPath: "advanced-major", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "officially-verified" },
    };
    const next = chooseRecommendedTrackTransition(current, "economics");
    expect(next.state.profile).toEqual(current.profile);
    expect(next.state.profileDraft?.ruleApplicability).toBe("reference-only");
    expect(next.state.profileDraft?.curriculumRuleVersion).toBe("2026-provided-final-plan");
  });
});
