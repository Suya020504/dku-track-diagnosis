// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompassPathRibbon, type CompassPathItem } from "./CompassPathRibbon";

const items: CompassPathItem[] = [
  { id: "interest", label: "관심 질문", state: "complete", completed: true, available: true, onSelect: vi.fn() },
  { id: "courses", label: "과목", state: "complete", completed: true, available: true, onSelect: vi.fn() },
  { id: "modules", label: "모듈", state: "current", completed: false, available: true, onSelect: vi.fn() },
  { id: "track", label: "트랙", state: "next", completed: false, available: true, onSelect: vi.fn() },
  { id: "plan", label: "계획", state: "pending", completed: false, available: false, unavailableReason: "과목 확인 후 열려요.", onSelect: vi.fn() },
];

describe("CompassPathRibbon", () => {
  it("turns the journey into route controls with readable complete, current, and next states", () => {
    const markup = renderToStaticMarkup(<CompassPathRibbon items={items} />);

    expect(markup).toContain("완료");
    expect(markup).toContain("현재");
    expect(markup).toContain("다음");
    expect(markup).toContain("잠김");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('data-journey-stage="interest"');
    expect(markup).toContain('data-completed="true"');
    expect(markup).toContain("과목 확인 후 열려요.");
    expect(markup).toContain("<button");

    document.body.innerHTML = markup;
    const completed = [...document.querySelectorAll<HTMLElement>('[data-completed="true"]')];
    expect(completed).toHaveLength(2);
    expect(completed.every((item) => item.textContent?.includes("완료"))).toBe(true);
  });

  it("keeps one flat progress structure with a single current step and no decorative folds", () => {
    const markup = renderToStaticMarkup(<CompassPathRibbon items={items} />);
    document.body.innerHTML = markup;

    const route = document.querySelector<HTMLElement>('[data-path-layout="linear-progress"]');
    const segments = [...document.querySelectorAll<HTMLElement>("[data-path-segment]")];

    expect(route).not.toBeNull();
    expect(route?.querySelector("ol")?.classList.contains("planner-compass-path__route")).toBe(true);
    expect(segments).toHaveLength(items.length);
    expect(document.querySelectorAll("[data-path-fold]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-path-state-icon]")).toHaveLength(items.length);
    expect(document.querySelectorAll('[data-visual-state="complete"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-visual-state="current"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-visual-state="next"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-visual-state="locked"]')).toHaveLength(1);
    expect(document.querySelectorAll("[data-current-position]")).toHaveLength(1);
    expect(document.querySelector('[data-visual-state="locked"]')?.textContent).toContain("잠김");
    expect(segments.every((segment) => segment.querySelector(":scope > button") !== null)).toBe(true);
  });
});
