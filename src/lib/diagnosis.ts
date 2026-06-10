import { courses, modules, tracks } from "../data/curriculumData";
import type {
  Course,
  DiagnosisInput,
  DiagnosisResult,
  EnrollmentType,
  ModuleId,
  ModuleProgress,
  Track,
  TrackDiagnosisResult,
  TrackId,
  TrackRecommendation,
  TrackRecommendationStatus,
} from "../types";

const courseById = new Map(courses.map((course) => [course.id, course]));
const moduleById = new Map(modules.map((module) => [module.id, module]));
const trackById = new Map(tracks.map((track) => [track.id, track]));

export function calculateDiagnosis(input: DiagnosisInput): DiagnosisResult {
  const selectedTrackIds = uniqueTrackIds(input.trackIds);
  const enrollmentType = input.enrollmentType ?? "primary";
  const completedIds = uniqueKnownCourseIds(input.completedCourseIds);
  const completedCourses = completedIds.map((id) => courseById.get(id)!);
  const completedIdSet = new Set(completedIds);
  const requiredCourses = getRequiredCourses(enrollmentType);
  const excludedRequiredCourses = getExcludedRequiredCourses(enrollmentType);
  if (selectedTrackIds.length === 0) {
    return {
      selectedTrackIds: [],
      enrollmentType,
      passed: false,
      totalCredits: completedCourses.reduce((sum, course) => sum + course.credits, 0),
      trackCredits: 0,
      requiredCreditsCompleted: requiredCourses
        .filter((course) => completedIdSet.has(course.id))
        .reduce((sum, course) => sum + course.credits, 0),
      requiredCreditsTotal: requiredCourses.reduce((sum, course) => sum + course.credits, 0),
      missingRequiredCourses: [],
      excludedRequiredCourses,
      moduleProgress: [],
      recommendedCourses: [],
      remainingCourses: [],
      completionRate: 0,
      trackResults: [],
    };
  }

  const trackResults = selectedTrackIds.map((trackId) =>
    calculateTrackDiagnosis(getTrack(trackId), completedIdSet, enrollmentType),
  );
  const aggregateTrackCourseIds = new Set(
    trackResults.flatMap((trackResult) =>
      trackResult.moduleProgress.flatMap((progress) => progress.courseIds),
    ),
  );
  const trackCredits = completedCourses
    .filter((course) => aggregateTrackCourseIds.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  const missingRequiredCourses = requiredCourses.filter((course) => !completedIdSet.has(course.id));
  const totalCredits = completedCourses.reduce((sum, course) => sum + course.credits, 0);
  const passed = trackResults.every((trackResult) => trackResult.passed);
  const moduleProgress = flattenModuleProgress(trackResults);
  const remainingCourses = uniqueCourses(trackResults.flatMap((trackResult) => trackResult.remainingCourses));
  const recommendedCourses = uniqueCourses(trackResults.flatMap((trackResult) => trackResult.recommendedCourses))
    .sort(compareCoursesForRecommendation)
    .slice(0, 14);
  const denominator =
    selectedTrackIds.length * requiredCourses.reduce((sum, course) => sum + course.credits, 0) +
    selectedTrackIds.reduce((sum, trackId) => sum + getTrack(trackId).rule.totalTrackCredits, 0);
  const progressNumerator = trackResults.reduce(
    (sum, trackResult) =>
      sum +
      Math.round(
        ((trackResult.completionRate / 100) *
          (getTrack(trackResult.trackId).rule.totalTrackCredits +
            requiredCourses.reduce((requiredSum, course) => requiredSum + course.credits, 0))),
      ),
    0,
  );
  const completionRate = Math.min(100, Math.round((progressNumerator / denominator) * 100));

  return {
    selectedTrackIds,
    enrollmentType,
    passed,
    totalCredits,
    trackCredits,
    requiredCreditsCompleted:
      requiredCourses
        .filter((course) => completedIdSet.has(course.id))
        .reduce((sum, course) => sum + course.credits, 0),
    requiredCreditsTotal: requiredCourses.reduce((sum, course) => sum + course.credits, 0),
    missingRequiredCourses,
    excludedRequiredCourses,
    moduleProgress,
    recommendedCourses,
    remainingCourses,
    completionRate,
    trackResults,
  };
}

export function calculateTrackRecommendations(
  input: Pick<DiagnosisInput, "completedCourseIds" | "enrollmentType">,
): TrackRecommendation[] {
  const enrollmentType = input.enrollmentType ?? "primary";
  const completedIds = uniqueKnownCourseIds(input.completedCourseIds);
  const completedIdSet = new Set(completedIds);

  return tracks
    .map((track) => {
      const trackResult = calculateTrackDiagnosis(track, completedIdSet, enrollmentType);
      const missingModuleCredits = trackResult.moduleProgress.reduce(
        (sum, progress) => sum + progress.missingCredits,
        0,
      );
      const missingRequiredCredits = trackResult.missingRequiredCourses.reduce(
        (sum, course) => sum + course.credits,
        0,
      );
      const missingModuleLabels = trackResult.moduleProgress
        .filter((progress) => progress.missingCredits > 0)
        .map((progress) => progress.label);
      const matchedModuleLabels = trackResult.moduleProgress
        .filter((progress) => progress.completedCredits > 0)
        .map((progress) => progress.label);
      const missingTotalCredits = missingModuleCredits + missingRequiredCredits;

      return {
        rank: 0,
        trackId: trackResult.trackId,
        trackName: trackResult.trackName,
        trackKind: trackResult.trackKind,
        passed: trackResult.passed,
        completionRate: trackResult.completionRate,
        trackCredits: trackResult.trackCredits,
        missingModuleCredits,
        missingTotalCredits,
        missingModuleCount: missingModuleLabels.length,
        missingRequiredCount: trackResult.missingRequiredCourses.length,
        remainingCourseCount: trackResult.remainingCourses.length,
        matchedModuleLabels,
        missingModuleLabels,
        recommendedCourses: trackResult.recommendedCourses,
        status: getRecommendationStatus(trackResult.passed, trackResult.completionRate, missingTotalCredits),
      };
    })
    .sort(compareTrackRecommendations)
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1,
    }));
}

export function isRequiredCourseApplicable(course: Course, enrollmentType: EnrollmentType): boolean {
  if (!course.required) return false;
  if (enrollmentType === "primary") return true;
  return getRecommendedGrade(course) !== 1;
}

export function getRequiredCourses(enrollmentType: EnrollmentType): Course[] {
  return courses.filter((course) => isRequiredCourseApplicable(course, enrollmentType));
}

export function getTrack(trackId: Track["id"]): Track {
  const track = trackById.get(trackId);
  if (!track) {
    throw new Error(`Unknown track id: ${trackId}`);
  }
  return track;
}

export function getTracks(trackIds: TrackId[]): Track[] {
  return uniqueTrackIds(trackIds).map((trackId) => getTrack(trackId));
}

export function getCoursesByModule(moduleId: ModuleId): Course[] {
  return courses.filter((course) => course.moduleId === moduleId);
}

export function getModuleLabel(moduleId: ModuleId): string {
  const module = moduleById.get(moduleId);
  return module ? `${module.id}. ${module.name}` : moduleId;
}

export function isCourseInTrack(track: Track, course: Course): boolean {
  if (track.rule.type === "major") {
    return track.rule.moduleIds.includes(course.moduleId);
  }
  return (
    track.rule.baseModuleIds.includes(course.moduleId) ||
    track.rule.convergenceRequirements.some((requirement) =>
      requirement.moduleIds.includes(course.moduleId),
    )
  );
}

export function isCourseInAnyTrack(trackIds: TrackId[], course: Course): boolean {
  return getTracks(trackIds).some((track) => isCourseInTrack(track, course));
}

export function isModuleInAnyTrack(trackIds: TrackId[], moduleId: ModuleId): boolean {
  return courses
    .filter((course) => course.moduleId === moduleId)
    .some((course) => isCourseInAnyTrack(trackIds, course));
}

function calculateTrackDiagnosis(
  track: Track,
  completedIdSet: Set<string>,
  enrollmentType: EnrollmentType,
): TrackDiagnosisResult {
  const completedCourses = [...completedIdSet].map((id) => courseById.get(id)!);
  const moduleProgress = calculateModuleProgress(track, completedIdSet);
  const trackCourseIds = new Set(moduleProgress.flatMap((progress) => progress.courseIds));
  const trackCredits = completedCourses
    .filter((course) => trackCourseIds.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  const requiredCourses = getRequiredCourses(enrollmentType);
  const excludedRequiredCourses = getExcludedRequiredCourses(enrollmentType);
  const missingRequiredCourses = requiredCourses.filter((course) => !completedIdSet.has(course.id));
  const moduleRequirementsPassed = moduleProgress.every((progress) => progress.missingCredits === 0);
  const requiredPassed = missingRequiredCourses.length === 0;
  const denominator =
    track.rule.totalTrackCredits + requiredCourses.reduce((sum, course) => sum + course.credits, 0);
  const progressNumerator =
    moduleProgress.reduce(
      (sum, progress) => sum + Math.min(progress.completedCredits, progress.requiredCredits),
      0,
    ) +
    requiredCourses
      .filter((course) => completedIdSet.has(course.id))
      .reduce((sum, course) => sum + course.credits, 0);

  return {
    trackId: track.id,
    trackName: track.name,
    trackKind: track.kind,
    enrollmentType,
    passed: moduleRequirementsPassed && requiredPassed,
    trackCredits,
    missingRequiredCourses,
    excludedRequiredCourses,
    moduleProgress,
    recommendedCourses: recommendCourses(track, completedIdSet, missingRequiredCourses, moduleProgress),
    remainingCourses: getRemainingTrackCourses(track, completedIdSet, requiredCourses),
    completionRate: Math.min(100, Math.round((progressNumerator / denominator) * 100)),
  };
}

function calculateModuleProgress(track: Track, completedIdSet: Set<string>): ModuleProgress[] {
  const rule = track.rule;

  if (rule.type === "major") {
    return rule.moduleIds.map((moduleId) =>
      moduleProgressForModules(
        [moduleId],
        getModuleLabel(moduleId),
        rule.requiredCreditsPerModule,
        completedIdSet,
      ),
    );
  }

  const baseProgress = rule.baseModuleIds.map((moduleId) =>
    moduleProgressForModules(
      [moduleId],
      getModuleLabel(moduleId),
      rule.requiredCreditsPerBaseModule,
      completedIdSet,
    ),
  );
  const baseTotal = moduleProgressForModules(
    rule.baseModuleIds,
    "F/H/I 학과 모듈 합산",
    rule.requiredBaseCreditsTotal,
    completedIdSet,
  );
  const convergence = rule.convergenceRequirements.map((requirement) =>
    moduleProgressForModules(
      requirement.moduleIds,
      requirement.label,
      requirement.requiredCredits,
      completedIdSet,
    ),
  );

  return [...baseProgress, baseTotal, ...convergence];
}

function moduleProgressForModules(
  moduleIds: ModuleId[],
  label: string,
  requiredCredits: number,
  completedIdSet: Set<string>,
): ModuleProgress {
  const courseIds = courses
    .filter((course) => moduleIds.includes(course.moduleId))
    .map((course) => course.id);
  const completedCredits = courses
    .filter((course) => courseIds.includes(course.id) && completedIdSet.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);

  return {
    moduleId: moduleIds.length === 2 ? "N+O" : moduleIds[0],
    label,
    requiredCredits,
    completedCredits,
    missingCredits: Math.max(0, requiredCredits - completedCredits),
    courseIds,
  };
}

function getRemainingTrackCourses(
  track: Track,
  completedIdSet: Set<string>,
  requiredCourses: Course[],
): Course[] {
  const requiredCourseIds = new Set(requiredCourses.map((course) => course.id));
  return courses
    .filter((course) => isCourseInTrack(track, course) || requiredCourseIds.has(course.id))
    .filter((course) => !completedIdSet.has(course.id));
}

function recommendCourses(
  track: Track,
  completedIdSet: Set<string>,
  missingRequiredCourses: Course[],
  moduleProgress: ModuleProgress[],
): Course[] {
  const recommendations = new Map<string, Course>();
  missingRequiredCourses.forEach((course) => recommendations.set(course.id, course));

  moduleProgress
    .filter((progress) => progress.missingCredits > 0)
    .forEach((progress) => {
      progress.courseIds
        .map((id) => courseById.get(id)!)
        .filter((course) => !completedIdSet.has(course.id))
        .sort(compareCoursesForRecommendation)
        .slice(0, 2)
        .forEach((course) => recommendations.set(course.id, course));
    });

  return [...recommendations.values()]
    .filter((course) => course.required || isCourseInTrack(track, course))
    .sort(compareCoursesForRecommendation)
    .slice(0, 10);
}

function compareCoursesForRecommendation(a: Course, b: Course): number {
  if (a.required !== b.required) {
    return a.required ? -1 : 1;
  }
  return semesterRank(a.recommendedSemester) - semesterRank(b.recommendedSemester) || a.code.localeCompare(b.code);
}

function semesterRank(semester?: string): number {
  if (!semester) return 99;
  const [year, term] = semester.split("-").map(Number);
  return year * 10 + term;
}

function getExcludedRequiredCourses(enrollmentType: EnrollmentType): Course[] {
  return courses.filter((course) => course.required && !isRequiredCourseApplicable(course, enrollmentType));
}

function getRecommendedGrade(course: Course): number | undefined {
  if (!course.recommendedSemester) return undefined;
  const [grade] = course.recommendedSemester.split("-").map(Number);
  return Number.isFinite(grade) ? grade : undefined;
}

function uniqueKnownCourseIds(courseIds: string[]): string[] {
  return [...new Set(courseIds)].filter((id) => courseById.has(id));
}

function uniqueTrackIds(trackIds: TrackId[]): TrackId[] {
  const known = trackIds.filter((id) => trackById.has(id));
  return [...new Set(known)];
}

function uniqueCourses(courseList: Course[]): Course[] {
  return [...new Map(courseList.map((course) => [course.id, course])).values()];
}

function flattenModuleProgress(trackResults: TrackDiagnosisResult[]): ModuleProgress[] {
  if (trackResults.length === 1) {
    return trackResults[0].moduleProgress;
  }

  return trackResults.flatMap((trackResult) =>
    trackResult.moduleProgress.map((progress) => ({
      ...progress,
      label: `${trackResult.trackName} · ${progress.label}`,
    })),
  );
}

function getRecommendationStatus(
  passed: boolean,
  completionRate: number,
  missingTotalCredits: number,
): TrackRecommendationStatus {
  if (passed) return "ready";
  if (completionRate >= 75 || missingTotalCredits <= 9) return "close";
  if (completionRate >= 50 || missingTotalCredits <= 18) return "possible";
  return "long-term";
}

function compareTrackRecommendations(a: TrackRecommendation, b: TrackRecommendation): number {
  if (a.passed !== b.passed) return a.passed ? -1 : 1;
  return (
    a.missingTotalCredits - b.missingTotalCredits ||
    a.missingModuleCount - b.missingModuleCount ||
    a.missingRequiredCount - b.missingRequiredCount ||
    b.completionRate - a.completionRate ||
    a.remainingCourseCount - b.remainingCourseCount ||
    a.trackName.localeCompare(b.trackName)
  );
}
