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
  it("planning and adding courses are explicit real callbacks", async () => {
    const p = await mount(); const button = document.querySelector<HTMLButtonElement>("[data-plan-course]")!;
    const id = button.dataset.planCourse; await act(async () => button.click()); expect(p.onPlanCourse).toHaveBeenCalledWith(id);
    await act(async () => document.querySelector<HTMLButtonElement>("[data-open-track-plan]")!.click()); expect(p.onOpenPlan).toHaveBeenCalledOnce();
  });
  it("in-progress preview does not mutate completed course input", async () => {
    const selections: CourseSelectionRecord[] = [{courseId:"f-1",status:"in-progress"}]; const before=JSON.stringify(selections);
    await mount({courseSelections:selections}); const toggle=document.querySelector<HTMLInputElement>('input[aria-label="수강 중 과목까지 미리보기"]')!;
    await act(async()=>toggle.click()); expect(document.body.textContent).toContain("수강 중 과목을 통과했을 때"); expect(JSON.stringify(selections)).toBe(before);
  });
  it("completed modules show a next action without invented remaining courses", async () => {
    await mount({courseSelections:courses.map(c=>({courseId:c.id,status:"completed" as const}))});
    expect(document.querySelectorAll("[data-track-course]")).toHaveLength(0);
    expect(document.body.textContent).toContain("선택한 트랙의 모듈 조건을 채웠어요");
  });
});
