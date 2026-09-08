// @vitest-environment jsdom

import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CourseSelectionRecord, StudentProfile } from "../../types";
import { calculateDiagnosis } from "../../lib/diagnosis";
import { calculatePathProgress } from "../../lib/progressEngine";
import { AcademicMajorRequirements } from "./AcademicMajorRequirements";
import { ResultDetailView } from "./ResultDetailView";

const profile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2021,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};
const selections: CourseSelectionRecord[] = ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"]
  .map((courseId) => ({ courseId, status: "completed" }));

describe("academic-major-required result display", () => {
  it("keeps missing academic course names in a compact, expandable checklist", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<AcademicMajorRequirements profile={profile} courseSelections={selections} />));
    const button = container.querySelector<HTMLButtonElement>("button")!;
    const content = container.querySelector("#result-academic-required-detail")!;
    expect(button.textContent).toContain("입학연도별 전공필수");
    expect(button.textContent).toContain("12 / 15학점");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(content.getAttribute("data-collapsed")).toBe("true");
    await act(async () => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(content.textContent).toContain("환경경제학");
    expect(content.querySelectorAll("li")).toHaveLength(1);
    await act(async () => root.unmount());
  });

  it("shows the cohort's lack of academic-required courses without implying all module conditions are satisfied", () => {
    const markup = renderToStaticMarkup(<AcademicMajorRequirements profile={{ ...profile, entryYear: 2024 }} courseSelections={[]} />);
    expect(markup).toContain("전공필수 없음");
    expect(markup).toContain("모듈 내 필수는 별도");
    expect(markup).not.toContain("졸업 가능");
  });

  it.each(["double-major", "minor"] as const)("keeps external %s requirements unresolved instead of showing zero", (studyPath) => {
    const markup = renderToStaticMarkup(<AcademicMajorRequirements
      profile={{ ...profile, affiliation: "external-student", studyPath, entryYear: 2024 }}
      courseSelections={[]}
    />);
    expect(markup).toContain("타 학과생");
    expect(markup).not.toContain("0 / 0학점");
    expect(markup).not.toContain("전공필수 없음");
  });

  it("asks for the admission year without displaying a fabricated credit count", () => {
    const markup = renderToStaticMarkup(<AcademicMajorRequirements profile={{ ...profile, entryYear: undefined }} courseSelections={[]} />);
    expect(markup).toContain("입학연도를 입력하면");
    expect(markup).not.toContain("0 / 0학점");
  });

  it("receives the actual selections on the current result page and separates module progress from cohort requirements", () => {
    const result = calculateDiagnosis({ trackIds: [], completedCourseIds: selections.map((item) => item.courseId), enrollmentType: "primary" });
    const pathProgress = calculatePathProgress({ profile, courseSelections: selections, additionalMajorCredits: [] });
    const markup = renderToStaticMarkup(<ResultDetailView
      result={result}
      profile={profile}
      pathProgress={pathProgress}
      section="current"
      headingRef={createRef<HTMLHeadingElement>()}
      onSectionChange={vi.fn()}
      onOpenRecommendations={vi.fn()}
      onGoToPlan={vi.fn()}
      onPrint={vi.fn()}
      courseSelections={selections}
    />);
    expect(markup).toContain("모듈 내 필수");
    expect(markup).toContain("18 / 18학점");
    expect(markup).toContain("입학연도별 전공필수");
    expect(markup).toContain("12 / 15학점");
    expect(markup).toContain("환경경제학");
    expect(markup).not.toContain("2021학번 입력 기준");
  });
});
