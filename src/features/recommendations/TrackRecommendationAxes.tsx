import { ArrowRight, CheckCircle2, Heart, Route } from "lucide-react";
import { tracks } from "../../data/curriculumData";
import { findAlignedLeaderTrackIds } from "../../lib/recommendationEngine";
import type {
  GraduationPlanStatus,
  RecommendationAxes,
  TrackId,
} from "../../types";
import { AxisResultCard } from "./AxisResultCard";

export type TrackRecommendationAxesProps = {
  axes?: RecommendationAxes;
  courseInputReady: boolean;
  storageError: boolean;
  activeAxis?: "interest" | "progress" | "plan";
  onOpenInterestSurvey: () => void;
  onOpenCourseInput: () => void;
  onOpenGraduationPlan: () => void;
};

const trackNames = new Map(tracks.map((track) => [track.id, track.name]));
const planStatusLabels: Record<GraduationPlanStatus, string> = {
  "currently-satisfied": "현재 입력으로 충족",
  "regular-plan-possible": "정규학기 계획 가능",
  "load-adjustment-needed": "학기별 수강량 조정 필요",
  "extra-term-possible": "추가 학기까지 보면 가능",
  "official-review-required": "공식 확인 필요",
};

function trackName(trackId: TrackId) {
  return trackNames.get(trackId) ?? trackId;
}

export function TrackRecommendationAxes({
  axes,
  courseInputReady,
  storageError,
  activeAxis,
  onOpenInterestSurvey,
  onOpenCourseInput,
  onOpenGraduationPlan,
}: TrackRecommendationAxesProps) {
  const interest = axes?.interest?.length ? axes.interest : undefined;
  const progress = courseInputReady && axes?.progress.length ? axes.progress : undefined;
  const plan = axes?.plan?.length ? axes.plan : undefined;
  const availableAxisCount = Number(Boolean(interest)) + Number(Boolean(progress)) + Number(Boolean(plan));
  const visibleAlignedLeaderTrackIds = findAlignedLeaderTrackIds(
    interest,
    progress ?? [],
    plan,
  );
  const aligned = availableAxisCount >= 2 && visibleAlignedLeaderTrackIds.length > 0;
  const hypothesis = progress?.[0]?.assumption === "track-major-hypothesis"
    || plan?.[0]?.assumption === "track-major-hypothesis";
  const comparisonMessage = availableAxisCount >= 2
    ? aligned
      ? "여러 기준이 같은 방향을 가리켜요"
      : "기준에 따라 결과가 달라요. 중요하게 볼 기준을 선택해 비교하세요."
    : "입력을 더하면 기준별 결과를 나란히 비교할 수 있어요.";

  return (
    <main className="recommendation-axes" aria-labelledby="recommendation-axes-title">
      <header className="recommendation-axes-hero">
        <div>
          <span>트랙 추천 비교</span>
          <h1 id="recommendation-axes-title">한 줄 순위 대신, 세 기준을 따로 확인하세요</h1>
          <p>관심, 현재 이수 과목, 졸업 전 계획은 서로 다른 질문입니다. 각 기준 안의 순서와 근거를 비교해 직접 판단할 수 있습니다.</p>
        </div>
        <div className={aligned ? "axis-comparison-note aligned" : "axis-comparison-note"} role="status">
          {aligned
            ? <CheckCircle2 aria-hidden="true" size={22} />
            : <Route aria-hidden="true" size={22} />}
          <strong>{comparisonMessage}</strong>
        </div>
      </header>

      {storageError && (
        <p className="recommendation-storage-error" role="alert">
          답변을 이 브라우저에 저장하지 못했습니다. 새로고침하면 답변이 사라질 수 있습니다.
        </p>
      )}

      {hypothesis && (
        <p className="axes-hypothesis-note">
          트랙형전공으로 전환한다고 가정한 비교
        </p>
      )}

      <div className="recommendation-axis-grid">
        <AxisResultCard
          id="interest"
          title="관심에 가까운 트랙"
          description="열 개 문항의 관심 방향만 반영하며, 이수 과목이나 졸업 가능성은 섞지 않습니다."
          active={activeAxis === "interest"}
          unavailable={interest ? undefined : {
            message: "관심 설문을 완료하면 흥미 방향에 가까운 트랙을 비교할 수 있어요.",
            actionLabel: "관심 설문 시작하기",
            onAction: onOpenInterestSurvey,
          }}
        >
          {interest && (
            <ol className="axis-candidate-list">
              {interest.map((candidate, index) => (
                <li key={candidate.trackId}>
                  <span className="axis-list-position" aria-label={`관심 기준 ${index + 1}번째`}>{index + 1}</span>
                  <div>
                    <div className="axis-candidate-title">
                      <strong>{trackName(candidate.trackId)}</strong>
                      <em>{candidate.score}%</em>
                    </div>
                    {candidate.closeLeader && <small className="axis-close-label">상위 점수와 가까움</small>}
                    <ul>{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AxisResultCard>

        <AxisResultCard
          id="progress"
          title="현재 이수 과목으로 가까운 트랙"
          description="완료로 표시한 과목만 계산해, 각 트랙까지 추가로 필요한 과목과 학점을 비교합니다."
          active={activeAxis === "progress"}
          assumption={progress?.[0]?.assumption === "track-major-hypothesis"
            ? "트랙형전공으로 전환한다고 가정한 비교"
            : undefined}
          unavailable={progress ? undefined : {
            message: "프로필과 현재까지 완료한 이수 과목을 확인하면 이 기준을 계산할 수 있어요.",
            actionLabel: "이수 과목 입력하기",
            onAction: onOpenCourseInput,
          }}
        >
          {progress && (
            <ol className="axis-candidate-list">
              {progress.map((candidate, index) => (
                <li key={candidate.trackId}>
                  <span className="axis-list-position" aria-label={`이수 과목 기준 ${index + 1}번째`}>{index + 1}</span>
                  <div>
                    <div className="axis-candidate-title">
                      <strong>{trackName(candidate.trackId)}</strong>
                      <em>추가 과목 {candidate.missingCourseCount}개</em>
                    </div>
                    <p>부족 {candidate.missingCredits}학점</p>
                    <small>
                      {candidate.missingModuleLabels.length
                        ? `확인할 모듈: ${candidate.missingModuleLabels.join(", ")}`
                        : "모듈 학점 조건 충족"}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AxisResultCard>

        <AxisResultCard
          id="plan"
          title="졸업 전 계획을 만들기 쉬운 트랙"
          description="목표 졸업학기와 학기당 수강량을 기준으로 배치 가능성과 공식 확인 항목을 비교합니다."
          active={activeAxis === "plan"}
          assumption={plan?.[0]?.assumption === "track-major-hypothesis"
            ? "트랙형전공으로 전환한다고 가정한 비교"
            : undefined}
          unavailable={plan ? undefined : {
            message: "현재 학기, 목표 졸업학기, 학기당 수강량을 입력하면 계획 가능성을 비교할 수 있어요.",
            actionLabel: "졸업 계획 입력하기",
            onAction: onOpenGraduationPlan,
          }}
        >
          {plan && (
            <ol className="axis-candidate-list">
              {plan.map((candidate, index) => (
                <li key={candidate.trackId}>
                  <span className="axis-list-position" aria-label={`졸업 계획 기준 ${index + 1}번째`}>{index + 1}</span>
                  <div>
                    <div className="axis-candidate-title">
                      <strong>{trackName(candidate.trackId)}</strong>
                      <em>{planStatusLabels[candidate.status]}</em>
                    </div>
                    <p>계획에 못 담은 과목 {candidate.unplacedCourseCount}개</p>
                    <small>추가로 필요한 학기 {candidate.neededExtraTerms}개</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </AxisResultCard>
      </div>

      <footer className="recommendation-axes-footer">
        <Heart aria-hidden="true" size={19} />
        <span>어느 축도 최종 결정을 대신하지 않습니다. 중요하게 볼 기준을 정한 뒤 트랙 상세와 공식 안내를 함께 확인하세요.</span>
        <ArrowRight aria-hidden="true" size={18} />
      </footer>
    </main>
  );
}
