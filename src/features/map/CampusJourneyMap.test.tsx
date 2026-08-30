import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CampusJourneyMap, type CampusJourneyStop } from "./CampusJourneyMap";

const stops: CampusJourneyStop[] = [
  { id: "interest", state: "current", available: true, onSelect: vi.fn() },
  { id: "tracks", state: "next", available: false, unavailableReason: "관심 질문 후 열려요.", onSelect: vi.fn() },
  { id: "diagnosis", state: "next", available: true, onSelect: vi.fn() },
  { id: "current", state: "locked", available: false, unavailableReason: "과목 확인 후 열려요.", onSelect: vi.fn() },
  { id: "gaps", state: "locked", available: false, unavailableReason: "진단 후 열려요.", onSelect: vi.fn() },
  { id: "next", state: "locked", available: false, unavailableReason: "진단 후 열려요.", onSelect: vi.fn() },
  { id: "plan", state: "optional", available: true, onSelect: vi.fn() },
];

describe("CampusJourneyMap", () => {
  it("renders two real route choices, a merge point, and optional planner destination", () => {
    const markup = renderToStaticMarkup(
      <CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />,
    );

    expect(markup).toContain("내 관심 트랙 찾기");
    expect(markup).toContain("이수 과목 바로 진단");
    expect(markup).toContain("두 경로가 합류");
    expect(markup).toContain("학기 플래너");
    expect(markup).toContain("선택 서비스");
    expect(markup).toContain("campus-journey__route--interest");
    expect(markup).toContain("campus-journey__route--diagnosis");
    expect(markup).toContain("campus-journey__route--shared");
    expect(markup).toContain("campus-journey__route--optional");
    expect(markup).toContain("내 관심 트랙 찾기 · 질문으로 출발 · 현재 위치");
  });

  it("keeps every stop semantic and exposes locked reasons", () => {
    const markup = renderToStaticMarkup(
      <CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />,
    );

    expect((markup.match(/data-map-stop=/g) ?? []).length).toBe(7);
    expect(markup).toContain('data-current-position="true"');
    expect(markup).toContain("관심 질문 후 열려요.");
    expect(markup).toContain("과목 확인 후 열려요.");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('aria-describedby="campus-map-tracks-reason"');
    expect(markup).toContain('aria-describedby="campus-route-list-tracks-reason"');
  });

  it("keeps the journey map fixed and provides an accessible route list", () => {
    const markup = renderToStaticMarkup(
      <CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />,
    );

    expect(markup).toContain('data-map-mode="fixed"');
    expect(markup).not.toContain('aria-label="지도 확대"');
    expect(markup).not.toContain('aria-label="지도 축소"');
    expect(markup).not.toContain('aria-label="지도 조절"');
    expect(markup).toContain("지도 경로를 목록으로 보기");
  });

  it("uses the generated conceptual background and says it is not a real campus map", () => {
    const markup = renderToStaticMarkup(
      <CampusJourneyMap stops={stops} onOpenTrackGuide={vi.fn()} />,
    );

    expect(markup).toContain("/illustrations/academic-journey-campus-map-flat-v2.webp");
    expect(markup).toContain("실제 캠퍼스 지리 안내가 아닙니다");
    expect(markup).toContain("2·3학년도 현재 이수 과목으로 참고 진단할 수 있습니다");
  });
});
