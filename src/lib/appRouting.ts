import type { SavedAppStateV2 } from "../types";
import { resolveDiagnosisStep, type DiagnosisStep } from "./viewRouting";

export type AppRoute =
  | { view: "landing" }
  | { view: "diagnosis"; step: DiagnosisStep }
  | {
      view: "recommendation";
      step: "survey" | "axes";
      axis?: "interest" | "progress" | "plan";
    }
  | { view: "plan"; step: "setup" | "schedule" | "checks" }
  | { view: "overview" | "resources" | "modules" | "result" | "contact" };

const simpleViews = new Set(["overview", "resources", "modules", "contact"] as const);
const recommendationAxes = new Set(["interest", "progress", "plan"] as const);
const planSteps = new Set(["setup", "schedule", "checks"] as const);

export function resolveAppRoute(
  search: string,
  state: SavedAppStateV2,
): AppRoute {
  const params = new URLSearchParams(search);
  const view = params.get("view");

  if (view === "diagnosis" || view === "result") {
    const step = resolveDiagnosisStep(search, state);
    return step === "result" ? { view: "result" } : { view: "diagnosis", step };
  }

  if (view === "lab") {
    return { view: "recommendation", step: "axes" };
  }

  if (view === "experiment") {
    return { view: "plan", step: "setup" };
  }

  if (view === "recommendation") {
    const step = params.get("step") === "axes" ? "axes" : "survey";
    if (step === "survey") return { view: "recommendation", step };

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
    const step = requested === "schedule" && !state.graduationPlanPreferences
      ? "setup"
      : requested;
    return { view: "plan", step };
  }

  if (simpleViews.has(view as "overview" | "resources" | "modules" | "contact")) {
    return { view: view as "overview" | "resources" | "modules" | "contact" };
  }

  return { view: "landing" };
}

export function buildAppHref(currentHref: string, route: AppRoute): string {
  const url = new URL(currentHref, "https://local.invalid");

  if (route.view === "landing") {
    clearRouteParams(url);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "diagnosis") {
    url.searchParams.set("view", route.step === "result" ? "result" : "diagnosis");
    url.searchParams.set("step", route.step);
    url.searchParams.delete("axis");
    url.searchParams.delete("section");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "result") {
    url.searchParams.set("view", "result");
    url.searchParams.set("step", "result");
    url.searchParams.delete("axis");
    url.searchParams.delete("section");
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
    url.searchParams.delete("section");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  if (route.view === "plan") {
    url.searchParams.set("view", "plan");
    url.searchParams.set("step", route.step);
    url.searchParams.delete("axis");
    url.searchParams.delete("section");
    return `${url.pathname}${url.search}${url.hash}`;
  }

  url.searchParams.set("view", route.view);
  url.searchParams.delete("step");
  url.searchParams.delete("axis");
  url.searchParams.delete("section");
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
    section: _section,
    ...unrelatedState
  } = currentState;
  const state = { ...unrelatedState, ...routeHistoryState(route) };
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", href);
}

function clearRouteParams(url: URL): void {
  url.searchParams.delete("view");
  url.searchParams.delete("step");
  url.searchParams.delete("axis");
  url.searchParams.delete("section");
}

function routeHistoryState(route: AppRoute): Record<string, string> {
  if (route.view === "diagnosis") {
    return {
      view: route.step === "result" ? "result" : "diagnosis",
      step: route.step,
    };
  }
  if (route.view === "result") return { view: "result", step: "result" };
  if (route.view === "recommendation") {
    return route.step === "axes" && route.axis
      ? { view: route.view, step: route.step, axis: route.axis }
      : { view: route.view, step: route.step };
  }
  if (route.view === "plan") return { view: route.view, step: route.step };
  return { view: route.view };
}
