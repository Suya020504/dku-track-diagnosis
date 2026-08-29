import { describe, expect, it } from "vitest";
import { courses } from "./curriculumData";
import {
  COURSE_OFFERING_SNAPSHOT_META,
  courseOfferings2026,
  getObservedSemesterNumbers,
} from "./courseOfferings2026";

describe("2026 historical course offering snapshot", () => {
  it("covers every registered course exactly once", () => {
    expect(Object.keys(courseOfferings2026).sort()).toEqual(
      courses.map((course) => course.id).sort(),
    );
    expect(Object.keys(courseOfferings2026)).toHaveLength(49);
  });

  it("keeps recommendation semesters separate from observed openings", () => {
    expect(courseOfferings2026["m-1"]).toMatchObject({
      officialCourseCode: "541980",
      observedProgramSemesters: ["1-1", "1-2"],
      evidence: "historical-2026-snapshot",
    });
    expect(getObservedSemesterNumbers("m-1")).toEqual([1, 2]);
  });

  it("records the current public re-verification boundary", () => {
    expect(COURSE_OFFERING_SNAPSHOT_META).toMatchObject({
      observedAt: "2026-08-11",
      recheckedAt: "2026-08-30",
      currentPublicVerification: "blocked-by-public-access",
      allowsFutureOfferingGuarantee: false,
    });
  });
});
