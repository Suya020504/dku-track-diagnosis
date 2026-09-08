// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";
import { modules, tracks } from "../../data/curriculumData";

let root: Root | undefined;

async function mountAt(search: string) {
  history.replaceState({}, "", `/${search}`);
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => root?.render(<App />));
}

async function goTo(search: string) {
  history.pushState({}, "", `/${search}`);
  await act(async () => {
    window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
  });
}

async function moveNativeHistory(direction: "back" | "forward") {
  await act(async () => {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener("popstate", handlePopState);
        reject(new Error(`Timed out waiting for history.${direction}()`));
      }, 2_000);
      function handlePopState() {
        window.clearTimeout(timeoutId);
        window.removeEventListener("popstate", handlePopState);
        resolve();
      }
      window.addEventListener("popstate", handlePopState, { once: true });
      window.history[direction]();
    });
  });
}

function resourceButton(section: string): HTMLButtonElement {
  const control = document.querySelector<HTMLButtonElement>(`[data-resource-section="${section}"]`);
  if (!control) throw new Error(`Missing resource control: ${section}`);
  return control;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
  history.replaceState({}, "", "/");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("resource reading routes", () => {
  it("gives every original-document link a distinct accessible name", async () => {
    await mountAt("?view=resources&section=official");
    const links = [...document.querySelectorAll<HTMLAnchorElement>(".dku-resource-source-list > li > a")];
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "학과 정규 교과과정 원문 열기",
      "2026-2 실제 개설 시간표 원문 열기",
      "2026학년도 학사종합안내 원문 열기",
    ]);
    expect(links.every((link) => link.textContent === "원문 열기 ↗")).toBe(true);
  });

  it("renders five focused URLs with a route-controlled active page index", async () => {
    await mountAt("?view=resources&section=tracks");

    for (const section of ["tracks", "modules", "curriculum", "timetable", "official"] as const) {
      if (section !== "tracks") await goTo(`?view=resources&section=${section}`);

      expect(document.querySelector(`[data-resource-page="${section}"]`)).not.toBeNull();
      expect(document.querySelector(`[data-resource-section="${section}"]`)?.getAttribute("aria-current"))
        .toBe("page");
      expect(document.querySelector(`[data-resource-section="${section}"]`)?.getAttribute("aria-selected"))
        .toBeNull();
      expect(document.querySelectorAll("[data-resource-page]")).toHaveLength(1);
      expect(document.activeElement).toBe(document.querySelector(`#resource-page-${section}`));
    }
  });

  it("focuses each clicked resource page heading while updating the URL", async () => {
    await mountAt("?view=resources&section=tracks");

    for (const section of ["modules", "curriculum", "timetable", "official"] as const) {
      await act(async () => resourceButton(section).click());

      expect(new URLSearchParams(location.search).get("section")).toBe(section);
      expect(document.activeElement).toBe(document.querySelector(`#resource-page-${section}`));
      expect(window.scrollTo).toHaveBeenLastCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }
  });

  it("restores resource heading focus and scroll through native back and forward history", async () => {
    await mountAt("?view=resources&section=modules");
    await act(async () => resourceButton("curriculum").click());
    expect(location.search).toBe("?view=resources&section=curriculum");

    const scrollTo = vi.mocked(window.scrollTo);
    scrollTo.mockClear();
    await moveNativeHistory("back");

    expect(location.search).toBe("?view=resources&section=modules");
    expect(resourceButton("modules").getAttribute("aria-current")).toBe("page");
    const moduleHeading = document.querySelector("h1#resource-page-modules");
    expect(moduleHeading).not.toBeNull();
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.activeElement).toBe(moduleHeading);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });

    scrollTo.mockClear();
    await moveNativeHistory("forward");

    expect(location.search).toBe("?view=resources&section=curriculum");
    expect(resourceButton("curriculum").getAttribute("aria-current")).toBe("page");
    const curriculumHeading = document.querySelector("h1#resource-page-curriculum");
    expect(curriculumHeading).not.toBeNull();
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.activeElement).toBe(curriculumHeading);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("keeps official track names and module scope, with a usable image fallback", async () => {
    await mountAt("?view=resources&section=tracks");
    for (const track of tracks) expect(document.body.textContent).toContain(track.name);
    expect(document.body.textContent).toContain("F/H/I 각각 3학점 이상");
    expect(document.body.textContent).toContain("M 8학점");
    expect(document.body.textContent).toContain("N+O 7학점");
    const image = document.querySelector<HTMLImageElement>('[data-concept-image="course-module-track"]')!;
    expect(image.src).toContain("course-module-track-structure-v2.webp");
    await act(async () => image.dispatchEvent(new Event("error")));
    expect(document.querySelector('[data-concept-fallback="course-module-track"]')?.textContent).toContain("아래 목록");
    await goTo("?view=resources&section=modules");
    for (const module of modules) expect(document.body.textContent).toContain(`${module.id}. ${module.name}`);
    expect(document.body.textContent).toContain("49과목");
    expect(document.body.textContent).toContain("45과목");
  });

  it("renders the complete department table rather than a track or timetable proxy", async () => {
    await mountAt("?view=resources&section=curriculum");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(47);
    expect(document.body.textContent).toContain("게시·개정연도 미표기");
    expect(document.body.textContent).toContain("국내인턴십1(환경자원경제)");
    expect(document.body.textContent).toContain("18학점");
    expect(document.querySelectorAll('[data-label="트랙 자료 연결"]')).toHaveLength(47);
    expect([...document.querySelectorAll('[data-label="트랙 자료 연결"]')].filter((node) => node.textContent?.includes("트랙 밖"))).toHaveLength(10);
  });

  it("shows all actual sections with unknowns and source meaning intact", async () => {
    await mountAt("?view=resources&section=timetable");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(37);
    expect(document.body.textContent).toContain("19:50–21:35");
    expect(document.body.textContent).toContain("토 7~10교시");
    expect(document.body.textContent).toContain("교수 미표기");
    expect(document.body.textContent).toContain("실시간 수업 여부 미표기");
    expect(document.body.textContent).toContain("사전녹화온라인강의");
    expect(document.body.textContent).toContain("실시간 자동 갱신되지 않습니다");
  });

  it("keeps official sources, functional videos, contact and historical boundaries", async () => {
    await mountAt("?view=resources&section=official");
    const page = document.querySelector('[data-resource-page="official"]')!;
    expect(page.querySelector('a[href="https://cms.dankook.ac.kr/web/ere"]')).not.toBeNull();
    expect(page.querySelector('a[href="https://www.youtube.com/@FoodandResourcesEconomics_dku/videos"]')).not.toBeNull();
    expect(page.querySelectorAll('a[href*="youtube.com/watch"]')).toHaveLength(4);
    for (const link of page.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')) {
      expect(link.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
      expect(new URL(link.href).protocol).toBe("https:");
    }
    expect(page.textContent).toContain("과거 2026-1 개설 이력을 소급 검증하지 않았습니다");
    expect(page.textContent).toContain("인쇄 60쪽");
    expect(document.querySelector(".dku-resource-footer")?.textContent).toContain("학과 공개·제공 자료를 바탕으로 안내");
  });
});
