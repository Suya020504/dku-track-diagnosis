// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DiagnosisPanel } from "./App";
import { calculateDiagnosis } from "./lib/diagnosis";
import type { TrackId } from "./types";

function renderPanel(trackIds: TrackId[], completedCourseIds: string[], allowResult = true) {
  const result = calculateDiagnosis({
    trackIds,
    completedCourseIds,
    enrollmentType: "primary",
  });
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <DiagnosisPanel
      result={result}
      selectedTrackNames={trackIds.length ? ["푸드마케팅"] : []}
      enrollmentType="primary"
      completedCount={completedCourseIds.length}
      allowResult={allowResult}
      onShowResult={vi.fn()}
    />,
  );
  return { host, result };
}

describe("DiagnosisPanel planner summary contract", () => {
  it("keeps the planner-scoped progress, metric, track, recommendation, and action hooks together", () => {
    const { host, result } = renderPanel(["food-marketing"], ["B-1", "B-2"]);
    const panel = host.querySelector(".diagnosis-panel.planner-diagnosis-panel");

    expect(panel).toBeTruthy();
    expect(panel?.querySelector('.progress-ring[aria-label^="전체 진행률"]')).toBeTruthy();
    expect(panel?.querySelector(".progress-bar > i")?.getAttribute("style")).toMatch(/width:\s*\d+%/);
    expect(panel?.querySelectorAll(".panel-metrics > .metric.compact")).toHaveLength(2);
    expect(panel?.querySelectorAll(".mini-row")).toHaveLength(result.trackResults.length);
    expect(panel?.querySelectorAll(".recommend-row")).toHaveLength(
      Math.min(3, result.recommendedCourses.length) + result.excludedRequiredCourses.length,
    );
    expect(panel?.querySelector("#diagnosis-result-action.primary-button")).toBeTruthy();
  });

  it("keeps the no-track summary inside the same planner-scoped panel without progress furniture", () => {
    const { host } = renderPanel([], ["B-1"]);
    const panel = host.querySelector(".diagnosis-panel.planner-diagnosis-panel");

    expect(panel).toBeTruthy();
    expect(panel?.querySelector(".empty-state.compact")?.textContent).toContain("1개 과목 체크됨");
    expect(panel?.querySelector(".progress-ring")).toBeNull();
    expect(panel?.querySelector("#diagnosis-result-action.primary-button")).toBeTruthy();
  });
});
