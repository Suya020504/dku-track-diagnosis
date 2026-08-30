import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { interestSurveyQuestions } from "../../lib/interestSurvey";
import type { InterestSurveyAnswer, InterestSurveyState } from "../../types";
import { InterestSurvey } from "./InterestSurvey";

const emptyCallbacks = {
  onChange: vi.fn(),
  onChooseTrack: vi.fn(),
  onSkipToDiagnosis: vi.fn(),
};

describe("InterestSurvey", () => {
  it("renders one restored question with the controlled answer and all five labels", () => {
    const value: InterestSurveyState = {
      answers: { [interestSurveyQuestions[2].id]: 4 },
      currentIndex: 2,
    };

    const markup = renderToStaticMarkup(
      <InterestSurvey
        value={value}
        storageError={false}
        {...emptyCallbacks}
      />,
    );

    expect(markup).toContain("3 / 10");
    expect(markup).toContain(interestSurveyQuestions[2].statement);
    expect(markup).toContain("전혀 그렇지 않다");
    expect(markup).toContain("그렇지 않다");
    expect(markup).toContain("보통이다");
    expect(markup).toContain("그렇다");
    expect(markup).toContain("매우 그렇다");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("이전");
    expect(markup).toContain("다음");
  });

  it("shows the parent persistence error without reading a separate storage key", () => {
    const markup = renderToStaticMarkup(
      <InterestSurvey
        value={{ answers: {}, currentIndex: 0 }}
        storageError
        {...emptyCallbacks}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("저장하지 못했어요");
    expect(markup).toContain("설문을 건너뛰고 자가진단 바로가기");
  });

  it("explains close scores, focuses the result heading, and keeps track choice explicit", () => {
    const answers = Object.fromEntries(
      interestSurveyQuestions.map((question) => [question.id, 3]),
    ) as Record<string, InterestSurveyAnswer>;
    const value: InterestSurveyState = {
      answers,
      currentIndex: 9,
      completedAt: "2026-08-30T00:00:00.000Z",
      selectedTrackId: "economics",
    };

    const markup = renderToStaticMarkup(
      <InterestSurvey
        value={value}
        storageError={false}
        {...emptyCallbacks}
      />,
    );

    expect(markup).toContain("여러 관심 방향이 비슷하게 나타났어요");
    expect(markup).toContain("상위 점수 차이가 가까워요");
    expect(markup).toMatch(/<h1[^>]*tabindex="-1"/);
    expect(markup).toContain("경제학을 선택했어요");
    expect(markup).toContain("선택한 트랙으로 자가진단 이어가기");
    expect(markup).not.toContain("전체 1순위");
  });
});
