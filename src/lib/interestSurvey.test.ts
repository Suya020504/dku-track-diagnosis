import { describe, expect, it } from "vitest";
import { getInterestSurveyQuestions } from "../data/interestSurveyQuestions";
import type { InterestSurveyAnswer, InterestSurveyAudience } from "../types";
import {
  CLOSE_INTEREST_SCORE_GAP,
  compareInterestSurveyResults,
  interestSurveyQuestions,
  isInterestSurveyComplete,
  scoreInterestSurvey,
} from "./interestSurvey";

function neutralAnswers(audience: InterestSurveyAudience = "department-student") {
  return Object.fromEntries(
    getInterestSurveyQuestions(audience).map((question) => [question.id, 3]),
  ) as Record<string, InterestSurveyAnswer>;
}

describe("interest survey scoring", () => {
  it.each(["department-student", "external-student"] as const)(
    "gives %s ten unique and balanced questions",
    (audience) => {
      const questions = getInterestSurveyQuestions(audience);
      const prefix = audience === "department-student" ? "dept-" : "external-";

      expect(questions).toHaveLength(10);
      expect(new Set(questions.map((item) => item.id)).size).toBe(10);
      expect(questions.every((item) => item.id.startsWith(prefix))).toBe(true);
      for (const trackId of [
        "food-marketing",
        "regional-development-consulting",
        "agri-food-distribution",
        "economics",
        "food-bio-economy",
      ] as const) {
        expect(questions.filter((item) => item.weights[trackId] === 1)).toHaveLength(2);
      }
    },
  );

  it("ranks food marketing first when marketing questions receive the strongest answers", () => {
    const answers = neutralAnswers();
    answers["dept-consumer-choice"] = 5;
    answers["dept-brand-strategy"] = 5;
    answers["dept-economic-data"] = 2;
    answers["dept-policy-evidence"] = 2;

    const results = scoreInterestSurvey(answers, "department-student");

    expect(results[0].trackId).toBe("food-marketing");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("keeps neutral answers at the middle of the scale", () => {
    const results = scoreInterestSurvey(neutralAnswers(), "department-student");

    expect(results.every((result) => result.score === 50)).toBe(true);
  });

  it("requires every question before marking the survey complete", () => {
    const answers = neutralAnswers();
    delete answers[interestSurveyQuestions[0].id];

    expect(isInterestSurveyComplete(answers, "department-student")).toBe(false);
    expect(isInterestSurveyComplete(neutralAnswers(), "department-student")).toBe(true);
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

    expect(isInterestSurveyComplete(answers, "department-student")).toBe(false);
  });

  it("ignores invalid and missing values instead of letting them distort scores", () => {
    const answers = neutralAnswers() as Record<string, number>;
    delete answers["dept-consumer-choice"];
    answers["dept-brand-strategy"] = 99;

    const results = scoreInterestSurvey(answers, "department-student");

    expect(results.every((result) => result.score >= 0 && result.score <= 100)).toBe(true);
    expect(results.find((result) => result.trackId === "food-marketing")?.score).toBe(50);
  });
});
