import { describe, expect, it, vi } from "vitest";
import type { SavedAppStateV2 } from "../types";
import { createEmptyAppState } from "./storage";
import {
  buildAppHref,
  resolveAppRoute,
  writeAppRouteToHistory,
} from "./appRouting";

const minorState: SavedAppStateV2 = {
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

const reviewedMinorState: SavedAppStateV2 = {
  ...minorState,
  courseInputReviewedAt: "2026-08-30T00:00:00.000Z",
};

const plannedState: SavedAppStateV2 = {
  ...minorState,
  graduationPlanPreferences: {
    currentTerm: "2026-1",
    targetGraduationTerm: "2027-2",
    maxMajorCoursesPerTerm: 3,
    considerSeasonalTerm: false,
  },
};

describe("canonical app route resolution", () => {
  it.each([
    ["", { view: "landing" }],
    ["?view=overview", { view: "overview" }],
    ["?view=resources", { view: "resources" }],
    ["?view=modules", { view: "modules" }],
    ["?view=contact", { view: "contact" }],
    ["?view=unknown", { view: "landing" }],
  ])("resolves %s to a safe top-level route", (search, expected) => {
    expect(resolveAppRoute(search, createEmptyAppState())).toEqual(expected);
  });

  it("keeps diagnosis and result access behind the diagnosis resolver", () => {
    expect(resolveAppRoute("?view=diagnosis&step=courses", createEmptyAppState())).toEqual({
      view: "diagnosis",
      step: "profile",
    });
    expect(resolveAppRoute("?view=result", minorState)).toEqual({
      view: "diagnosis",
      step: "courses",
    });
    expect(resolveAppRoute("?view=result", reviewedMinorState)).toEqual({ view: "result" });
  });

  it.each([
    ["?view=lab", { view: "recommendation", step: "axes" }],
    ["?view=experiment", { view: "plan", step: "setup" }],
  ])("resolves legacy alias %s to its canonical route", (search, expected) => {
    expect(resolveAppRoute(search, createEmptyAppState())).toEqual(expected);
  });

  it("allows progress recommendation axes without a completed survey", () => {
    expect(resolveAppRoute(
      "?view=recommendation&step=axes&axis=progress",
      createEmptyAppState(),
    )).toEqual({ view: "recommendation", step: "axes", axis: "progress" });
  });

  it("drops an axes-only parameter from the survey route", () => {
    expect(resolveAppRoute(
      "?view=recommendation&step=survey&axis=interest",
      createEmptyAppState(),
    )).toEqual({ view: "recommendation", step: "survey" });
  });

  it("redirects a schedule without saved preferences to plan setup", () => {
    expect(resolveAppRoute("?view=plan&step=schedule", minorState)).toEqual({
      view: "plan",
      step: "setup",
    });
    expect(resolveAppRoute("?view=plan&step=schedule", plannedState)).toEqual({
      view: "plan",
      step: "schedule",
    });
  });
});

describe("canonical app route writes", () => {
  it("preserves unrelated query parameters and the hash while replacing route fields", () => {
    expect(buildAppHref(
      "/app?view=lab&step=old&axis=plan&utm_source=share&theme=dark#summary",
      { view: "recommendation", step: "axes", axis: "interest" },
    )).toBe(
      "/app?view=recommendation&step=axes&axis=interest&utm_source=share&theme=dark#summary",
    );
  });

  it("uses the bare app path for landing while retaining unrelated parameters", () => {
    expect(buildAppHref(
      "/app?view=experiment&step=schedule&utm_source=share#top",
      { view: "landing" },
    )).toBe("/app?utm_source=share#top");
  });

  it("replaces an alias with its canonical URL on mount", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        history: { state: { existing: true }, pushState, replaceState },
        location: { href: "/app?view=lab&utm_source=share" },
      },
    });

    const route = resolveAppRoute("?view=lab&utm_source=share", createEmptyAppState());
    writeAppRouteToHistory(route, "replace");

    expect(replaceState).toHaveBeenCalledWith(
      expect.objectContaining({ existing: true, view: "recommendation", step: "axes" }),
      "",
      "/app?view=recommendation&utm_source=share&step=axes",
    );
    expect(pushState).not.toHaveBeenCalled();
  });

  it("pushes an explicit user navigation", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        history: { state: { existing: true }, pushState, replaceState },
        location: { href: "/app?view=overview&theme=dark" },
      },
    });

    writeAppRouteToHistory({ view: "plan", step: "setup" }, "push");

    expect(pushState).toHaveBeenCalledWith(
      expect.objectContaining({ existing: true, view: "plan", step: "setup" }),
      "",
      "/app?view=plan&theme=dark&step=setup",
    );
    expect(replaceState).not.toHaveBeenCalled();
  });
});
