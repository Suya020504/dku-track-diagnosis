import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CampusJourneyStop } from "./CampusJourneyMap";
import { CampusMapLanding } from "./CampusMapLanding";

const stops: CampusJourneyStop[] = [
  { id: "interest", state: "current", available: true, onSelect: vi.fn() },
  { id: "tracks", state: "next", available: true, onSelect: vi.fn() },
  { id: "diagnosis", state: "next", available: true, onSelect: vi.fn() },
  { id: "current", state: "locked", available: false, onSelect: vi.fn() },
  { id: "gaps", state: "locked", available: false, onSelect: vi.fn() },
  { id: "next", state: "locked", available: false, onSelect: vi.fn() },
  { id: "plan", state: "optional", available: true, onSelect: vi.fn() },
];

describe("CampusMapLanding", () => {
  it("makes the map the main experience and labels the planner as optional", () => {
    const markup = renderToStaticMarkup(
      <CampusMapLanding
        mapStops={stops}
        plannerStatus="empty"
        onOpenTrackGuide={vi.fn()}
      />,
    );

    expect(markup).toContain("campus-journey__map-shell");
    expect(markup).toContain("보조 서비스 · 선택");
    expect(markup).toContain("학기 플래너는 진단 뒤 선택하세요");
    expect(markup).toContain("자가진단 후 선택 가능");
  });

  it("offers the saved plan only when a planner action exists", () => {
    const markup = renderToStaticMarkup(
      <CampusMapLanding
        mapStops={stops}
        plannerStatus="saved-plan"
        onPlannerAction={vi.fn()}
        onOpenTrackGuide={vi.fn()}
      />,
    );

    expect(markup).toContain("저장한 계획 보기");
    expect(markup).toContain("저장한 계획 있음");
  });
});
