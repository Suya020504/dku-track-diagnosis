// @vitest-environment jsdom

import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateDiagnosis } from "../../lib/diagnosis";
import { calculatePathProgress } from "../../lib/progressEngine";
import type { CourseSelectionRecord, StudentProfile } from "../../types";
import { ResultDetailView } from "./ResultDetailView";

const profile: StudentProfile = { affiliation: "department-student", studyPath: "track-major", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "student-confirmed" };
const result = calculateDiagnosis({ trackIds: ["food-marketing"], completedCourseIds: [] });
const progress = calculatePathProgress({ profile, targetTrackId: "food-marketing", courseSelections: [], additionalMajorCredits: [] });
let root: Root | undefined;

function Harness({ initialSelections = [], readOnly = false, onGoToPlan = () => {} }: { initialSelections?: CourseSelectionRecord[]; readOnly?: boolean; onGoToPlan?: () => void }) {
  const [selections, setSelections] = useState(initialSelections);
  return <>
    <ResultDetailView result={result} profile={profile} pathProgress={progress} section="next" headingRef={createRef()}
      courseSelections={selections} planStartTerm="2026-2"
      onPlannedCourseChange={readOnly ? undefined : (courseId, term) => setSelections((current) => [
        ...current.filter((item) => item.courseId !== courseId), ...(term ? [{ courseId, status: "planned" as const, plannedTerm: term }] : []),
      ])}
      onSectionChange={() => {}} onOpenRecommendations={() => {}} onGoToPlan={onGoToPlan} onPrint={() => {}} />
    <output aria-label="실제 계획 기록">{JSON.stringify(selections)}</output>
  </>;
}

function candidate() {
  const row = [...document.querySelectorAll<HTMLElement>(".dku-results-candidate-row")]
    .find((node) => node.querySelector("h3")?.textContent === "통계학기초");
  if (!row) throw new Error("Missing recommendation fixture");
  return row;
}
function button(label: string, scope: ParentNode = document) {
  const target = [...scope.querySelectorAll<HTMLButtonElement>("button")].find((node) => node.textContent?.trim() === label);
  if (!target) throw new Error(`Missing button: ${label}`);
  return target;
}
async function render(props: React.ComponentProps<typeof Harness> = {}) {
  root = createRoot(document.querySelector("#root")!);
  await act(async () => root?.render(<Harness {...props} />));
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; });

describe("recommendation course planning", () => {
  it("adds a candidate with later as the honest undecided default and can remove it", async () => {
    await render();
    await act(async () => button("수강 계획에 추가", candidate()).click());
    expect(document.querySelector("output")?.textContent).toBe('[{"courseId":"b-2","status":"planned","plannedTerm":"later"}]');
    expect(candidate().textContent).toContain("수강 계획에 담김");
    const term = candidate().querySelector<HTMLSelectElement>('select[aria-label="통계학기초 계획 학기"]');
    expect(term?.value).toBe("later");
    expect(candidate().textContent).toContain("플래너에서 정한 시작 학기 기준");
    expect(candidate().textContent).toContain("2026년 2학기");
    await act(async () => button("계획에서 빼기", candidate()).click());
    expect(document.querySelector("output")?.textContent).toBe("[]");
    expect(candidate().querySelector("select")).toBeNull();
    expect(button("수강 계획에 추가", candidate())).toBeTruthy();
  });

  it("updates each relative planned term without duplicating or losing other records", async () => {
    await render({ initialSelections: [{ courseId: "b-2", status: "planned" }, { courseId: "b-1", status: "completed" }] });
    const control = candidate().querySelector<HTMLSelectElement>("select");
    expect(control).toBeTruthy();
    expect(control?.value).toBe("later");
    for (const term of ["next", "following", "later"]) {
      await act(async () => { control!.value = term; control!.dispatchEvent(new Event("change", { bubbles: true })); });
      const saved = JSON.parse(document.querySelector("output")!.textContent!) as CourseSelectionRecord[];
      expect(saved).toEqual([{ courseId: "b-1", status: "completed" }, { courseId: "b-2", status: "planned", plannedTerm: term }]);
    }
  });

  it.each(["completed", "in-progress"] as const)("does not overwrite an already %s course with a plan", async (status) => {
    await render({ initialSelections: [{ courseId: "b-2", status }] });
    expect(candidate().textContent).toContain("이미 입력됨");
    expect(candidate().textContent).toContain(status === "completed" ? "이수 완료" : "수강 중");
    expect(candidate().querySelector("button")).toBeNull();
    expect(candidate().querySelector("select")).toBeNull();
  });

  it("does not render inert planning actions in read-only result consumers", async () => {
    await render({ readOnly: true, initialSelections: [{ courseId: "b-2", status: "planned", plannedTerm: "next" }] });
    expect(document.querySelectorAll(".dku-results-candidate-row button,.dku-results-candidate-row select")).toHaveLength(0);
    expect(candidate().textContent).toContain("수강 계획에 담김");
  });

  it("labels the footer navigation as making a plan rather than adding candidates", async () => {
    const onGoToPlan = vi.fn();
    await render({ onGoToPlan });
    await act(async () => button("이 결과로 학기 계획 만들기").click());
    expect(onGoToPlan).toHaveBeenCalledTimes(1);
    expect(document.querySelector("output")?.textContent).toBe("[]");
  });
});
