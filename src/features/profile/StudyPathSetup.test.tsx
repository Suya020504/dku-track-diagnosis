import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPathSetup } from "./StudyPathSetup";

describe("StudyPathSetup", () => {
  it("keeps the compatibility entry point on the affiliation-only first step", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup profile={undefined} onChange={vi.fn()} onComplete={vi.fn()} />,
    );

    expect(markup).toContain("식품자원경제학과 입학생");
    expect(markup).toContain("타 학과 학생");
    expect(markup).not.toContain("이수 경로를 선택해 주세요");
    expect(markup).not.toContain('name="studyPath"');
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
        profileStage="path"
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
        profileStage="path"
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("복수전공");
    expect(markup).toContain("부전공");
    expect(markup).toContain("disabled=\"\"");
  });

  it("requires an explicit target track for track-major", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={{
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "track-major",
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        }}
        targetTrackId={undefined}
        profileStage="path"
        onTargetTrackChange={vi.fn()}
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("진단할 트랙");
    expect(markup).toContain("푸드마케팅");
    expect(markup).toContain("경제학");
    expect(markup).toContain("disabled=\"\"");
  });

  it("enables track-major completion after an explicit target is selected", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={{
          goal: "check-progress",
          affiliation: "department-student",
          studyPath: "track-major",
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        }}
        targetTrackId="food-marketing"
        profileStage="path"
        onTargetTrackChange={vi.fn()}
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("푸드마케팅");
    expect(markup).not.toContain("disabled=\"\"");
  });

  it("lets a find-track profile continue to the interest survey without choosing a target first", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={{
          goal: "find-track",
          affiliation: "department-student",
          studyPath: "track-major",
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        }}
        targetTrackId={undefined}
        profileStage="path"
        onTargetTrackChange={vi.fn()}
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("설문 전에는 선택하지 않아도 됩니다");
    expect(markup).toContain("관심 설문으로 이동");
    expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>관심 설문으로 이동<\/button>/);
  });

  it("keeps an incompatible affiliation and path pair incomplete", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup
        profile={{
          goal: "check-progress",
          affiliation: "external-student",
          studyPath: "advanced-major",
          curriculumRuleVersion: "2026-provided-final-plan",
          ruleApplicability: "reference-only",
        }}
        profileStage="path"
        onChange={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(markup).toContain("disabled=\"\"");
    expect(markup).toContain("이수 경로를 선택해 주세요");
    expect(markup).not.toContain("심화전공 기준을 사용합니다");
  });
});
