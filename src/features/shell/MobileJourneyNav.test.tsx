import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MobileJourneyNav, type MobileJourneyItem } from "./MobileJourneyNav";

const primaryItems: MobileJourneyItem[] = [
  { id: "start", label: "시작", available: true, onSelect: vi.fn() },
  { id: "diagnosis", label: "진단", available: true, onSelect: vi.fn() },
  { id: "result", label: "결과", available: false, unavailableReason: "진단 후 열려요.", onSelect: vi.fn() },
  { id: "plan", label: "계획", available: false, unavailableReason: "결과 확인 후 열려요.", onSelect: vi.fn() },
];

const moreItems: MobileJourneyItem[] = [
  { id: "tracks", label: "트랙", available: true, onSelect: vi.fn() },
  { id: "resources", label: "자료", available: true, onSelect: vi.fn() },
  { id: "contact", label: "문의", available: true, onSelect: vi.fn() },
];

describe("MobileJourneyNav", () => {
  it("keeps four primary destinations fixed and exposes a real more menu", () => {
    const markup = renderToStaticMarkup(
      <MobileJourneyNav activeId="diagnosis" primaryItems={primaryItems} moreItems={moreItems} />,
    );

    expect((markup.match(/data-mobile-primary=/g) ?? [])).toHaveLength(4);
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("더보기");
    expect(markup).toContain("트랙");
    expect(markup).toContain("자료");
    expect(markup).toContain("문의");
    expect(markup).toContain("<details");
  });
});
