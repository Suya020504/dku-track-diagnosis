// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tracks } from "../../data/curriculumData";
import { TrackServiceLanding } from "./TrackServiceLanding";

let root: Root | undefined;

async function renderLanding(
  overrides: Partial<React.ComponentProps<typeof TrackServiceLanding>> = {},
) {
  const host = document.querySelector<HTMLDivElement>("#root");
  if (!host) throw new Error("Missing root host");
  root = createRoot(host);
  const props: React.ComponentProps<typeof TrackServiceLanding> = {
    tracks,
    plannerStatus: "empty",
    resultReady: false,
    onStartSimulation: vi.fn(),
    onOpenGuide: vi.fn(),
    onOpenRecommendation: vi.fn(),
    ...overrides,
  };
  await act(async () => root?.render(<TrackServiceLanding {...props} />));
  return props;
}

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim().includes(label));
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

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

describe("TrackServiceLanding", () => {
  it("numbers only the three required diagnosis steps and keeps an empty start quiet", async () => {
    await renderLanding();
    const steps = [...document.querySelectorAll(".track-home__steps strong")].map(node => node.textContent);
    expect(steps).toEqual(["이수 유형", "이수 과목", "진단 결과"]);
    expect(document.querySelector("[data-resume-state]")).toBeNull();
    expect(document.body.textContent).toContain("필수 진단에 포함되지 않아요");
  });

  it.each(["needs-profile", "needs-courses", "needs-track", "ready", "saved-plan"] as const)("resumes the actual %s state", async (plannerStatus) => {
    const onPlannerAction = vi.fn();
    await renderLanding({ plannerStatus, onPlannerAction });
    const resume = document.querySelector<HTMLElement>("[data-resume-state]");
    expect(resume?.dataset.resumeState).toBe(plannerStatus);
    await act(async () => resume?.querySelector("button")?.click());
    expect(onPlannerAction).toHaveBeenCalledTimes(1);
  });
  it("presents situation simulation first without the retired map metaphor", async () => {
    await renderLanding();

    expect(document.querySelector("h1")?.textContent).toBe("어떤 트랙이 나한테 잘 맞을까?");
    expect(button("내 트랙 확인하기").dataset.actionPriority).toBe("primary");
    expect(button("트랙제 먼저 알아보기").dataset.actionPriority).toBe("secondary");
    expect(document.querySelector("[data-map-mode]")).toBeNull();
    expect(document.querySelector("[data-map-stop]")).toBeNull();
    expect(document.body.textContent).not.toContain("현재 위치");
    expect(document.body.textContent).not.toContain("지도");
    expect(document.querySelector<HTMLImageElement>(".track-home__hero-visual img")?.alt).not.toContain("나침반");
    expect(document.querySelector<HTMLImageElement>(".track-home__hero-visual img")?.src).toContain("track-service-hero-desk-v2.webp");
    expect(document.querySelectorAll("[data-track-preview]")).toHaveLength(5);
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it("keeps simulation, optional guide, and optional recommendation as working actions", async () => {
    const onStartSimulation = vi.fn();
    const onOpenGuide = vi.fn();
    const onOpenRecommendation = vi.fn();
    await renderLanding({ onStartSimulation, onOpenGuide, onOpenRecommendation });

    await act(async () => button("내 트랙 확인하기").click());
    await act(async () => button("트랙제 먼저 알아보기").click());
    await act(async () => button("관심으로 트랙 추천받기").click());

    expect(onStartSimulation).toHaveBeenCalledTimes(1);
    expect(onOpenGuide).toHaveBeenCalledTimes(1);
    expect(onOpenRecommendation).toHaveBeenCalledTimes(1);
  });

  it("shows one truthful resume action for a saved plan without fake counts", async () => {
    const onPlannerAction = vi.fn();
    await renderLanding({
      plannerStatus: "saved-plan",
      resultReady: true,
      onPlannerAction,
    });

    expect(document.body.textContent).toContain("저장한 학기 계획이 있어요");
    await act(async () => button("저장한 계획 보기").click());
    expect(onPlannerAction).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/\d+개 과목|\d+%/);
  });

  it("preserves the agreed audience copy and trust boundary", async () => {
    await renderLanding();

    expect(document.body.textContent).toContain("단국대 학생을 위한 트랙제 안내·자가진단");
    expect(document.body.textContent).toContain("실제 인정 기준은 학과 확인이 필요합니다");
  });
});
