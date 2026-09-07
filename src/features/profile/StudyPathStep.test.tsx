import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StudentAffiliation } from "../../types";
import { StudyPathStep } from "./StudyPathStep";

function renderFor(affiliation: StudentAffiliation) {
  return renderToStaticMarkup(
    <StudyPathStep
      affiliation={affiliation}
      goal="find-track"
      studyPath={affiliation === "department-student" ? "track-major" : "double-major"}
      entryYearValid
      allowedPaths={affiliation === "department-student" ? ["track-major"] : ["double-major"]}
      valid
      onGoalChange={vi.fn()}
      onStudyPathChange={vi.fn()}
      onEntryYearChange={vi.fn()}
      onTargetTrackChange={vi.fn()}
      onBack={vi.fn()}
      onComplete={vi.fn()}
    />,
  );
}

describe("StudyPathStep affiliation copy", () => {
  it("frames interest discovery inside the department for department students", () => {
    const markup = renderFor("department-student");

    expect(markup).toContain("전공 안에서 관심 트랙 찾기");
    expect(markup).not.toContain("내 전공과 연결할 트랙 찾기");
  });

  it("frames interest discovery as a bridge for students from other departments", () => {
    const markup = renderFor("external-student");

    expect(markup).toContain("내 전공과 연결할 트랙 찾기");
    expect(markup).not.toContain("전공 안에서 관심 트랙 찾기");
  });
});
