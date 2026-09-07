import { describe, expect, it } from "vitest";
import { chooseRecommendedTrackTransition } from "./App";
import { createEmptyAppState } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";

describe("recommended target confirmation", () => {
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
    expect(next.state.profileDraft).toEqual({ ...current.profile, goal: "check-progress", studyPath: "track-major" });
    expect(next.state.targetTrackId).toBe(trackId);
    expect(next.state.graduationPlan).toEqual(trackId === current.targetTrackId ? current.graduationPlan : undefined);
    expect(next.route).toEqual({ view: "diagnosis", step: "profile", profileStage: "path" });
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
