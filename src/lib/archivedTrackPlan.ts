import type { CourseSelectionRecord, DiagnosisSnapshot } from "../types";
import type { TrackSemesterPlan } from "./trackSemesterPlanner";

const signaturePrefix = "track-modules:2026:v1:";
const statuses = new Set(["completed", "in-progress", "planned"]);
const plannedTerms = new Set(["next", "following", "later"]);
const unplacedReasons = new Set(["offering-unknown", "outside-plan-range", "capacity-exceeded", "planned-term-conflict", "in-progress-term-conflict"]);

/** Frozen-record validation: never import the catalogue, offerings, or live solver. */
export function isArchivedTrackSemesterPlan(
  value: unknown,
  snapshot?: Pick<DiagnosisSnapshot, "targetTrackId" | "comparisonTrackIds" | "courseSelections" | "trackCompletion">,
): value is TrackSemesterPlan {
  try {
    if (!record(value) || value.version !== 1 || value.scope !== "track-modules"
      || !identifierArray(value.selectedTrackIds) || !identifierArray(value.courseIds)
      || !preferences(value.preferences) || typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt))
      || typeof value.inputSignature !== "string" || value.inputSignature.length > 64_000 || !value.inputSignature.startsWith(signaturePrefix)
      || !Array.isArray(value.placements) || value.placements.length > 1_000
      || !Array.isArray(value.unplaced) || value.unplaced.length > 1_000
      || !Array.isArray(value.notes) || value.notes.length > 100 || !value.notes.every(note => typeof note === "string" && note.length <= 10_000)) return false;
    const payload: unknown = JSON.parse(value.inputSignature.slice(signaturePrefix.length));
    if (!record(payload) || !identifierArray(payload.selectedTrackIds) || !sameIds(payload.selectedTrackIds, value.selectedTrackIds)
      || !preferences(payload.preferences) || preferenceKey(payload.preferences) !== preferenceKey(value.preferences)
      || !Array.isArray(payload.courseSelections) || payload.courseSelections.length > 1_000 || !payload.courseSelections.every(selection)
      || !record(payload.manualTerms) || Object.entries(payload.manualTerms).some(([id, term]) => !identifier(id) || typeof term !== "string" || term.length > 32)) return false;
    const inputSelections = normalizedSelections(payload.courseSelections);
    if (inputSelections.length !== payload.courseSelections.length) return false;
    if (snapshot && (!sameIds([...(snapshot.targetTrackId ? [snapshot.targetTrackId] : []), ...snapshot.comparisonTrackIds], value.selectedTrackIds)
      || JSON.stringify(normalizedSelections(snapshot.courseSelections)) !== JSON.stringify(inputSelections))) return false;
    const inputById = new Map(inputSelections.map(item => [item.courseId, item]));
    const selectedIds = value.selectedTrackIds;
    const courseIds = new Set(value.courseIds);
    const frozenCoverage = snapshot?.trackCompletion ? new Map<string, string[]>() : undefined;
    if (frozenCoverage && snapshot?.trackCompletion) {
      for (const track of snapshot.trackCompletion.trackResults) {
        for (const id of new Set(track.moduleProgress.flatMap(module => module.courseIds))) {
          frozenCoverage.set(id, [...(frozenCoverage.get(id) ?? []), track.trackId]);
        }
      }
      if (value.courseIds.some(id => !frozenCoverage.has(id))) return false;
    }
    if (courseIds.size > 0 && value.selectedTrackIds.length === 0) return false;
    if (value.courseIds.some(id => inputById.get(id)?.status === "completed")) return false;
    const currentTerm = termIndex(value.preferences.currentTerm);
    const targetTerm = termIndex(value.preferences.targetGraduationTerm);
    const seen = new Set<string>();
    const loads = new Map<string, number>();
    for (const placement of value.placements) {
      if (!record(placement) || !identifier(placement.courseId) || !courseIds.has(placement.courseId) || seen.has(placement.courseId)
        || !academicTerm(placement.term) || !identifierArray(placement.trackIds) || placement.trackIds.length === 0
        || !placement.trackIds.every(id => selectedIds.includes(id)) || typeof placement.requiresOfferingCheck !== "boolean") return false;
      const input = inputById.get(placement.courseId);
      if (frozenCoverage && !sameIds(placement.trackIds, frozenCoverage.get(placement.courseId) ?? [])) return false;
      const expectedSource = input?.status === "in-progress" || input?.status === "planned" ? input.status : "suggested";
      if (placement.source !== expectedSource) return false;
      const term = termIndex(placement.term);
      if (term < currentTerm || term > targetTerm || expectedSource === "in-progress" && term !== currentTerm) return false;
      const hasManual = Object.prototype.hasOwnProperty.call(payload.manualTerms, placement.courseId);
      if (hasManual && payload.manualTerms[placement.courseId] !== placement.term) return false;
      if (!hasManual && expectedSource !== "in-progress") {
        if (term === currentTerm || input?.plannedTerm === "next" && term !== currentTerm + 1 || input?.plannedTerm === "following" && term !== currentTerm + 2) return false;
      }
      const load = (loads.get(placement.term) ?? 0) + 1;
      if (load > value.preferences.maxMajorCoursesPerTerm) return false;
      loads.set(placement.term, load); seen.add(placement.courseId);
    }
    for (const item of value.unplaced) {
      if (!record(item) || !identifier(item.courseId) || !courseIds.has(item.courseId) || seen.has(item.courseId)
        || !unplacedReasons.has(String(item.reason)) || typeof item.message !== "string" || item.message.length > 10_000) return false;
      seen.add(item.courseId);
    }
    return seen.size === courseIds.size;
  } catch { return false; }
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function identifier(value: unknown): value is string { return typeof value === "string" && value.length > 0 && value.length <= 128; }
function identifierArray(value: unknown): value is string[] { return Array.isArray(value) && value.length <= 1_000 && value.every(identifier) && new Set(value).size === value.length; }
function sameIds(left: readonly string[], right: readonly string[]): boolean { return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...right].sort()); }
function academicTerm(value: unknown): value is string { return typeof value === "string" && /^\d{4}-[12]$/.test(value); }
function termIndex(term: string): number { const [year, semester] = term.split("-").map(Number); return year * 2 + semester - 1; }
type SavedPreferences = { currentTerm: string; targetGraduationTerm: string; maxMajorCoursesPerTerm: number; considerSeasonalTerm: boolean };
function preferences(value: unknown): value is SavedPreferences {
  if (!record(value) || !academicTerm(value.currentTerm) || !academicTerm(value.targetGraduationTerm)
    || typeof value.maxMajorCoursesPerTerm !== "number" || !Number.isInteger(value.maxMajorCoursesPerTerm)
    || value.maxMajorCoursesPerTerm < 1 || value.maxMajorCoursesPerTerm > 6 || typeof value.considerSeasonalTerm !== "boolean") return false;
  const distance = termIndex(value.targetGraduationTerm) - termIndex(value.currentTerm);
  return distance >= 0 && distance <= 12;
}
function preferenceKey(value: SavedPreferences): string { return JSON.stringify([value.currentTerm, value.targetGraduationTerm, value.maxMajorCoursesPerTerm, value.considerSeasonalTerm]); }
function selection(value: unknown): value is CourseSelectionRecord { return record(value) && identifier(value.courseId) && statuses.has(String(value.status)) && (value.plannedTerm === undefined || plannedTerms.has(String(value.plannedTerm))); }
function normalizedSelections(values: readonly CourseSelectionRecord[]): CourseSelectionRecord[] {
  const rank = { completed: 3, "in-progress": 2, planned: 1 };
  const termRank = { next: 0, following: 1, later: 2 };
  const result = new Map<string, CourseSelectionRecord>();
  for (const item of values) {
    const previous = result.get(item.courseId);
    if (!previous || rank[item.status] > rank[previous.status] || item.status === "planned" && previous.status === "planned" && termRank[item.plannedTerm ?? "later"] < termRank[previous.plannedTerm ?? "later"]) {
      result.set(item.courseId, { courseId: item.courseId, status: item.status, ...(item.status === "planned" ? { plannedTerm: item.plannedTerm ?? "later" } : {}) });
    }
  }
  return [...result.values()].sort((a, b) => a.courseId < b.courseId ? -1 : a.courseId > b.courseId ? 1 : 0);
}
