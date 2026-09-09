// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { TrackHistoryComparison } from "./TrackHistoryComparison";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("gives each history checkbox a labelled touch target and leaves selection confirmation explicit", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const onConfirmTracks = vi.fn();
  const onPendingChange = vi.fn();
  const selections = [{ courseId: "f-1", status: "completed" as const }];
  const before = JSON.stringify(selections);
  try {
    await act(async () => root.render(<TrackHistoryComparison courseSelections={selections} selectedTrackIds={[]}
      onPendingChange={onPendingChange} onConfirmTracks={onConfirmTracks} onOpenCourses={vi.fn()} onOpenInterest={vi.fn()} />));
    const target = host.querySelector<HTMLLabelElement>('[data-history-track="food-marketing"] .track-history-check-target');
    expect(target?.tagName).toBe("LABEL");
    const checkbox = target?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.getAttribute("aria-label")).toBe("푸드마케팅 함께 선택");
    await act(async () => target!.click());
    expect(onPendingChange).toHaveBeenCalledWith(["food-marketing"]);
    expect(onConfirmTracks).not.toHaveBeenCalled();
    expect(host.textContent).toContain("전공 전체 졸업학점이 아닌 트랙 모듈 조건");
    await act(async () => host.querySelector<HTMLButtonElement>(".track-history-selection button")!.click());
    expect(onConfirmTracks).toHaveBeenCalledWith(["food-marketing"]);
    expect(JSON.stringify(selections)).toBe(before);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
