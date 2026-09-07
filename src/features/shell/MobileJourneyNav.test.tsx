// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileJourneyNav, type MobileJourneyItem } from "./MobileJourneyNav";

const primaryItems: MobileJourneyItem[] = [
  { id: "start", label: "시작", available: true, onSelect: vi.fn() },
  { id: "diagnosis", label: "진단", available: true, onSelect: vi.fn() },
  { id: "result", label: "결과", available: false, unavailableReason: "진단 후 열려요.", onSelect: vi.fn() },
  { id: "plan", label: "계획", available: false, unavailableReason: "결과 확인 후 열려요.", onSelect: vi.fn() },
];

const moreItems: MobileJourneyItem[] = [
  { id: "tracks", label: "트랙", available: true, onSelect: vi.fn() },
  { id: "overview", label: "트랙제 안내", available: true, onSelect: vi.fn() },
  { id: "resources", label: "자료", available: true, onSelect: vi.fn() },
  { id: "contact", label: "문의", available: true, onSelect: vi.fn() },
];

let root: Root | undefined;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
});

describe("MobileJourneyNav", () => {
  it("closes more with Escape and restores keyboard focus", async () => {
    root = createRoot(document.querySelector("#root")!);
    await act(async () => root?.render(<MobileJourneyNav activeId="start" primaryItems={primaryItems} moreItems={moreItems} />));
    const menu = document.querySelector("details")!;
    menu.open = true;
    const item = menu.querySelector("button")!;
    item.focus();
    await act(async () => item.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape",bubbles:true})));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector("summary"));
  });
  it("keeps four primary destinations fixed and exposes a real more menu", () => {
    const markup = renderToStaticMarkup(
      <MobileJourneyNav activeId="diagnosis" primaryItems={primaryItems} moreItems={moreItems} />,
    );

    expect((markup.match(/data-mobile-primary=/g) ?? [])).toHaveLength(4);
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("더보기");
    expect(markup).toContain("트랙");
    expect(markup).toContain("트랙제 안내");
    expect(markup).toContain("자료");
    expect(markup).toContain("문의");
    expect(markup).toContain("<details");
  });

  it("reveals a locked destination reason by touch without navigating", async () => {
    const onLockedSelect = vi.fn();
    const items = primaryItems.map((item) => item.id === "result"
      ? { ...item, onSelect: onLockedSelect }
      : item);
    const container = document.querySelector<HTMLDivElement>("#root");
    if (!container) throw new Error("Missing root");
    root = createRoot(container);
    await act(async () => root?.render(
      <MobileJourneyNav activeId="diagnosis" primaryItems={items} moreItems={moreItems} />,
    ));

    const locked = [...document.querySelectorAll<HTMLButtonElement>(".planner-mobile-nav__primary button")]
      .find((candidate) => candidate.textContent?.includes("결과"));
    if (!locked) throw new Error("Missing locked result destination");

    expect(locked.disabled).toBe(false);
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    expect(locked.querySelector("[data-mobile-lock-label]")?.textContent).toBe("잠김");

    await act(async () => locked.click());

    expect(onLockedSelect).not.toHaveBeenCalled();
    expect(document.querySelector('[role="status"]')?.textContent).toContain("진단 후 열려요.");
  });
});
