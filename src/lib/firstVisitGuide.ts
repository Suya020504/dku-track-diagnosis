import type { SavedAppStateV2 } from "../types";

export const FIRST_VISIT_GUIDE_KEY = "dku-track:quick-start:v1";

/** A separate preference must never rewrite course history or saved plans. */
export function shouldOfferFirstVisitGuide(state: SavedAppStateV2, storage: Storage): boolean {
  const hasWork = Boolean(state.profile || state.profileDraft || state.entryIntent
    || state.pendingSelectedTrackIds || state.pendingTargetTrackId !== undefined
    || state.targetTrackId || state.courseInputReviewedAt || state.interestSurvey
    || state.trackPlanning || state.graduationPlan || state.graduationPlanDraft
    || state.graduationPlanPreferences || state.currentSemester || state.targetGraduationSemester
    || state.courseSelections.length || state.additionalMajorCredits.length
    || state.comparisonTrackIds.length || state.snapshots.length);
  if (hasWork) return false;
  try { return storage.getItem(FIRST_VISIT_GUIDE_KEY) !== "seen"; }
  catch { return false; }
}

export function rememberFirstVisitGuide(storage: Storage): void {
  try { storage.setItem(FIRST_VISIT_GUIDE_KEY, "seen"); }
  catch { /* Optional preference: dismissal still works for the current session. */ }
}
