import { courseOfferings2026 } from "../data/courseOfferings2026";
import { tracks } from "../data/curriculumData";
import type {
  AdditionalMajorCredit,
  CourseSelectionRecord,
  GraduationPlanPreferences,
  InterestAxisCandidate,
  InterestSurveyState,
  PlanAxisCandidate,
  ProgressAxisCandidate,
  RecommendationAxes,
  StudentProfile,
  TrackId,
} from "../types";
import { findMinimumCourseCombination } from "./courseCombination";
import { calculateGraduationPlan } from "./graduationPlanner";
import {
  CLOSE_INTEREST_SCORE_GAP,
  isInterestSurveyComplete,
  scoreInterestSurvey,
} from "./interestSurvey";
import { calculatePathProgress } from "./progressEngine";

type RecommendationBaseInput = {
  profile: StudentProfile;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
};

export type ProgressAccessibilityInput = RecommendationBaseInput;

export type GraduationPlanabilityInput = RecommendationBaseInput & {
  preferences: GraduationPlanPreferences;
  generatedAt: string;
};

type RecommendationAxesBaseInput = {
  profile?: StudentProfile;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  interestSurvey?: InterestSurveyState;
};

export type RecommendationAxesInput = RecommendationAxesBaseInput
  & (
    | {
        graduationPlanPreferences: GraduationPlanPreferences;
        generatedAt: string;
      }
    | {
        graduationPlanPreferences?: undefined;
        generatedAt?: string;
      }
  );

const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));
const schedulableCourseIds = new Set(
  Object.values(courseOfferings2026)
    .filter((record) => record.evidence !== "unknown")
    .map((record) => record.courseId),
);
const planStatusOrder = new Map([
  "currently-satisfied",
  "regular-plan-possible",
  "load-adjustment-needed",
  "extra-term-possible",
  "official-review-required",
].map((status, index) => [status, index]));

export function rankTracksByProgressAccessibility(
  input: ProgressAccessibilityInput,
): ProgressAxisCandidate[] {
  const profile = comparisonProfile(input.profile);
  const completedSelections = input.courseSelections.filter((item) => item.status === "completed");
  const assumedCourseIds = [...new Set(completedSelections.map((item) => item.courseId))];

  return tracks
    .map((track) => {
      const combination = findMinimumCourseCombination({
        profile,
        targetTrackId: track.id,
        assumedCourseIds,
        additionalMajorCredits: input.additionalMajorCredits,
        schedulableCourseIds,
      });
      const progress = calculatePathProgress({
        profile,
        targetTrackId: track.id,
        courseSelections: completedSelections,
        additionalMajorCredits: input.additionalMajorCredits,
      });
      const missingModuleLabels = progress.trackProgress === "not-applicable"
        ? []
        : progress.trackProgress.moduleProgress
          .filter((module) => module.missingCredits > 0)
          .map((module) => module.label);

      return {
        trackId: track.id,
        missingCourseCount:
          combination.newCourseCount + Math.ceil(combination.unallocatedElectiveCredits / 3),
        missingCredits: combination.newCredits + combination.unallocatedElectiveCredits,
        missingModuleLabels,
        assumption: comparisonAssumption(input.profile),
      };
    })
    .sort(compareProgressCandidates);
}

export function rankTracksByGraduationPlanability(
  input: GraduationPlanabilityInput,
): PlanAxisCandidate[] {
  const profile = comparisonProfile(input.profile);

  return tracks
    .map((track) => {
      const result = calculateGraduationPlan({
        profile,
        targetTrackId: track.id,
        courseSelections: input.courseSelections,
        additionalMajorCredits: input.additionalMajorCredits,
        preferences: input.preferences,
        generatedAt: input.generatedAt,
      });

      return {
        trackId: track.id,
        status: result.status,
        unplacedCourseCount: result.unplacedCourses.length,
        neededExtraTerms: result.neededExtraTerms,
        assumption: comparisonAssumption(input.profile),
      };
    })
    .sort(comparePlanCandidates);
}

export function buildRecommendationAxes(
  input: RecommendationAxesInput,
): RecommendationAxes {
  const interest = input.interestSurvey
    && isInterestSurveyComplete(input.interestSurvey.answers)
    ? buildInterestAxis(input.interestSurvey)
    : undefined;
  const progress = input.profile ? rankTracksByProgressAccessibility({
    profile: input.profile,
    courseSelections: input.courseSelections,
    additionalMajorCredits: input.additionalMajorCredits,
  }) : [];
  const plan = input.profile && input.graduationPlanPreferences
    ? rankTracksByGraduationPlanability({
        profile: input.profile,
        courseSelections: input.courseSelections,
        additionalMajorCredits: input.additionalMajorCredits,
        preferences: input.graduationPlanPreferences,
        generatedAt: input.generatedAt,
      })
    : undefined;

  return {
    interest,
    progress,
    plan,
    alignedLeaderTrackIds: findAlignedLeaderTrackIds(interest, progress, plan),
  };
}

function buildInterestAxis(state: InterestSurveyState): InterestAxisCandidate[] {
  const results = scoreInterestSurvey(state.answers);
  const topScore = results[0]?.score;

  return results.map((result) => ({
    trackId: result.trackId,
    score: result.score,
    closeLeader: topScore !== undefined && topScore - result.score <= CLOSE_INTEREST_SCORE_GAP,
    reasons: result.reasons,
  }));
}

function comparisonProfile(profile: StudentProfile): StudentProfile {
  if (profile.studyPath === "track-major") return profile;
  return { ...profile, studyPath: "track-major", ruleApplicability: "reference-only" };
}

function comparisonAssumption(
  profile: StudentProfile,
): ProgressAxisCandidate["assumption"] {
  return profile.studyPath === "track-major" ? "current-path" : "track-major-hypothesis";
}

function compareProgressCandidates(
  left: ProgressAxisCandidate,
  right: ProgressAxisCandidate,
): number {
  return compareProgressLeaderMetrics(left, right)
    || trackIndex(left.trackId) - trackIndex(right.trackId);
}

function compareProgressLeaderMetrics(
  left: ProgressAxisCandidate,
  right: ProgressAxisCandidate,
): number {
  return left.missingCourseCount - right.missingCourseCount
    || left.missingCredits - right.missingCredits
    || left.missingModuleLabels.length - right.missingModuleLabels.length;
}

function comparePlanCandidates(left: PlanAxisCandidate, right: PlanAxisCandidate): number {
  return comparePlanLeaderMetrics(left, right)
    || trackIndex(left.trackId) - trackIndex(right.trackId);
}

function comparePlanLeaderMetrics(left: PlanAxisCandidate, right: PlanAxisCandidate): number {
  return (planStatusOrder.get(left.status) ?? Number.MAX_SAFE_INTEGER)
    - (planStatusOrder.get(right.status) ?? Number.MAX_SAFE_INTEGER)
    || left.unplacedCourseCount - right.unplacedCourseCount
    || left.neededExtraTerms - right.neededExtraTerms;
}

export function findAlignedLeaderTrackIds(
  interest: InterestAxisCandidate[] | undefined,
  progress: ProgressAxisCandidate[],
  plan: PlanAxisCandidate[] | undefined,
): TrackId[] {
  const leaderGroups: TrackId[][] = [];
  if (interest && interest.length > 0) {
    leaderGroups.push(
      interest
        .filter((candidate) => candidate.score === interest[0].score)
        .map((candidate) => candidate.trackId),
    );
  }
  if (progress.length > 0) {
    leaderGroups.push(
      progress
        .filter((candidate) => compareProgressLeaderMetrics(candidate, progress[0]) === 0)
        .map((candidate) => candidate.trackId),
    );
  }
  if (plan && plan.length > 0) {
    leaderGroups.push(
      plan
        .filter((candidate) => comparePlanLeaderMetrics(candidate, plan[0]) === 0)
        .map((candidate) => candidate.trackId),
    );
  }

  const leadingAxisCounts = new Map<TrackId, number>();
  leaderGroups.forEach((group) => {
    group.forEach((trackId) => {
      leadingAxisCounts.set(trackId, (leadingAxisCounts.get(trackId) ?? 0) + 1);
    });
  });

  return tracks
    .map((track) => track.id)
    .filter((trackId) => (leadingAxisCounts.get(trackId) ?? 0) >= 2);
}

function trackIndex(trackId: TrackId): number {
  return trackOrder.get(trackId) ?? Number.MAX_SAFE_INTEGER;
}
