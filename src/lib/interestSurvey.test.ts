import { describe, expect, it } from "vitest";
import type { InterestSurveyAnswer } from "../types";
import {
  CLOSE_INTEREST_SCORE_GAP,
  compareInterestSurveyResults,
  interestSurveyQuestions,
  isInterestSurveyComplete,
  scoreInterestSurvey,
} from "./interestSurvey";

function neutralAnswers() {
  return Object.fromEntries(
    interestSurveyQuestions.map((question) => [question.id, 3]),
  ) as Record<string, InterestSurveyAnswer>;
}

describe("interest survey scoring", () => {
  it("ranks food marketing first when marketing questions receive the strongest answers", () => {
    const answers = neutralAnswers();
    answers["consumer-choice"] = 5;
    answers["brand-strategy"] = 5;
    answers["economic-data"] = 2;
    answers["policy-evidence"] = 2;

    const results = scoreInterestSurvey(answers);

    expect(results[0].trackId).toBe("food-marketing");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("keeps neutral answers at the middle of the scale", () => {
    const results = scoreInterestSurvey(neutralAnswers());

    expect(results.every((result) => result.score === 50)).toBe(true);
  });

  it("requires every question before marking the survey complete", () => {
    const answers = neutralAnswers();
    delete answers[interestSurveyQuestions[0].id];

    expect(isInterestSurveyComplete(answers)).toBe(false);
    expect(isInterestSurveyComplete(neutralAnswers())).toBe(true);
  });

  it("treats a tie and a gap up to five percentage points as similar interests", () => {
    expect(
      compareInterestSurveyResults([{ score: 72 }, { score: 72 }, { score: 60 }]),
    ).toEqual({
      isCloseMatch: true,
      scoreGap: 0,
      closeMatchCount: 2,
    });

    expect(
      compareInterestSurveyResults([
        { score: 72 },
        { score: 72 - CLOSE_INTEREST_SCORE_GAP },
        { score: 65 },
      ]),
    ).toEqual({
      isCloseMatch: true,
      scoreGap: CLOSE_INTEREST_SCORE_GAP,
      closeMatchCount: 2,
    });
  });

  it("describes a gap above five percentage points as a clear lead", () => {
    expect(
      compareInterestSurveyResults([
        { score: 72 },
        { score: 72 - CLOSE_INTEREST_SCORE_GAP - 1 },
      ]),
    ).toEqual({
      isCloseMatch: false,
      scoreGap: CLOSE_INTEREST_SCORE_GAP + 1,
      closeMatchCount: 1,
    });
  });

  it("handles a single available result without claiming a close match", () => {
    expect(compareInterestSurveyResults([{ score: 50 }])).toEqual({
      isCloseMatch: false,
      scoreGap: null,
      closeMatchCount: 1,
    });
  });

  it("does not mark a survey complete when an answer is outside the approved scale", () => {
    const answers = neutralAnswers() as Record<string, number>;
    answers[interestSurveyQuestions[0].id] = 6;

    expect(isInterestSurveyComplete(answers)).toBe(false);
  });

  it("ignores invalid and missing values instead of letting them distort scores", () => {
    const answers = neutralAnswers() as Record<string, number>;
    delete answers["consumer-choice"];
    answers["brand-strategy"] = 99;

    const results = scoreInterestSurvey(answers);

    expect(results.every((result) => result.score >= 0 && result.score <= 100)).toBe(true);
    expect(results.find((result) => result.trackId === "food-marketing")?.score).toBe(50);
  });
});
