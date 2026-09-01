// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

let root: Root | undefined;

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim().includes(label));
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

async function mountAt(href: string) {
  history.replaceState({}, "", href);
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

async function click(label: string) {
  await act(async () => button(label).click());
}

async function moveNativeHistory(direction: "back" | "forward") {
  await act(async () => {
    const popped = new Promise<void>((resolve) => {
      window.addEventListener("popstate", () => resolve(), { once: true });
    });
    history[direction]();
    await popped;
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
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

describe("separate track guide journey", () => {
  it("opens from the map and restores one guide section through native history", async () => {
    await mountAt("/");

    await click("트랙 상세 가이드");
    expect(new URLSearchParams(location.search).get("view")).toBe("track-guide");
    expect(new URLSearchParams(location.search).get("section")).toBe("overview");
    expect(document.querySelector('[data-track-guide-section="overview"]')).not.toBeNull();
    expect(document.querySelectorAll("[data-track-guide-section]")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.activeElement).toBe(document.querySelector("h1"));
    expect(document.title).toBe("트랙제란? | 단국대 식품자원경제학과 트랙제 자가진단");
    expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
    const guideLabel = [...document.querySelectorAll<HTMLElement>(".planner-guide-index strong")]
      .find((candidate) => candidate.textContent?.includes("트랙 가이드"));
    expect(guideLabel?.textContent).toBe("트랙 가이드");

    await click("트랙제의 장점");
    expect(new URLSearchParams(location.search).get("section")).toBe("benefits");
    expect(document.querySelector('[data-track-guide-section="benefits"]')).not.toBeNull();
    expect(document.querySelectorAll("[data-track-guide-section]")).toHaveLength(1);
    expect(document.title).toBe("트랙제의 장점 | 단국대 식품자원경제학과 트랙제 자가진단");

    await moveNativeHistory("back");
    expect(new URLSearchParams(location.search).get("section")).toBe("overview");
    expect(document.querySelector('[data-track-guide-section="overview"]')).not.toBeNull();
  });

  it("does not add duplicate history when the current guide tab is selected again", async () => {
    await mountAt("/?view=track-guide&section=overview");
    const pushState = vi.spyOn(history, "pushState");

    await click("트랙제란?");

    expect(pushState).not.toHaveBeenCalled();
    expect(new URLSearchParams(location.search).get("section")).toBe("overview");
  });

  it("shows the official four-part video series without loading YouTube before consent", async () => {
    await mountAt("/?view=track-guide&section=videos&video=osc9yOuq0IU");

    expect(document.querySelectorAll("[data-official-track-video]")).toHaveLength(4);
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.body.textContent).toContain("3편 · 트랙제");
    expect(document.body.textContent).toContain("2024년 공식 설명");

    await click("공식 영상 재생");
    const iframe = document.querySelector<HTMLIFrameElement>("iframe");
    expect(iframe?.src).toBe("https://www.youtube-nocookie.com/embed/osc9yOuq0IU?rel=0&autoplay=1");
    expect(iframe?.title).toContain("모듈형 교육과정 트랙제_3편");

    await click("2편 · 모듈형 교육과정");
    expect(new URLSearchParams(location.search).get("video")).toBe("iuXHSSuc0UQ");
    expect(document.querySelector<HTMLIFrameElement>("iframe")?.src)
      .toBe("https://www.youtube-nocookie.com/embed/iuXHSSuc0UQ?rel=0&autoplay=1");

    await moveNativeHistory("back");
    expect(new URLSearchParams(location.search).get("video")).toBe("osc9yOuq0IU");
    expect(document.querySelector<HTMLIFrameElement>("iframe")?.src)
      .toBe("https://www.youtube-nocookie.com/embed/osc9yOuq0IU?rel=0&autoplay=1");

    await moveNativeHistory("forward");
    expect(new URLSearchParams(location.search).get("video")).toBe("iuXHSSuc0UQ");
    expect(document.querySelector<HTMLIFrameElement>("iframe")?.src)
      .toBe("https://www.youtube-nocookie.com/embed/iuXHSSuc0UQ?rel=0&autoplay=1");

    const externalVideos = document.querySelectorAll<HTMLAnchorElement>(
      '[data-official-track-video] a[target="_blank"]',
    );
    expect(externalVideos).toHaveLength(4);
    externalVideos.forEach((link) => expect(link.rel).toContain("noopener"));
  });

  it("separates official facts from the service interpretation and exposes primary sources", async () => {
    await mountAt("/?view=track-guide&section=structure");

    expect(document.body.textContent).toContain("공식 확인");
    expect(document.body.textContent).toContain("서비스에서 이렇게 이해해요");
    expect(document.body.textContent).toContain("5개 트랙");
    expect(document.body.textContent).toContain("15개 모듈");
    expect(document.querySelectorAll("[data-track-guide-track]")).toHaveLength(5);
    expect(document.querySelector('a[href^="https://www.dankook.ac.kr/documents/"]')).not.toBeNull();
    expect(document.querySelector('a[href="https://cms.dankook.ac.kr/web/ere/-6"]')).not.toBeNull();
    expect(document.querySelector('a[href="https://www.youtube.com/@FoodandResourcesEconomics_dku/videos"]')).not.toBeNull();
  });
});
