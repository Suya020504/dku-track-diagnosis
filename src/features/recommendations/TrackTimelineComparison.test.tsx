// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TrackTimelineComparison } from "./TrackTimelineComparison";
import * as comparison from "./compareTrackTimelines";
import type { CourseSelectionRecord } from "../../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function change(field: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("only computes after valid explicit submission and hides stale results when conditions or history change", async () => {
  const calculate = vi.spyOn(comparison, "compareTrackTimelines");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const selections: CourseSelectionRecord[] = [];
  try {
    await act(async () => root.render(<TrackTimelineComparison courseSelections={selections} />));
    const inputs = [...host.querySelectorAll("input")];
    const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);
    expect(calculate).not.toHaveBeenCalled();
    await change(inputs[1], "2028-");
    expect(submit.disabled).toBe(true);
    await change(inputs[1], "2028-2");
    expect(submit.disabled).toBe(false);
    expect(calculate).not.toHaveBeenCalled();
    await act(async () => submit.click());
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll("[data-timeline-track]")).toHaveLength(5);
    expect(host.textContent).toContain("수강 중·수강 예정 과목을 통과한다고 가정");
    expect(host.textContent).toContain("가장 빠른 완성 시점을 보장하지");
    await change(inputs[2], "2");
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll("[data-timeline-track]")).toHaveLength(0);
    expect(host.querySelector('[role="status"]')?.textContent).toContain("다시 비교");
    await act(async () => submit.click());
    expect(calculate).toHaveBeenCalledTimes(2);
    await act(async () => root.render(<TrackTimelineComparison courseSelections={[{ courseId: "f-1", status: "completed" }]} />));
    expect(host.querySelectorAll("[data-timeline-track]")).toHaveLength(0);
    expect(selections).toEqual([]);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    calculate.mockRestore();
  }
});

it("restores saved condition defaults without automatically calculating or accepting an impossible horizon", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<TrackTimelineComparison courseSelections={[]} initialPreferences={{
      currentTerm: "2027-1", targetGraduationTerm: "2029-2", maxMajorCoursesPerTerm: 2, considerSeasonalTerm: false,
    }} />));
    const inputs = [...host.querySelectorAll("input")];
    expect(inputs.map(input => input.value)).toEqual(["2027-1", "2029-2", "2"]);
    expect(host.querySelectorAll("[data-timeline-track]")).toHaveLength(0);
    await change(inputs[1], "2034-1");
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("12개 정규학기");
    await change(inputs[1], "2026-2");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("현재 학기와 같거나 이후");
  } finally {
    await act(async () => root.unmount());
  }
});
