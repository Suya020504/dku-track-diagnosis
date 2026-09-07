import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SurveyAudienceStep } from "./SurveyAudienceStep";

describe("SurveyAudienceStep", () => {
  it("asks affiliation before showing audience-specific questions", () => {
    const markup = renderToStaticMarkup(
      <SurveyAudienceStep onSelect={vi.fn()} />,
    );

    expect(markup).toContain("data-survey-audience-step");
    expect(markup).toContain("식품자원경제학과 학생");
    expect(markup).toContain("타 학과 학생");
    expect(markup).toContain("전공 안에서 더 깊게 공부할 방향");
    expect(markup).toContain("현재 전공과 식품자원경제를 연결할 방향");
    expect(markup).not.toContain("interest-question-card");
  });
});
