import { describe, expect, it, vi } from "vitest";
import { courses, tracks } from "../data/curriculumData";
import type { CourseSelectionRecord, TrackId } from "../types";
import { calculateTrackCompletion, isTrackCompletionScenario } from "./trackCompletion";

const marketingIds = ["f-1", "f-2", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"];
const completed = (ids: string[]): CourseSelectionRecord[] =>
  ids.map((courseId) => ({ courseId, status: "completed" }));

describe("calculateTrackCompletion", () => {
  it("keeps no target selected, but compares all five tracks without a default target", () => {
    const result = calculateTrackCompletion({ selectedTrackIds: [], courseSelections: [] });

    expect(result.selectedTrackIds).toEqual([]);
    expect(result.completed.trackResults).toEqual([]);
    expect(result.completed.satisfied).toBe(false);
    expect(result.completed.unionRemainingCourseIds).toEqual([]);
    expect(result.completed.unionRemainingCourseCount).toBe(0);
    expect(result.completed.recommendations).toHaveLength(5);
    expect(result.completed.discoveryCandidates).toHaveLength(5);
  });

  it("needs ten module courses, not eighteen required credits or a 63-credit degree, for empty marketing", () => {
    const input = {
      selectedTrackIds: ["food-marketing"] as TrackId[],
      courseSelections: completed(["a-1", "a-2", "b-2", "c-1", "c-2", "c-3"]),
      additionalMajorCredits: [{ credits: 100 }],
    };
    const result = calculateTrackCompletion(input).completed;

    expect(result.unionRemainingCourseCount).toBe(10);
    expect(result.unionRemainingCredits).toBe(30);
    expect(result.trackResults[0]).toMatchObject({
      earnedCredits: 0, creditedCredits: 0, requiredCredits: 30,
      missingCredits: 30, completionRate: 0, satisfied: false,
    });
    expect(result.unionRemainingCourseIds.every((id) => !/^[abc]-/.test(id))).toBe(true);
  });

  it("does not force global-required F1/H1 when other courses already satisfy track modules", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"],
      courseSelections: completed(["f-2", "f-3", "h-2", "h-3", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"]),
    }).completed;

    expect(result.satisfied).toBe(true);
    expect(result.unionRemainingCourseIds).toEqual([]);
    expect(result.trackResults[0]).toMatchObject({ creditedCredits: 30, completionRate: 100 });
  });

  it("counts only completed known courses once and reports unknown input separately", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"],
      courseSelections: [
        ...completed(["f-1", "f-1", "not-a-course"]),
        { courseId: "f-1", status: "in-progress" },
        { courseId: "h-1", status: "in-progress" },
        { courseId: "i-1", status: "planned" },
      ],
    });

    expect(result.completed.trackResults[0].earnedCredits).toBe(3);
    expect(result.completed.trackResults[0].creditedCredits).toBe(3);
    expect(result.completed.unionRemainingCourseCount).toBe(9);
    expect(result.completed.unionRemainingCourseIds).toContain("h-1");
    expect(result.completed.unionRemainingCourseIds).toContain("i-1");
    expect(result.ignoredCourseIds).toEqual(["not-a-course"]);
    expect(result.inProgressPreview).toBeUndefined();
  });

  it("returns a separately labelled in-progress preview without changing earned completion", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"],
      courseSelections: [
        ...marketingIds.map((courseId) => ({ courseId, status: "in-progress" as const })),
        { courseId: "d-1", status: "planned" },
      ],
      includeInProgress: true,
    });

    expect(result.completed.basis).toBe("completed");
    expect(result.completed.satisfied).toBe(false);
    expect(result.completed.unionRemainingCourseCount).toBe(10);
    expect(result.inProgressPreview?.basis).toBe("completed-plus-in-progress");
    expect(result.inProgressPreview?.satisfied).toBe(true);
    expect(result.inProgressPreview?.unionRemainingCourseCount).toBe(0);
    expect(result.inProgressPreview?.assumedCourseIds).not.toContain("d-1");
  });

  it("does not count planned courses in either completion scenario", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"],
      courseSelections: marketingIds.map((courseId) => ({ courseId, status: "planned" })),
      includeInProgress: true,
    });

    expect(result.completed.unionRemainingCourseCount).toBe(10);
    expect(result.inProgressPreview?.unionRemainingCourseCount).toBe(10);
    expect(result.completed.suggestedCourses.find((item) => item.courseId === "f-1")?.currentStatus).toBe("planned");
  });

  it("shares J/L across marketing and economics, counting their union only once", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing", "economics"], courseSelections: [],
    }).completed;

    expect(result.unionRemainingCourseCount).toBe(16);
    expect(result.unionRemainingCredits).toBe(48);
    expect(new Set(result.unionRemainingCourseIds).size).toBe(16);
    expect(result.trackResults.map((track) => track.remainingCourseCount)).toEqual([10, 10]);
    expect(result.suggestedCourses.find((item) => item.courseId === "j-1")?.selectedTrackIds)
      .toEqual(["food-marketing", "economics"]);
    expect(result.suggestedCourses.find((item) => item.courseId === "f-1")?.selectedTrackIds)
      .toEqual(["food-marketing"]);
  });

  it("reports discovery cost after the chosen combined plan, not the full independent track cost", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"], courseSelections: [],
    }).completed;
    const distribution = result.discoveryCandidates.find((item) => item.trackId === "agri-food-distribution");
    const bio = result.discoveryCandidates.find((item) => item.trackId === "food-bio-economy");

    expect(result.discoveryCandidates).toHaveLength(4);
    expect(distribution).toMatchObject({
      remainingCourseCount: 10, additionalCourseCount: 4, additionalCredits: 12,
      additionalCourseIds: ["g-1", "g-2", "k-1", "k-2"],
    });
    expect(bio).toMatchObject({ additionalCourseCount: 7, additionalCredits: 15 });
    expect(result.discoveryCandidates.every((item) =>
      item.additionalCourseIds.every((id) => !result.unionRemainingCourseIds.includes(id)),
    )).toBe(true);
  });

  it("recommends by remaining track-module workload, independent of broad major credits", () => {
    const result = calculateTrackCompletion({ selectedTrackIds: [], courseSelections: completed(marketingIds) });

    expect(result.completed.recommendations[0]).toMatchObject({
      trackId: "food-marketing", remainingCourseCount: 0, remainingCredits: 0,
    });
    expect(result.completed.recommendations[1]).toMatchObject({
      trackId: "agri-food-distribution", remainingCourseCount: 4, remainingCredits: 12,
    });
  });

  it("solves food bio using 15 + 8 + 7 without adding F/H/I subconstraints to the progress numerator", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-bio-economy"],
      courseSelections: completed(["f-1", "h-1", "i-1", "m-1", "m-2", "m-3", "m-4", "n-1", "n-2", "o-1"]),
    }).completed;
    const bio = result.trackResults[0];

    expect(bio).toMatchObject({
      earnedCredits: 24, creditedCredits: 24, requiredCredits: 30,
      missingCredits: 6, completionRate: 80, satisfied: false,
    });
    expect(bio.moduleProgress).toHaveLength(6);
    expect(bio.moduleProgress.filter((item) => item.isSubconstraint)).toHaveLength(3);
    expect(result.unionRemainingCourseCount).toBe(2);
    expect(result.unionRemainingCredits).toBe(6);
  });

  it("does not show 100 percent when food-bio base credits are concentrated in F/H and I is missing", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: ["food-bio-economy"],
      courseSelections: completed(["f-1", "f-2", "f-3", "h-1", "h-2", "m-1", "m-2", "m-3", "m-4", "n-1", "n-2", "o-1"]),
    }).completed;

    expect(result.trackResults[0]).toMatchObject({
      earnedCredits: 30, creditedCredits: 27, missingCredits: 3,
      completionRate: 90, satisfied: false,
    });
    expect(result.unionRemainingCourseIds).toEqual(["i-1"]);
  });

  it("minimizes course count first, then credits, then course codes for food bio", () => {
    const result = calculateTrackCompletion({ selectedTrackIds: ["food-bio-economy"], courseSelections: [] }).completed;

    expect(result.unionRemainingCourseCount).toBe(12);
    expect(result.unionRemainingCredits).toBe(30);
    expect(result.unionRemainingCourseIds.filter((id) => /^[no]-/.test(id)))
      .toEqual(["n-1", "n-2", "o-1"]);
    expect(calculateTrackCompletion({
      selectedTrackIds: ["food-bio-economy"], courseSelections: completed(result.unionRemainingCourseIds),
    }).completed.satisfied).toBe(true);
  });

  it("solves all five simultaneously within an interactive time budget without a global power set", () => {
    const start = performance.now();
    const result = calculateTrackCompletion({ selectedTrackIds: tracks.map((track) => track.id), courseSelections: [] }).completed;
    const elapsed = performance.now() - start;

    expect(result.unionRemainingCourseCount).toBe(25);
    expect(result.unionRemainingCredits).toBe(69);
    expect(result.discoveryCandidates).toEqual([]);
    expect(elapsed).toBeLessThan(500);
    expect(calculateTrackCompletion({
      selectedTrackIds: tracks.map((track) => track.id), courseSelections: completed(result.unionRemainingCourseIds),
    }).completed.satisfied).toBe(true);
  });

  it("returns no remaining coursework for all completed courses, without inflating a 30-credit gauge", () => {
    const result = calculateTrackCompletion({
      selectedTrackIds: tracks.map((track) => track.id),
      courseSelections: completed(courses.map((course) => course.id)),
    }).completed;

    expect(result.satisfied).toBe(true);
    expect(result.unionRemainingCourseCount).toBe(0);
    expect(result.trackResults.every((track) => track.creditedCredits === 30 && track.completionRate === 100)).toBe(true);
  });

  it("normalizes duplicates deterministically and never changes caller data", () => {
    const selectedTrackIds = Object.freeze(["economics", "food-marketing", "economics"] as const);
    const courseSelections = Object.freeze([
      Object.freeze({ courseId: "f-1", status: "planned" as const }),
      Object.freeze({ courseId: "f-1", status: "completed" as const }),
      Object.freeze({ courseId: "j-1", status: "in-progress" as const }),
    ]);
    const before = JSON.stringify({ selectedTrackIds, courseSelections });
    const result = calculateTrackCompletion({ selectedTrackIds, courseSelections, includeInProgress: true });
    const reordered = calculateTrackCompletion({
      selectedTrackIds: [...selectedTrackIds].reverse(),
      courseSelections: [...courseSelections].reverse(), includeInProgress: true,
    });

    expect(JSON.stringify({ selectedTrackIds, courseSelections })).toBe(before);
    expect(result).toEqual(reordered);
    expect(result.selectedTrackIds).toEqual(["food-marketing", "economics"]);
    expect(result.completed.trackResults[0].earnedCredits).toBe(3);
  });
});

describe("isTrackCompletionScenario", () => {
  it("accepts JSON snapshots for empty, multiple-track, complete and in-progress scenarios", () => {
    const examples = [
      calculateTrackCompletion({ selectedTrackIds: [], courseSelections: [] }).completed,
      calculateTrackCompletion({ selectedTrackIds: tracks.map((track) => track.id), courseSelections: completed(["f-1"]) }).completed,
      calculateTrackCompletion({ selectedTrackIds: tracks.map((track) => track.id), courseSelections: completed(courses.map((course) => course.id)) }).completed,
      calculateTrackCompletion({ selectedTrackIds: ["food-bio-economy"], courseSelections: [{ courseId: "f-1", status: "in-progress" }], includeInProgress: true }).inProgressPreview,
    ];
    for (const example of examples) expect(isTrackCompletionScenario(JSON.parse(JSON.stringify(example)))).toBe(true);
  });

  it("rejects malformed IDs, non-finite/broken credit bounds, duplicated courses and conflicting summaries", () => {
    const example = calculateTrackCompletion({ selectedTrackIds: ["food-marketing"], courseSelections: completed(["f-1"]) }).completed;
    const alteredCandidate = (patch: Record<string, unknown>) => ({ ...example, trackResults: [{ ...example.trackResults[0], ...patch }] });
    for (const bad of [null, {}, { ...example, basis: "graduation" },
      { ...example, assumedCourseIds: ["unknown"] },
      { ...example, unionRemainingCourseIds: [...example.unionRemainingCourseIds, example.unionRemainingCourseIds[0]] },
      { ...example, unionRemainingCourseCount: 0 },
      { ...example, unionRemainingCredits: Number.NaN },
      { ...example, satisfied: true },
      { ...example, recommendations: [example.recommendations[0], example.recommendations[0]] },
      { ...example, suggestedCourses: [{ ...example.suggestedCourses[0], selectedTrackIds: ["unknown"] }] },
      alteredCandidate({ earnedCredits: Number.POSITIVE_INFINITY }),
      alteredCandidate({ creditedCredits: -1 }), alteredCandidate({ creditedCredits: 31 }),
      alteredCandidate({ requiredCredits: 0 }), alteredCandidate({ completionRate: 101 }),
      alteredCandidate({ remainingCourseIds: ["unknown"] }),
      alteredCandidate({ moduleProgress: [{ ...example.trackResults[0].moduleProgress[0], moduleIds: ["Z"] }] }),
      { ...example, discoveryCandidates: example.discoveryCandidates.map((candidate, index) => index ? candidate : { ...candidate, additionalCourseIds: ["f-1"], additionalCourseCount: 1 }) },
    ]) expect(isTrackCompletionScenario(bad)).toBe(false);
  });

  it("validates saved facts without recalculating them under changed live course credits", () => {
    const snapshot = JSON.parse(JSON.stringify(calculateTrackCompletion({
      selectedTrackIds: ["food-marketing"], courseSelections: completed(["f-1"]),
    }).completed));
    const course = courses.find((item) => item.id === "f-1")!;
    const priorCredits = course.credits;
    try {
      course.credits = 99;
      expect(isTrackCompletionScenario(snapshot)).toBe(true);
    } finally {
      course.credits = priorCredits;
    }
  });

  it("rejects a completed track that simultaneously asks for more remaining courses", () => {
    const snapshot = calculateTrackCompletion({ selectedTrackIds: ["food-marketing"], courseSelections: completed(marketingIds) }).completed;
    const inconsistent = { ...snapshot.trackResults[0], remainingCourseIds: ["f-3"], remainingCourseCount: 1, remainingCredits: 3 };
    expect(isTrackCompletionScenario({ ...snapshot,
      trackResults: [inconsistent], recommendations: snapshot.recommendations.map((item) => item.trackId === "food-marketing" ? inconsistent : item),
    })).toBe(false);
  });

  it("preserves frozen IDs after a course is removed from a freshly loaded current catalogue", async () => {
    const snapshot = JSON.parse(JSON.stringify(calculateTrackCompletion({
      selectedTrackIds: tracks.map((track) => track.id), courseSelections: completed(courses.map((course) => course.id)),
    }).completed));
    const catalogue = await import("../data/curriculumData");
    vi.resetModules();
    vi.doMock("../data/curriculumData", () => ({ ...catalogue, courses: catalogue.courses.filter((course) => course.id !== "f-1") }));
    try {
      const reloaded = await import("./trackCompletion");
      expect(reloaded.isTrackCompletionScenario(snapshot)).toBe(true);
    } finally {
      vi.doUnmock("../data/curriculumData");
      vi.resetModules();
    }
  });
});
