import { appendDiagnosisSnapshot } from "./storage";
import type { DiagnosisSnapshot, PathProgressResult, SavedAppStateV2 } from "../types";
import type { TrackCompletionScenario } from "./trackCompletion";

function snapshotFacts(snapshot: Omit<DiagnosisSnapshot, "id" | "createdAt">): string {
  return JSON.stringify({
    profile: snapshot.profile,
    courseSelections: [...snapshot.courseSelections].sort((a, b) => a.courseId.localeCompare(b.courseId)),
    additionalMajorCredits: [...snapshot.additionalMajorCredits].sort((a, b) => a.id.localeCompare(b.id)),
    targetTrackId: snapshot.targetTrackId,
    comparisonTrackIds: [...snapshot.comparisonTrackIds].sort(),
    result: snapshot.result,
    trackCompletion: snapshot.trackCompletion,
  });
}

export function archiveCurrentDiagnosis(current: SavedAppStateV2, result: PathProgressResult, id: string, createdAt: string, trackCompletion?: TrackCompletionScenario): SavedAppStateV2 {
  if (!current.profile || !current.courseInputReviewedAt) throw new Error("Review the current diagnosis before archiving it.");
  const snapshot: DiagnosisSnapshot = {
    id, createdAt, ruleVersion: current.profile.curriculumRuleVersion,
    profile: current.profile, courseSelections: current.courseSelections,
    additionalMajorCredits: current.additionalMajorCredits, targetTrackId: current.targetTrackId,
    comparisonTrackIds: current.comparisonTrackIds, result,
    ...(trackCompletion ? { trackCompletion } : {}),
  };
  if (current.snapshots.some(previous => !previous.graduationPlan && !previous.trackPlan && snapshotFacts(previous) === snapshotFacts(snapshot))) return current;
  return appendDiagnosisSnapshot(current, structuredClone(snapshot));
}
