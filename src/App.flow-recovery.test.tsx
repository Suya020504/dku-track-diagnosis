// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { createGraduationPlanTransition } from "./App";
import { archiveCurrentDiagnosis } from "./lib/diagnosisArchive";
import { calculatePathProgress } from "./lib/progressEngine";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";

let root: Root | undefined;
function fixture(): SavedAppStateV2 {
  return { ...createEmptyAppState(), profile: {
    affiliation: "department-student", studyPath: "track-major", majorRole: "primary", otherMajor: "no", goal: "check-progress",
    curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only",
  }, courseInputReviewedAt: "2026-09-09T00:00:00Z", courseSelections: [{ courseId: "b-1", status: "completed" }] };
}
function recordedFixture() {
  const state = { ...fixture(), targetTrackId: "food-marketing" as const };
  const result = calculatePathProgress({ profile: state.profile!, targetTrackId: state.targetTrackId,
    courseSelections: state.courseSelections, additionalMajorCredits: [], courseInputReviewedAt: state.courseInputReviewedAt });
  return archiveCurrentDiagnosis(state, result, "kept-record", "2026-09-09T00:00:00Z");
}
function saved() { return JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!); }
async function mount(state?: SavedAppStateV2, route = "/") {
  if (state) localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
  history.replaceState({}, "", route);
  root = createRoot(document.querySelector("#root")!);
  await act(async () => root?.render(<App />));
}
async function remount(route = location.href) {
  await act(async () => root?.unmount()); root = undefined;
  await mount(undefined, route);
}
function button(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button ${label}`);
  return button;
}
async function click(label: string) { await act(async () => button(label).click()); }
function input(label: string) {
  const input = [...document.querySelectorAll("label")].find(item => item.textContent?.includes(label))?.querySelector("input");
  if (!input) throw new Error(`Missing input ${label}`);
  return input;
}
async function change(label: string, value: string) {
  const field = input(label);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>'; localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.head.innerHTML = ""; vi.restoreAllMocks(); localStorage.clear(); });

describe("reported service flow recovery", () => {
  it("opens the current-course comparison from the targetless home resume action without changing inputs", async () => {
    const state = fixture(); await mount(state);
    await click("내 결과 다시 보기");
    expect(location.search).toBe("?view=recommendation&step=axes&axis=progress");
    expect(document.querySelector('#track-history-title')).not.toBeNull();
    expect(saved()).toEqual(state);
  });
  it("opens current-course comparison from the next-course result action", async () => {
    await mount(recordedFixture(), "/?view=result&section=next");
    await click("세 기준별 트랙 비교 보기");
    expect(location.search).toBe("?view=recommendation&step=axes&axis=progress");
    expect(document.querySelector('#track-history-title')).not.toBeNull();
  });
  it("opens structure from five-track details while keeping the overview entry separate", async () => {
    await mount(fixture());
    await click("5개 트랙 자세히 보기");
    expect(location.search).toBe("?view=track-guide&section=structure");
    await remount("/");
    await click("트랙제 먼저 알아보기");
    expect(location.search).toBe("?view=track-guide&section=overview");
  });
  it("requires confirmation and keeps archived records when resetting current input", async () => {
    const state = recordedFixture(); await mount(state, "/?view=diagnosis&step=courses");
    await click("선택 수정");
    await click("입력 초기화");
    expect(saved()).toEqual(state);
    expect(document.body.textContent).toContain("보관한 진단과 계획 기록은 유지됩니다");
    await click("취소"); expect(saved()).toEqual(state);
    await click("입력 초기화"); await click("현재 입력 초기화");
    expect(saved().courseSelections).toEqual([]); expect(saved().profile).toBeUndefined();
    expect(saved().snapshots).toEqual(state.snapshots);
    await remount("/?view=records");
    expect(saved().snapshots).toEqual(state.snapshots);
    expect(document.body.textContent).toContain("푸드마케팅");
  });
  it("keeps all current input when a confirmed reset cannot be saved", async () => {
    const state = recordedFixture(); await mount(state, "/?view=diagnosis&step=courses");
    await click("선택 수정"); await click("입력 초기화");
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await click("현재 입력 초기화");
    expect(saved()).toEqual(state); expect(location.search).toContain("step=courses");
    expect(document.body.textContent).toContain("초기화하지 못했어요");
    failure.mockRestore(); await click("현재 입력 초기화");
    expect(saved().snapshots).toEqual(state.snapshots); expect(saved().profile).toBeUndefined();
  });
  it("gives the track picker a shrinkable narrow layout and a separate confirmation row", async () => {
    const styles = document.createElement("style");
    styles.textContent = readFileSync("src/styles.css", "utf8")
      + readFileSync("src/styles/planner-courses.css", "utf8");
    document.head.append(styles);
    await mount(recordedFixture(), "/?view=diagnosis&step=courses");
    await click("선택 수정"); await click("입력 초기화");
    const picker = document.querySelector(".track-picker")!;
    const confirmation = document.querySelector("#current-input-reset-confirmation")!;
    expect(getComputedStyle(picker).gridTemplateColumns).toBe("minmax(0, 1fr)");
    expect(getComputedStyle(picker).gridTemplateAreas).toContain('"confirmation"');
    expect(getComputedStyle(picker).gridTemplateAreas).toContain('"continue"');
    expect(getComputedStyle(confirmation).gridArea).toBe("confirmation");
    expect(getComputedStyle(confirmation).gridArea).not.toBe(getComputedStyle(document.querySelector(".enrollment-profile-summary")!).gridArea);
  });
  it("restores unfinished raw planner text after reload without replacing committed conditions or records", async () => {
    const state = recordedFixture(); await mount(state, "/?view=plan&step=setup");
    await change("목표 졸업 학기", "2027-"); await change("학기당 최대 전공과목 수", "1.5");
    await change("현재 학기", "");
    await remount();
    expect(input("목표 졸업 학기").value).toBe("2027-");
    expect(input("학기당 최대 전공과목 수").value).toBe("1.5");
    expect(input("현재 학기").value).toBe("");
    expect(button("학기별 참고 계획 만들기").disabled).toBe(true);
    expect(saved().graduationPlanPreferences).toBeUndefined(); expect(saved().snapshots).toEqual(state.snapshots);
    await change("현재 학기", "2026-2"); await change("목표 졸업 학기", "2027-2"); await change("학기당 최대 전공과목 수", "4");
    await click("학기별 참고 계획 만들기");
    expect(saved().graduationPlanPreferences).toEqual({ currentTerm: "2026-2", targetGraduationTerm: "2027-2", maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false });
    expect(saved().graduationPlanDraft).toBeUndefined(); expect(saved().snapshots).toEqual(state.snapshots);
  });
  it("retains raw invalid load text for correction across reloads", async () => {
    await mount(recordedFixture(), "/?view=plan&step=setup");
    await change("학기당 최대 전공과목 수", "아직 미정"); await remount();
    expect(input("학기당 최대 전공과목 수").value).toBe("아직 미정");
    expect(button("학기별 참고 계획 만들기").disabled).toBe(true);
  });
  it("keeps an edited draft separate from the last generated plan when reopening condition editing", async () => {
    const preferences = { currentTerm: "2026-2" as const, targetGraduationTerm: "2027-2" as const,
      maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false };
    const state = createGraduationPlanTransition(recordedFixture(), preferences, "2026-09-09T01:00:00Z").state;
    await mount(state, "/?view=plan&step=setup");
    await change("목표 졸업 학기", "2029-"); await change("학기당 최대 전공과목 수", "");
    expect(saved().graduationPlanPreferences).toEqual(preferences);
    expect(saved().graduationPlan).toEqual(state.graduationPlan);
    await remount("/?view=plan&step=schedule"); await click("조건 수정");
    expect(input("목표 졸업 학기").value).toBe("2029-");
    expect(input("학기당 최대 전공과목 수").value).toBe("");
    expect(button("학기별 참고 계획 만들기").disabled).toBe(true);
    expect(saved().snapshots).toEqual(state.snapshots);
  });
  it("reports a failed draft save and lets the same draft be retried without losing input", async () => {
    const state = recordedFixture(); await mount(state, "/?view=plan&step=setup");
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await change("목표 졸업 학기", "2029-2");
    expect(document.querySelector(".planner-local-save--error")).not.toBeNull();
    expect(document.body.textContent).toContain("초안을 저장하지 못했어요");
    expect(input("목표 졸업 학기").value).toBe("2029-2"); expect(saved()).toEqual(state);
    failure.mockRestore(); await click("초안 저장 다시 시도"); await remount();
    expect(input("목표 졸업 학기").value).toBe("2029-2");
    expect(document.querySelector(".planner-local-save--error")).toBeNull();
  });
});
