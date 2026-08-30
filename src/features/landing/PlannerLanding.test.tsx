// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlannerLanding } from "./PlannerLanding";
import type { CompassPathItem } from "../journey/CompassPathRibbon";

const expectedTrackNames = [
  "푸드마케팅",
  "지역개발 및 컨설팅",
  "농식품유통",
  "경제학",
  "푸드바이오경제",
] as const;

let root: Root | undefined;

const journeyItems: CompassPathItem[] = [
  { id: "interest", label: "관심 질문", state: "current", completed: false, available: true, onSelect: vi.fn() },
  { id: "track", label: "트랙 탐색", state: "next", completed: false, available: true, onSelect: vi.fn() },
  { id: "semester", label: "학기 계획", state: "next", completed: false, available: false, unavailableReason: "관심 트랙과 이수 과목을 먼저 확인해 주세요.", onSelect: vi.fn() },
];

async function renderLanding(overrides: Partial<React.ComponentProps<typeof PlannerLanding>> = {}) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  const props: React.ComponentProps<typeof PlannerLanding> = {
    onFindTrack: vi.fn(),
    onStartDiagnosis: vi.fn(),
    journeyItems,
    plannerStatus: "empty",
    ...overrides,
  };
  await act(async () => root?.render(<PlannerLanding {...props} />));
  return props;
}

function action(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.trim() === label);
  if (!match) throw new Error(`Action not found: ${label}`);
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

describe("PlannerLanding", () => {
  it("puts the interest action first and marks it as the primary landing action", async () => {
    await renderLanding();

    const primary = action("내 관심 트랙 찾기");
    const secondary = action("이수 과목 바로 진단");

    expect(primary.dataset.actionPriority).toBe("primary");
    expect(secondary.dataset.actionPriority).toBe("secondary");
    expect(primary.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("내 관심을 따라, 전공 로드맵을 완성해요");
    expect(document.querySelectorAll("[data-journey-stage]")).toHaveLength(3);
  });

  it("calls the interest discovery callback from the primary action", async () => {
    const onFindTrack = vi.fn();
    await renderLanding({ onFindTrack });

    await act(async () => action("내 관심 트랙 찾기").click());

    expect(onFindTrack).toHaveBeenCalledTimes(1);
  });

  it("calls the diagnosis callback from the secondary action", async () => {
    const onStartDiagnosis = vi.fn();
    await renderLanding({ onStartDiagnosis });

    await act(async () => action("이수 과목 바로 진단").click());

    expect(onStartDiagnosis).toHaveBeenCalledTimes(1);
  });

  it("renders all five current tracks without fake result or account data", async () => {
    await renderLanding();

    const trackNames = [...document.querySelectorAll<HTMLElement>("[data-track-id] strong")]
      .map((item) => item.textContent?.trim());

    expect(trackNames).toEqual(expectedTrackNames);
    expect(document.querySelectorAll('[data-track-id] [role="img"]')).toHaveLength(5);
    expect(document.body.textContent).toContain("관심을 찾으면 계획표가 펼쳐져요");
    expect(document.querySelector<HTMLImageElement>(".planner-landing__compass-plane img")?.alt)
      .toBe("전공 학습 경로와 다음 학기를 가리키는 캠퍼스 컴퍼스 일러스트");
    for (const forbidden of ["현재 예시 60%", "부족 모듈 2개", "18학점", "김단국", "로그인"]) {
      expect(document.body.textContent).not.toContain(forbidden);
    }
  });
});
