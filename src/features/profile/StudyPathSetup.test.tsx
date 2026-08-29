import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPathSetup } from "./StudyPathSetup";

describe("StudyPathSetup", () => {
  it("shows student affiliation before allowed study paths", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup profile={undefined} onChange={vi.fn()} onComplete={vi.fn()} />,
    );

    expect(markup).toContain("식품자원경제학과 입학생");
    expect(markup).toContain("타 학과 학생");
    expect(markup).not.toContain("부전공 진행도");
  });

  it("does not show minor to department students", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={{
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "advanced-major",
          entryYear: 2026,
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        }}
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("심화전공");
    expect(markup).toContain("트랙형전공");
    expect(markup).not.toContain("부전공");
  });

  it("restores an incomplete draft without enabling the primary action", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={undefined}
        initialDraft={{ affiliation: "external-student", goal: "find-track" }}
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("복수전공");
    expect(markup).toContain("부전공");
    expect(markup).toContain("disabled=\"\"");
  });
});
