import type { InterestSurveyAudience, SavedAppStateV2 } from "../types";
import { isOfficialTrackVideoId, type OfficialTrackVideoId } from "../data/officialResources";
import { resolveDiagnosisStep, type DiagnosisStep } from "./viewRouting";

export type ResultSection = "current" | "next" | "confirm";
export type ResourceSection = "tracks" | "modules" | "curriculum" | "timetable" | "official";
export type TrackGuideSection = "overview" | "benefits" | "outcomes" | "structure" | "application" | "videos";
export type ProfileStage = "affiliation" | "path";

export type AppRoute =
  | { view: "landing" }
  | {
      view: "diagnosis";
      step: DiagnosisStep;
      input?: "pdf-review";
      profileStage?: ProfileStage;
    }
  | {
      view: "recommendation";
      step: "survey" | "axes";
      axis?: "interest" | "progress" | "plan";
      audience?: InterestSurveyAudience;
    }
  | { view: "plan"; step: "setup" | "schedule" | "checks" }
  | { view: "result"; section?: ResultSection }
  | { view: "resources"; section?: ResourceSection }
  | { view: "track-guide"; section?: TrackGuideSection; videoId?: OfficialTrackVideoId }
  | { view: "contact" }
  | { view: "records"; recordId?: string };

const recommendationAxes = new Set(["interest", "progress", "plan"] as const);
const surveyAudiences = new Set<InterestSurveyAudience>(["department-student", "external-student"]);
const planSteps = new Set(["setup", "schedule", "checks"] as const);
const resultSections = new Set<ResultSection>(["current", "next", "confirm"]);
const resourceSections = new Set<ResourceSection>(["tracks", "modules", "curriculum", "timetable", "official"]);
const trackGuideSections = new Set<TrackGuideSection>(["overview", "benefits", "outcomes", "structure", "application", "videos"]);
const profileStages = new Set<ProfileStage>(["affiliation", "path"]);

export function resolveAppRoute(
  search: string,
  state: SavedAppStateV2,
  context: { hasPdfImportDraft?: boolean } = {},
): AppRoute {
  const params = new URLSearchParams(search);
  const view = params.get("view");

  if (view === "diagnosis" || view === "result") {
    const step = resolveDiagnosisStep(search, state);
    if (step === "result") return { view: "result", section: resolveResultSection(params) };
    const input = params.get("input");
    const profileStage = step === "profile" ? resolveProfileStage(params) : undefined;
    const baseRoute = profileStage
      ? { view: "diagnosis" as const, step, profileStage }
      : { view: "diagnosis" as const, step };
    return step === "courses" && input === "pdf-review" && context.hasPdfImportDraft
      ? { ...baseRoute, input }
      : baseRoute;
  }

  if (view === "lab") {
    return { view: "recommendation", step: "axes" };
  }

  if (view === "experiment") {
    return { view: "plan", step: "setup" };
  }

  if (view === "recommendation") {
    const step = params.get("step") === "axes" ? "axes" : "survey";
    if (step === "survey") {
      const audience = params.get("audience");
      return audience && surveyAudiences.has(audience as InterestSurveyAudience)
        ? { view: "recommendation", step, audience: audience as InterestSurveyAudience }
        : { view: "recommendation", step };
    }

    const axis = params.get("axis");
    return axis && recommendationAxes.has(axis as "interest" | "progress" | "plan")
      ? { view: "recommendation", step, axis: axis as "interest" | "progress" | "plan" }
      : { view: "recommendation", step };
  }

  if (view === "plan") {
    const rawStep = params.get("step");
    const requested = rawStep && planSteps.has(rawStep as "setup" | "schedule" | "checks")
      ? rawStep as "setup" | "schedule" | "checks"
      : "setup";
    const step = requested !== "setup" && !state.graduationPlan
      ? "setup"
      : requested;
    return { view: "plan", step };
  }

  if (view === "resources") {
    return { view: "resources", section: resolveResourceSection(params) };
  }

  if (view === "track-guide") {
    const section = resolveTrackGuideSection(params);
    const videoId = section === "videos" ? params.get("video") : null;
    return isOfficialTrackVideoId(videoId)
      ? { view: "track-guide", section, videoId }
      : { view: "track-guide", section };
  }

  if (view === "overview") return { view: "track-guide", section: "overview" };

  if (view === "modules") {
    return { view: "resources", section: "modules" };
  }

  if (view === "contact") return { view };

  if (view === "records") {
    const recordId = params.get("record");
    return recordId ? { view, recordId } : { view };
  }

  return { view: "landing" };
}

export function buildAppHref(currentHref: string, route: AppRoute): string {
  const url = new URL(currentHref, "https://local.invalid");
  url.searchParams.delete("input");
  url.searchParams.delete("video");
  url.searchParams.delete("audience");
  url.searchParams.delete("record");

  if (route.view === "landing") {
    clearRouteParams(url);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "diagnosis") {
    url.searchParams.set("view", route.step === "result" ? "result" : "diagnosis");
    url.searchParams.set("step", route.step);
    url.searchParams.delete("axis");
    url.searchParams.delete("section");
    if (route.step === "profile") {
      url.searchParams.set("profile", route.profileStage ?? "affiliation");
    } else {
      url.searchParams.delete("profile");
    }
    if (route.step === "courses" && route.input === "pdf-review") {
      url.searchParams.set("input", route.input);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "result") {
    url.searchParams.set("view", "result");
    url.searchParams.set("step", "result");
    url.searchParams.delete("axis");
    url.searchParams.set("section", route.section ?? "current");
    url.searchParams.delete("profile");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "recommendation") {
    url.searchParams.set("view", "recommendation");
    url.searchParams.set("step", route.step);
    if (route.step === "axes" && route.axis) {
      url.searchParams.set("axis", route.axis);
    } else {
      url.searchParams.delete("axis");
    }
    if (route.step === "survey" && route.audience) {
      url.searchParams.set("audience", route.audience);
    }
    url.searchParams.delete("section");
    url.searchParams.delete("profile");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "plan") {
    url.searchParams.set("view", "plan");
    url.searchParams.set("step", route.step);
    url.searchParams.delete("axis");
    url.searchParams.delete("section");
    url.searchParams.delete("profile");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "resources") {
    url.searchParams.set("view", "resources");
    url.searchParams.delete("step");
    url.searchParams.delete("axis");
    url.searchParams.set("section", route.section ?? "tracks");
    url.searchParams.delete("profile");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "track-guide") {
    url.searchParams.set("view", "track-guide");
    url.searchParams.delete("step");
    url.searchParams.delete("axis");
    url.searchParams.set("section", route.section ?? "overview");
    if (route.section === "videos" && route.videoId) url.searchParams.set("video", route.videoId);
    url.searchParams.delete("profile");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "records" && route.recordId) url.searchParams.set("record", route.recordId);
  url.searchParams.set("view", route.view);
  url.searchParams.delete("step");
  url.searchParams.delete("axis");
  url.searchParams.delete("section");
  url.searchParams.delete("profile");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function writeAppRouteToHistory(
  route: AppRoute,
  mode: "push" | "replace",
): void {
  if (typeof window === "undefined") return;
  const href = buildAppHref(window.location.href, route);
  const currentState = window.history.state ?? {};
  const {
    view: _view,
    step: _step,
    axis: _axis,
    audience: _audience,
    section: _section,
    profile: _profile,
    input: _input,
    video: _video,
    recordId: _recordId,
    ...unrelatedState
  } = currentState;
  const state = { ...unrelatedState, ...routeHistoryState(route) };
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", href);
}

function clearRouteParams(url: URL): void {
  url.searchParams.delete("record");
  url.searchParams.delete("view");
  url.searchParams.delete("step");
  url.searchParams.delete("axis");
  url.searchParams.delete("section");
  url.searchParams.delete("profile");
  url.searchParams.delete("input");
  url.searchParams.delete("video");
  url.searchParams.delete("audience");
}

function routeHistoryState(route: AppRoute): Record<string, string> {
  if (route.view === "records") return route.recordId
    ? { view: route.view, recordId: route.recordId }
    : { view: route.view };
  if (route.view === "diagnosis") {
    const state = {
      view: route.step === "result" ? "result" : "diagnosis",
      step: route.step,
    };
    const routeState = route.step === "profile"
      ? { ...state, profile: route.profileStage ?? "affiliation" }
      : state;
    return route.step === "courses" && route.input === "pdf-review"
      ? { ...routeState, input: route.input }
      : routeState;
  }
  if (route.view === "result") {
    return { view: "result", step: "result", section: route.section ?? "current" };
  }
  if (route.view === "recommendation") {
    if (route.step === "axes" && route.axis) {
      return { view: route.view, step: route.step, axis: route.axis };
    }
    if (route.step === "survey" && route.audience) {
      return { view: route.view, step: route.step, audience: route.audience };
    }
    return { view: route.view, step: route.step };
  }
  if (route.view === "plan") return { view: route.view, step: route.step };
  if (route.view === "resources") return { view: route.view, section: route.section ?? "tracks" };
  if (route.view === "track-guide") {
    return route.section === "videos" && route.videoId
      ? { view: route.view, section: route.section, video: route.videoId }
      : { view: route.view, section: route.section ?? "overview" };
  }
  return { view: route.view };
}

function resolveResultSection(params: URLSearchParams): ResultSection {
  const section = params.get("section");
  return section && resultSections.has(section as ResultSection)
    ? section as ResultSection
    : "current";
}

function resolveResourceSection(params: URLSearchParams): ResourceSection {
  const section = params.get("section");
  return section && resourceSections.has(section as ResourceSection)
    ? section as ResourceSection
    : "tracks";
}

function resolveTrackGuideSection(params: URLSearchParams): TrackGuideSection {
  const section = params.get("section");
  return section && trackGuideSections.has(section as TrackGuideSection)
    ? section as TrackGuideSection
    : "overview";
}

function resolveProfileStage(params: URLSearchParams): ProfileStage {
  const profile = params.get("profile");
  return profile && profileStages.has(profile as ProfileStage)
    ? profile as ProfileStage
    : "affiliation";
}
