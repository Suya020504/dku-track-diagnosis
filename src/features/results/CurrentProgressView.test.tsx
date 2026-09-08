// @vitest-environment jsdom

import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateDiagnosis } from "../../lib/diagnosis";
import { calculatePathProgress } from "../../lib/progressEngine";
import type { CourseSelectionRecord, PathProgressResult, StudentProfile } from "../../types";
import { CurrentProgressView } from "./CurrentProgressView";

const profile: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2021,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};
const courseSelections: CourseSelectionRecord[] = ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"]
  .map((courseId) => ({ courseId, status: "completed" }));
const result = calculateDiagnosis({ trackIds: [], completedCourseIds: courseSelections.map((item) => item.courseId) });
const pathProgress = calculatePathProgress({
  profile,
  courseSelections,
  additionalMajorCredits: [{ id: "other", label: "기타 인정 전공", credits: 45, status: "officially-verified" }],
});

function render(progress: PathProgressResult = pathProgress, studentProfile = profile) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<CurrentProgressView
    result={result}
    profile={studentProfile}
    pathProgress={progress}
    courseSelections={courseSelections}
    headingRef={createRef<HTMLHeadingElement>()}
  />);
  return container;
}

describe("current-result satisfaction scope", () => {
  it("limits the large satisfied title to computed module and credit conditions when 2021 academic requirements remain", () => {
    const container = render();
    expect(pathProgress.status).toBe("reference-calculation-satisfied");
    expect(container.querySelector("h1")?.textContent).toBe("모듈·전공학점 기준상 충족");
    expect(container.textContent).toContain("18 / 18학점");
    expect(container.textContent).toContain("63 / 63학점");
    expect(container.textContent).toContain("입학연도별 전공필수 · 12 / 15학점");
    expect(container.querySelector("#result-academic-required-detail")?.textContent).toContain("환경경제학");
  });

  it("includes track scope when the progress result contains track conditions", () => {
    const track = calculateDiagnosis({ trackIds: ["food-marketing"], completedCourseIds: [] }).trackResults[0];
    const container = render({ ...pathProgress, trackProgress: track });
    expect(container.querySelector("h1")?.textContent).toBe("모듈·트랙·전공학점 기준상 충족");
  });

  it("does not invent module or track satisfaction for a credit-only minor", () => {
    const container = render({
      requiredProgress: "not-applicable",
      trackProgress: "not-applicable",
      totalMajorProgress: { completedCredits: 21, requiredCredits: 21, missingCredits: 0 },
      reviewItems: [],
      status: "current-input-satisfied",
    }, { ...profile, affiliation: "external-student", studyPath: "minor" });
    expect(container.querySelector("h1")?.textContent).toBe("전공학점 기준상 충족");
  });

  it.each([
    ["incomplete", "보완할 조건이 있어요"],
    ["official-review-required", "학과 확인 필요"],
  ] as const)("keeps the non-satisfaction status %s unchanged", (status, expected) => {
    expect(render({ ...pathProgress, status }).querySelector("h1")?.textContent).toBe(expected);
  });
});
