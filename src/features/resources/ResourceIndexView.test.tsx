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
    }
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
      .toBe("여러 과목이 모듈로 묶이고 다섯 갈래 트랙으로 이어지는 개념 설명 이미지");

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
      .toBe("확인한 진행도에서 다음 과목을 고르고 학기 계획으로 이어지는 개념 설명 이미지");

    const image = document.querySelector<HTMLImageElement>('[data-concept-image="progress-next-semester"]');
    if (!image) throw new Error("Missing planner concept image");
    await act(async () => image.dispatchEvent(new Event("error")));

    expect(document.querySelector('[data-concept-fallback="progress-next-semester"]')?.textContent)
      .toContain("이미지 없이도 아래 교육과정표에서");
  });

  it("labels safe external links and never embeds the official campus photograph", async () => {
    await mountAt("?view=resources&section=official");

    expect(document.body.textContent).toContain("천안캠퍼스 항공사진(2022)");
    expect(document.body.textContent).toContain("정보기획팀");
    expect(document.body.textContent).toContain("2023-04-05");
    expect(document.body.textContent).toContain("외부 재사용 허가가 확인되기 전까지 앱 안에 사진을 재현하지 않습니다");
    expect(document.body.textContent).toContain("학생이 만든 학업 계획 보조 도구");
    expect(document.querySelector('[data-official-campus-source] img')).toBeNull();

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
