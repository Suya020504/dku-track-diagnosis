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
  it("renders four focused URLs with a route-controlled active page index", async () => {
    await mountAt("?view=resources&section=tracks");

    for (const section of ["tracks", "modules", "curriculum", "official"] as const) {
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

    for (const section of ["modules", "curriculum", "official"] as const) {
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

  it("uses the current curriculum data and evidence states on track and module pages", async () => {
    await mountAt("?view=resources&section=tracks");

    for (const track of tracks) expect(document.body.textContent).toContain(track.name);
    expect(document.body.textContent).toContain("F/H/I 각각 3학점 이상");
    expect(document.body.textContent).toContain("F/H/I 합산 15학점");
    expect(document.body.textContent).toContain("M 8학점");
    expect(document.body.textContent).toContain("N+O 7학점");
    expect(document.querySelector('[data-evidence-state="official-public-confirmed"]')).not.toBeNull();
    expect(document.querySelector('[data-concept-image="course-module-track"]')?.getAttribute("alt"))
      .toBe("과목 카드가 모듈 폴더로 분류되고 다섯 트랙 카드로 정리되는 개념 설명 이미지");
    expect(document.querySelector<HTMLImageElement>('[data-concept-image="course-module-track"]')?.src)
      .toContain("course-module-track-structure-v2.webp");

    await goTo("?view=resources&section=modules");
    for (const module of modules) expect(document.body.textContent).toContain(`${module.id}. ${module.name}`);
    expect(document.body.textContent).toContain("이후 개설을 보장하지 않습니다");
    expect(document.querySelector('[data-evidence-state="historical-2026-snapshot"]')).not.toBeNull();
  });

  it("keeps curriculum meaning in HTML and exposes a non-image fallback", async () => {
    await mountAt("?view=resources&section=curriculum");

    expect(document.querySelector("table")?.textContent).toContain("추천 시점");
    expect(document.body.textContent).toContain("과목에서 트랙까지 이렇게 이어져요");
    expect(document.body.textContent).toContain("식품유통경제학");
    expect(document.body.textContent).toContain("필수 과목 참고안: 6과목 · 18학점");
    expect(document.querySelector('.planner-course-track-figure [data-evidence-state="official-public-confirmed"]'))
      .not.toBeNull();
    expect(document.querySelector(".planner-course-track-figure")?.textContent)
      .toContain("2026학년도 학사종합안내의 현재 공개본 72쪽");
    expect(document.querySelector('[data-concept-image="progress-next-semester"]')?.getAttribute("alt"))
      .toBe("체크한 과목 카드와 선택 과목을 학기 플래너에 정리하는 개념 설명 이미지");
    expect(document.querySelector<HTMLImageElement>('[data-concept-image="progress-next-semester"]')?.src)
      .toContain("progress-next-semester-planner-v2.webp");

    const image = document.querySelector<HTMLImageElement>('[data-concept-image="progress-next-semester"]');
    if (!image) throw new Error("Missing planner concept image");
    await act(async () => image.dispatchEvent(new Event("error")));

    expect(document.querySelector('[data-concept-fallback="progress-next-semester"]')?.textContent)
      .toContain("이미지 없이도 아래 교육과정표에서");
  });

  it("keeps exact department website and YouTube links available on the official resources page", async () => {
    await mountAt("?view=resources&section=official");

    const officialPage = document.querySelector('[data-resource-page="official"]');
    const departmentHome = officialPage?.querySelector<HTMLAnchorElement>(
      'a[href="https://cms.dankook.ac.kr/web/ere"]',
    );
    const departmentYouTube = officialPage?.querySelector<HTMLAnchorElement>(
      'a[href="https://www.youtube.com/@FoodandResourcesEconomics_dku/videos"]',
    );

    expect(departmentHome?.textContent).toContain("학과 홈페이지");
    expect(departmentYouTube?.textContent).toContain("학과 YouTube 채널");
    for (const link of [departmentHome, departmentYouTube]) {
      expect(link?.target).toBe("_blank");
      expect(link?.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
      expect(link?.textContent).toContain("외부 링크");
    }

    expect(document.querySelector("[data-official-campus-source]")).toBeNull();
    expect(document.body.textContent).not.toContain("외부 재사용 허가가 확인되기 전까지 앱 안에 사진을 재현하지 않습니다");
    expect(document.body.textContent).toContain("학생이 만든 학업 계획 보조 도구");

    const disclaimer = document.querySelector(".planner-resource-disclaimer")?.textContent ?? "";
    expect(disclaimer).toContain("생성한 개념 설명 이미지에는 학교 로고·인장을 사용하지 않았고 공식 학교 이미지가 아닙니다");
    expect(disclaimer).toContain("이 학생 제작 도구는 학교 공식 페이지와 구분됩니다");
    expect(disclaimer).not.toContain("이 화면은 학교 로고나 공식 시스템을 모사하지 않으며");

    const externalLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-resource-page="official"] a[target="_blank"]')];
    expect(externalLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of externalLinks) {
      expect(link.textContent).toContain("외부 링크");
      expect(link.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    }
  });
});
