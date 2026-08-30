import { expect, it, vi } from "vitest";
import type { SavedAppStateV2 } from "../types";
import { createEmptyAppState } from "./storage";
import {
  buildDiagnosisHref,
  resolveDiagnosisStep,
  writeDiagnosisStepToHistory,
} from "./viewRouting";

const emptyV2State = createEmptyAppState();
const minorV2State: SavedAppStateV2 = {
  ...createEmptyAppState(),
  profile: {
    goal: "check-progress",
    affiliation: "external-student",
    studyPath: "minor",
    entryYear: 2026,
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
  },
};
const trackMajorWithoutTrackState: SavedAppStateV2 = {
  ...createEmptyAppState(),
  profile: {
    goal: "check-progress",
    affiliation: "department-student",
    studyPath: "track-major",
    entryYear: 2026,
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
  },
};
const reviewedTrackMajorWithoutTrackState: SavedAppStateV2 = {
  ...trackMajorWithoutTrackState,
  courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
};
const reviewedMinorState = { ...minorV2State, courseInputReviewedAt: "2026-08-30T00:00:00.000Z" };

it("keeps the profile step when no valid profile is saved", () => {
  expect(resolveDiagnosisStep("?view=diagnosis&step=courses", emptyV2State)).toBe("profile");
});

it("allows a minor to reach courses without a track", () => {
  expect(resolveDiagnosisStep("?view=diagnosis&step=courses", minorV2State)).toBe("courses");
});

it("allows a track-major without a selected target to enter courses and finish course review", () => {
  expect(resolveDiagnosisStep("?view=diagnosis&step=courses", trackMajorWithoutTrackState)).toBe("courses");
  expect(resolveDiagnosisStep("?view=result", reviewedTrackMajorWithoutTrackState)).toBe("result");
});

it("keeps results behind reviewed course input", () => {
  expect(resolveDiagnosisStep("?view=result", minorV2State)).toBe("courses");
  expect(resolveDiagnosisStep("?view=result", reviewedMinorState)).toBe("result");
});

it("uses a canonical diagnosis URL and removes section anchors", () => {
  expect(buildDiagnosisHref("/app?view=result&section=old#summary", "courses")).toBe(
    "/app?view=diagnosis&step=courses#summary",
  );
});

it("writes the canonical step to browser history", () => {
  const pushState = vi.fn();
  const replaceState = vi.fn();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      history: { state: { existing: true }, pushState, replaceState },
      location: { href: "/app?section=old" },
    },
  });

  writeDiagnosisStepToHistory("result", "push");
  expect(pushState).toHaveBeenCalledWith({ existing: true, view: "result", step: "result" }, "", "/app?view=result&step=result");
  expect(replaceState).not.toHaveBeenCalled();
});
