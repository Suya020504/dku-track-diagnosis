import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { interestSurveyQuestions } from "../../lib/interestSurvey";
import type { InterestSurveyAnswer, InterestSurveyState } from "../../types";
import { InterestSurvey } from "./InterestSurvey";

const emptyCallbacks = {
  onChange: vi.fn(),
  onAudienceChange: vi.fn(),
  onChooseTrack: vi.fn(),
  onSkipToDiagnosis: vi.fn(),
};

describe("InterestSurvey", () => {
  it("keeps the answered audience question and its focus target when storage fails", () => {
    const markup = renderToStaticMarkup(<InterestSurvey value={{audience:"department-student",answers:{},currentIndex:1}} storageError {...emptyCallbacks} />);
    expect(markup).toContain('class="ds-question-workspace"');
    expect(markup).toContain('class="dc-storage-error" role="alert"');
    expect(markup).toContain('class="ds-question-panel"');
    expect(markup).toContain('<legend tabindex="-1">');
    expect(markup.match(/type="radio"/g)).toHaveLength(5);
  });
  it("renders one restored question as one native 1–5 planner scale", () => {
    const value: InterestSurveyState = {
      audience: "department-student",
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
    expect(markup.match(/type="radio"/g)).toHaveLength(5);
    expect(markup.match(/name="interest-consumer-scale"/g)).toHaveLength(5);
    expect(markup).toMatch(/<input[^>]*(?:value="4"[^>]*checked|checked[^>]*value="4")/);
    expect(markup).not.toContain('aria-pressed="true"');
    expect(markup).toContain("방향키로 선택지를 이동할 수 있어요");
    expect(markup).not.toContain("숫자키");
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

  it("shows affiliation choice before rendering any common question", () => {
    const markup = renderToStaticMarkup(
      <InterestSurvey
        value={{ answers: {}, currentIndex: 0 }}
        storageError={false}
        {...emptyCallbacks}
      />,
    );

    expect(markup).toContain("data-survey-audience-step");
    expect(markup).not.toContain("interest-question-card");
  });

  it("explains close scores, focuses the result heading, and keeps track choice explicit", () => {
    const answers = Object.fromEntries(
      interestSurveyQuestions.map((question) => [question.id, 3]),
    ) as Record<string, InterestSurveyAnswer>;
    const value: InterestSurveyState = {
      audience: "department-student",
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
    expect(markup).toContain("상위 관심 점수가 비슷해요");
    expect(markup).toMatch(/<h1[^>]*tabindex="-1"/);
    expect(markup).toContain("경제학을 선택했어요");
    expect(markup).toContain("선택한 트랙으로 자가진단 이어가기");
    expect(markup).toContain('aria-label="경제학 트랙"');
    expect(markup).toContain("공동 상위");
    expect(markup.match(/aria-pressed=/g)).toHaveLength(3);
    expect(markup).toContain("다른 트랙도 보기");
    expect(markup).not.toContain("전체 1순위");
  });
});
