import { courses } from "../data/curriculumData";
import {
  getRequirementRule,
  REQUIRED_COURSE_VARIANTS,
  type RequirementRule,
} from "../data/requirementRules2026";
import type {
  Course,
  CourseCombinationInput,
  MinimumCourseCombination,
  ModuleId,
} from "../types";
import { getTrack, isCourseInTrack } from "./diagnosis";
import { calculatePathProgress } from "./progressEngine";

const courseById = new Map(courses.map((course) => [course.id, course]));

export function calculateUnallocatedElectiveCredits(
  input: CourseCombinationInput,
  selectedCourseIds: string[] = [],
): number {
  const rule = getRequirementRule(input.profile, input.targetTrackId);
  const uniqueKnownAssumedAndSelectedCredits = [...new Set([
    ...input.assumedCourseIds,
    ...selectedCourseIds,
  ])]
    .map((id) => courseById.get(id))
    .filter((course): course is Course => course !== undefined && course.moduleId !== "A")
    .reduce((sum, course) => sum + course.credits, 0);
  const additionalMajorCreditsTotal = input.additionalMajorCredits.reduce(
    (sum, item) => sum + item.credits,
    0,
  );

  return Math.max(
    0,
    rule.totalMajorCredits - uniqueKnownAssumedAndSelectedCredits - additionalMajorCreditsTotal,
  );
}

export function findMinimumCourseCombination(
  input: CourseCombinationInput,
): MinimumCourseCombination {
  const rule = getRequirementRule(input.profile, input.targetTrackId);
  const candidates = applicableCandidateIds(input);
  const assumed = new Set(input.assumedCourseIds);
  const mandatoryIds = requiredMissingCourseIds(rule, assumed);
  const mandatory = new Set(mandatoryIds);
  const optionalIds = candidates.filter((id) => !mandatory.has(id));

  for (let optionalCount = 0; optionalCount <= optionalIds.length; optionalCount += 1) {
    const accepted: MinimumCourseCombination[] = [];
    collectAcceptedCombinations({
      input,
      rule,
      mandatoryIds,
      optionalIds,
      optionalCount,
      accepted,
    });

    if (accepted.length > 0) {
      return accepted.sort(compareCombinations)[0];
    }
  }

  return buildCombination(input, [], false);
}

function applicableCandidateIds(input: CourseCombinationInput): string[] {
  const rule = getRequirementRule(input.profile, input.targetTrackId);
  const required = rule.requiredCourseVariantId
    ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId].courseIds
    : [];
  const trackIds = input.targetTrackId
    ? courses
      .filter((course) => isCourseInTrack(getTrack(input.targetTrackId!), course))
      .map((course) => course.id)
    : [];
  const assumed = new Set(input.assumedCourseIds);

  return [...new Set([...required, ...trackIds])]
    .filter((id) => courseById.has(id) && !assumed.has(id))
    .sort((left, right) => courseById.get(left)!.code.localeCompare(courseById.get(right)!.code));
}

function requiredMissingCourseIds(rule: RequirementRule, assumed: Set<string>): string[] {
  if (!rule.requiredCourseVariantId) return [];

  return REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId].courseIds
    .filter((id) => courseById.has(id) && !assumed.has(id))
    .sort((left, right) => courseById.get(left)!.code.localeCompare(courseById.get(right)!.code));
}

type SearchContext = {
  input: CourseCombinationInput;
  rule: RequirementRule;
  mandatoryIds: string[];
  optionalIds: string[];
  optionalCount: number;
  accepted: MinimumCourseCombination[];
};

function collectAcceptedCombinations(context: SearchContext): void {
  const chosen: string[] = [];
  const baseIds = [...new Set([...context.input.assumedCourseIds, ...context.mandatoryIds])];

  function visit(start: number): void {
    const slotsLeft = context.optionalCount - chosen.length;
    const remainingCount = context.optionalIds.length - start;
    if (slotsLeft < 0 || remainingCount < slotsLeft) return;

    const remainingIds = context.optionalIds.slice(start);
    if (!canStillSatisfyTrack(context.rule, baseIds, chosen, remainingIds, slotsLeft)) return;

    if (slotsLeft === 0) {
      const selectedIds = [...context.mandatoryIds, ...chosen]
        .sort((left, right) => courseById.get(left)!.code.localeCompare(courseById.get(right)!.code));
      if (hardConditionsSatisfied(context.input, selectedIds)) {
        context.accepted.push(buildCombination(context.input, selectedIds, true));
      }
      return;
    }

    const lastStart = context.optionalIds.length - slotsLeft;
    for (let index = start; index <= lastStart; index += 1) {
      chosen.push(context.optionalIds[index]);
      visit(index + 1);
      chosen.pop();
    }
  }

  visit(0);
}

function canStillSatisfyTrack(
  rule: RequirementRule,
  baseIds: string[],
  chosenIds: string[],
  remainingIds: string[],
  slotsLeft: number,
): boolean {
  if (!rule.trackRule) return true;

  const selectedCourses = [...new Set([...baseIds, ...chosenIds])]
    .map((id) => courseById.get(id))
    .filter((course): course is Course => Boolean(course));
  const remainingCourses = remainingIds
    .map((id) => courseById.get(id))
    .filter((course): course is Course => Boolean(course));
  const trackRule = rule.trackRule;

  if (trackRule.type === "major") {
    const minimumNeeded = trackRule.moduleIds.reduce((sum, moduleId) => {
      return sum + minimumCoursesNeeded(
        creditsForModules(selectedCourses, [moduleId]),
        trackRule.creditsPerModule,
        remainingCourses.filter((course) => course.moduleId === moduleId),
      );
    }, 0);
    return Number.isFinite(minimumNeeded) && minimumNeeded <= slotsLeft;
  }

  const baseModuleMinimum = trackRule.baseModuleIds.reduce((sum, moduleId) => {
    return sum + minimumCoursesNeeded(
      creditsForModules(selectedCourses, [moduleId]),
      trackRule.creditsPerBaseModule,
      remainingCourses.filter((course) => course.moduleId === moduleId),
    );
  }, 0);
  const baseTotalMinimum = minimumCoursesNeeded(
    creditsForModules(selectedCourses, trackRule.baseModuleIds),
    trackRule.baseCreditsTotal,
    remainingCourses.filter((course) => trackRule.baseModuleIds.includes(course.moduleId as "F" | "H" | "I")),
  );
  const moduleMMinimum = minimumCoursesNeeded(
    creditsForModules(selectedCourses, ["M"]),
    trackRule.moduleMCredits,
    remainingCourses.filter((course) => course.moduleId === "M"),
  );
  const moduleNOMinimum = minimumCoursesNeeded(
    creditsForModules(selectedCourses, ["N", "O"]),
    trackRule.moduleNOCredits,
    remainingCourses.filter((course) => course.moduleId === "N" || course.moduleId === "O"),
  );
  const minimumNeeded = Math.max(baseModuleMinimum, baseTotalMinimum) + moduleMMinimum + moduleNOMinimum;

  return Number.isFinite(minimumNeeded) && minimumNeeded <= slotsLeft;
}

function minimumCoursesNeeded(
  currentCredits: number,
  requiredCredits: number,
  remainingCourses: Course[],
): number {
  let missing = Math.max(0, requiredCredits - currentCredits);
  if (missing === 0) return 0;

  const creditsDescending = remainingCourses
    .map((course) => course.credits)
    .sort((left, right) => right - left);
  for (let index = 0; index < creditsDescending.length; index += 1) {
    missing -= creditsDescending[index];
    if (missing <= 0) return index + 1;
  }
  return Number.POSITIVE_INFINITY;
}

function creditsForModules(selectedCourses: Course[], moduleIds: ModuleId[]): number {
  return selectedCourses
    .filter((course) => moduleIds.includes(course.moduleId))
    .reduce((sum, course) => sum + course.credits, 0);
}

function hardConditionsSatisfied(input: CourseCombinationInput, selectedIds: string[]): boolean {
  const progress = calculatePathProgress({
    profile: input.profile,
    courseSelections: [...new Set([...input.assumedCourseIds, ...selectedIds])]
      .map((courseId) => ({ courseId, status: "completed" as const })),
    additionalMajorCredits: input.additionalMajorCredits,
    targetTrackId: input.targetTrackId,
  });
  const requiredSatisfied = progress.requiredProgress === "not-applicable"
    || progress.requiredProgress.missingCredits === 0;
  const trackSatisfied = progress.trackProgress === "not-applicable"
    || progress.trackProgress.moduleProgress.every((module) => module.missingCredits === 0);

  return requiredSatisfied && trackSatisfied;
}

function buildCombination(
  input: CourseCombinationInput,
  courseIds: string[],
  hardConditionsSatisfiedValue: boolean,
): MinimumCourseCombination {
  const selectedCourses = courseIds.map((id) => courseById.get(id)!);
  const newCredits = selectedCourses.reduce((sum, course) => sum + course.credits, 0);
  const unschedulableCount = courseIds.filter((id) => !input.schedulableCourseIds.has(id)).length;
  const recommendedRankSum = selectedCourses.reduce(
    (sum, course) => sum + recommendedSemesterRank(course.recommendedSemester),
    0,
  );
  const commaJoinedCourseCodes = selectedCourses.map((course) => course.code).sort().join(",");
  const newCourseCount = courseIds.length;

  return {
    courseIds,
    newCourseCount,
    newCredits,
    unallocatedElectiveCredits: calculateUnallocatedElectiveCredits(input, courseIds),
    hardConditionsSatisfied: hardConditionsSatisfiedValue,
    comparisonKey: `${newCourseCount}|${newCredits}|${unschedulableCount}|${recommendedRankSum}|${commaJoinedCourseCodes}`,
  };
}

function compareCombinations(left: MinimumCourseCombination, right: MinimumCourseCombination): number {
  const leftParts = parseComparisonKey(left.comparisonKey);
  const rightParts = parseComparisonKey(right.comparisonKey);

  return left.newCredits - right.newCredits
    || leftParts.unschedulableCount - rightParts.unschedulableCount
    || leftParts.recommendedRankSum - rightParts.recommendedRankSum
    || leftParts.courseCodes.localeCompare(rightParts.courseCodes);
}

function parseComparisonKey(comparisonKey: string): {
  unschedulableCount: number;
  recommendedRankSum: number;
  courseCodes: string;
} {
  const [, , unschedulableCount, recommendedRankSum, courseCodes] = comparisonKey.split("|");
  return {
    unschedulableCount: Number(unschedulableCount),
    recommendedRankSum: Number(recommendedRankSum),
    courseCodes,
  };
}

function recommendedSemesterRank(semester?: string): number {
  if (!semester) return 99;
  const [year, term] = semester.split("-").map(Number);
  return year * 10 + term;
}
