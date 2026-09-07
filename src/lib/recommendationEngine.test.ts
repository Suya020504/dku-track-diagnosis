import { describe, expect, it } from "vitest";
import { tracks } from "../data/curriculumData";
import type {
  AdditionalMajorCredit,
  CourseSelectionRecord,
  GraduationPlanPreferences,
  InterestSurveyAnswer,
  StudentProfile,
} from "../types";
import { interestSurveyQuestions } from "./interestSurvey";
import {
  buildRecommendationAxes,
  rankTracksByGraduationPlanability,
  rankTracksByProgressAccessibility,
} from "./recommendationEngine";

const generatedAt = "2026-08-30T09:00:00.000Z";
const noAdditionalCredits: AdditionalMajorCredit[] = [];

const externalMinorProfile: StudentProfile = {
  goal: "find-track",
  affiliation: "external-student",
  studyPath: "minor",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "student-confirmed",
};

const departmentAdvancedProfile: StudentProfile = {
  goal: "find-track",
  affiliation: "department-student",
  studyPath: "advanced-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "student-confirmed",
};

const oneTermPreferences: GraduationPlanPreferences = {
  currentTerm: "2026-1",
  targetGraduationTerm: "2026-2",
  maxMajorCoursesPerTerm: 1,
  considerSeasonalTerm: false,
};

const nextFirstTermPreferences: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-1",
  maxMajorCoursesPerTerm: 2,
  considerSeasonalTerm: false,
};

const regionalPlanningWindow: GraduationPlanPreferences = {
  currentTerm: "2026-2",
  targetGraduationTerm: "2027-2",
  maxMajorCoursesPerTerm: 3,
  considerSeasonalTerm: false,
};

function selections(
  courseIds: string[],
  status: CourseSelectionRecord["status"] = "completed",
): CourseSelectionRecord[] {
  return courseIds.map((courseId) => ({ courseId, status }));
}

function foodMarketingAnswers(): Record<string, InterestSurveyAnswer> {
  const answers = Object.fromEntries(
    interestSurveyQuestions.map((question) => [question.id, 3]),
  ) as Record<string, InterestSurveyAnswer>;
  answers["dept-consumer-choice"] = 5;
  answers["dept-brand-strategy"] = 5;
  answers["dept-economic-data"] = 1;
  answers["dept-policy-evidence"] = 1;
  return answers;
}

function economicsAnswers(): Record<string, InterestSurveyAnswer> {
  const answers = Object.fromEntries(
    interestSurveyQuestions.map((question) => [question.id, 3]),
  ) as Record<string, InterestSurveyAnswer>;
  answers["dept-economic-data"] = 5;
  answers["dept-policy-evidence"] = 5;
  answers["dept-consumer-choice"] = 1;
  answers["dept-brand-strategy"] = 1;
  return answers;
}

function closeButNotTiedAnswers(): Record<string, InterestSurveyAnswer> {
  const answers = Object.fromEntries(
    interestSurveyQuestions.map((question) => [question.id, 3]),
  ) as Record<string, InterestSurveyAnswer>;
  answers["dept-consumer-choice"] = 4;
  answers["dept-economic-data"] = 4;
  return answers;
}

const economicsCompleted = selections([
  "b-2", "c-1", "c-2", "c-3", "f-1", "h-1",
  "d-1", "d-2", "e-1", "e-2", "g-1", "g-2", "j-1", "j-2", "l-1", "l-2",
]);

const regionalAlmostComplete = selections([
  "b-2", "c-1", "c-2", "f-1", "h-1",
  "d-1", "d-2", "e-1", "e-2", "h-2", "i-1", "i-2", "k-1",
]);

describe("independent recommendation axes", () => {
  it("builds an interest-only axis without inventing a profile or progress input", () => {
    const result = buildRecommendationAxes({
      profile: undefined as unknown as StudentProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: foodMarketingAnswers(), currentIndex: 9 },
    });

    expect(result.interest?.[0].trackId).toBe("food-marketing");
    expect(result.progress).toEqual([]);
    expect(result.plan).toBeUndefined();
    expect(result.alignedLeaderTrackIds).toEqual([]);
  });

  it("ranks food marketing first on the interest axis", () => {
    const result = buildRecommendationAxes({
      profile: externalMinorProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: foodMarketingAnswers(), currentIndex: 9 },
      generatedAt,
    });

    expect(result.interest?.[0]).toMatchObject({
      trackId: "food-marketing",
      closeLeader: true,
    });
  });

  it("ranks economics first from completed courses only", () => {
    const result = rankTracksByProgressAccessibility({
      profile: departmentAdvancedProfile,
      courseSelections: economicsCompleted,
      additionalMajorCredits: noAdditionalCredits,
    });

    expect(result[0].trackId).toBe("economics");
    expect(result[0].assumption).toBe("track-major-hypothesis");
  });

  it("makes regional development the only regular-plan candidate", () => {
    const result = rankTracksByGraduationPlanability({
      profile: externalMinorProfile,
      courseSelections: regionalAlmostComplete,
      additionalMajorCredits: noAdditionalCredits,
      preferences: nextFirstTermPreferences,
      generatedAt,
    });

    expect(result.filter((candidate) => candidate.status === "regular-plan-possible"))
      .toEqual([expect.objectContaining({ trackId: "regional-development-consulting" })]);
    expect(result[0].trackId).toBe("regional-development-consulting");
  });

  it("keeps three different leaders independent and reports no aligned leader", () => {
    const result = buildRecommendationAxes({
      profile: externalMinorProfile,
      courseSelections: [
        ...economicsCompleted,
        ...selections(["h-3", "i-1", "i-2", "k-1", "k-2", "d-3"], "planned"),
      ],
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: foodMarketingAnswers(), currentIndex: 9 },
      graduationPlanPreferences: regionalPlanningWindow,
      generatedAt,
    });

    expect(result.interest?.[0].trackId).toBe("food-marketing");
    expect(result.progress[0].trackId).toBe("economics");
    expect(result.plan?.[0].trackId).toBe("regional-development-consulting");
    expect(result.alignedLeaderTrackIds).toEqual([]);
  });

  it("propagates a horizon-feasible food-marketing alternative into plan-axis ordering", () => {
    const result = rankTracksByGraduationPlanability({
      profile: externalMinorProfile,
      courseSelections: selections([
        "b-2", "c-1", "c-2", "c-3", "f-1", "h-1", "f-2", "h-2",
        "i-1", "i-2", "j-1", "l-1", "l-2",
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
      generatedAt,
    });

    expect(result[0]).toMatchObject({
      trackId: "food-marketing",
      status: "regular-plan-possible",
      unplacedCourseCount: 0,
    });
  });

  it("includes a track once when it leads at least two available axes", () => {
    const result = buildRecommendationAxes({
      profile: departmentAdvancedProfile,
      courseSelections: economicsCompleted,
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: economicsAnswers(), currentIndex: 9 },
      generatedAt,
    });

    expect(result.alignedLeaderTrackIds).toEqual(["economics"]);
  });

  it("keeps every tied progress leader eligible for cross-axis alignment", () => {
    const result = buildRecommendationAxes({
      profile: departmentAdvancedProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: economicsAnswers(), currentIndex: 9 },
      generatedAt,
    });

    expect(result.progress[0].trackId).toBe("food-marketing");
    expect(result.alignedLeaderTrackIds).toEqual(["economics"]);
  });

  it("keeps a close second visible without treating it as an interest leader", () => {
    const result = buildRecommendationAxes({
      profile: departmentAdvancedProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      interestSurvey: { audience: "department-student", answers: closeButNotTiedAnswers(), currentIndex: 9 },
    });
    const foodMarketing = result.interest?.find(
      (candidate) => candidate.trackId === "food-marketing",
    );
    const economics = result.interest?.find(
      (candidate) => candidate.trackId === "economics",
    );

    expect(foodMarketing).toMatchObject({ score: 61, closeLeader: true });
    expect(economics).toMatchObject({ score: 59, closeLeader: true });
    expect(result.alignedLeaderTrackIds).toEqual(["food-marketing"]);
  });

  it("leaves unavailable optional axes undefined", () => {
    const result = buildRecommendationAxes({
      profile: departmentAdvancedProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      generatedAt,
    });

    expect(result.interest).toBeUndefined();
    expect(result.plan).toBeUndefined();
  });

  it("uses fixed track order for empty completed-input ties and labels non-track comparisons", () => {
    const result = rankTracksByProgressAccessibility({
      profile: departmentAdvancedProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
    });

    expect(result.slice(0, 4).map((candidate) => candidate.trackId))
      .toEqual(tracks.slice(0, 4).map((track) => track.id));
    expect(result.every((candidate) => candidate.assumption === "track-major-hypothesis"))
      .toBe(true);
  });

  it("changes planning but not progress when only in-progress courses are added", () => {
    const base = {
      profile: externalMinorProfile,
      additionalMajorCredits: noAdditionalCredits,
    };
    const withoutInProgress = buildRecommendationAxes({
      ...base,
      courseSelections: [],
      graduationPlanPreferences: oneTermPreferences,
      generatedAt,
    });
    const withInProgress = buildRecommendationAxes({
      ...base,
      courseSelections: [{ courseId: "unknown-current", status: "in-progress" }],
      graduationPlanPreferences: oneTermPreferences,
      generatedAt,
    });

    expect(withInProgress.progress).toEqual(withoutInProgress.progress);
    expect(withInProgress.plan).not.toEqual(withoutInProgress.plan);
    expect(withInProgress.plan?.every((candidate) => candidate.unplacedCourseCount > 0)).toBe(true);
  });

  it("keeps planner inputs deterministic and does not publish aggregate winner fields", () => {
    const first = buildRecommendationAxes({
      profile: externalMinorProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      graduationPlanPreferences: oneTermPreferences,
      generatedAt,
    });
    const second = buildRecommendationAxes({
      profile: externalMinorProfile,
      courseSelections: [],
      additionalMajorCredits: noAdditionalCredits,
      graduationPlanPreferences: oneTermPreferences,
      generatedAt,
    });
    const serialized = JSON.stringify(first);

    expect(second).toEqual(first);
    expect(serialized).not.toMatch(/overallScore|overallRank|balancedScore|aggregateWinner/);
  });
});
