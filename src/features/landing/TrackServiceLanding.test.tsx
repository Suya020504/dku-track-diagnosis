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
  it("finishes the visible journey at diagnosis results and keeps planning optional", async () => {
    await renderLanding();
    const steps = [...document.querySelectorAll(".journey-home-steps strong")].map(node => node.textContent);
    expect(steps).toEqual(["내 정보", "트랙 선택", "진단 결과"]);
    expect(document.querySelector('.journey-home-steps li:last-child .lucide-arrow-right')).toBeNull();
    expect(document.querySelector("[data-resume-state]")).toBeNull();
    expect(document.body.textContent).toContain("학기 계획은 필요할 때만 이용하세요");
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

    expect(document.querySelector("h1")?.textContent).toBe("내 수업으로 트랙을 완성해요");
    expect(document.body.textContent).toContain("들은 과목으로 트랙별 이수 현황과 남은 수업을 확인하세요.");
    expect(button("선택한 방법으로 시작하기").classList.contains("journey-home-start")).toBe(true);
    expect(document.querySelector("[data-map-mode]")).toBeNull();
    expect(document.querySelector("[data-map-stop]")).toBeNull();
    expect(document.body.textContent).not.toContain("현재 위치");
    expect(document.body.textContent).not.toContain("지도");
    expect(document.querySelector('.journey-home-copy h1 .journey-home-accent')?.textContent).toBe('트랙');
    expect(document.querySelector('.journey-home-other-methods')).toBeNull();
    expect(document.querySelectorAll('input[name="entry-intent"]')).toHaveLength(3);
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it("keeps simulation, optional guide, and optional recommendation as working actions", async () => {
    const onStartSimulation = vi.fn();
    const onOpenGuide = vi.fn();
    const onOpenRecommendation = vi.fn();
    await renderLanding({ onStartSimulation, onOpenGuide, onOpenRecommendation });

    await act(async () => button("선택한 방법으로 시작하기").click());
    await act(async () => button("트랙제와 5개 트랙 알아보기").click());
    await act(async () => document.querySelector<HTMLInputElement>('input[value="interest-survey"]')!.click());
    await act(async () => button("선택한 방법으로 시작하기").click());

    expect(onStartSimulation).toHaveBeenCalledTimes(1);
    expect(onOpenGuide).toHaveBeenCalledTimes(1);
    expect(onOpenRecommendation).toHaveBeenCalledTimes(1);
  });

  it("combines the two guide entries into one overview action", async () => {
    let destination = "landing";
    await renderLanding({
      onOpenGuide: () => { destination = "overview"; },
    });

    expect(document.querySelectorAll('.journey-home-copy button')).toHaveLength(1);
    expect(document.querySelector('.journey-home-track-guide')).toBeNull();
    await act(async () => button("트랙제와 5개 트랙 알아보기").click());
    expect(destination).toBe("overview");
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

  it("prioritizes the returning result action and folds alternate starting methods", async () => {
    const onResumeResult = vi.fn();
    const onPlannerAction = vi.fn();
    await renderLanding({ plannerStatus: "saved-plan", resultReady: true, onResumeResult, onPlannerAction });

    const alternateMethods = document.querySelector<HTMLDetailsElement>(".journey-home-other-methods")!;
    expect(alternateMethods.open).toBe(false);
    expect(alternateMethods.querySelector("summary")?.textContent).toBe("다른 방법으로 시작하기");
    expect(alternateMethods.contains(button("선택한 방법으로 시작하기"))).toBe(true);
    const resumeButtons = document.querySelectorAll<HTMLButtonElement>(".journey-home-resume-actions button");
    expect(resumeButtons[0].textContent).toContain("내 결과 다시 보기");
    expect(resumeButtons[0].className).toBe("journey-home-resume-primary");
    expect(resumeButtons[1].className).toBe("journey-home-resume-secondary");
    await act(async () => resumeButtons[0].click());
    expect(onResumeResult).toHaveBeenCalledOnce();
    expect(onPlannerAction).not.toHaveBeenCalled();
    await act(async () => resumeButtons[1].click());
    expect(onPlannerAction).toHaveBeenCalledOnce();
  });

  it("preserves the returning selection while alternate methods are closed and reopened", async () => {
    const onStartIntent = vi.fn();
    const onEntryIntentChange = vi.fn();
    await renderLanding({ plannerStatus: "needs-courses", entryIntent: "completed-courses", onStartIntent, onEntryIntentChange });
    const details = document.querySelector<HTMLDetailsElement>(".journey-home-other-methods")!;
    expect(document.querySelector<HTMLInputElement>('input[value="completed-courses"]')?.checked).toBe(true);
    await act(async () => details.querySelector("summary")!.click());
    expect(details.open).toBe(true);
    await act(async () => button("선택한 방법으로 시작하기").click());
    expect(onStartIntent).toHaveBeenCalledWith("completed-courses");
    await act(async () => details.querySelector("summary")!.click());
    expect(details.open).toBe(false);
    expect(document.querySelector<HTMLInputElement>('input[value="completed-courses"]')?.checked).toBe(true);
    expect(onEntryIntentChange).not.toHaveBeenCalled();
  });

  it("keeps video help separate from starting or resuming the actual student journey", async () => {
    const onOpenExample = vi.fn();
    const onStartIntent = vi.fn();
    const onPlannerAction = vi.fn();
    await renderLanding({ plannerStatus: "ready", onOpenExample, onStartIntent, onPlannerAction });
    await act(async () => button("사용 방법 영상 보기").click());
    expect(onOpenExample).toHaveBeenCalledOnce();
    expect(onStartIntent).not.toHaveBeenCalled();
    expect(onPlannerAction).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDetailsElement>(".journey-home-other-methods")?.open).toBe(false);
  });

  it.each(["known-tracks", "interest-survey", "completed-courses"] as const)("starts the selected %s intent without merging the paths", async (intent) => {
    const onStartIntent=vi.fn(); await renderLanding({onStartIntent});
    await act(async()=>document.querySelector<HTMLInputElement>(`input[value="${intent}"]`)!.click());
    await act(async()=>button("선택한 방법으로 시작하기").click());
    expect(onStartIntent).toHaveBeenCalledWith(intent);
  });
  it("preserves multiple-track and optional-plan scope without a marketing claim", async () => {
    await renderLanding();

    expect(document.body.textContent).toContain("여러 트랙을 함께 선택할 수 있어요");
    expect(document.body.textContent).toContain("학기 계획은 필요할 때만 이용하세요");
    expect(document.body.textContent).not.toContain("졸업 보장");
  });
  it("does not promise automatic saving when storage is unavailable", async () => {
    await renderLanding({ saveUnavailable: true });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("브라우저에 저장하지 못하고 있어요");
    expect(document.body.textContent).not.toContain("자동 저장");
  });
});
