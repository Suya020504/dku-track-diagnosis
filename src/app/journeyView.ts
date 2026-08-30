import type { AppRoute } from "../lib/appRouting";

export type JourneyStage = "interest" | "courses" | "modules" | "track" | "semester";

export type JourneyView = {
  stage: JourneyStage;
  label: string;
  index: number;
};

export const PLANNER_JOURNEY: readonly JourneyView[] = [
  { stage: "interest", label: "관심 질문", index: 0 },
  { stage: "courses", label: "과목", index: 1 },
  { stage: "modules", label: "모듈", index: 2 },
  { stage: "track", label: "트랙", index: 3 },
  { stage: "semester", label: "다음 학기", index: 4 },
] as const;

export function resolveJourneyView(route: AppRoute): JourneyView {
  const stage = resolveJourneyStage(route);
  return PLANNER_JOURNEY.find((view) => view.stage === stage) ?? PLANNER_JOURNEY[0];
}

function resolveJourneyStage(route: AppRoute): JourneyStage {
  if (route.view === "landing" || route.view === "overview" || route.view === "contact") {
    return "interest";
  }

  if (route.view === "recommendation") {
    return route.step === "axes" ? "track" : "interest";
  }

  if (route.view === "diagnosis") return "courses";
  if (route.view === "plan") return "semester";
  if (route.view === "result") return route.section === "next" ? "semester" : "track";

  if (route.view !== "resources") return "interest";
  if (route.section === "modules" || route.section === "curriculum") return "modules";
  return "track";
}
