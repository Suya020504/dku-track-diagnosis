import { describe, expect, it } from "vitest";
import type { AppRoute } from "../lib/appRouting";
import { resolveJourneyView } from "./journeyView";

describe("planner journey view", () => {
  it.each<[AppRoute, string]>([
    [{ view: "landing" }, "interest"],
    [{ view: "diagnosis", step: "courses" }, "courses"],
    [{ view: "resources", section: "modules" }, "modules"],
    [{ view: "track-guide", section: "overview" }, "interest"],
    [{ view: "result", section: "current" }, "track"],
    [{ view: "plan", step: "setup" }, "semester"],
  ])("maps %o to the %s planner stage", (route, stage) => {
    expect(resolveJourneyView(route).stage).toBe(stage);
  });
});
