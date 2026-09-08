import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPathSetup } from "./StudyPathSetup";

describe("StudyPathSetup", () => {
  it("keeps the compatibility entry point on the affiliation-only first step", () => {
    const markup = renderToStaticMarkup(
      <StudyPathSetup profile={undefined} onChange={vi.fn()} onComplete={vi.fn()} />,
    );

    expect(markup).toContain("식품자원경제학과 학생");
    expect(markup).not.toContain("식품자원경제학과 입학생");
    expect(markup).toContain("타 학과 학생");
    expect(markup).not.toContain("이수 경로를 선택해 주세요");
    expect(markup).not.toContain('name="studyPath"');
  });

  it("sets the department role to primary without administrative path radios", () => {
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

    expect(markup).toContain("주전공");
    expect(markup).not.toContain('name="majorRole"');
    expect(markup).not.toContain('name="studyPath"');
  });

  it("lets an undecided external student continue without a forced major commitment", () => {
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
    expect(markup).not.toContain("disabled=\"\"");
    expect(markup).toContain('value="undecided"');
  });

  it("keeps the target optional for a progress-checking track-major", () => {
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

    expect(markup).not.toContain('name="targetTrackId"');
    expect(markup).toContain("내 정보 저장하고 계속");
    expect(markup).not.toContain("disabled=\"\"");
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

    expect(markup).not.toContain('name="targetTrackId"');
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

    expect(markup).not.toContain('name="targetTrackId"');
    expect(markup).toContain("내 정보 저장하고 계속");
    expect(markup).not.toContain('disabled=""');
  });

  it("reads an incompatible legacy path as undecided without displaying an academic conclusion", () => {
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

    expect(markup).not.toContain("disabled=\"\"");
    expect(markup).toContain("학사 이수 기준은 확정하지 않아요");
    expect(markup).not.toContain("심화전공 기준을 사용합니다");
  });
});
