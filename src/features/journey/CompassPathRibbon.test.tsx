import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompassPathRibbon, type CompassPathItem } from "./CompassPathRibbon";

const items: CompassPathItem[] = [
  { id: "interest", label: "관심 질문", state: "complete", completed: true, available: true, onSelect: vi.fn() },
  { id: "courses", label: "과목", state: "current", completed: false, available: true, onSelect: vi.fn() },
  { id: "modules", label: "모듈", state: "next", completed: false, available: true, onSelect: vi.fn() },
  { id: "track", label: "트랙", state: "pending", completed: false, available: false, unavailableReason: "과목 확인 후 열려요.", onSelect: vi.fn() },
];

describe("CompassPathRibbon", () => {
  it("turns the journey into route controls with readable complete, current, and next states", () => {
    const markup = renderToStaticMarkup(<CompassPathRibbon items={items} />);

    expect(markup).toContain("완료");
    expect(markup).toContain("현재");
    expect(markup).toContain("다음");
    expect(markup).toContain("대기");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('data-journey-stage="interest"');
    expect(markup).toContain('data-completed="true"');
    expect(markup).toContain("과목 확인 후 열려요.");
    expect(markup).toContain("<button");
  });
});
