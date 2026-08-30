import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../data/curriculumData";
import type {
  DiagnosisSnapshot,
  GraduationPlanPreferences,
  GraduationPlanResult,
  RecommendationAxes,
  SavedAppStateV2,
} from "../types";
import {
  appendDiagnosisSnapshot,
  createEmptyAppState,
  emptyState,
  loadAppState,
  loadSavedState,
  migrateV1State,
  normalizeSnapshotHistory,
  saveAppState,
  saveState,
  STORAGE_KEY_V2,
  STORAGE_LAST_VALID_KEY_V2,
} from "./storage";

const values = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  },
});

function makeStorage(initial: Record<string, string>): Storage {
  const storageValues = new Map(Object.entries(initial));
  return {
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => void storageValues.set(key, value),
    removeItem: (key) => void storageValues.delete(key),
    clear: () => storageValues.clear(),
    key: (index) => [...storageValues.keys()][index] ?? null,
    get length() {
      return storageValues.size;
    },
  };
}

function stateWithTarget(targetTrackId: "food-marketing" | "economics"): SavedAppStateV2 {
  return { ...createEmptyAppState(), targetTrackId };
}

const minorProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
} as const;

const planPreferences: GraduationPlanPreferences = {
  currentTerm: "2026-1",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 3,
  considerSeasonalTerm: false,
};

function makeGraduationPlan(
  preferences: GraduationPlanPreferences = planPreferences,
): GraduationPlanResult {
  return {
    status: "regular-plan-possible",
    preferences,
    placements: [{
      termId: "2026-1",
      courseId: "f-1",
      origin: "generated",
      offeringEvidence: "historical-2026-snapshot",
    }],
    extraTermPlacements: [],
    unplacedCourses: [{
      courseId: "h-1",
      reason: "offering-unknown",
      message: "개설 학기 확인 필요",
    }],
    electiveAllocations: [],
    unallocatedElectiveCredits: 0,
    unallocatedElectiveSlots: 0,
    unplacedElectiveCredits: 0,
    unplacedElectiveSlots: 0,
    recommendedMaxMajorCoursesPerTerm: 4,
    neededExtraTerms: 0,
    reviewItems: [{
      code: "future-offering",
      message: "향후 개설 여부 확인 필요",
      evidence: "project-derived",
    }],
    generatedAt: "2026-08-30T00:00:00.000Z",
  };
}

const recommendationAxes: RecommendationAxes = {
  interest: [{
    trackId: "food-marketing",
    score: 80,
    closeLeader: false,
    reasons: ["소비자 분석 선호"],
  }],
  progress: [{
    trackId: "food-marketing",
    missingCourseCount: 2,
    missingCredits: 6,
    missingModuleLabels: ["H. 머천다이징"],
    assumption: "current-path",
  }],
  plan: [{
    trackId: "food-marketing",
    status: "regular-plan-possible",
    unplacedCourseCount: 0,
    neededExtraTerms: 0,
    assumption: "track-major-hypothesis",
  }],
  alignedLeaderTrackIds: ["food-marketing"],
};

function makeSnapshot(id: string): DiagnosisSnapshot {
  return {
    id,
    createdAt: "2026-08-30T00:00:00.000Z",
    ruleVersion: "2026-provided-final-plan",
    profile: minorProfile,
    courseSelections: [],
    additionalMajorCredits: [],
    comparisonTrackIds: [],
    result: {
      requiredProgress: "not-applicable",
      trackProgress: "not-applicable",
      totalMajorProgress: {
        completedCredits: 0,
        requiredCredits: 0,
        missingCredits: 0,
      },
      reviewItems: [],
      status: "incomplete",
    },
  };
}

describe("diagnosis storage", () => {
  beforeEach(() => values.clear());

  it("keeps actual completion and local semester plans separate", () => {
    saveState({
      ...emptyState(),
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1"],
      plannedCourseTerms: { "c-2": "next", "h-1": "following" },
    });

    expect(loadSavedState()).toMatchObject({
      completedCourseIds: ["f-1"],
      plannedCourseTerms: { "c-2": "next", "h-1": "following" },
    });
  });

  it("removes unknown courses and invalid planning terms from stored input", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        curriculumYear: 2026,
        trackIds: ["food-marketing", "unknown-track"],
        completedCourseIds: ["f-1", "not-a-course", "f-1"],
        enrollmentType: "primary",
        plannedCourseTerms: { "c-2": "later", "not-a-course": "next", "h-1": "someday" },
      }),
    );

    expect(loadSavedState()).toEqual({
      curriculumYear: 2026,
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1"],
      enrollmentType: "primary",
      plannedCourseTerms: { "c-2": "later" },
    });
  });

  it("migrates previous saved data without a plan field", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        curriculumYear: 2026,
        trackIds: ["economics"],
        completedCourseIds: ["d-1"],
        enrollmentType: "double-major",
      }),
    );

    expect(loadSavedState().plannedCourseTerms).toEqual({});
  });

  it("migrates sanitized v1 completed courses and remote planned terms without overlap", () => {
    const migrated = migrateV1State({
      curriculumYear: 2026,
      trackIds: ["food-marketing", "unknown-track", "food-marketing"],
      completedCourseIds: ["b-2", "not-a-course", "f-1", "b-2"],
      enrollmentType: "primary",
      plannedCourseTerms: { "b-2": "following", "h-1": "next", "not-a-course": "later" },
    });

    expect(migrated.courseSelections).toEqual([
      { courseId: "b-2", status: "completed" },
      { courseId: "f-1", status: "completed" },
      { courseId: "h-1", status: "planned", plannedTerm: "next" },
    ]);
    expect(migrated.profile?.affiliation).toBe("department-student");
    expect(migrated.profile?.ruleApplicability).toBe("reference-only");
    expect(migrated.targetTrackId).toBe("food-marketing");
    expect(migrated.comparisonTrackIds).toEqual([]);
  });

  it("ignores legacy data from a different curriculum year", () => {
    expect(migrateV1State({
      curriculumYear: 2025,
      trackIds: ["food-marketing"],
      completedCourseIds: ["f-1"],
      enrollmentType: "primary",
      plannedCourseTerms: { "h-1": "next" },
    })).toEqual(createEmptyAppState());
  });

  it("keeps only the newest twelve diagnosis snapshots", () => {
    const snapshots = Array.from({ length: 13 }, (_, index) => ({
      id: `snapshot-${index + 1}`,
    })) as DiagnosisSnapshot[];

    expect(normalizeSnapshotHistory(snapshots)).toHaveLength(12);
    expect(normalizeSnapshotHistory(snapshots)[0].id).toBe("snapshot-2");
  });

  it("loads a valid legacy v2 state without recommendation or plan fields", () => {
    const legacyV2: SavedAppStateV2 = {
      version: 2,
      courseSelections: [],
      additionalMajorCredits: [],
      comparisonTrackIds: [],
      snapshots: [],
    };

    expect(loadAppState(makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify(legacyV2),
    }))).toEqual(legacyV2);
  });

  it("persists valid survey, recommendation, plan, and enriched snapshot data", () => {
    const graduationPlan = makeGraduationPlan();
    const snapshot = {
      ...makeSnapshot("enriched"),
      recommendationAxes,
      graduationPlan,
    };
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      interestSurvey: {
        answers: { "consumer-choice": 5, "future-food": 1 },
        currentIndex: 2,
        completedAt: "2026-08-30T00:00:00.000Z",
        selectedTrackId: "food-marketing",
      },
      graduationPlanPreferences: planPreferences,
      graduationPlan,
      snapshots: [snapshot],
    };
    const storage = makeStorage({});

    expect(saveAppState(state, storage)).toBe(true);
    expect(loadAppState(storage)).toEqual(state);
  });

  it("persists planner-owned elective allocations through the target plus two terms", () => {
    const graduationPlan: GraduationPlanResult = {
      ...makeGraduationPlan(),
      electiveAllocations: [
        { termId: "2026-2", slots: 1, credits: 3 },
        { termId: "2028-2", slots: 1, credits: 3 },
      ],
      unallocatedElectiveCredits: 9,
      unallocatedElectiveSlots: 3,
      unplacedElectiveCredits: 3,
      unplacedElectiveSlots: 1,
    };
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      graduationPlanPreferences: planPreferences,
      graduationPlan,
    };
    const storage = makeStorage({});

    expect(saveAppState(state, storage)).toBe(true);
    expect(loadAppState(storage)).toEqual(state);
  });

  it("preserves v2 inputs and preferences while clearing pre-allocation-contract plans", () => {
    const oldPlan = { ...makeGraduationPlan() } as Record<string, unknown>;
    delete oldPlan.electiveAllocations;
    delete oldPlan.unplacedElectiveCredits;
    delete oldPlan.unplacedElectiveSlots;
    const source = {
      ...createEmptyAppState(),
      profile: minorProfile,
      graduationPlanPreferences: planPreferences,
      graduationPlan: oldPlan,
      snapshots: [{ ...makeSnapshot("old-plan"), graduationPlan: oldPlan }],
    };

    const loaded = loadAppState(makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify(source),
    }));

    expect(loaded.profile).toEqual(minorProfile);
    expect(loaded.graduationPlanPreferences).toEqual(planPreferences);
    expect(loaded.graduationPlan).toBeUndefined();
    expect(loaded.snapshots[0].graduationPlan).toBeUndefined();
  });

  it.each([
    ["answer outside 1-5", { answers: { "consumer-choice": 6 }, currentIndex: 0 }],
    ["unknown question", { answers: { "made-up-question": 3 }, currentIndex: 0 }],
    ["non-integer current index", { answers: {}, currentIndex: 0.5 }],
    ["unknown selected track", { answers: {}, currentIndex: 0, selectedTrackId: "unknown" }],
  ])("recovers last-valid state after invalid survey %s", (_, interestSurvey) => {
    const validState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({ ...createEmptyAppState(), interestSurvey }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it.each([
    ["target before current", { ...planPreferences, currentTerm: "2027-1", targetGraduationTerm: "2026-2" }],
    ["invalid current term", { ...planPreferences, currentTerm: "2026-3" }],
    ["load below one", { ...planPreferences, maxMajorCoursesPerTerm: 0 }],
    ["load above six", { ...planPreferences, maxMajorCoursesPerTerm: 7 }],
    ["fractional load", { ...planPreferences, maxMajorCoursesPerTerm: 2.5 }],
  ])("recovers last-valid state after invalid plan preferences: %s", (_, graduationPlanPreferences) => {
    const validState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({ ...createEmptyAppState(), graduationPlanPreferences }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it("rejects a stored plan whose preferences differ from the saved preferences", () => {
    const validState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        graduationPlanPreferences: planPreferences,
        graduationPlan: makeGraduationPlan({
          ...planPreferences,
          targetGraduationTerm: "2028-1",
        }),
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it.each([
    ["unknown placement course", { placements: [{ termId: "2026-1", courseId: "unknown", origin: "generated", offeringEvidence: "unknown" }] }],
    ["invalid placement origin", { placements: [{ termId: "2026-1", courseId: "f-1", origin: "manual", offeringEvidence: "unknown" }] }],
    ["invalid offering evidence", { placements: [{ termId: "2026-1", courseId: "f-1", origin: "generated", offeringEvidence: "guaranteed" }] }],
    ["invalid unplaced reason", { unplacedCourses: [{ courseId: "h-1", reason: "unknown", message: "검토" }] }],
    ["invalid plan status", { status: "ready" }],
    ["invalid allocation term", { electiveAllocations: [{ termId: "2026-3", slots: 1, credits: 3 }] }],
    ["zero allocation slots", { electiveAllocations: [{ termId: "2026-2", slots: 0, credits: 3 }] }],
    ["fractional allocation slots", { electiveAllocations: [{ termId: "2026-2", slots: 1.5, credits: 3 }] }],
    ["zero allocation credits", { electiveAllocations: [{ termId: "2026-2", slots: 1, credits: 0 }] }],
    ["allocation credits beyond slots", { electiveAllocations: [{ termId: "2026-2", slots: 1, credits: 4 }] }],
    ["negative unplaced elective credits", { unplacedElectiveCredits: -1 }],
    ["fractional unplaced elective slots", { unplacedElectiveSlots: 0.5 }],
    [
      "elective credit conservation mismatch",
      {
        electiveAllocations: [{ termId: "2026-2", slots: 1, credits: 3 }],
        unallocatedElectiveCredits: 9,
        unallocatedElectiveSlots: 3,
        unplacedElectiveCredits: 3,
        unplacedElectiveSlots: 1,
      },
    ],
  ])("recovers after invalid nested graduation plan data: %s", (_, override) => {
    const validState = stateWithTarget("economics");
    const malformedPlan = { ...makeGraduationPlan(), ...override };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        graduationPlanPreferences: planPreferences,
        graduationPlan: malformedPlan,
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it.each([
    [
      "normal placement after target",
      {
        placements: [{
          termId: "2028-1",
          courseId: "f-1",
          origin: "generated",
          offeringEvidence: "historical-2026-snapshot",
        }],
      },
    ],
    [
      "normal placement before current",
      {
        placements: [{
          termId: "2025-2",
          courseId: "f-1",
          origin: "generated",
          offeringEvidence: "historical-2026-snapshot",
        }],
      },
    ],
    [
      "extra placement at target",
      {
        extraTermPlacements: [{
          termId: "2027-2",
          courseId: "h-1",
          origin: "generated",
          offeringEvidence: "unknown",
        }],
      },
    ],
    [
      "extra placement beyond two additional terms",
      {
        extraTermPlacements: [{
          termId: "2029-1",
          courseId: "h-1",
          origin: "generated",
          offeringEvidence: "unknown",
        }],
      },
    ],
    [
      "elective allocation in current term",
      {
        electiveAllocations: [{ termId: "2026-1", slots: 1, credits: 3 }],
        unallocatedElectiveCredits: 3,
        unallocatedElectiveSlots: 1,
      },
    ],
    [
      "elective allocation beyond two additional terms",
      {
        electiveAllocations: [{ termId: "2029-1", slots: 1, credits: 3 }],
        unallocatedElectiveCredits: 3,
        unallocatedElectiveSlots: 1,
      },
    ],
  ])("recovers literal last-valid state after invalid plan term semantics: %s", (_, override) => {
    const lastValid: SavedAppStateV2 = {
      version: 2,
      courseSelections: [],
      additionalMajorCredits: [],
      targetTrackId: "economics",
      comparisonTrackIds: [],
      snapshots: [],
    };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        graduationPlanPreferences: planPreferences,
        graduationPlan: { ...makeGraduationPlan(), ...override },
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(lastValid),
    });

    expect(loadAppState(storage)).toEqual(lastValid);
  });

  it("accepts an in-progress placement in the current term", () => {
    const plan = {
      ...makeGraduationPlan(),
      placements: [{
        termId: "2026-1",
        courseId: "f-1",
        origin: "in-progress",
        offeringEvidence: "historical-2026-snapshot",
      }],
    } satisfies GraduationPlanResult;
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      graduationPlanPreferences: planPreferences,
      graduationPlan: plan,
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(state) });

    expect(loadAppState(storage)).toEqual(state);
  });

  it("applies plan term boundaries to graduation plans inside snapshots", () => {
    const lastValid: SavedAppStateV2 = {
      version: 2,
      courseSelections: [],
      additionalMajorCredits: [],
      targetTrackId: "economics",
      comparisonTrackIds: [],
      snapshots: [],
    };
    const invalidSnapshot = {
      ...makeSnapshot("invalid-plan-term"),
      graduationPlan: {
        ...makeGraduationPlan(),
        placements: [{
          termId: "2028-1",
          courseId: "f-1",
          origin: "generated",
          offeringEvidence: "historical-2026-snapshot",
        }],
      },
    };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        snapshots: [invalidSnapshot],
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(lastValid),
    });

    expect(loadAppState(storage)).toEqual(lastValid);
  });

  it("applies the same elective allocation guard to graduation plans inside snapshots", () => {
    const lastValid = stateWithTarget("economics");
    const invalidSnapshot = {
      ...makeSnapshot("invalid-plan-allocation"),
      graduationPlan: {
        ...makeGraduationPlan(),
        electiveAllocations: [{ termId: "2026-1", slots: 1, credits: 3 }],
        unallocatedElectiveCredits: 3,
        unallocatedElectiveSlots: 1,
      },
    };
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        snapshots: [invalidSnapshot],
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(lastValid),
    });

    expect(loadAppState(storage)).toEqual(lastValid);
  });

  it.each([
    ["unknown interest track", { ...recommendationAxes, interest: [{ ...recommendationAxes.interest![0], trackId: "unknown" }] }],
    ["invalid progress assumption", { ...recommendationAxes, progress: [{ ...recommendationAxes.progress[0], assumption: "saved-path" }] }],
    ["invalid plan status", { ...recommendationAxes, plan: [{ ...recommendationAxes.plan![0], status: "ready" }] }],
    ["unknown aligned leader", { ...recommendationAxes, alignedLeaderTrackIds: ["unknown"] }],
  ])("recovers after invalid snapshot recommendation axes: %s", (_, invalidAxes) => {
    const validState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify({
        ...createEmptyAppState(),
        snapshots: [{ ...makeSnapshot("invalid"), recommendationAxes: invalidAxes }],
      }),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it("preserves legacy semester fields and every PlanTerm value", () => {
    const state: SavedAppStateV2 = {
      ...createEmptyAppState(),
      currentSemester: "2-1",
      targetGraduationSemester: "4-2",
      courseSelections: [
        { courseId: "f-1", status: "planned", plannedTerm: "next" },
        { courseId: "h-1", status: "planned", plannedTerm: "following" },
        { courseId: "i-1", status: "planned", plannedTerm: "later" },
      ],
    };
    const storage = makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(state) });

    expect(loadAppState(storage)).toEqual(state);
  });

  it("appends a diagnosis snapshot without overwriting earlier history", () => {
    const state = { ...createEmptyAppState(), snapshots: [makeSnapshot("first")] };

    const appended = appendDiagnosisSnapshot(state, makeSnapshot("second"));

    expect(appended.snapshots.map((snapshot) => snapshot.id)).toEqual(["first", "second"]);
    expect(state.snapshots.map((snapshot) => snapshot.id)).toEqual(["first"]);
  });

  it("keeps only the newest twelve snapshots when appending", () => {
    const state = {
      ...createEmptyAppState(),
      snapshots: Array.from({ length: 12 }, (_, index) => makeSnapshot(`snapshot-${index + 1}`)),
    };

    const appended = appendDiagnosisSnapshot(state, makeSnapshot("snapshot-13"));

    expect(appended.snapshots).toHaveLength(12);
    expect(appended.snapshots[0].id).toBe("snapshot-2");
    expect(appended.snapshots[11].id).toBe("snapshot-13");
  });

  it.each([
    {
      name: "uses the active v2 state before all fallback sources",
      active: JSON.stringify(stateWithTarget("food-marketing")),
      lastValid: JSON.stringify(stateWithTarget("economics")),
      legacy: JSON.stringify({ ...emptyState(), trackIds: ["economics"] }),
      expected: stateWithTarget("food-marketing"),
    },
    {
      name: "uses last-valid after malformed active JSON",
      active: "{broken",
      lastValid: JSON.stringify(stateWithTarget("economics")),
      legacy: JSON.stringify({ ...emptyState(), trackIds: ["food-marketing"] }),
      expected: stateWithTarget("economics"),
    },
    {
      name: "uses last-valid after structurally malformed active JSON",
      active: JSON.stringify({ ...createEmptyAppState(), snapshots: [{}] }),
      lastValid: JSON.stringify(stateWithTarget("economics")),
      legacy: JSON.stringify({ ...emptyState(), trackIds: ["food-marketing"] }),
      expected: stateWithTarget("economics"),
    },
    {
      name: "migrates sanitized v1 after both v2 copies are malformed",
      active: JSON.stringify({ version: 2 }),
      lastValid: JSON.stringify({ version: 2 }),
      legacy: JSON.stringify({
        ...emptyState(),
        trackIds: ["food-marketing"],
        completedCourseIds: ["f-1", "unknown-course"],
        plannedCourseTerms: { "f-1": "next", "h-1": "following", "unknown-course": "later" },
      }),
      expected: migrateV1State({
        ...emptyState(),
        trackIds: ["food-marketing"],
        completedCourseIds: ["f-1", "unknown-course"],
        plannedCourseTerms: { "f-1": "next", "h-1": "following", "unknown-course": "later" },
      }),
    },
    {
      name: "returns empty only after every persisted source is unusable",
      active: JSON.stringify({ version: 2 }),
      lastValid: "{broken",
      legacy: JSON.stringify({ ...emptyState(), curriculumYear: 2025 }),
      expected: createEmptyAppState(),
    },
  ])("$name", ({ active, lastValid, legacy, expected }) => {
    const storage = makeStorage({
      [STORAGE_KEY_V2]: active,
      [STORAGE_LAST_VALID_KEY_V2]: lastValid,
      [STORAGE_KEY]: legacy,
    });

    expect(loadAppState(storage)).toEqual(expected);
  });

  it.each([
    ["snapshot", { ...createEmptyAppState(), snapshots: [{}] }],
    [
      "profile curriculum rule version",
      {
        ...createEmptyAppState(),
        profile: {
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "track-major",
          curriculumRuleVersion: "wrong-version",
          ruleApplicability: "reference-only",
        },
      },
    ],
    [
      "profile entry year",
      {
        ...createEmptyAppState(),
        profile: {
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "track-major",
          entryYear: "2026",
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        },
      },
    ],
    ["profile draft array", { ...createEmptyAppState(), profileDraft: [] }],
    ["profile draft field", { ...createEmptyAppState(), profileDraft: { affiliation: "invalid" } }],
    ["profile draft study path", { ...createEmptyAppState(), profileDraft: { studyPath: "invalid" } }],
    ["current semester", { ...createEmptyAppState(), currentSemester: "5-1" }],
    ["target graduation semester", { ...createEmptyAppState(), targetGraduationSemester: "summer" }],
  ])("falls back after malformed %s", (_, malformedState) => {
    const validState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_KEY_V2]: JSON.stringify(malformedState),
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(validState),
    });

    expect(loadAppState(storage)).toEqual(validState);
  });

  it("returns false when v2 storage throws while saving", () => {
    const throwingStorage: Storage = {
      ...makeStorage({}),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    expect(saveAppState(createEmptyAppState(), throwingStorage)).toBe(false);
  });

  it("does not replace the last-valid recovery state when the next state is invalid", () => {
    const recoveryState = stateWithTarget("economics");
    const storage = makeStorage({
      [STORAGE_LAST_VALID_KEY_V2]: JSON.stringify(recoveryState),
    });
    const invalidState = {
      ...createEmptyAppState(),
      currentSemester: "5-1",
    } as unknown as SavedAppStateV2;

    expect(saveAppState(invalidState, storage)).toBe(false);
    expect(storage.getItem(STORAGE_LAST_VALID_KEY_V2)).toBe(JSON.stringify(recoveryState));
    expect(loadAppState(storage)).toEqual(recoveryState);
  });

  it("keeps the old recovery state when the second v2 write fails", () => {
    const storedValues = new Map<string, string>([
      [STORAGE_LAST_VALID_KEY_V2, JSON.stringify(stateWithTarget("economics"))],
    ]);
    let writes = 0;
    const secondWriteFailingStorage: Storage = {
      getItem: (key) => storedValues.get(key) ?? null,
      setItem: (key, value) => {
        writes += 1;
        if (writes === 2) throw new Error("second write failed");
        storedValues.set(key, value);
      },
      removeItem: (key) => storedValues.delete(key),
      clear: () => storedValues.clear(),
      key: (index) => [...storedValues.keys()][index] ?? null,
      get length() {
        return storedValues.size;
      },
    };

    expect(saveAppState(stateWithTarget("food-marketing"), secondWriteFailingStorage)).toBe(false);
    expect(secondWriteFailingStorage.getItem(STORAGE_LAST_VALID_KEY_V2)).toBe(
      JSON.stringify(stateWithTarget("economics")),
    );
    secondWriteFailingStorage.setItem(STORAGE_KEY_V2, "{broken");
    expect(loadAppState(secondWriteFailingStorage)).toEqual(stateWithTarget("economics"));
  });
});
