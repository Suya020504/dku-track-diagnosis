import { getAllowedStudyPaths } from "../data/requirementRules2026";
import type { SavedAppStateV2 } from "../types";

export type DiagnosisStep = "profile" | "courses" | "result";

const DIAGNOSIS_STEPS = new Set<DiagnosisStep>(["profile", "courses", "result"]);

function hasValidProfile(state: SavedAppStateV2): boolean {
  const profile = state.profile;
  return Boolean(
    profile && getAllowedStudyPaths(profile.affiliation).includes(profile.studyPath),
  );
}

export function resolveDiagnosisStep(
  search: string,
  state: SavedAppStateV2,
): DiagnosisStep {
  if (!hasValidProfile(state)) return "profile";

  const params = new URLSearchParams(search);
  const rawStep = params.get("step");
  const requested = rawStep && DIAGNOSIS_STEPS.has(rawStep as DiagnosisStep)
    ? rawStep as DiagnosisStep
    : params.get("view") === "result"
      ? "result"
      : "courses";

  if (requested === "result" && !state.courseInputReviewedAt) return "courses";
  return requested;
}

export function buildDiagnosisHref(currentHref: string, step: DiagnosisStep): string {
  const url = new URL(currentHref, "https://local.invalid");
  url.searchParams.set("view", step === "result" ? "result" : "diagnosis");
  url.searchParams.set("step", step);
  url.searchParams.delete("section");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function writeDiagnosisStepToHistory(
  step: DiagnosisStep,
  mode: "push" | "replace",
): void {
  if (typeof window === "undefined") return;
  const href = buildDiagnosisHref(window.location.href, step);
  const state = {
    ...(window.history.state ?? {}),
    view: step === "result" ? "result" : "diagnosis",
    step,
  };
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", href);
}

// Public names used by the app-facing routing contract.
export const readViewFromSearch = resolveDiagnosisStep;
export const buildViewHref = buildDiagnosisHref;
export const writeViewToHistory = writeDiagnosisStepToHistory;
