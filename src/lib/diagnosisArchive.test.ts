import { describe, expect, it } from "vitest";
import { archiveCurrentDiagnosis } from "./diagnosisArchive";
import { createEmptyAppState } from "./storage";
import { calculatePathProgress } from "./progressEngine";
import type { SavedAppStateV2 } from "../types";

function fixture(): SavedAppStateV2 { return { ...createEmptyAppState(), profile: {
  affiliation: "external-student", studyPath: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only",
}, courseInputReviewedAt: "2026-09-08T00:00:00Z", courseSelections: [{ courseId: "b-1", status: "completed" }] }; }

describe("archive current diagnosis without a planner", () => {
  it("preserves the current input, deep copies the result and does not create a plan", () => {
    const state = fixture();
    const result = calculatePathProgress({ profile: state.profile!, courseSelections: state.courseSelections, additionalMajorCredits: [] });
    const next = archiveCurrentDiagnosis(state, result, "record1", "2026-09-08T01:00:00Z");
    expect(next.snapshots).toHaveLength(1);
    expect(next.snapshots[0].graduationPlan).toBeUndefined();
    expect(next.courseSelections).toEqual(state.courseSelections);
    result.totalMajorProgress.completedCredits = 999;
    expect(next.snapshots[0].result.totalMajorProgress.completedCredits).toBe(3);
    expect(state.snapshots).toHaveLength(0);
  });
  it("deduplicates unchanged input/results but archives real changes", () => {
    const state = fixture();
    const result = calculatePathProgress({ profile: state.profile!, courseSelections: state.courseSelections, additionalMajorCredits: [] });
    const next = archiveCurrentDiagnosis(state, result, "record1", "2026-09-08T01:00:00Z");
    expect(archiveCurrentDiagnosis(next, result, "record2", "2026-09-08T02:00:00Z")).toBe(next);
    const changed = { ...next, courseSelections: [] };
    expect(archiveCurrentDiagnosis(changed, result, "record2", "2026-09-08T02:00:00Z").snapshots).toHaveLength(2);
  });
  it("refuses an unreviewed or missing profile", () => {
    const state = fixture();
    const result = calculatePathProgress({ profile: state.profile!, courseSelections: [], additionalMajorCredits: [] });
    expect(() => archiveCurrentDiagnosis({ ...state, courseInputReviewedAt: undefined }, result, "id", "now")).toThrow();
    expect(() => archiveCurrentDiagnosis(createEmptyAppState(), result, "id", "now")).toThrow();
  });
});
