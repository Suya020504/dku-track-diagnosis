// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackPlanningState } from "../../types";
import { buildTrackSemesterPlan } from "../../lib/trackSemesterPlanner";
import { TrackModulePlanner, type TrackModulePlannerProps } from "./TrackModulePlanner";

let root: Root | undefined;

async function mountPlanner(overrides: Partial<TrackModulePlannerProps> = {}) {
  const onChangeState = vi.fn();
  const onSavePlan = vi.fn();
  const onEditTracks = vi.fn();
  const onBackToResult = vi.fn();
  const onOpenApplication = vi.fn();
  let latest: TrackPlanningState = overrides.state ?? {};
  function Harness() {
    const [state, setState] = useState(latest);
    return <TrackModulePlanner
      selectedTrackIds={["food-marketing", "agri-food-distribution"]}
      courseSelections={[]}
      onSavePlan={onSavePlan}
      onEditTracks={onEditTracks}
      onBackToResult={onBackToResult}
      onOpenApplication={onOpenApplication}
      {...overrides}
      state={state}
      onChangeState={(next) => { latest = next; onChangeState(next); setState(next); }}
    />;
  }
  root = createRoot(document.querySelector<HTMLDivElement>("#root")!);
  await act(async () => root?.render(<Harness />));
  return { onChangeState, onSavePlan, onEditTracks, onBackToResult, onOpenApplication, latest: () => latest };
}

function input(label: string): HTMLInputElement {
  const field = [...document.querySelectorAll("label")]
    .find((candidate) => candidate.textContent?.includes(label))?.querySelector("input");
  if (!field) throw new Error(`Missing input: ${label}`);
  return field;
}

function button(label: string): HTMLButtonElement {
  const control = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes(label));
  if (!control) throw new Error(`Missing button: ${label}`);
  return control;
}

async function change(field: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const oneRemainingSelections = ["f-1", "h-1", "h-2", "i-1", "i-2", "j-1", "j-2", "l-1", "l-2"]
  .map((courseId) => ({ courseId, status: "completed" as const }));
const oneRemainingDraft: TrackPlanningState = { draft: { version: 1, values: {
  currentTerm: "2026-2", targetGraduationTerm: "2028-2", maxMajorCoursesPerTerm: "4",
} } };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
});

describe("TrackModulePlanner", () => {
  it("preserves an incomplete condition as a raw draft and blocks generation", async () => {
    const view = await mountPlanner();
    await change(input("현재 학기"), "2026-");
    expect(view.latest().draft?.values.currentTerm).toBe("2026-");
    expect(input("현재 학기").value).toBe("2026-");
    expect(button("계획 만들기").disabled).toBe(true);
    expect(view.latest().result).toBeUndefined();
  });

  it.each([
    { target: "2026-1", load: "4" },
    { target: "2033-1", load: "4" },
    { target: "2028-1", load: "2e0" },
    { target: "2028-1", load: "0" },
  ])("blocks impossible or overlong plan conditions $target / $load", async ({ target, load }) => {
    await mountPlanner({ state: { draft: { version: 1, values: {
      currentTerm: "2026-2", targetGraduationTerm: target, maxMajorCoursesPerTerm: load,
    } } } });
    expect(button("계획 만들기").disabled).toBe(true);
    expect(document.querySelector('[aria-invalid="true"]')).not.toBeNull();
  });

  it("does not replace an intentionally blank restored current term with a default", async () => {
    await mountPlanner({ state: { draft: { version: 1, values: { currentTerm: "" } } } });
    expect(input("현재 학기").value).toBe("");
    expect(button("계획 만들기").disabled).toBe(true);
  });

  it("offers track recovery instead of generating an empty target plan", async () => {
    const view = await mountPlanner({ selectedTrackIds: [] });
    expect(document.querySelector('button[type="submit"]')).toBeNull();
    await act(async () => button("트랙 선택").click());
    expect(view.onEditTracks).toHaveBeenCalledTimes(1);
  });

  it("generates a real deduplicated course grid and saves only the plan container", async () => {
    const selections = [{ courseId: "f-1", status: "completed" as const }];
    const view = await mountPlanner({ courseSelections: selections, state: { draft: { version: 1, values: {
      currentTerm: "2026-2", targetGraduationTerm: "2028-2", maxMajorCoursesPerTerm: "6",
    } } } });
    await act(async () => button("계획 만들기").click());
    expect(view.latest().result).toBeDefined();
    expect(view.latest().draft).toBeUndefined();
    expect(document.querySelector('table[aria-label="과목별 학기 계획"]')).not.toBeNull();
    const rowIds = [...document.querySelectorAll<HTMLTableRowElement>('tbody tr[data-course-id]')]
      .map((row) => row.dataset.courseId);
    expect(rowIds.length).toBeGreaterThan(0);
    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(rowIds).not.toContain("f-1");
    expect(selections).toEqual([{ courseId: "f-1", status: "completed" }]);
    await act(async () => button("이 계획 보관하기").click());
    expect(view.onSavePlan).toHaveBeenCalledWith(view.latest().result);
  });

  it("keeps the existing grid but prevents saving a stale result after raw conditions change", async () => {
    const view = await mountPlanner({ state: { draft: { version: 1, values: {
      currentTerm: "2026-2", targetGraduationTerm: "2028-2", maxMajorCoursesPerTerm: "4",
    } } } });
    await act(async () => button("계획 만들기").click());
    const generated = view.latest().result;
    await change(input("목표 학기"), "2029-");
    expect(view.latest().result).toBe(generated);
    expect(document.querySelector('table[aria-label="과목별 학기 계획"]')).not.toBeNull();
    expect(button("이 계획 보관하기").disabled).toBe(true);
    expect(document.querySelector('[data-plan-draft-notice]')).not.toBeNull();
  });

  it("exposes storage failure and real recovery / application actions", async () => {
    const view = await mountPlanner({ storageError: true });
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("저장하지 못");
    await act(async () => button("과목 다시 확인").click());
    await act(async () => button("학과 신청 안내").click());
    expect(view.onBackToResult).toHaveBeenCalledTimes(1);
    expect(view.onOpenApplication).toHaveBeenCalledTimes(1);
    expect(view.onSavePlan).not.toHaveBeenCalled();
  });

  it("moves one remaining course through its select without duplicating it or changing completed history", async () => {
    const view = await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: oneRemainingSelections, state: oneRemainingDraft });
    await act(async () => button("계획 만들기").click());
    const select = document.querySelector<HTMLSelectElement>('tr[data-course-id="f-2"] select');
    expect(select).not.toBeNull();
    await act(async () => {
      select!.value = "2028-1";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.latest().manualTerms).toEqual({ "f-2": "2028-1" });
    expect(view.latest().result?.placements.filter((item) => item.courseId === "f-2")).toEqual([
      expect.objectContaining({ courseId: "f-2", term: "2028-1" }),
    ]);
    expect(document.querySelectorAll('tr[data-course-id="f-2"]')).toHaveLength(1);
    expect(document.querySelector<HTMLSelectElement>('tr[data-course-id="f-2"] select')?.value).toBe("2028-1");
    expect(oneRemainingSelections).toHaveLength(9);
    expect(oneRemainingSelections.every((item) => item.status === "completed")).toBe(true);
  });

  it("locks an in-progress course to the current term instead of offering a move", async () => {
    const view = await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: [
      ...oneRemainingSelections, { courseId: "f-2", status: "in-progress" },
    ], state: oneRemainingDraft });
    await act(async () => button("계획 만들기").click());
    const select = document.querySelector<HTMLSelectElement>('tr[data-course-id="f-2"] select');
    expect(select?.disabled).toBe(true);
    expect(view.latest().result?.placements.find((item) => item.courseId === "f-2")?.term).toBe("2026-2");
  });

  it("shows every unplaced reason outside a closed disclosure when there is no future term", async () => {
    const view = await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: oneRemainingSelections,
      state: { draft: { version: 1, values: { currentTerm: "2026-2", targetGraduationTerm: "2026-2", maxMajorCoursesPerTerm: "4" } } },
    });
    await act(async () => button("계획 만들기").click());
    const reasons = view.latest().result?.unplaced ?? [];
    expect(reasons.length).toBeGreaterThan(0);
    const list = document.querySelector('[aria-labelledby="track-module-plan-unplaced-title"]');
    expect(list?.closest("details")).toBeNull();
    for (const reason of reasons) expect(list?.textContent).toContain(reason.message);
  });

  it("blocks saving or moving a restored plan whose source courses no longer match", async () => {
    const oldResult = buildTrackSemesterPlan({ selectedTrackIds: ["food-marketing"], courseSelections: oneRemainingSelections,
      preferences: { currentTerm: "2026-2", targetGraduationTerm: "2028-2", maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false },
      generatedAt: "2026-09-09T00:00:00Z",
    });
    await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: [], state: { result: oldResult } });
    expect(button("이 계획 보관하기").disabled).toBe(true);
    expect(document.querySelector<HTMLSelectElement>('tr[data-course-id="f-2"] select')?.disabled).toBe(true);
    expect(document.querySelector('[data-plan-draft-notice]')?.textContent).toContain("이수 과목이 바뀌었어요");
  });

  it("can recover an old manual future assignment when the course is now in progress", async () => {
    const view = await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: [
      ...oneRemainingSelections, { courseId: "f-2", status: "in-progress" },
    ], state: { ...oneRemainingDraft, manualTerms: { "f-2": "2028-1" } } });
    await act(async () => button("계획 만들기").click());
    expect(view.latest().result?.unplaced).toEqual([
      expect.objectContaining({ courseId: "f-2", reason: "in-progress-term-conflict" }),
    ]);
    await act(async () => button("현재 학기로 되돌리기").click());
    expect(view.latest().result?.unplaced).toHaveLength(0);
    expect(view.latest().result?.placements.find((item) => item.courseId === "f-2")?.term).toBe("2026-2");
  });

  it("identifies the assigned course in its ticket and puts offering guidance in one shared place", async () => {
    await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: oneRemainingSelections, state: oneRemainingDraft });
    await act(async () => button("계획 만들기").click());
    const row = document.querySelector('tr[data-course-id="f-2"]');
    const courseName = row?.querySelector("th strong")?.textContent;
    const ticket = row?.querySelector(".track-module-planner__placement");
    expect(courseName).toBeTruthy();
    expect(ticket?.textContent).toContain(courseName);
    expect(ticket?.textContent).toContain("3학점");
    expect(ticket?.textContent).not.toContain("개설 확인 필요");
    expect(document.querySelectorAll("[data-plan-offering-note]")).toHaveLength(1);
    expect(document.querySelector("[data-plan-offering-note]")?.textContent).toBe("2026년 개설 이력으로 만든 계획이에요. 수강신청 전 개설 정보를 확인하세요.");
    expect(document.querySelector("[data-plan-offering-note]")?.closest("details")).toBeNull();
    expect(document.querySelector(".track-module-planner__rail")?.textContent).not.toContain("실제 복수 트랙 인정 여부");
    expect(document.body.textContent).not.toContain("학교에 신청서를 제출하는 기능은 아니에요");
  });

  it("connects official course lookup in a new tab and separates it from track application", async () => {
    await mountPlanner({ selectedTrackIds: ["food-marketing"], courseSelections: oneRemainingSelections, state: oneRemainingDraft });
    await act(async () => button("계획 만들기").click());
    const link = document.querySelector<HTMLAnchorElement>(".track-module-planner__registration a")!;
    expect(link.href).toBe("https://webinfo.dankook.ac.kr/tiac/univ/lssn/lpci/views/lssnPopup/tmtbl2.do");
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
    expect(link.textContent).toContain("실제 개설 강좌 확인");
    expect(document.querySelector(".track-module-planner__registration")?.textContent).toContain("천안 캠퍼스와 조회할 연도·학기");
    const row = document.querySelector('tr[data-course-id="f-2"]')!;
    expect(row.querySelector(".track-module-planner__course-code")?.textContent).toContain("446410");
    expect(row.querySelector(".track-module-planner__course-code button")?.getAttribute("aria-label")).toContain("446410 복사");
  });
});
