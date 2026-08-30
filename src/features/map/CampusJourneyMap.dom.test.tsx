// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CampusJourneyMap, type CampusJourneyStop } from "./CampusJourneyMap";

const onInterest = vi.fn();
const onTracks = vi.fn();
const stops: CampusJourneyStop[] = [
  { id: "interest", state: "current", available: true, onSelect: onInterest },
  { id: "tracks", state: "locked", available: false, unavailableReason: "관심 질문 후 열려요.", onSelect: onTracks },
  { id: "diagnosis", state: "next", available: true, onSelect: vi.fn() },
  { id: "current", state: "locked", available: false, onSelect: vi.fn() },
  { id: "gaps", state: "locked", available: false, onSelect: vi.fn() },
  { id: "next", state: "locked", available: false, onSelect: vi.fn() },
  { id: "plan", state: "optional", available: true, onSelect: vi.fn() },
];

describe("CampusJourneyMap interactions", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    onInterest.mockClear();
    onTracks.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("zooms, resets the map, and returns focus to the current stop", () => {
    act(() => {
      root.render(<CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />);
    });

    const zoomIn = host.querySelector<HTMLButtonElement>('[aria-label="지도 확대"]')!;
    const reset = [...host.querySelectorAll<HTMLButtonElement>(".campus-journey__map-controls button")]
      .find((button) => button.textContent?.includes("현재 위치"))!;
    const output = host.querySelector("output")!;

    act(() => zoomIn.click());
    expect(output.textContent).toBe("110%");

    act(() => reset.click());
    expect(output.textContent).toBe("100%");
    expect(document.activeElement).toBe(host.querySelector('[data-map-stop="interest"]'));
  });

  it("runs available route actions and keeps locked stops focusable with their reason", () => {
    act(() => {
      root.render(<CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />);
    });

    const interest = host.querySelector<HTMLButtonElement>('[data-map-stop="interest"]')!;
    const tracks = host.querySelector<HTMLButtonElement>('[data-map-stop="tracks"]')!;

    act(() => interest.click());
    expect(onInterest).toHaveBeenCalledTimes(1);
    expect(tracks.disabled).toBe(false);
    expect(tracks.getAttribute("aria-disabled")).toBe("true");
    expect(tracks.getAttribute("aria-describedby")).toBe("campus-map-tracks-reason");
    tracks.focus();
    expect(document.activeElement).toBe(tracks);
    act(() => tracks.click());
    expect(onTracks).not.toHaveBeenCalled();
  });
});
