// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let root: Root | undefined;

async function mountAt(href: string) {
  history.replaceState({}, "", href);
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

function helpButton(): HTMLButtonElement {
  const control = document.querySelector<HTMLButtonElement>('[aria-label="도움말 열기"]');
  if (!control) throw new Error("Missing help button");
  return control;
}

function button(label: string): HTMLButtonElement {
  const control = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!control) throw new Error(`Missing button: ${label}`);
  return control;
}

function guideButton(label: string): HTMLButtonElement {
  const control = [...document.querySelectorAll<HTMLButtonElement>(".planner-guide-index button, .planner-shell-map-nav button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!control) throw new Error(`Missing guide button: ${label}`);
  return control;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  document.body.style.overflow = "";
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  document.body.style.overflow = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("App help dialog", () => {
  it.each([
    "/",
    "/?view=overview",
    "/?view=resources&section=modules",
    "/?view=contact",
  ])("starts %s with help closed", async (href) => {
    await mountAt(href);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelector(".planner-shell-background")?.hasAttribute("inert")).toBe(false);
  });

  it("opens as a keyboard modal, traps focus, closes with Escape, and restores the invoker", async () => {
    await mountAt("/?view=overview");
    const invoker = helpButton();
    invoker.focus();

    await act(async () => invoker.click());

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const heading = document.querySelector<HTMLHeadingElement>("#guide-dialog-title");
    const background = document.querySelector<HTMLElement>(".planner-shell-background");
    if (!dialog || !heading || !background) throw new Error("Missing modal structure");
    expect(document.activeElement).toBe(heading);
    expect(background.hasAttribute("inert")).toBe(true);
    expect(background.getAttribute("aria-hidden")).toBe("true");
    expect(dialog.closest(".planner-shell-background")).toBeNull();
    expect(dialog.querySelector('nav[aria-label="사용 단계"]')).not.toBeNull();
    expect(dialog.textContent).toContain("목표 트랙이 아직 없어도 5개 트랙을 비교할 수 있습니다");
    expect(dialog.textContent).toContain("목표 트랙은 선택 사항");
    expect(dialog.textContent).not.toContain("관심 트랙 복수 선택");
    expect(document.body.style.overflow).toBe("hidden");

    const controls = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    expect(controls.length).toBeGreaterThan(2);
    const first = controls[0];
    const last = controls.at(-1);
    if (!last) throw new Error("Missing final modal control");

    await act(async () => heading.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Tab",
      shiftKey: true,
    })));
    expect(document.activeElement).toBe(last);

    last.focus();
    await act(async () => last.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Tab",
    })));
    expect(document.activeElement).toBe(first);

    first.focus();
    await act(async () => first.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Tab",
      shiftKey: true,
    })));
    expect(document.activeElement).toBe(last);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Escape",
    })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(background.hasAttribute("inert")).toBe(false);
    expect(background.getAttribute("aria-hidden")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(invoker);
  });

  it("focuses the landing H1 on initial load and after shell or history returns", async () => {
    await mountAt("/");

    const initialHeading = document.querySelector<HTMLHeadingElement>("#campus-journey-title");
    expect(initialHeading?.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(initialHeading);

    await act(async () => guideButton("트랙 가이드").click());
    expect(new URLSearchParams(location.search).get("view")).toBe("track-guide");

    await act(async () => guideButton("지도 안내").click());
    expect(location.search).toBe("");
    expect(document.activeElement).toBe(document.querySelector("#campus-journey-title"));

    history.pushState({}, "", "/?view=overview");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    history.pushState({}, "", "/");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(document.activeElement).toBe(document.querySelector("#campus-journey-title"));
  });

  it("closes the overlay before a help action navigates and focuses the destination", async () => {
    await mountAt("/");
    await act(async () => helpButton().click());

    await act(async () => button("자가진단 열기").click());

    const params = new URLSearchParams(location.search);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(params.get("view")).toBe("diagnosis");
    expect(params.get("step")).toBe("profile");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.activeElement).toBe(document.querySelector("h1"));
  });
});
