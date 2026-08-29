import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../data/curriculumData";
import type { DiagnosisSnapshot } from "../types";
import {
  createEmptyAppState,
  emptyState,
  loadAppState,
  loadSavedState,
  migrateV1State,
  normalizeSnapshotHistory,
  saveAppState,
  saveState,
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

  it("migrates v1 completed courses and remote planned terms without loss", () => {
    const migrated = migrateV1State({
      curriculumYear: 2026,
      trackIds: ["food-marketing"],
      completedCourseIds: ["b-2", "f-1"],
      enrollmentType: "primary",
      plannedCourseTerms: { "h-1": "next" },
    });

    expect(migrated.courseSelections).toEqual([
      { courseId: "b-2", status: "completed" },
      { courseId: "f-1", status: "completed" },
      { courseId: "h-1", status: "planned", plannedTerm: "next" },
    ]);
    expect(migrated.profile?.affiliation).toBe("department-student");
    expect(migrated.profile?.ruleApplicability).toBe("reference-only");
  });

  it("keeps only the newest twelve diagnosis snapshots", () => {
    const snapshots = Array.from({ length: 13 }, (_, index) => ({
      id: `snapshot-${index + 1}`,
    })) as DiagnosisSnapshot[];

    expect(normalizeSnapshotHistory(snapshots)).toHaveLength(12);
    expect(normalizeSnapshotHistory(snapshots)[0].id).toBe("snapshot-2");
  });

  it("returns the last valid state when the active payload is corrupt", () => {
    const validState = createEmptyAppState();
    const storage = makeStorage({
      "track-sim:v2": "{broken",
      "track-sim:v2:last-valid": JSON.stringify(validState),
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
});
