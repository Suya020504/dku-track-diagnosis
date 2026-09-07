import { tracks } from "../data/curriculumData";
import {
  getInterestSurveyQuestions,
  type InterestSurveyQuestion,
} from "../data/interestSurveyQuestions";
import type { InterestSurveyAnswer, InterestSurveyAudience, TrackId } from "../types";

export type { InterestSurveyAnswer } from "../types";

export type InterestSurveyResult = {
  trackId: TrackId;
  trackName: string;
  score: number;
  summary: string;
  reasons: string[];
};

/**
 * Percentage-point gap at which the two leading tracks should be described as
 * similarly interesting instead of declaring a clear first choice.
 */
export const CLOSE_INTEREST_SCORE_GAP = 5;

export type InterestSurveyResultComparison = {
  isCloseMatch: boolean;
  scoreGap: number | null;
  closeMatchCount: number;
};

export type { InterestSurveyQuestion } from "../data/interestSurveyQuestions";

export const interestSurveyQuestions: readonly InterestSurveyQuestion[] =
  getInterestSurveyQuestions("department-student");

export const interestTrackProfiles: Record<
  TrackId,
  { summary: string; reasons: string[] }
> = {
  "food-marketing": {
    summary: "소비자와 시장을 이해해 상품 기획과 마케팅 전략으로 연결하는 방향입니다.",
    reasons: [
      "소비자 선택과 시장 변화를 분석하는 일",
      "상품 기획과 유통 전략을 연결하는 일",
    ],
  },
  "regional-development-consulting": {
    summary: "지역·환경 문제를 조사하고 정책과 컨설팅 대안으로 발전시키는 방향입니다.",
    reasons: [
      "지역 현장의 문제를 구조적으로 파악하는 일",
      "지속가능한 정책과 실행 방안을 제안하는 일",
    ],
  },
  "agri-food-distribution": {
    summary: "농식품의 생산·가격·물류 흐름을 이해하고 효율적인 유통 구조를 설계하는 방향입니다.",
    reasons: [
      "생산자와 소비자를 잇는 유통 흐름을 개선하는 일",
      "가격·물류·공급망 데이터를 비교하는 일",
    ],
  },
  economics: {
    summary: "경제이론과 데이터를 이용해 시장·정책·사회 현상을 분석하는 방향입니다.",
    reasons: [
      "자료를 근거로 경제 현상을 설명하는 일",
      "정책의 효과와 대안을 객관적으로 평가하는 일",
    ],
  },
  "food-bio-economy": {
    summary: "식품자원경제학에 바이오·영양·식품기술을 결합해 미래 산업을 탐색하는 방향입니다.",
    reasons: [
      "식품과 바이오 기술을 산업 관점에서 연결하는 일",
      "푸드테크와 미래식품의 가능성을 탐색하는 일",
    ],
  },
};

export function scoreInterestSurvey(
  answers: Readonly<Record<string, unknown>>,
  audience: InterestSurveyAudience = "department-student",
): InterestSurveyResult[] {
  const questions = getInterestSurveyQuestions(audience);
  const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));

  return tracks
    .map((track) => {
      let weightedScore = 0;
      let totalWeight = 0;

      questions.forEach((question) => {
        const answer = answers[question.id];
        const weight = question.weights[track.id] ?? 0;

        if (!isInterestSurveyAnswer(answer) || weight === 0) {
          return;
        }

        weightedScore += (answer - 1) * weight;
        totalWeight += 4 * weight;
      });

      const profile = interestTrackProfiles[track.id];

      return {
        trackId: track.id,
        trackName: track.name,
        score: totalWeight === 0 ? 0 : Math.round((weightedScore / totalWeight) * 100),
        summary: profile.summary,
        reasons: profile.reasons,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (trackOrder.get(left.trackId) ?? 0) - (trackOrder.get(right.trackId) ?? 0),
    );
}

export function compareInterestSurveyResults(
  results: Pick<InterestSurveyResult, "score">[],
): InterestSurveyResultComparison {
  if (results.length < 2) {
    return {
      isCloseMatch: false,
      scoreGap: null,
      closeMatchCount: results.length,
    };
  }

  const scores = results.map((result) => result.score).sort((left, right) => right - left);
  const topScore = scores[0];
  const scoreGap = topScore - scores[1];

  return {
    isCloseMatch: scoreGap <= CLOSE_INTEREST_SCORE_GAP,
    scoreGap,
    closeMatchCount: scores.filter(
      (score) => topScore - score <= CLOSE_INTEREST_SCORE_GAP,
    ).length,
  };
}

export function isInterestSurveyComplete(
  answers: Readonly<Record<string, unknown>>,
  audience: InterestSurveyAudience = "department-student",
) {
  return getInterestSurveyQuestions(audience).every((question) =>
    isInterestSurveyAnswer(answers[question.id]),
  );
}

function isInterestSurveyAnswer(value: unknown): value is InterestSurveyAnswer {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}
