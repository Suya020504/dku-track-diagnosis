// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let root: Root | undefined;

async function mountAt(href: string) {
  history.replaceState({}, "", href);
  const host = document.querySelector<HTMLDivElement>("#root");
  if (!host) throw new Error("Missing root host");
  root = createRoot(host);
  await act(async () => root?.render(<App />));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("resource-only navigation", () => {
  it("uses four local resource tabs without the global academic journey ribbon", async () => {
    await mountAt("/?view=resources&section=modules");

    expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
    expect(document.querySelector(".planner-shell-layout")?.classList.contains("is-immersive")).toBe(true);
    expect(document.querySelector('nav[aria-label="주요 서비스"]')).not.toBeNull();
    expect(document.querySelector(".planner-guide-index")).toBeNull();
    expect(document.querySelectorAll("[data-resource-section]")).toHaveLength(4);
    expect(document.querySelector('[data-resource-section="modules"]')?.getAttribute("aria-current"))
      .toBe("page");
    expect(document.title).toBe("모듈·과목 자료 | 단국대 식품자원경제학과 트랙제 자가진단");
  });

  it("keeps the contact utility in the same top-navigation shell without an academic ribbon", async () => {
    await mountAt("/?view=contact");

    expect(document.querySelector(".planner-shell-layout")?.classList.contains("is-immersive")).toBe(true);
    expect(document.querySelector('nav[aria-label="주요 서비스"]')).not.toBeNull();
    expect(document.querySelector(".planner-guide-index")).toBeNull();
    expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
    expect(document.querySelectorAll('.planner-shell-primary-nav [aria-current="page"]')).toHaveLength(0);
    expect(document.querySelector('.planner-shell-utility [aria-current="page"]')?.textContent).toContain("문의사항");
  });
});
