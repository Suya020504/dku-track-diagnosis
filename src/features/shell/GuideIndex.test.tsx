import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuideIndex, type GuideIndexItem } from "./GuideIndex";

const items: GuideIndexItem[] = [
  { id: "start", index: "01", label: "시작하기", available: true, onSelect: vi.fn() },
  { id: "result", index: "04", label: "결과", available: false, unavailableReason: "이수 과목을 먼저 확인해 주세요.", onSelect: vi.fn() },
];

describe("GuideIndex", () => {
  it("marks the route-derived item current and explains an unavailable destination", () => {
    const markup = renderToStaticMarkup(<GuideIndex items={items} activeId="start" />);

    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain("이수 과목을 먼저 확인해 주세요.");
  });
});
