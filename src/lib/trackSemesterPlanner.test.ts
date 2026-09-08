import { describe, expect, it, vi } from "vitest";
import { courses, tracks } from "../data/curriculumData";
import type { CourseSelectionRecord, GraduationPlanPreferences } from "../types";
import {
  buildTrackSemesterPlan, buildTrackPlanInputSignature, isTrackSemesterPlan,
  type TrackSemesterPlanInput,
} from "./trackSemesterPlanner";

// Exercise a genuine missing offering-evidence case without changing the catalogue files.
vi.mock("../data/courseOfferings2026", async (importOriginal) => {
  const original = await importOriginal<typeof import("../data/courseOfferings2026")>();
  return {
    ...original,
    courseOfferings2026: {
      ...original.courseOfferings2026,
      "m-1": { ...original.courseOfferings2026["m-1"], evidence: "unknown" },
    },
  };
});

const preferences: GraduationPlanPreferences = {
  currentTerm: "2026-2", targetGraduationTerm: "2028-2",
  maxMajorCoursesPerTerm: 3, considerSeasonalTerm: false,
};
const base: TrackSemesterPlanInput = {
  selectedTrackIds: ["food-marketing"], courseSelections: [], preferences,
  generatedAt: "2026-09-09T12:00:00.000Z",
};
const completed = (ids: string[]): CourseSelectionRecord[] => ids.map((courseId) => ({ courseId, status: "completed" }));

describe("buildTrackSemesterPlan", () => {
  it("creates a module-only ten-course marketing plan with no anonymous degree-credit fillers", () => {
    const result = buildTrackSemesterPlan(base);
    expect(result.scope).toBe("track-modules");
    expect(result.courseIds).toHaveLength(10);
    expect(result.placements).toHaveLength(10);
    expect(result.unplaced).toEqual([]);
    expect(result.placements.every((item) => item.term > "2026-2")).toBe(true);
    expect(result.courseIds.every((id) => !/^[abc]-/.test(id))).toBe(true);
    expect(result.placements.every((item) => item.requiresOfferingCheck)).toBe(true);
  });

  it("assigns shared courses once and exposes both selected track labels", () => {
    const result = buildTrackSemesterPlan({ ...base,
      selectedTrackIds: ["food-marketing", "economics"],
      preferences: { ...preferences, maxMajorCoursesPerTerm: 6 },
    });
    expect(result.courseIds).toHaveLength(16);
    expect(result.placements).toHaveLength(16);
    expect(new Set(result.placements.map((item) => item.courseId)).size).toBe(16);
    expect(result.placements.find((item) => item.courseId === "j-1")?.trackIds)
      .toEqual(["food-marketing", "economics"]);
  });

  it("retains related active plans, excludes completed/unrelated courses and keeps in-progress at current term", () => {
    const result = buildTrackSemesterPlan({ ...base, courseSelections: [
      ...completed(["f-1"]), { courseId: "f-1", status: "planned" },
      { courseId: "h-1", status: "in-progress" },
      { courseId: "i-1", status: "planned", plannedTerm: "following" },
      { courseId: "d-1", status: "planned" }, { courseId: "b-2", status: "in-progress" },
    ] });
    expect(result.courseIds).not.toContain("f-1");
    expect(result.courseIds).not.toContain("d-1");
    expect(result.courseIds).not.toContain("b-2");
    expect(result.placements.find((item) => item.courseId === "h-1"))
      .toMatchObject({ term: "2026-2", source: "in-progress" });
    expect(result.placements.find((item) => item.courseId === "i-1"))
      .toMatchObject({ term: "2027-2", source: "planned" });
  });

  it("keeps evidence-unknown automatic courses unplaced; explicit manual assignment remains a check-required plan", () => {
    const input = { ...base, selectedTrackIds: ["food-bio-economy"] as const };
    const automatic = buildTrackSemesterPlan(input);
    expect(automatic.unplaced).toContainEqual(expect.objectContaining({ courseId: "m-1", reason: "offering-unknown" }));
    expect(automatic.placements.some((item) => item.courseId === "m-1")).toBe(false);
    const manual = buildTrackSemesterPlan({ ...input, manualTerms: { "m-1": "2027-1" } });
    expect(manual.placements.find((item) => item.courseId === "m-1"))
      .toMatchObject({ term: "2027-1", requiresOfferingCheck: true });
  });

  it("allows explicit manual moves outside the historical pattern without claiming verified offering", () => {
    const result = buildTrackSemesterPlan({ ...base, manualTerms: { "f-1": "2027-1" } });
    expect(result.placements.find((item) => item.courseId === "f-1"))
      .toMatchObject({ term: "2027-1", requiresOfferingCheck: true });
  });

  it("does not silently move an invalid manual choice or oversubscribe pinned courses", () => {
    const result = buildTrackSemesterPlan({ ...base,
      preferences: { ...preferences, maxMajorCoursesPerTerm: 1 },
      manualTerms: { "f-1": "2027-1", "h-1": "2027-1", "i-1": "2030-1" },
    });
    expect(result.unplaced).toContainEqual(expect.objectContaining({ courseId: "h-1", reason: "capacity-exceeded" }));
    expect(result.unplaced).toContainEqual(expect.objectContaining({ courseId: "i-1", reason: "outside-plan-range" }));
    expect(result.placements.filter((item) => item.term === "2027-1")).toHaveLength(1);
    for (const term of new Set(result.placements.map((item) => item.term))) {
      expect(result.placements.filter((item) => item.term === term).length).toBeLessThanOrEqual(1);
    }
  });

  it("rejects moving an in-progress course out of the current term", () => {
    const result = buildTrackSemesterPlan({ ...base,
      courseSelections: [{ courseId: "f-1", status: "in-progress" }],
      manualTerms: { "f-1": "2027-2" },
    });
    expect(result.unplaced).toContainEqual(expect.objectContaining({ courseId: "f-1", reason: "in-progress-term-conflict" }));
  });

  it("respects a relative planned term and leaves a historical-pattern conflict visible", () => {
    const result = buildTrackSemesterPlan({ ...base,
      courseSelections: [{ courseId: "f-1", status: "planned", plannedTerm: "next" }],
    });
    expect(result.unplaced).toContainEqual(expect.objectContaining({ courseId: "f-1", reason: "planned-term-conflict" }));
    expect(result.placements.some((item) => item.courseId === "f-1")).toBe(false);
  });

  it("never automatically assigns future work to the current term, even when target equals current", () => {
    const result = buildTrackSemesterPlan({ ...base,
      preferences: { ...preferences, targetGraduationTerm: "2026-2", considerSeasonalTerm: true },
    });
    expect(result.placements).toEqual([]);
    expect(result.unplaced).toHaveLength(10);
    expect(result.notes.some((note) => note.includes("계절학기"))).toBe(true);
  });

  it.each([
    { currentTerm: "2026-3" }, { targetGraduationTerm: "2026-1" },
    { targetGraduationTerm: "2033-1" }, { maxMajorCoursesPerTerm: 0 },
    { maxMajorCoursesPerTerm: 7 }, { maxMajorCoursesPerTerm: 1.5 },
  ])("rejects invalid/bounded planning preferences: %j", (override) => {
    expect(() => buildTrackSemesterPlan({ ...base,
      preferences: { ...preferences, ...override } as GraduationPlanPreferences,
    })).toThrow();
  });

  it("does not fabricate a default track or plan unknown IDs", () => {
    const result = buildTrackSemesterPlan({ ...base, selectedTrackIds: [],
      courseSelections: [{ courseId: "not-a-course", status: "planned" }],
    });
    expect(result.courseIds).toEqual([]);
    expect(result.placements).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it("preserves input objects and produces a signature sensitive to selections, statuses and manual moves", () => {
    const input = { ...base, courseSelections: completed(["f-1", "h-1"]) };
    const before = JSON.stringify(input);
    const result = buildTrackSemesterPlan(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(result.preferences).not.toBe(input.preferences);
    expect(result.inputSignature).toBe(buildTrackPlanInputSignature({ ...input,
      courseSelections: [...input.courseSelections].reverse(), generatedAt: "2026-09-10T12:00:00Z",
    }));
    expect(result.inputSignature).not.toBe(buildTrackPlanInputSignature({ ...input, selectedTrackIds: ["economics"] }));
    expect(result.inputSignature).not.toBe(buildTrackPlanInputSignature({ ...input,
      courseSelections: [{ courseId: "f-1", status: "planned" }],
    }));
    expect(result.inputSignature).not.toBe(buildTrackPlanInputSignature({ ...input, manualTerms: { "f-2": "2027-1" } }));
  });

  it("handles all five tracks without duplicate/omitted target courses", () => {
    const start = performance.now();
    const result = buildTrackSemesterPlan({ ...base,
      selectedTrackIds: tracks.map((track) => track.id),
      preferences: { ...preferences, targetGraduationTerm: "2029-2", maxMajorCoursesPerTerm: 6 },
    });
    expect(result.courseIds).toHaveLength(25);
    expect(new Set([...result.placements, ...result.unplaced].map((item) => item.courseId)).size).toBe(25);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it("canonicalizes duplicate planned records with omitted and later terms regardless of input order", () => {
    const selections: CourseSelectionRecord[] = [
      { courseId: "f-1", status: "planned" },
      { courseId: "f-1", status: "planned", plannedTerm: "later" },
    ];
    const forward = buildTrackSemesterPlan({ ...base, courseSelections: selections });
    const reversed = buildTrackSemesterPlan({ ...base, courseSelections: [...selections].reverse() });
    expect(forward).toEqual(reversed);
  });
});

describe("isTrackSemesterPlan", () => {
  it("accepts a generated and JSON-roundtripped plan, including an empty completed-course plan", () => {
    expect(isTrackSemesterPlan(JSON.parse(JSON.stringify(buildTrackSemesterPlan(base))))).toBe(true);
    expect(isTrackSemesterPlan(buildTrackSemesterPlan({ ...base,
      courseSelections: completed(courses.map((course) => course.id)),
    }))).toBe(true);
  });

  it("rejects malformed storage data, duplicate IDs and impossible relations instead of trusting a type cast", () => {
    const plan = buildTrackSemesterPlan(base);
    for (const invalid of [null, {}, { ...plan, version: 2 }, { ...plan, inputSignature: "" },
      { ...plan, placements: [...plan.placements, plan.placements[0]] },
      { ...plan, courseIds: [...plan.courseIds, "not-a-course"] },
      { ...plan, placements: plan.placements.map((item, index) => index ? item : { ...item, term: "2030-1" }) },
      { ...plan, placements: plan.placements.map((item, index) => index ? item : { ...item, trackIds: ["economics"] }) },
      { ...plan, preferences: { ...plan.preferences, maxMajorCoursesPerTerm: 0 } },
    ]) expect(isTrackSemesterPlan(invalid)).toBe(false);
  });
});
