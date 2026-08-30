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

  it("keeps the map fixed and opens the separate track guide", () => {
    const onOpenTrackGuide = vi.fn();
    act(() => {
      root.render(<CampusJourneyMap stops={stops} onOpenTrackGuide={onOpenTrackGuide} />);
    });

    expect(host.querySelector(".campus-journey__map-controls")).toBeNull();
    expect(host.querySelector('[data-map-mode="fixed"]')).not.toBeNull();
    const guide = host.querySelector<HTMLButtonElement>(".campus-journey__track-action")!;
    act(() => guide.click());
    expect(onOpenTrackGuide).toHaveBeenCalledTimes(1);
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
