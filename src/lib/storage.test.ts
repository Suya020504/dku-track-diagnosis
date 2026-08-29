import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../data/curriculumData";
import type { DiagnosisSnapshot, SavedAppStateV2 } from "../types";
import {
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
