// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackCompletionResults, type TrackCompletionResultsProps } from "./TrackCompletionResults";

let root: Root;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; });

async function mount(overrides: Partial<TrackCompletionResultsProps> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const props: TrackCompletionResultsProps = {
    selectedTrackIds: ["food-marketing"], courseSelections: [],
    profile: { affiliation: "department-student", studyPath: "advanced-major", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
    onEditTracks: vi.fn(), onAddTrack: vi.fn(), onPlanCourse: vi.fn(), onOpenPlan: vi.fn(),
    onSaveDiagnosis: vi.fn(), onOpenApplication: vi.fn(), onEditProfile: vi.fn(), ...overrides,
  };
  await act(async () => root.render(<TrackCompletionResults {...props} />));
  return props;
}

describe("course choices in track results", () => {
  it("explains recommendation scope and distinguishes module-required markers", async () => {
    await mount();
    expect(document.querySelector("#track-next-courses-title")?.textContent).toBe("모듈 조건을 채우는 추천 조합");
    expect(document.body.textContent).toContain("모두 필수로 들어야 한다는 뜻은 아니에요");
    expect(document.body.textContent).toContain("학번별 전공필수");
    const row = document.querySelector('[data-track-course="f-1"]')!;
    expect(row.textContent).toContain("모듈 내 필수 표식 있음");
    expect(row.textContent).toContain("대체 인정 여부는 별도 확인");
    expect(row.textContent).toContain("환경식품과 무역");
  });

  it("exposes a native disclosure without mutating courses or implying multiple independent swaps", async () => {
    const props = await mount();
    const disclosure = document.querySelector<HTMLDetailsElement>('[data-course-alternatives="f-1"]')!;
    expect(disclosure.open).toBe(false);
    await act(async () => disclosure.querySelector<HTMLElement>("summary")!.click());
    expect(disclosure.open).toBe(true);
    expect(disclosure.textContent).toContain("이 과목 하나만 바꿀 때");
    expect(disclosure.textContent).toContain("여러 과목을 동시에 바꾸면 조건이 달라질 수");
    expect(disclosure.textContent).toContain("목록을 열어도 계획은 바뀌지 않아요");
    expect(props.onPlanCourse).not.toHaveBeenCalled();
    expect(props.onSaveDiagnosis).not.toHaveBeenCalled();
    expect(props.courseSelections).toEqual([]);
  });

  it("recalculates candidates for the displayed in-progress preview", async () => {
    await mount({ courseSelections: [{ courseId: "f-3", status: "in-progress" }] });
    expect(document.querySelector('[data-course-alternatives="f-1"]')?.textContent).toContain("환경식품과 무역");
    const preview = document.querySelector<HTMLInputElement>('input[aria-label="수강 중 과목까지 미리보기"]')!;
    await act(async () => preview.click());
    const alternatives = document.querySelector('[data-course-alternatives="f-1"]')!;
    expect(alternatives.textContent).not.toContain("환경식품과 무역");
    expect(alternatives.textContent).toContain("유통관리론");
  });
});
