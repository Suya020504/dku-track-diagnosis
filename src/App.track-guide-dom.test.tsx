// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { tracks, OFFICIAL_CURRICULUM_SOURCE } from "./data/curriculumData";
import { OFFICIAL_TRACK_VIDEOS, TRACK_REGULATION_URL, TRACK_DEGREE_VIDEO_URL } from "./data/officialResources";

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
  it("uses the new concept illustration with live captions and no retired guide classes", async () => {
    await mountAt("/?view=track-guide&section=overview");
    expect(document.querySelector(".dku-guide-page")).not.toBeNull();
    expect(document.querySelector('.dku-guide-page [class*="planner-track-guide"]')).toBeNull();
    const illustration = document.querySelector<HTMLImageElement>(".guide-concept img");
    expect(illustration?.getAttribute("src")).toBe("/illustrations/course-module-track-structure-v2.webp");
    expect(document.querySelector("figcaption")?.textContent).toContain("모듈 — 관련 과목의 묶음");
    expect(document.querySelectorAll(".guide-next")).toHaveLength(1);
  });

  it("compares all five authoritative track names and keeps the single next action", async () => {
    await mountAt("/?view=track-guide&section=structure");
    const names = [...document.querySelectorAll("[data-track-guide-track] h3")].map((node) => node.textContent);
    expect(names).toEqual(tracks.map((track) => track.name));
    expect(document.querySelectorAll(".guide-next")).toHaveLength(1);
  });

  it("keeps supporting benefit explanations expandable with primary-source links", async () => {
    await mountAt("/?view=track-guide&section=benefits");
    expect(document.querySelectorAll(".guide-reason-list details")).toHaveLength(4);
    expect(document.querySelectorAll(".guide-reason-list details[open]")).toHaveLength(0);
    expect(document.querySelectorAll(".guide-reason-list details a")).toHaveLength(4);
    const expectedHrefs = [OFFICIAL_CURRICULUM_SOURCE.url, TRACK_REGULATION_URL, OFFICIAL_CURRICULUM_SOURCE.url, TRACK_DEGREE_VIDEO_URL];
    for (const [index, article] of [...document.querySelectorAll(".guide-reason-list article")].entries()) {
      const link = article.querySelector("a");
      expect(link?.getAttribute("aria-label")).toBe(`${article.querySelector("h3")?.textContent} — 근거 원문 확인`);
      expect(link?.getAttribute("href")).toBe(expectedHrefs[index]);
    }
  });

  it.each(["overview", "benefits", "outcomes", "structure"])(
    "keeps the full source ledger in the dedicated materials tab, not %s",
    async (section) => {
      await mountAt(`/?view=track-guide&section=${section}`);
      expect(document.querySelector("[data-guide-source-ledger]")).toBeNull();
      await click("공식 영상·자료");
      expect(document.querySelectorAll("[data-guide-source-ledger]")).toHaveLength(1);
      expect(document.querySelector('a[href="https://cms.dankook.ac.kr/web/ere/-6"]')).not.toBeNull();
    },
  );

  it("opens from the optional landing guide action and restores one guide section through native history", async () => {
    await mountAt("/");

    await click("트랙제 먼저 알아보기");
    expect(new URLSearchParams(location.search).get("view")).toBe("track-guide");
    expect(new URLSearchParams(location.search).get("section")).toBe("overview");
    expect(document.querySelector('[data-track-guide-section="overview"]')).not.toBeNull();
    expect(document.querySelectorAll("[data-track-guide-section]")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.activeElement).toBe(document.querySelector("h1"));
    expect(document.title).toBe("트랙제란? | 단국대 식품자원경제학과 트랙제 자가진단");
    expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
    expect(button("내 트랙 현황 확인하기")).not.toBeNull();
    expect(button("관심으로 트랙 추천받기")).not.toBeNull();
    expect(document.body.textContent).not.toContain("연결해 보는 지도");
    const guideLabel = [...document.querySelectorAll<HTMLElement>(".planner-shell-primary-nav button")]
      .find((candidate) => candidate.textContent?.includes("트랙 가이드"));
    expect(guideLabel?.textContent).toBe("트랙 가이드");
    expect(guideLabel?.getAttribute("aria-current")).toBe("page");

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
    externalVideos.forEach((link, index) => {
      expect(link.getAttribute("aria-label")).toBe(`${OFFICIAL_TRACK_VIDEOS[index].title} — 유튜브에서 보기`);
      expect(link.href).toBe(OFFICIAL_TRACK_VIDEOS[index].watchUrl);
    });
    externalVideos.forEach((link) => expect(link.rel).toContain("noopener"));
  });

  it("separates official facts from the service interpretation and exposes primary sources", async () => {
    await mountAt("/?view=track-guide&section=structure");

    expect(document.body.textContent).toContain("공식 확인");
    expect(document.body.textContent).toContain("서비스에서 이렇게 이해해요");
    expect(document.body.textContent).toContain("5개 트랙");
    expect(document.body.textContent).toContain("15개 모듈");
    expect(document.querySelectorAll("[data-track-guide-track]")).toHaveLength(5);
    await click("공식 영상·자료");
    expect(document.querySelector('a[href^="https://www.dankook.ac.kr/documents/"]')).not.toBeNull();
    expect(document.querySelector('a[href="https://cms.dankook.ac.kr/web/ere/-6"]')).not.toBeNull();
    expect(document.querySelector('a[href="https://www.youtube.com/@FoodandResourcesEconomics_dku/videos"]')).not.toBeNull();
  });

  it("separates the formal degree name from the track notation described by official videos", async () => {
    await mountAt("/?view=track-guide&section=outcomes");

    expect(document.querySelector('[data-track-guide-section="outcomes"]')).not.toBeNull();
    expect(document.body.textContent).toContain("경제학사");
    expect(document.body.textContent).toContain("식품자원경제학");
    expect(document.body.textContent).toContain("별도의 학위명이 아니라");
    expect(document.body.textContent).toContain("학위증·성적증명서");
    expect(document.body.textContent).toContain("2026 운영 여부는 학과 확인 필요");
    expect(document.querySelector('a[href*="seq=9926"]')).not.toBeNull();
    expect(document.querySelector('a[href*="osc9yOuq0IU"][href*="t=860s"]')).not.toBeNull();
  });

  it("moves through benefits, degree outcomes, and track structure as one optional guide journey", async () => {
    await mountAt("/?view=track-guide&section=benefits");

    await click("학위·이수 결과 확인하기");
    expect(new URLSearchParams(location.search).get("section")).toBe("outcomes");
    expect(document.activeElement).toBe(document.querySelector("h1"));

    await click("5개 트랙 구성 비교하기");
    expect(new URLSearchParams(location.search).get("section")).toBe("structure");

    await moveNativeHistory("back");
    expect(new URLSearchParams(location.search).get("section")).toBe("outcomes");
    expect(document.querySelector('[data-track-guide-section="outcomes"]')).not.toBeNull();
  });
});
