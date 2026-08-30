import { describe, expect, it } from "vitest";
import type {
  CourseSelectionRecord,
  GraduationPlanInput,
  StudentProfile,
} from "../types";
import {
  buildRegularTermHorizon,
  calculateGraduationPlan,
  compareAcademicTerms,
  scheduleCoursesWithinLoad,
} from "./graduationPlanner";

const FUTURE_OFFERING_MESSAGE =
  "2026학년도 개설 이력을 참고한 계획입니다. 이후 학기의 반복 개설을 보장하지 않으며, 실제 개설·폐강·인정 여부는 해당 학기 수강신청 시스템과 학과 안내를 확인해야 합니다.";

const externalMinorProfile: StudentProfile = {
  goal: "plan-graduation",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const externalEconomicsProfile: StudentProfile = {
  ...externalMinorProfile,
  studyPath: "track-major",
  ruleApplicability: "reference-only",
};

const departmentTrackProfile: StudentProfile = {
  ...externalMinorProfile,
  affiliation: "department-student",
  studyPath: "track-major",
  ruleApplicability: "reference-only",
};

const completed = (courseIds: string[]): CourseSelectionRecord[] =>
  courseIds.map((courseId) => ({ courseId, status: "completed" }));

function minorPlan(
  courseSelections: CourseSelectionRecord[],
  overrides: Partial<GraduationPlanInput["preferences"]> = {},
): GraduationPlanInput {
  return {
    profile: externalMinorProfile,
    courseSelections,
    additionalMajorCredits: [],
    preferences: {
      currentTerm: "2026-2",
      targetGraduationTerm: "2027-1",
      maxMajorCoursesPerTerm: 2,
      considerSeasonalTerm: false,
      ...overrides,
    },
    generatedAt: "2026-08-30T09:00:00.000Z",
  };
}

function foodMarketingPlan(
  courseIds: string[],
  targetGraduationTerm: GraduationPlanInput["preferences"]["targetGraduationTerm"],
  maxMajorCoursesPerTerm: number,
): GraduationPlanInput {
  return {
    profile: departmentTrackProfile,
    targetTrackId: "food-marketing",
    courseSelections: completed(courseIds),
    additionalMajorCredits: [{
      id: "verified-other-major",
      label: "검증된 교육과정표 밖 전공학점",
      credits: 21,
      status: "officially-verified",
    }],
    preferences: {
      currentTerm: "2026-2",
      targetGraduationTerm,
      maxMajorCoursesPerTerm,
      considerSeasonalTerm: false,
    },
    generatedAt: "2026-08-30T09:00:00.000Z",
  };
}

describe("academic term helpers", () => {
  it("compares terms numerically across years", () => {
    expect(compareAcademicTerms("2027-1", "2026-2")).toBeGreaterThan(0);
    expect(compareAcademicTerms("2026-1", "2026-2")).toBeLessThan(0);
    expect(compareAcademicTerms("2026-2", "2026-2")).toBe(0);
  });

  it("starts the regular horizon after the current term and includes the target", () => {
    expect(buildRegularTermHorizon("2026-2", "2028-1")).toEqual([
      "2027-1",
      "2027-2",
      "2028-1",
    ]);
  });

  it("rejects a graduation target before the current term", () => {
    expect(() => buildRegularTermHorizon("2027-1", "2026-2")).toThrow(
      "Target graduation term must not be earlier than current term",
    );
  });
});

describe("scheduleCoursesWithinLoad", () => {
  it("keeps named and anonymous course slots within the per-term maximum", () => {
    const result = scheduleCoursesWithinLoad({
      horizon: ["2027-1", "2027-2"],
      maxMajorCoursesPerTerm: 2,
      candidates: [
        { courseId: "c-2", origin: "generated" },
        { courseId: "c-3", origin: "generated" },
        { courseId: "b-2", origin: "generated" },
      ],
      unallocatedElectiveCredits: 6,
    });

    for (const termId of ["2027-1", "2027-2"] as const) {
      const namedCount = result.placements.filter((item) => item.termId === termId).length;
      const anonymousCount = result.electiveAllocations.find((item) => item.termId === termId)?.slots ?? 0;
      expect(namedCount + anonymousCount).toBeLessThanOrEqual(2);
    }
  });

  it("does not put a semester-2-only course in a semester-1 term", () => {
    const result = scheduleCoursesWithinLoad({
      horizon: ["2027-1", "2027-2"],
      maxMajorCoursesPerTerm: 2,
      candidates: [{ courseId: "b-2", origin: "generated" }],
      unallocatedElectiveCredits: 0,
    });

    expect(result.placements).toEqual([
      expect.objectContaining({ courseId: "b-2", termId: "2027-2" }),
    ]);
  });

  it("maps exact user terms and keeps later plans flexible with user origin", () => {
    const result = scheduleCoursesWithinLoad({
      horizon: ["2027-1", "2027-2"],
      maxMajorCoursesPerTerm: 2,
      candidates: [
        { courseId: "c-2", origin: "user-planned", plannedTerm: "next" },
        { courseId: "b-2", origin: "user-planned", plannedTerm: "following" },
        { courseId: "c-3", origin: "user-planned", plannedTerm: "later" },
      ],
      unallocatedElectiveCredits: 0,
    });

    expect(result.placements).toEqual(expect.arrayContaining([
      expect.objectContaining({ courseId: "c-2", termId: "2027-1", origin: "user-planned" }),
      expect.objectContaining({ courseId: "b-2", termId: "2027-2", origin: "user-planned" }),
      expect.objectContaining({ courseId: "c-3", termId: "2027-1", origin: "user-planned" }),
    ]));
  });
});

describe("calculateGraduationPlan", () => {
  it("returns currently-satisfied from completed-only evidence and preserves the supplied timestamp", () => {
    const result = calculateGraduationPlan(minorPlan(
      completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2"]),
    ));

    expect(result.status).toBe("currently-satisfied");
    expect(result.generatedAt).toBe("2026-08-30T09:00:00.000Z");
    expect(result.electiveAllocations).toEqual([]);
    expect(result.unplacedElectiveCredits).toBe(0);
    expect(result.unplacedElectiveSlots).toBe(0);
  });

  it("shows in-progress courses in the current term without treating them as current completion", () => {
    const result = calculateGraduationPlan(minorPlan([
      ...completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1"]),
      { courseId: "d-2", status: "in-progress" },
    ]));

    expect(result.status).toBe("regular-plan-possible");
    expect(result.placements).toContainEqual(expect.objectContaining({
      courseId: "d-2",
      termId: "2026-2",
      origin: "in-progress",
    }));
    expect(result.placements.filter((item) => item.courseId === "d-2")).toHaveLength(1);
    expect(result.placements).not.toContainEqual(expect.objectContaining({ courseId: "b-1" }));
  });

  it("chooses the semester-1 J alternative that fits the regular target horizon", () => {
    const input = foodMarketingPlan([
      "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "f-2", "h-2",
      "i-1", "i-2", "j-1", "l-1", "l-2",
    ], "2027-1", 6);

    const first = calculateGraduationPlan(input);
    const second = calculateGraduationPlan(input);

    expect(second).toEqual(first);
    expect(first.status).toBe("regular-plan-possible");
    expect(first.unallocatedElectiveCredits).toBe(0);
    expect(first.unplacedElectiveCredits).toBe(0);
    expect(first.placements).toContainEqual(expect.objectContaining({
      courseId: "j-3",
      termId: "2027-1",
      origin: "generated",
    }));
    expect(first.placements).not.toContainEqual(expect.objectContaining({ courseId: "j-2" }));
  });

  it("chooses an equal-size equal-credit combination that distributes capacity across terms", () => {
    const result = calculateGraduationPlan(foodMarketingPlan([
      "b-2", "c-1", "c-2", "c-3", "f-1", "h-1",
      "i-1", "i-2", "j-1", "l-2",
    ], "2027-2", 2));

    expect(result.status).toBe("regular-plan-possible");
    expect(result.unallocatedElectiveCredits).toBe(0);
    expect(result.unplacedCourses).toEqual([]);
    expect(result.placements.filter((item) => item.origin === "generated")).toEqual([
      expect.objectContaining({ courseId: "h-3", termId: "2027-1" }),
      expect.objectContaining({ courseId: "l-1", termId: "2027-1" }),
      expect.objectContaining({ courseId: "f-3", termId: "2027-2" }),
      expect.objectContaining({ courseId: "j-2", termId: "2027-2" }),
    ]);
    expect(result.placements).not.toContainEqual(expect.objectContaining({ courseId: "f-2" }));
  });

  it("does not trade minimum new credits for a higher-credit regular-horizon combination", () => {
    const result = calculateGraduationPlan({
      profile: departmentTrackProfile,
      targetTrackId: "food-bio-economy",
      courseSelections: completed([
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "i-1", "f-2", "h-2",
        "m-1", "m-2", "m-3", "m-4",
      ]),
      additionalMajorCredits: [{
        id: "verified-other-major",
        label: "검증된 교육과정표 밖 전공학점",
        credits: 21,
        status: "officially-verified",
      }],
      preferences: {
        currentTerm: "2026-2",
        targetGraduationTerm: "2027-1",
        maxMajorCoursesPerTerm: 6,
        considerSeasonalTerm: false,
      },
      generatedAt: "2026-08-30T09:00:00.000Z",
    });
    const generatedCourseIds = [...result.placements, ...result.extraTermPlacements]
      .filter((item) => item.origin === "generated")
      .map((item) => item.courseId)
      .sort();

    expect(result.status).toBe("extra-term-possible");
    expect(result.unallocatedElectiveCredits).toBe(0);
    expect(generatedCourseIds).toEqual(["n-1", "n-2", "o-1"]);
  });

  it("caps current-term in-progress placements and exposes deterministic overflow", () => {
    const result = calculateGraduationPlan(minorPlan([
      ...completed(["b-1", "c-1", "c-3", "d-1", "d-2"]),
      { courseId: "c-2", status: "in-progress" },
      { courseId: "b-2", status: "in-progress" },
    ], { maxMajorCoursesPerTerm: 1 }));
    const currentPlacements = result.placements.filter((item) => item.termId === "2026-2");

    expect(currentPlacements).toEqual([
      expect.objectContaining({ courseId: "b-2", origin: "in-progress" }),
    ]);
    expect(result.unplacedCourses).toContainEqual(expect.objectContaining({
      courseId: "c-2",
      reason: "capacity-before-target",
    }));
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "plan-input" }));
    expect(result.status).toBe("official-review-required");
  });

  it("rejects reversed public plan terms before a completed-only early return", () => {
    expect(() => calculateGraduationPlan(minorPlan(
      completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2"]),
      { targetGraduationTerm: "2026-1" },
    ))).toThrow("Target graduation term must not be earlier than current term");
  });

  it("rejects reversed public plan terms before an official-conflict early return", () => {
    expect(() => calculateGraduationPlan({
      ...minorPlan(completed([
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-1", "d-2",
        "e-1", "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ]), { targetGraduationTerm: "2026-1" }),
      profile: externalEconomicsProfile,
      targetTrackId: "economics",
    })).toThrow("Target graduation term must not be earlier than current term");
  });

  it("does not place an in-progress course whose offering evidence is unknown", () => {
    const result = calculateGraduationPlan(minorPlan([
      ...completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1"]),
      { courseId: "unknown-current", status: "in-progress" },
    ]));

    expect(result.placements).not.toContainEqual(expect.objectContaining({
      courseId: "unknown-current",
    }));
    expect(result.unplacedCourses).toContainEqual(expect.objectContaining({
      courseId: "unknown-current",
      reason: "offering-unknown",
    }));
    expect(result.reviewItems).toContainEqual(expect.objectContaining({
      code: "future-offering",
      evidence: "official-review-required",
    }));
    expect(result.status).toBe("official-review-required");
  });

  it("does not add capacity for seasonal consideration and adds an independent review item", () => {
    const selections = completed(["b-1", "b-2", "c-1", "c-2", "c-3"]);
    const withoutSeasonal = calculateGraduationPlan(minorPlan(selections));
    const withSeasonal = calculateGraduationPlan(minorPlan(selections, {
      considerSeasonalTerm: true,
    }));

    expect(withSeasonal.status).toBe(withoutSeasonal.status);
    expect(withSeasonal.unallocatedElectiveSlots).toBe(withoutSeasonal.unallocatedElectiveSlots);
    expect(withSeasonal.neededExtraTerms).toBe(withoutSeasonal.neededExtraTerms);
    expect(withSeasonal.reviewItems).toContainEqual(expect.objectContaining({ code: "seasonal-term" }));
  });

  it("returns regular-plan-possible when anonymous elective slots exactly fit regular capacity", () => {
    const result = calculateGraduationPlan(minorPlan(
      completed(["b-1", "b-2", "c-1", "c-2", "c-3"]),
    ));

    expect(result.status).toBe("regular-plan-possible");
    expect(result.unallocatedElectiveSlots).toBe(2);
    expect(result.electiveAllocations).toEqual([
      { termId: "2027-1", slots: 2, credits: 6 },
    ]);
    expect(result.unplacedElectiveCredits).toBe(0);
    expect(result.unplacedElectiveSlots).toBe(0);
    expect(result.recommendedMaxMajorCoursesPerTerm).toBeUndefined();
  });

  it("returns the smallest higher per-term maximum that makes the target horizon fit", () => {
    const result = calculateGraduationPlan(minorPlan(
      completed(["b-1", "b-2", "c-1", "c-2"]),
    ));

    expect(result.status).toBe("load-adjustment-needed");
    expect(result.recommendedMaxMajorCoursesPerTerm).toBe(3);
    expect(result.electiveAllocations.reduce((sum, item) => sum + item.credits, 0)
      + result.unplacedElectiveCredits).toBe(result.unallocatedElectiveCredits);
  });

  it("uses at most two added regular terms when raising the load through six is insufficient", () => {
    const result = calculateGraduationPlan(minorPlan([], {
      maxMajorCoursesPerTerm: 3,
    }));

    expect(result.status).toBe("extra-term-possible");
    expect(result.neededExtraTerms).toBe(2);
    expect(result.electiveAllocations).toEqual([
      { termId: "2027-1", slots: 3, credits: 9 },
      { termId: "2027-2", slots: 3, credits: 9 },
      { termId: "2028-1", slots: 1, credits: 3 },
    ]);
    expect(result.unplacedElectiveCredits).toBe(0);
  });

  it("keeps the exact extended-horizon allocation and exposes every unplaced elective credit", () => {
    const result = calculateGraduationPlan(minorPlan([], {
      targetGraduationTerm: "2027-1",
      maxMajorCoursesPerTerm: 1,
    }));

    expect(result.status).toBe("official-review-required");
    expect(result.unallocatedElectiveCredits).toBe(21);
    expect(result.electiveAllocations).toEqual([
      { termId: "2027-1", slots: 1, credits: 3 },
      { termId: "2027-2", slots: 1, credits: 3 },
      { termId: "2028-1", slots: 1, credits: 3 },
    ]);
    expect(result.unplacedElectiveCredits).toBe(12);
    expect(result.unplacedElectiveSlots).toBe(4);
    expect(result.reviewItems).toContainEqual(expect.objectContaining({
      code: "elective-placeholder",
      message: expect.stringContaining("학기 미배정 선택전공 12학점"),
    }));
    expect(result.electiveAllocations.reduce((sum, item) => sum + item.credits, 0)
      + result.unplacedElectiveCredits).toBe(21);
  });

  it("requires official review when a planned course has no offering evidence", () => {
    const result = calculateGraduationPlan(minorPlan([
      ...completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1"]),
      { courseId: "unknown-future", status: "planned", plannedTerm: "later" },
    ]));

    expect(result.status).toBe("official-review-required");
    expect(result.unplacedCourses).toContainEqual(expect.objectContaining({
      courseId: "unknown-future",
      reason: "offering-unknown",
    }));
  });

  it("preserves the external economics 48-credit document conflict", () => {
    const result = calculateGraduationPlan({
      ...minorPlan(completed([
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "d-1", "d-2",
        "e-1", "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
      ])),
      profile: externalEconomicsProfile,
      targetTrackId: "economics",
    });

    expect(result.status).toBe("official-review-required");
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "document-conflict" }));
  });

  it("reserves one anonymous slot per three elective credits without inventing course IDs", () => {
    const result = calculateGraduationPlan(minorPlan([], {
      maxMajorCoursesPerTerm: 3,
    }));

    expect(result.unallocatedElectiveCredits).toBe(21);
    expect(result.unallocatedElectiveSlots).toBe(7);
    expect(result.placements).toEqual([]);
    expect(result.extraTermPlacements).toEqual([]);
    expect(result.reviewItems).toContainEqual(expect.objectContaining({ code: "elective-placeholder" }));
  });

  it("keeps a useful regular status while warning about historical future offerings", () => {
    const result = calculateGraduationPlan(minorPlan([
      ...completed(["b-1", "b-2", "c-1", "c-2", "c-3", "d-1"]),
      { courseId: "d-2", status: "planned", plannedTerm: "later" },
    ], { maxMajorCoursesPerTerm: 1 }));

    expect(result.status).toBe("regular-plan-possible");
    expect(result.placements.filter((item) => item.courseId === "d-2")).toEqual([
      expect.objectContaining({ origin: "user-planned" }),
    ]);
    expect(result.reviewItems).toContainEqual(expect.objectContaining({
      code: "future-offering",
      message: FUTURE_OFFERING_MESSAGE,
    }));
  });
});
