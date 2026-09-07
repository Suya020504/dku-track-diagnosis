// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";

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
  it("keeps diagnosis steps inside the diagnosis flow and leaves module browsing in the course filter", async () => {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify({
      ...createEmptyAppState(),
      profile: {
        affiliation: "department-student", goal: "check-progress", studyPath: "advanced-major",
        curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only",
      },
      courseSelections: [{ courseId: "b-1", status: "completed" }],
    }));
    await mountAt("/?view=diagnosis&step=courses");
    const nav = document.querySelector('nav[aria-label="자가진단 단계"]');
    expect(nav).not.toBeNull();
    expect([...nav!.querySelectorAll("button > strong")].map((node) => node.textContent))
      .toEqual(["이수 유형", "이수 과목", "진단 결과"]);
    expect(nav!.querySelector<HTMLButtonElement>('[data-journey-stage="result"] button')?.disabled).toBe(true);
    await act(async () => document.querySelector<HTMLButtonElement>("#diagnosis-result-action")!.click());
    expect(new URLSearchParams(location.search).get("view")).toBe("result");
    expect(document.querySelector('[data-journey-stage="result"] button')?.getAttribute("aria-current"))
      .toBe("step");
    await act(async () => document.querySelector<HTMLButtonElement>('[data-journey-stage="courses"] button')!.click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".dku-check-mode button")]
      .find((node) => node.textContent === "모듈별")!.click());
    expect(new URLSearchParams(location.search).get("view")).toBe("diagnosis");
    expect(new URLSearchParams(location.search).get("step")).toBe("courses");
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!);
    expect(saved.courseSelections).toEqual([{ courseId: "b-1", status: "completed" }]);
  });

  it.each(["?view=recommendation&step=survey", "?view=plan&step=setup"])(
    "does not present optional services as required diagnosis steps: %s",
    async (query) => {
      await mountAt(`/${query}`);
      expect(document.querySelector(".planner-compass-path")).toBeNull();
    },
  );

  it("uses five local resource tabs including verified timetable without the global academic journey ribbon", async () => {
    await mountAt("/?view=resources&section=modules");

    expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
    expect(document.querySelector(".planner-shell-layout")?.classList.contains("is-immersive")).toBe(true);
    expect(document.querySelector('nav[aria-label="주요 서비스"]')).not.toBeNull();
    expect(document.querySelector(".planner-guide-index")).toBeNull();
    expect([...document.querySelectorAll("[data-resource-section]")].map(node => node.getAttribute("data-resource-section")))
      .toEqual(["tracks", "modules", "curriculum", "timetable", "official"]);
    expect(document.querySelector('[data-resource-section="modules"]')?.getAttribute("aria-current"))
      .toBe("page");
    expect(document.title).toBe("모듈·과목 자료 | 단국대 식품자원경제학과 트랙제 자가진단");
    await act(async () => document.querySelector<HTMLButtonElement>('[data-resource-section="timetable"]')!.click());
    expect(new URLSearchParams(location.search).get("section")).toBe("timetable");
    expect(document.querySelector('[data-resource-section="timetable"]')?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector(".dku-resource-page")).not.toBeNull();
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
