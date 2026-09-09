// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackCompletionResults } from "./TrackCompletionResults";
import { courses } from "../../data/curriculumData";
import type { CourseSelectionRecord, StudentProfile } from "../../types";

let root: Root;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; });
const profile: StudentProfile = { affiliation: "department-student", studyPath: "advanced-major", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" };
async function mount(extra = {}) {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const props = { profile, selectedTrackIds: ["food-marketing", "agri-food-distribution"] as const, courseSelections: [] as CourseSelectionRecord[], onEditTracks: vi.fn(), onAddTrack: vi.fn(), onPlanCourse: vi.fn(), onOpenPlan: vi.fn(), onSaveDiagnosis: vi.fn(), onOpenApplication: vi.fn(), onEditProfile: vi.fn(), ...extra };
  await act(async () => root.render(<TrackCompletionResults {...props} />)); return props;
}
describe("student multi-track results", () => {
  it("shows a unique combined course list and scope instead of a 63-credit graduation claim", async () => {
    await mount(); const rows = [...document.querySelectorAll("[data-track-course]")].map(e => e.getAttribute("data-track-course"));
    expect(rows.length).toBeGreaterThan(0); expect(new Set(rows).size).toBe(rows.length);
    expect(document.body.textContent).toContain("트랙 모듈"); expect(document.body.textContent).not.toContain("졸업 가능");
  });
  it("finishes diagnosis without presenting course planning as a required next step", async () => {
    const p = await mount();
    expect(document.querySelector(".track-completion-status")?.textContent).toContain("진단 완료");
    expect(document.querySelector("#track-completion-title")?.textContent).toContain("내 트랙의 남은 수업");
    expect(document.querySelector(".track-completion-total button")).toBeNull();
    expect(document.querySelectorAll("[data-plan-course]")).toHaveLength(0);
    expect([...document.querySelectorAll(".track-completion-courses thead th")].map(item => item.textContent))
      .toEqual(["과목명", "학점", "함께 채우는 트랙", "대체 과목 정보"]);
    const tools = document.querySelector<HTMLDetailsElement>(".track-completion-extra-tools")!;
    expect(tools.open).toBe(false);
    expect(tools.querySelector("summary")?.textContent).toContain("필요할 때 더 해보기");
    await act(async () => tools.querySelector<HTMLElement>("summary")!.click());
    await act(async () => tools.querySelector<HTMLButtonElement>("[data-open-track-plan]")!.click());
    expect(p.onOpenPlan).toHaveBeenCalledOnce();
    expect(p.onPlanCourse).not.toHaveBeenCalled();
  });
  it("keeps input editing collapsed and groups record storage with the report conclusion", async () => {
    const editCourses = vi.fn(); const print = vi.fn();
    const p = await mount({ onEditCourses: editCourses, onPrint: print });
    const edit = document.querySelector<HTMLDetailsElement>(".track-completion-edit")!;
    const tools = document.querySelector<HTMLDetailsElement>(".track-completion-extra-tools")!;
    expect(edit.open).toBe(false); expect(tools.open).toBe(false);
    const clickNamed = async (scope: ParentNode, name: string) => {
      const button = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === name)!;
      await act(async () => button.click());
    };
    await act(async () => edit.querySelector<HTMLElement>("summary")!.click());
    await clickNamed(edit, "트랙 변경"); await clickNamed(edit, "이수 과목 수정");
    expect(p.onEditTracks).toHaveBeenCalledOnce(); expect(editCourses).toHaveBeenCalledOnce();
    await act(async () => tools.querySelector<HTMLElement>("summary")!.click());
    const report = document.querySelector(".track-completion-report")!;
    await clickNamed(report, "진단 보관하기"); await clickNamed(report, "결과 인쇄"); await clickNamed(tools, "신청 안내 보기");
    expect(p.onSaveDiagnosis).toHaveBeenCalledOnce(); expect(print).toHaveBeenCalledOnce(); expect(p.onOpenApplication).toHaveBeenCalledOnce();
    expect(report.textContent).toContain("입력 자동 저장과 별도로");
  });
  it("keeps extra-track discovery collapsed and preserves the comparison and add callbacks", async () => {
    const p = await mount();
    const discovery = document.querySelector<HTMLDetailsElement>(".track-completion-discovery")!;
    expect(discovery.open).toBe(false);
    expect(discovery.querySelector("summary")?.textContent).toContain("다른 트랙도 함께 확인하기");
    await act(async () => discovery.querySelector<HTMLElement>("summary")!.click());
    await act(async () => discovery.querySelector<HTMLButtonElement>(".track-discovery-choice button")!.click());
    await act(async () => discovery.querySelector<HTMLButtonElement>(".track-discovery-detail button")!.click());
    expect(p.onAddTrack).toHaveBeenCalledOnce();
  });
  it("only exposes saving and printing the completed report before opening support tools", async () => {
    await mount();
    const outsideClosedDetails = [...document.querySelectorAll<HTMLButtonElement>(".track-completion-page button")].filter(button => {
      let ancestor = button.parentElement;
      while (ancestor) {
        if (ancestor.tagName === "DETAILS" && !(ancestor as HTMLDetailsElement).open) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
    expect(outsideClosedDetails.map(button => button.textContent)).toEqual(["진단 보관하기", "결과 인쇄"]);
    expect(document.querySelectorAll("[data-primary-result-action]")).toHaveLength(1);
  });
  it("groups the completed report and track progress as peer panels and keeps optional tools after them", async () => {
    await mount();
    const report = document.querySelector(".track-completion-report")!;
    const side = document.querySelector(".track-completion-side")!;
    expect(report.parentElement).toBe(side.parentElement);
    expect(report.querySelector("#track-completion-title")).not.toBeNull();
    expect(report.querySelector(".track-completion-total")).not.toBeNull();
    expect(report.querySelector(".track-completion-courses table")).not.toBeNull();
    expect(report.querySelector(".track-completion-record-tools")).not.toBeNull();
    const tools = document.querySelector(".track-completion-extra-tools")!;
    expect(report.contains(tools)).toBe(false);
    expect(document.querySelector(".track-completion-footer")?.previousElementSibling).toBe(report.parentElement);
  });
  it("renders progress percentages from the current course record instead of design example values", async () => {
    await mount({ courseSelections: [{ courseId: "f-1", status: "completed" }, { courseId: "h-1", status: "completed" }] });
    const cards = document.querySelectorAll(".track-result-progress");
    expect(cards[0].querySelector("[data-completion-rate]")?.textContent).toBe("20%");
    expect(cards[1].querySelector("[data-completion-rate]")?.textContent).toBe("10%");
    expect(cards[0].querySelector("progress")?.value).toBe(6);
    expect(cards[0].textContent).toContain("6 / 30학점");
  });
  it("in-progress preview does not mutate completed course input", async () => {
    const selections: CourseSelectionRecord[] = [{courseId:"f-1",status:"in-progress"}]; const before=JSON.stringify(selections);
    await mount({courseSelections:selections}); const toggle=document.querySelector<HTMLInputElement>('input[aria-label="수강 중 과목까지 미리보기"]')!;
    await act(async()=>toggle.click()); expect(document.body.textContent).toContain("수강 중 과목을 통과했을 때"); expect(JSON.stringify(selections)).toBe(before);
  });
  it("completed modules finish without invented remaining courses or an obligatory next action", async () => {
    await mount({courseSelections:courses.map(c=>({courseId:c.id,status:"completed" as const}))});
    expect(document.querySelectorAll("[data-track-course]")).toHaveLength(0);
    expect(document.body.textContent).toContain("선택한 트랙의 모듈 조건을 채웠어요");
    expect(document.querySelector(".track-completion-empty button")).toBeNull();
  });
});
