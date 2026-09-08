import { courses, modules, tracks } from "../data/curriculumData";
import type { CourseSelectionRecord, CourseSelectionStatus, ModuleId, Track, TrackId } from "../types";

const courseById = new Map(courses.map((course) => [course.id, course]));
const moduleById = new Map(modules.map((module) => [module.id, module]));
const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));

export const TRACK_COMPLETION_ASSUMPTIONS = [
  "2026 교육과정의 트랙 모듈 학점 조건만 계산합니다. 모듈 내 필수 18학점, 학번별 전공필수, 전체 전공 63·42학점과 졸업 가능 여부는 각각 별도로 확인해야 합니다.",
  "과목의 필수 표식은 모듈 내 필수에 관한 표시이며 학번별 전공필수와 다릅니다. 이 계산은 트랙 모듈 학점만 비교하므로 이미 학점을 충족했다면 해당 표식만으로 과목을 추가하지 않습니다.",
  "선택 트랙 사이에서 겹치는 과목은 한 번 수강하는 것으로 참고 계산합니다. 실제 복수 트랙 인정과 학번별 적용은 학과 확인이 필요합니다.",
  "이수 완료만 현재 진도에 반영합니다. 수강 중 미리보기는 해당 과목을 통과한다고 가정하며 수강 예정은 이수로 세지 않습니다.",
  "과목 수, 학점, 과목 코드 순으로 조합을 선택합니다. 개설 학기·선수 과목·시간표·정원은 이 계산에서 확인하지 않습니다.",
] as const;

export type TrackCompletionInput = {
  selectedTrackIds: readonly TrackId[];
  courseSelections: readonly CourseSelectionRecord[];
  includeInProgress?: boolean;
};

export type TrackModuleCompletionProgress = {
  key: string;
  moduleIds: ModuleId[];
  label: string;
  requiredCredits: number;
  completedCredits: number;
  creditedCredits: number;
  missingCredits: number;
  /** A prerequisite within a parent total; never add it to the 30-credit gauge again. */
  isSubconstraint: boolean;
  courseIds: string[];
  completedCourseIds: string[];
};

export type TrackCompletionCandidate = {
  trackId: TrackId;
  trackName: string;
  /** All eligible module credits, including surplus; not a module-mandatory or degree total. */
  earnedCredits: number;
  /** Credits allocated to the track's conditions, capped at its target. */
  creditedCredits: number;
  requiredCredits: number;
  missingCredits: number;
  completionRate: number;
  satisfied: boolean;
  canCompleteWithKnownCourses: boolean;
  moduleProgress: TrackModuleCompletionProgress[];
  remainingCourseIds: string[];
  remainingCourseCount: number;
  remainingCredits: number;
};

export type TrackSuggestedCourse = {
  courseId: string;
  credits: number;
  moduleId: ModuleId;
  /** Selected targets whose currently unmet constraints this course contributes to. */
  selectedTrackIds: TrackId[];
  /** All catalogue tracks containing the course's module; not a claim of completion. */
  allTrackIds: TrackId[];
  currentStatus?: CourseSelectionStatus;
};

export type TrackDiscoveryCandidate = TrackCompletionCandidate & {
  /** Extra courses after keeping the selected targets' chosen union plan fixed. */
  additionalCourseIds: string[];
  additionalCourseCount: number;
  additionalCredits: number;
};

export type TrackCompletionScenario = {
  basis: "completed" | "completed-plus-in-progress";
  assumedCourseIds: string[];
  trackResults: TrackCompletionCandidate[];
  satisfied: boolean;
  canCompleteWithKnownCourses: boolean;
  unionRemainingCourseIds: string[];
  unionRemainingCourseCount: number;
  unionRemainingCredits: number;
  suggestedCourses: TrackSuggestedCourse[];
  /** All five tracks ranked by remaining module-course count, credits, catalogue order. */
  recommendations: TrackCompletionCandidate[];
  discoveryCandidates: TrackDiscoveryCandidate[];
};

export type TrackCompletionResult = {
  selectedTrackIds: TrackId[];
  completed: TrackCompletionScenario;
  inProgressPreview?: TrackCompletionScenario;
  ignoredCourseIds: string[];
  assumptions: string[];
};

/**
 * Validates saved shape and internal relationships, not current curriculum math.
 * Historical amounts/requirements are preserved; never call the live solver here.
 */
export function isTrackCompletionScenario(value: unknown): value is TrackCompletionScenario {
  try {
    if (!snapshotRecord(value)
      || (value.basis !== "completed" && value.basis !== "completed-plus-in-progress")
      || !snapshotCourseIds(value.assumedCourseIds)
      || !snapshotCourseIds(value.unionRemainingCourseIds)
      || !snapshotNumber(value.unionRemainingCourseCount) || !snapshotNumber(value.unionRemainingCredits)
      || value.unionRemainingCourseCount !== value.unionRemainingCourseIds.length
      || typeof value.satisfied !== "boolean" || typeof value.canCompleteWithKnownCourses !== "boolean"
      || !Array.isArray(value.trackResults) || value.trackResults.length > tracks.length
      || !Array.isArray(value.recommendations) || value.recommendations.length !== tracks.length
      || !Array.isArray(value.discoveryCandidates) || value.discoveryCandidates.length > tracks.length
      || !Array.isArray(value.suggestedCourses) || value.suggestedCourses.length !== value.unionRemainingCourseCount) return false;
    const assumed = new Set(value.assumedCourseIds);
    if (value.unionRemainingCourseIds.some((id) => assumed.has(id))
      || !value.trackResults.every((item) => snapshotCandidate(item, assumed))
      || !value.recommendations.every((item) => snapshotCandidate(item, assumed))) return false;
    const results = value.trackResults as TrackCompletionCandidate[];
    const recommendations = value.recommendations as TrackCompletionCandidate[];
    const selected = results.map((item) => item.trackId);
    if (new Set(selected).size !== selected.length
      || new Set(recommendations.map((item) => item.trackId)).size !== tracks.length
      || value.satisfied !== (results.length > 0 && results.every((item) => item.satisfied))) return false;
    const recommendationById = new Map(recommendations.map((item) => [item.trackId, item]));
    if (results.some((candidate) => !sameSnapshotCandidate(candidate, recommendationById.get(candidate.trackId)!))) return false;

    const union = new Set(value.unionRemainingCourseIds);
    const suggestedIds = new Set<string>();
    let suggestedCredits = 0;
    for (const raw of value.suggestedCourses) {
      if (!snapshotRecord(raw) || typeof raw.courseId !== "string" || !union.has(raw.courseId)
        || suggestedIds.has(raw.courseId) || !snapshotNumber(raw.credits) || raw.credits <= 0
        || !moduleById.has(raw.moduleId as ModuleId) || !snapshotTrackIds(raw.selectedTrackIds)
        || !snapshotTrackIds(raw.allTrackIds) || raw.selectedTrackIds.length === 0
        || !raw.selectedTrackIds.every((id) => selected.includes(id) && (raw.allTrackIds as TrackId[]).includes(id))
        || (raw.currentStatus !== undefined && raw.currentStatus !== "completed"
          && raw.currentStatus !== "in-progress" && raw.currentStatus !== "planned")) return false;
      suggestedIds.add(raw.courseId);
      suggestedCredits += raw.credits;
      if (!raw.selectedTrackIds.every((id) => results.find((result) => result.trackId === id)!
        .moduleProgress.some((progress) => progress.courseIds.includes(raw.courseId as string)))) return false;
    }
    if (suggestedCredits !== value.unionRemainingCredits || suggestedIds.size !== union.size) return false;
    const discoveries = value.discoveryCandidates;
    if (discoveries.length !== tracks.length - selected.length) return false;
    const discoveryIds = new Set<TrackId>();
    for (const raw of discoveries) {
      if (!snapshotCandidate(raw, assumed) || selected.includes(raw.trackId) || discoveryIds.has(raw.trackId)) return false;
      const item = raw as TrackDiscoveryCandidate;
      if (!snapshotCourseIds(item.additionalCourseIds) || !snapshotNumber(item.additionalCourseCount)
        || !snapshotNumber(item.additionalCredits) || item.additionalCourseCount !== item.additionalCourseIds.length
        || (item.additionalCourseCount === 0) !== (item.additionalCredits === 0)
        || item.additionalCourseIds.some((id) => assumed.has(id) || union.has(id))
        || !sameSnapshotCandidate(item, recommendationById.get(item.trackId)!)) return false;
      discoveryIds.add(item.trackId);
    }
    return true;
  } catch {
    return false;
  }
}

function snapshotRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function snapshotNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10_000;
}

function snapshotString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 1_000;
}

function snapshotCourseIds(value: unknown): value is string[] {
  // Frozen identifiers must outlive removals/renames in the current catalogue.
  // Validate stored scope relations below, never current catalogue membership.
  return Array.isArray(value) && value.length <= 1_000
    && value.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)
    && new Set(value).size === value.length;
}

function snapshotTrackIds(value: unknown): value is TrackId[] {
  return Array.isArray(value) && value.length <= tracks.length
    && value.every((id) => trackOrder.has(id)) && new Set(value).size === value.length;
}

function snapshotModule(value: unknown, assumed: Set<string>): value is TrackModuleCompletionProgress {
  if (!snapshotRecord(value) || !snapshotString(value.key) || !snapshotString(value.label)
    || !Array.isArray(value.moduleIds) || value.moduleIds.length < 1 || value.moduleIds.length > modules.length
    || !value.moduleIds.every((id) => moduleById.has(id)) || new Set(value.moduleIds).size !== value.moduleIds.length
    || value.key !== value.moduleIds.join("+") || typeof value.isSubconstraint !== "boolean"
    || !snapshotNumber(value.requiredCredits) || value.requiredCredits <= 0
    || !snapshotNumber(value.completedCredits) || !snapshotNumber(value.creditedCredits)
    || !snapshotNumber(value.missingCredits) || !snapshotCourseIds(value.courseIds)
    || !snapshotCourseIds(value.completedCourseIds)) return false;
  return value.completedCourseIds.every((id) => assumed.has(id) && (value.courseIds as string[]).includes(id))
    && value.creditedCredits === Math.min(value.requiredCredits, value.completedCredits)
    && value.missingCredits === Math.max(0, value.requiredCredits - value.completedCredits);
}

function snapshotCandidate(value: unknown, assumed: Set<string>): value is TrackCompletionCandidate {
  if (!snapshotRecord(value) || !trackOrder.has(value.trackId as TrackId) || !snapshotString(value.trackName)
    || typeof value.satisfied !== "boolean" || typeof value.canCompleteWithKnownCourses !== "boolean"
    || !["earnedCredits", "creditedCredits", "requiredCredits", "missingCredits", "completionRate", "remainingCourseCount", "remainingCredits"]
      .every((key) => snapshotNumber(value[key]))
    || !snapshotCourseIds(value.remainingCourseIds) || value.remainingCourseIds.some((id) => assumed.has(id))
    || !Array.isArray(value.moduleProgress) || value.moduleProgress.length === 0 || value.moduleProgress.length > modules.length
    || !value.moduleProgress.every((item) => snapshotModule(item, assumed))) return false;
  const item = value as unknown as TrackCompletionCandidate;
  return item.requiredCredits > 0 && item.creditedCredits <= item.requiredCredits && item.creditedCredits <= item.earnedCredits
    && item.missingCredits === item.requiredCredits - item.creditedCredits
    && item.completionRate === Math.round(100 * item.creditedCredits / item.requiredCredits)
    && item.remainingCourseCount === item.remainingCourseIds.length
    && (item.remainingCourseCount === 0) === (item.remainingCredits === 0)
    && item.satisfied === item.moduleProgress.every((progress) => progress.missingCredits === 0)
    && (!item.satisfied || item.remainingCourseCount === 0 && item.creditedCredits === item.requiredCredits && item.canCompleteWithKnownCourses)
    && new Set(item.moduleProgress.map((progress) => progress.key)).size === item.moduleProgress.length;
}

function sameSnapshotCandidate(left: TrackCompletionCandidate, right?: TrackCompletionCandidate): boolean {
  if (!right) return false;
  const facts = (item: TrackCompletionCandidate) => ({
    trackId: item.trackId, trackName: item.trackName, earnedCredits: item.earnedCredits,
    creditedCredits: item.creditedCredits, requiredCredits: item.requiredCredits, missingCredits: item.missingCredits,
    completionRate: item.completionRate, satisfied: item.satisfied, canCompleteWithKnownCourses: item.canCompleteWithKnownCourses,
    remainingCourseIds: item.remainingCourseIds, remainingCourseCount: item.remainingCourseCount, remainingCredits: item.remainingCredits,
    moduleProgress: item.moduleProgress.map((progress) => ({ key: progress.key, moduleIds: progress.moduleIds,
      label: progress.label, requiredCredits: progress.requiredCredits, completedCredits: progress.completedCredits,
      creditedCredits: progress.creditedCredits, missingCredits: progress.missingCredits,
      isSubconstraint: progress.isSubconstraint, courseIds: progress.courseIds, completedCourseIds: progress.completedCourseIds })),
  });
  return JSON.stringify(facts(left)) === JSON.stringify(facts(right));
}

export function calculateTrackCompletion(input: TrackCompletionInput): TrackCompletionResult {
  const selectedTrackIds = tracks
    .filter((track) => input.selectedTrackIds.includes(track.id))
    .map((track) => track.id);
  const statuses = normalizedStatuses(input.courseSelections);
  const completedIds = new Set([...statuses]
    .filter(([, status]) => status === "completed")
    .map(([id]) => id));
  const result: TrackCompletionResult = {
    selectedTrackIds,
    completed: buildScenario(selectedTrackIds, completedIds, statuses, "completed"),
    ignoredCourseIds: [...new Set(input.courseSelections
      .filter((selection) => !courseById.has(selection.courseId))
      .map((selection) => selection.courseId))].sort(compareText),
    assumptions: [...TRACK_COMPLETION_ASSUMPTIONS],
  };
  if (input.includeInProgress) {
    const previewIds = new Set([...statuses]
      .filter(([, status]) => status === "completed" || status === "in-progress")
      .map(([id]) => id));
    result.inProgressPreview = buildScenario(
      selectedTrackIds, previewIds, statuses, "completed-plus-in-progress",
    );
  }
  return result;
}

function normalizedStatuses(selections: readonly CourseSelectionRecord[]): Map<string, CourseSelectionStatus> {
  const rank: Record<CourseSelectionStatus, number> = { completed: 3, "in-progress": 2, planned: 1 };
  const statuses = new Map<string, CourseSelectionStatus>();
  for (const { courseId, status } of selections) {
    if (!courseById.has(courseId) || !rank[status]) continue;
    const previous = statuses.get(courseId);
    if (!previous || rank[status] > rank[previous]) statuses.set(courseId, status);
  }
  return statuses;
}

type Constraint = {
  moduleIds: ModuleId[];
  requiredCredits: number;
  label: string;
  isSubconstraint: boolean;
};

function constraintsForTrack(track: Track): Constraint[] {
  const rule = track.rule;
  const single = (moduleId: ModuleId, requiredCredits: number, isSubconstraint = false): Constraint => ({
    moduleIds: [moduleId], requiredCredits, isSubconstraint,
    label: `${moduleId}. ${moduleById.get(moduleId)?.name ?? moduleId}`,
  });
  if (rule.type === "major") {
    return rule.moduleIds.map((moduleId) => single(moduleId, rule.requiredCreditsPerModule));
  }
  return [
    ...rule.baseModuleIds.map((moduleId) => single(moduleId, rule.requiredCreditsPerBaseModule, true)),
    {
      moduleIds: [...rule.baseModuleIds], requiredCredits: rule.requiredBaseCreditsTotal,
      label: `${rule.baseModuleIds.join("/")} 학과 모듈 합산`, isSubconstraint: false,
    },
    ...rule.convergenceRequirements.map((requirement) => ({
      ...requirement, moduleIds: [...requirement.moduleIds], isSubconstraint: false,
    })),
  ];
}

function moduleProgress(constraint: Constraint, assumed: Set<string>): TrackModuleCompletionProgress {
  const courseIds = courses
    .filter((course) => constraint.moduleIds.includes(course.moduleId))
    .map((course) => course.id).sort(compareCourseIds);
  const completedCourseIds = courseIds.filter((id) => assumed.has(id));
  const completedCredits = creditsForIds(completedCourseIds);
  return {
    key: constraint.moduleIds.join("+"),
    ...constraint,
    moduleIds: [...constraint.moduleIds],
    completedCredits,
    creditedCredits: Math.min(constraint.requiredCredits, completedCredits),
    missingCredits: Math.max(0, constraint.requiredCredits - completedCredits),
    courseIds, completedCourseIds,
  };
}

function buildCandidate(track: Track, assumed: Set<string>): TrackCompletionCandidate {
  const progress = constraintsForTrack(track).map((constraint) => moduleProgress(constraint, assumed));
  const earnedIds = [...new Set(progress.flatMap((item) => item.completedCourseIds))];
  const creditedCredits = allocatedTrackCredits(track, progress);
  const remaining = solveRemaining([track], assumed);
  return {
    trackId: track.id, trackName: track.name,
    earnedCredits: creditsForIds(earnedIds), creditedCredits,
    requiredCredits: track.rule.totalTrackCredits,
    missingCredits: Math.max(0, track.rule.totalTrackCredits - creditedCredits),
    completionRate: Math.min(100, Math.round(100 * creditedCredits / track.rule.totalTrackCredits)),
    satisfied: progress.every((item) => item.missingCredits === 0),
    canCompleteWithKnownCourses: remaining.feasible,
    moduleProgress: progress,
    remainingCourseIds: remaining.courseIds,
    remainingCourseCount: remaining.courseIds.length,
    remainingCredits: creditsForIds(remaining.courseIds),
  };
}

function allocatedTrackCredits(track: Track, progress: TrackModuleCompletionProgress[]): number {
  const rule = track.rule;
  if (rule.type === "major") return progress.reduce((sum, item) => sum + item.creditedCredits, 0);

  // Reserve each base-module minimum first, then allow only the remaining base budget
  // to receive surplus. F9/H6/I0 consequently earns 12/15 allocated base credits,
  // not 15/15: an unmet I minimum must not coexist with a misleading 100% gauge.
  const base = progress.filter((item) => item.isSubconstraint);
  const reserved = base.reduce((sum, item) => sum + item.creditedCredits, 0);
  const surplus = base.reduce((sum, item) => sum + Math.max(0, item.completedCredits - item.requiredCredits), 0);
  const flexibleBudget = Math.max(
    0, rule.requiredBaseCreditsTotal - rule.baseModuleIds.length * rule.requiredCreditsPerBaseModule,
  );
  const convergence = progress.slice(rule.baseModuleIds.length + 1)
    .reduce((sum, item) => sum + item.creditedCredits, 0);
  return Math.min(rule.totalTrackCredits, reserved + Math.min(flexibleBudget, surplus) + convergence);
}

function buildScenario(
  selectedTrackIds: TrackId[],
  assumed: Set<string>,
  statuses: Map<string, CourseSelectionStatus>,
  basis: TrackCompletionScenario["basis"],
): TrackCompletionScenario {
  const recommendations = tracks.map((track) => buildCandidate(track, assumed)).sort(compareCandidates);
  const selectedTracks = tracks.filter((track) => selectedTrackIds.includes(track.id));
  const trackResults = selectedTrackIds.map((id) => recommendations.find((item) => item.trackId === id)!);
  const union = solveRemaining(selectedTracks, assumed);
  const afterChosenPlan = new Set([...assumed, ...union.courseIds]);
  const discoveryCandidates = recommendations
    .filter((candidate) => !selectedTrackIds.includes(candidate.trackId))
    .map((candidate): TrackDiscoveryCandidate => {
      const track = tracks.find((item) => item.id === candidate.trackId)!;
      const additional = solveRemaining([track], afterChosenPlan);
      return {
        ...candidate,
        additionalCourseIds: additional.courseIds,
        additionalCourseCount: additional.courseIds.length,
        additionalCredits: creditsForIds(additional.courseIds),
      };
    }).sort((left, right) => left.additionalCourseCount - right.additionalCourseCount
      || left.additionalCredits - right.additionalCredits || compareCandidates(left, right));
  const suggestedCourses = union.courseIds.map((courseId): TrackSuggestedCourse => {
    const course = courseById.get(courseId)!;
    return {
      courseId, credits: course.credits, moduleId: course.moduleId,
      selectedTrackIds: trackResults.filter((candidate) => candidate.moduleProgress.some((item) =>
        item.missingCredits > 0 && item.courseIds.includes(courseId),
      )).map((candidate) => candidate.trackId),
      allTrackIds: tracks.filter((track) => constraintsForTrack(track)
        .some((constraint) => constraint.moduleIds.includes(course.moduleId))).map((track) => track.id),
      currentStatus: statuses.get(courseId),
    };
  });
  return {
    basis,
    assumedCourseIds: [...assumed].sort(compareCourseIds),
    trackResults,
    satisfied: trackResults.length > 0 && trackResults.every((item) => item.satisfied),
    canCompleteWithKnownCourses: union.feasible,
    unionRemainingCourseIds: union.courseIds,
    unionRemainingCourseCount: union.courseIds.length,
    unionRemainingCredits: creditsForIds(union.courseIds),
    suggestedCourses, recommendations, discoveryCandidates,
  };
}

type MissingConstraint = { moduleIds: ModuleId[]; missingCredits: number };
type CoursePlan = { courseIds: string[]; feasible: boolean };
type SearchState = { credits: number[]; courseIds: string[]; newCredits: number };

function solveRemaining(selectedTracks: Track[], assumed: Set<string>): CoursePlan {
  const constraintsByModules = new Map<string, MissingConstraint>();
  for (const track of selectedTracks) {
    for (const constraint of constraintsForTrack(track)) {
      const progress = moduleProgress(constraint, assumed);
      if (progress.missingCredits === 0) continue;
      const moduleIds = [...constraint.moduleIds].sort(compareText);
      const key = moduleIds.join("+");
      const previous = constraintsByModules.get(key);
      constraintsByModules.set(key, {
        moduleIds,
        missingCredits: Math.max(previous?.missingCredits ?? 0, progress.missingCredits),
      });
    }
  }
  const constraints = [...constraintsByModules.values()];
  if (constraints.length === 0) return { courseIds: [], feasible: true };

  // Modules only interact when a constraint spans both of them. Partitioning by
  // this graph makes the additive count/credit optimum equal the union of each
  // component optimum. The current catalogue's largest component is F/H/I (9
  // courses), then N/O (7); we never enumerate a power set of all 49 courses.
  const parents = new Map<ModuleId, ModuleId>();
  function root(moduleId: ModuleId): ModuleId {
    const parent = parents.get(moduleId);
    if (!parent || parent === moduleId) {
      parents.set(moduleId, moduleId);
      return moduleId;
    }
    const resolved = root(parent);
    parents.set(moduleId, resolved);
    return resolved;
  }
  for (const constraint of constraints) {
    const first = root(constraint.moduleIds[0]);
    for (const moduleId of constraint.moduleIds.slice(1)) parents.set(root(moduleId), first);
  }
  const components = new Map<ModuleId, MissingConstraint[]>();
  for (const constraint of constraints) {
    const key = root(constraint.moduleIds[0]);
    components.set(key, [...(components.get(key) ?? []), constraint]);
  }
  const plans = [...components.values()].map((component) => solveComponent(component, assumed));
  return {
    courseIds: plans.flatMap((plan) => plan.courseIds).sort(compareCourseIds),
    feasible: plans.every((plan) => plan.feasible),
  };
}

function solveComponent(constraints: MissingConstraint[], assumed: Set<string>): CoursePlan {
  const moduleIds = new Set(constraints.flatMap((constraint) => constraint.moduleIds));
  const candidates = courses
    .filter((course) => moduleIds.has(course.moduleId) && !assumed.has(course.id))
    .sort((left, right) => compareCourseIds(left.id, right.id));
  const zero = constraints.map(() => 0);
  let states = new Map<string, SearchState>([[zero.join(","), { credits: zero, courseIds: [], newCredits: 0 }]]);
  for (const course of candidates) {
    const next = new Map(states);
    for (const state of states.values()) {
      const credits = constraints.map((constraint, index) => Math.min(
        constraint.missingCredits,
        state.credits[index] + (constraint.moduleIds.includes(course.moduleId) ? course.credits : 0),
      ));
      const key = credits.join(",");
      const candidate: SearchState = {
        credits, courseIds: [...state.courseIds, course.id], newCredits: state.newCredits + course.credits,
      };
      const previous = next.get(key);
      if (!previous || compareStates(candidate, previous) < 0) next.set(key, candidate);
    }
    states = next;
  }
  const answer = states.get(constraints.map((constraint) => constraint.missingCredits).join(","));
  // A future catalogue gap must not become a false zero-work answer.
  return answer
    ? { courseIds: answer.courseIds, feasible: true }
    : { courseIds: candidates.map((course) => course.id), feasible: false };
}

function compareStates(left: SearchState, right: SearchState): number {
  return left.courseIds.length - right.courseIds.length
    || left.newCredits - right.newCredits
    || compareText(left.courseIds.join(","), right.courseIds.join(","));
}

function compareCandidates(left: TrackCompletionCandidate, right: TrackCompletionCandidate): number {
  return left.remainingCourseCount - right.remainingCourseCount
    || left.remainingCredits - right.remainingCredits
    || trackOrder.get(left.trackId)! - trackOrder.get(right.trackId)!;
}

function creditsForIds(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + (courseById.get(id)?.credits ?? 0), 0);
}

function compareCourseIds(left: string, right: string): number {
  return compareText(courseById.get(left)?.code ?? left, courseById.get(right)?.code ?? right);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
