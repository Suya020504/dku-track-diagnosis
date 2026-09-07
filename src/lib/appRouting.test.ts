import { describe, expect, it, vi } from "vitest";
import type { SavedAppStateV2 } from "../types";
import { calculateGraduationPlan } from "./graduationPlanner";
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

const resultState: SavedAppStateV2 = {
  ...plannedState,
  graduationPlan: calculateGraduationPlan({
    profile: minorState.profile!,
    courseSelections: [],
    additionalMajorCredits: [],
    preferences: plannedState.graduationPlanPreferences!,
    generatedAt: "2026-08-30T12:00:00.000Z",
  }),
};

describe("canonical app route resolution", () => {
  it.each([
    ["", { view: "landing" }],
    ["?view=overview", { view: "track-guide", section: "overview" }],
    ["?view=resources", { view: "resources", section: "tracks" }],
    ["?view=track-guide", { view: "track-guide", section: "overview" }],
    ["?view=modules", { view: "resources", section: "modules" }],
    ["?view=contact", { view: "contact" }],
    ["?view=unknown", { view: "landing" }],
  ])("resolves %s to a safe top-level route", (search, expected) => {
    expect(resolveAppRoute(search, createEmptyAppState())).toEqual(expected);
  });

  it("keeps diagnosis and result access behind the diagnosis resolver", () => {
    expect(resolveAppRoute("?view=diagnosis&step=courses", createEmptyAppState())).toEqual({
      view: "diagnosis",
      step: "profile",
      profileStage: "affiliation",
    });
    expect(resolveAppRoute("?view=result", minorState)).toEqual({
      view: "diagnosis",
      step: "courses",
    });
    expect(resolveAppRoute("?view=result", reviewedMinorState)).toEqual({
      view: "result",
      section: "current",
    });
  });

  it("preserves the requested result section after the result prerequisite is ready", () => {
    expect(resolveAppRoute("?view=result&section=next", reviewedMinorState)).toEqual({
      view: "result",
      section: "next",
    });
  });

  it("defaults and validates result sections without bypassing prerequisites", () => {
    expect(resolveAppRoute("?view=result&section=unknown", reviewedMinorState)).toEqual({
      view: "result",
      section: "current",
    });
    expect(resolveAppRoute("?view=result&section=next", minorState)).toEqual({
      view: "diagnosis",
      step: "courses",
    });
  });

  it("resolves resource sections and canonicalizes the legacy modules alias", () => {
    const timetableRoute = { view: "resources", section: "timetable" } as const;
    const timetableHref = buildAppHref("/", timetableRoute);
    expect(timetableHref).toBe("/?view=resources&section=timetable");
    expect(resolveAppRoute(timetableHref.slice(1), createEmptyAppState())).toEqual(timetableRoute);
    expect(resolveAppRoute("?view=resources&section=official", reviewedMinorState)).toEqual({
      view: "resources",
      section: "official",
    });
    expect(resolveAppRoute("?view=modules", reviewedMinorState)).toEqual({
      view: "resources",
      section: "modules",
    });
    expect(resolveAppRoute("?view=resources&section=unknown", reviewedMinorState)).toEqual({
      view: "resources",
      section: "tracks",
    });
  });

  it.each(["overview", "benefits", "outcomes", "structure", "videos"] as const)(
    "restores the %s track-guide section without diagnosis prerequisites",
    (section) => {
      expect(resolveAppRoute(
        `?view=track-guide&section=${section}`,
        createEmptyAppState(),
      )).toEqual({ view: "track-guide", section });
    },
  );

  it("falls back to the track-guide overview for an unknown section", () => {
    expect(resolveAppRoute(
      "?view=track-guide&section=unknown",
      createEmptyAppState(),
    )).toEqual({ view: "track-guide", section: "overview" });
  });

  it("restores only known official videos on the videos guide section", () => {
    expect(resolveAppRoute(
      "?view=track-guide&section=videos&video=osc9yOuq0IU",
      createEmptyAppState(),
    )).toEqual({ view: "track-guide", section: "videos", videoId: "osc9yOuq0IU" });
    expect(resolveAppRoute(
      "?view=track-guide&section=videos&video=unknown",
      createEmptyAppState(),
    )).toEqual({ view: "track-guide", section: "videos" });
    expect(resolveAppRoute(
      "?view=track-guide&section=overview&video=osc9yOuq0IU",
      createEmptyAppState(),
    )).toEqual({ view: "track-guide", section: "overview" });
  });

  it("resolves profile stages only on the profile step", () => {
    expect(resolveAppRoute("?view=diagnosis&step=profile&profile=path", createEmptyAppState())).toEqual({
      view: "diagnosis",
      step: "profile",
      profileStage: "path",
    });
    expect(resolveAppRoute("?view=diagnosis&step=profile&profile=unknown", createEmptyAppState())).toEqual({
      view: "diagnosis",
      step: "profile",
      profileStage: "affiliation",
    });
  });

  it("opens pdf review only for the course step with an in-memory draft", () => {
    expect(resolveAppRoute(
      "?view=diagnosis&step=courses&input=pdf-review",
      minorState,
      { hasPdfImportDraft: true },
    )).toEqual({ view: "diagnosis", step: "courses", input: "pdf-review" });

    expect(resolveAppRoute(
      "?view=diagnosis&step=courses&input=pdf-review",
      minorState,
    )).toEqual({ view: "diagnosis", step: "courses" });
    expect(resolveAppRoute(
      "?view=diagnosis&step=profile&input=pdf-review",
      minorState,
      { hasPdfImportDraft: true },
    )).toEqual({ view: "diagnosis", step: "profile", profileStage: "affiliation" });
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

  it("round-trips a valid survey audience", () => {
    const route = {
      view: "recommendation",
      step: "survey",
      audience: "department-student",
    } as const;
    const href = buildAppHref("https://local.invalid/", route);

    expect(href).toBe("/?view=recommendation&step=survey&audience=department-student");
    expect(resolveAppRoute(href.slice(1), createEmptyAppState())).toEqual(route);
  });

  it("drops an invalid survey audience", () => {
    expect(resolveAppRoute(
      "?view=recommendation&step=survey&audience=unknown",
      createEmptyAppState(),
    )).toEqual({ view: "recommendation", step: "survey" });
  });

  it.each(["schedule", "checks"] as const)(
    "canonicalizes %s to setup whenever the actual plan result is missing",
    (step) => {
      expect(resolveAppRoute(`?view=plan&step=${step}`, minorState)).toEqual({
        view: "plan",
        step: "setup",
      });
      expect(resolveAppRoute(`?view=plan&step=${step}`, plannedState)).toEqual({
        view: "plan",
        step: "setup",
      });
    },
  );

  it.each(["schedule", "checks"] as const)(
    "restores %s only with an actual stored graduation plan",
    (step) => {
      expect(resolveAppRoute(`?view=plan&step=${step}`, resultState)).toEqual({
        view: "plan",
        step,
      });
    },
  );
});

describe("canonical app route writes", () => {
  it("writes canonical section and profile-stage fields", () => {
    expect(buildAppHref(
      "/app?view=modules&utm_source=legacy#module-list",
      { view: "resources", section: "modules" },
    )).toBe("/app?view=resources&utm_source=legacy&section=modules#module-list");

    expect(buildAppHref(
      "/app?view=modules&utm_source=share#top",
      { view: "resources", section: "official" },
    )).toBe("/app?view=resources&utm_source=share&section=official#top");

    expect(buildAppHref(
      "/app?view=diagnosis&step=profile&utm_source=share#top",
      { view: "diagnosis", step: "profile", profileStage: "path" },
    )).toBe("/app?view=diagnosis&step=profile&utm_source=share&profile=path#top");

    expect(buildAppHref(
      "/app?view=resources&step=old&axis=plan&section=official&utm_source=share#guide",
      { view: "track-guide", section: "videos", videoId: "osc9yOuq0IU" },
    )).toBe("/app?view=track-guide&section=videos&utm_source=share&video=osc9yOuq0IU#guide");
  });

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

  it("writes pdf review only on diagnosis courses and clears stale input elsewhere", () => {
    expect(buildAppHref(
      "/app?view=diagnosis&step=courses&utm_source=share#review",
      { view: "diagnosis", step: "courses", input: "pdf-review" },
    )).toBe(
      "/app?view=diagnosis&step=courses&utm_source=share&input=pdf-review#review",
    );

    expect(buildAppHref(
      "/app?view=diagnosis&step=courses&input=pdf-review&utm_source=share#review",
      { view: "contact" },
    )).toBe("/app?view=contact&utm_source=share#review");
  });

  it("removes pdf review state from history when navigating away", () => {
    const pushState = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        history: {
          state: {
            existing: true,
            input: "pdf-review",
            view: "diagnosis",
            step: "courses",
          },
          pushState,
          replaceState: vi.fn(),
        },
        location: {
          href: "/app?view=diagnosis&step=courses&input=pdf-review&theme=dark",
        },
      },
    });

    writeAppRouteToHistory({ view: "contact" }, "push");

    expect(pushState).toHaveBeenCalledWith(
      { existing: true, view: "contact" },
      "",
      "/app?view=contact&theme=dark",
    );
  });

  it("replaces an alias with its canonical URL on mount", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        history: {
          state: { existing: true, section: "old", view: "lab" },
          pushState,
          replaceState,
        },
        location: { href: "/app?view=lab&utm_source=share" },
      },
    });

    const route = resolveAppRoute("?view=lab&utm_source=share", createEmptyAppState());
    writeAppRouteToHistory(route, "replace");

    expect(replaceState).toHaveBeenCalledWith(
      { existing: true, view: "recommendation", step: "axes" },
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
        history: {
          state: { existing: true, section: "old", view: "lab" },
          pushState,
          replaceState,
        },
        location: { href: "/app?view=overview&theme=dark" },
      },
    });

    writeAppRouteToHistory({ view: "plan", step: "setup" }, "push");

    expect(pushState).toHaveBeenCalledWith(
      { existing: true, view: "plan", step: "setup" },
      "",
      "/app?view=plan&theme=dark&step=setup",
    );
    expect(replaceState).not.toHaveBeenCalled();
  });
});
