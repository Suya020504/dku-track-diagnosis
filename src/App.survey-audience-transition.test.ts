import { describe, expect, it } from "vitest";
import type { SavedAppStateV2 } from "./types";
import { chooseSurveyAudienceTransition, startEntryFlowTransition } from "./App";
import { createEmptyAppState } from "./lib/storage";

describe("survey audience transition", () => {
  it.each([undefined, "2026-09-08T00:00:00.000Z"])(
    "restores saved questions and the selected audience on home re-entry (completedAt=%s)",
    (completedAt) => {
      const current: SavedAppStateV2 = {
        ...createEmptyAppState(),
        interestSurvey: {
          audience: "department-student",
          answers: { "dept-consumer-choice": 5 },
          currentIndex: 1,
          ...(completedAt ? { completedAt, selectedTrackId: "food-marketing" as const } : {}),
        },
      };
      const entry = startEntryFlowTransition(current, "find-track");
      expect(entry.route).toEqual({
        view: "diagnosis", step: "profile",
      });
      expect(entry.state.interestSurvey).toEqual(current.interestSurvey);
      const sameAudience = chooseSurveyAudienceTransition(entry.state, "department-student");
      expect(sameAudience.state.interestSurvey).toEqual(current.interestSurvey);
    },
  );

  it("keeps answers when the current audience is selected again", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      interestSurvey: {
        audience: "external-student",
        answers: { "external-consumer-choice": 4 },
        currentIndex: 3,
      },
    };
    expect(chooseSurveyAudienceTransition(current, "external-student").state.interestSurvey)
      .toEqual(current.interestSurvey);
  });

  it("changes only survey-owned state while preserving diagnosis and planning data", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      courseSelections: [{ courseId: "b-1", status: "completed" }],
      targetTrackId: "economics",
      graduationPlanPreferences: {
        currentTerm: "2026-2",
        targetGraduationTerm: "2028-1",
        maxMajorCoursesPerTerm: 3,
        considerSeasonalTerm: false,
      },
      interestSurvey: {
        audience: "department-student",
        answers: { "dept-consumer-choice": 5 },
        currentIndex: 2,
        completedAt: "2026-09-01T00:00:00.000Z",
        selectedTrackId: "food-marketing",
      },
    };

    const next = chooseSurveyAudienceTransition(current, "external-student");

    expect(next.state.courseSelections).toEqual(current.courseSelections);
    expect(next.state.targetTrackId).toBe(current.targetTrackId);
    expect(next.state.graduationPlanPreferences).toEqual(current.graduationPlanPreferences);
    expect(next.state.interestSurvey).toEqual({
      audience: "external-student",
      answers: {},
      currentIndex: 0,
    });
    expect(next.state.profileDraft?.affiliation).toBe("external-student");
    expect(next.route).toEqual({
      view: "recommendation",
      step: "survey",
      audience: "external-student",
    });
  });

  it("drops an incompatible prior study path when the survey audience changes", () => {
    const current: SavedAppStateV2 = {
      ...createEmptyAppState(),
      profile: {
        affiliation: "department-student",
        goal: "check-progress",
        studyPath: "advanced-major",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
    };

    const next = chooseSurveyAudienceTransition(current, "external-student");

    expect(next.state.profile).toEqual(current.profile);
    expect(next.state.profileDraft?.affiliation).toBe("external-student");
    expect(next.state.profileDraft?.studyPath).toBeUndefined();
  });
});
