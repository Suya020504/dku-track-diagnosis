import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { Compass, Heart, Route } from "lucide-react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { tracks } from "../../data/curriculumData";
import { findAlignedLeaderTrackIds } from "../../lib/recommendationEngine";
import type {
  GraduationPlanStatus,
  InterestAxisCandidate,
  PlanAxisCandidate,
  ProgressAxisCandidate,
  RecommendationAxes,
  TrackId,
} from "../../types";
import { AxisResultCard } from "./AxisResultCard";

export type RecommendationAxisId = "interest" | "progress" | "plan";

export type TrackRecommendationAxesProps = {
  axes?: RecommendationAxes;
  courseInputReady: boolean;
  storageError: boolean;
  activeAxis: RecommendationAxisId;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onAxisChange: (axis: RecommendationAxisId) => void;
  onOpenInterestSurvey: () => void;
  onOpenCourseInput: () => void;
  onOpenGraduationPlan: () => void;
};

const AXIS_PAGES: ReadonlyArray<{
  id: RecommendationAxisId;
  index: string;
  label: string;
  description: string;
}> = [
  { id: "interest", index: "01", label: "관심", description: "질문에서 보인 방향" },
  { id: "progress", index: "02", label: "현재 완료 과목", description: "완료로 표시한 과목" },
  { id: "plan", index: "03", label: "졸업 전 계획", description: "목표 학기까지의 배치" },
];

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

function sameProgressLeader(left: ProgressAxisCandidate, right: ProgressAxisCandidate) {
  return left.missingCourseCount === right.missingCourseCount
    && left.missingCredits === right.missingCredits
    && left.missingModuleLabels.length === right.missingModuleLabels.length;
}

function samePlanLeader(left: PlanAxisCandidate, right: PlanAxisCandidate) {
  return left.status === right.status
    && left.unplacedCourseCount === right.unplacedCourseCount
    && left.neededExtraTerms === right.neededExtraTerms;
}

function CandidateCollection<T extends { trackId: TrackId }>({
  candidates,
  relationLabel,
  renderEvidence,
  leaderTieTrackIds,
}: {
  candidates: T[];
  relationLabel: (candidate: T, index: number) => string;
  renderEvidence: (candidate: T) => ReactNode;
  leaderTieTrackIds: TrackId[];
}) {
  const lead = candidates[0];
  const secondary = candidates.slice(1, 3);
  if (!lead) return null;

  return (
    <div className="axis-candidate-guide">
      <article className="axis-lead-candidate" data-lead-track={lead.trackId}>
        <header>
          <span>{relationLabel(lead, 0)}</span>
          <div>
            <TrackGlyph trackId={lead.trackId} decorative />
            <h3>{trackName(lead.trackId)}</h3>
          </div>
        </header>
        {renderEvidence(lead)}
      </article>

      {secondary.length > 0 ? (
        <section className="axis-secondary-candidates" aria-labelledby="axis-secondary-candidates-title">
          <header>
            <span>다른 방향도 확인</span>
            <h3 id="axis-secondary-candidates-title">함께 비교할 두 후보</h3>
          </header>
          <ol>
            {secondary.map((candidate, index) => (
              <li key={candidate.trackId}>
                <article data-track-id={candidate.trackId}>
                  <header>
                    <span>{relationLabel(candidate, index + 1)}</span>
                    <div>
                      <TrackGlyph trackId={candidate.trackId} decorative />
                      <h4>{trackName(candidate.trackId)}</h4>
                    </div>
                  </header>
                  {renderEvidence(candidate)}
                </article>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {leaderTieTrackIds.length > 1 ? (
        <p className="axis-tie-note">
          동점 후보 사이에는 우열을 정하지 않습니다. 선두가 같은 후보: {leaderTieTrackIds.map(trackName).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function InterestCandidates({ candidates }: { candidates: InterestAxisCandidate[] }) {
  const top = candidates[0];
  const leaderTieTrackIds = candidates
    .filter((candidate) => candidate.score === top.score)
    .map((candidate) => candidate.trackId);
  const hasLeaderTie = leaderTieTrackIds.length > 1;

  return (
    <CandidateCollection
      candidates={candidates}
      leaderTieTrackIds={leaderTieTrackIds}
      relationLabel={(candidate, index) => {
        if (candidate.score === top.score && hasLeaderTie) return "공동 선두 후보";
        if (index === 0) return "기준 안의 선두 후보";
        if (candidate.closeLeader) return "선두와 가까운 후보";
        return "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <ul className="axis-reason-list">
          {candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    />
  );
}

function ProgressCandidates({ candidates }: { candidates: ProgressAxisCandidate[] }) {
  const top = candidates[0];
  const leaderTieTrackIds = candidates
    .filter((candidate) => sameProgressLeader(candidate, top))
    .map((candidate) => candidate.trackId);
  const hasLeaderTie = leaderTieTrackIds.length > 1;

  return (
    <CandidateCollection
      candidates={candidates}
      leaderTieTrackIds={leaderTieTrackIds}
      relationLabel={(candidate, index) => {
        if (sameProgressLeader(candidate, top) && hasLeaderTie) return "공동 선두 후보";
        return index === 0 ? "기준 안의 선두 후보" : "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <dl className="axis-evidence-list">
          <div><dt>과목</dt><dd>추가로 확인할 과목 {candidate.missingCourseCount}개</dd></div>
          <div><dt>학점</dt><dd>부족 {candidate.missingCredits}학점</dd></div>
          <div>
            <dt>모듈</dt>
            <dd>
              {candidate.missingModuleLabels.length > 0
                ? candidate.missingModuleLabels.join(" · ")
                : "모듈 학점 조건 충족"}
            </dd>
          </div>
        </dl>
      )}
    />
  );
}

function PlanCandidates({ candidates }: { candidates: PlanAxisCandidate[] }) {
  const top = candidates[0];
  const leaderTieTrackIds = candidates
    .filter((candidate) => samePlanLeader(candidate, top))
    .map((candidate) => candidate.trackId);
  const hasLeaderTie = leaderTieTrackIds.length > 1;

  return (
    <CandidateCollection
      candidates={candidates}
      leaderTieTrackIds={leaderTieTrackIds}
      relationLabel={(candidate, index) => {
        if (samePlanLeader(candidate, top) && hasLeaderTie) return "공동 선두 후보";
        return index === 0 ? "기준 안의 선두 후보" : "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <dl className="axis-evidence-list">
          <div><dt>배치 상태</dt><dd>{planStatusLabels[candidate.status]}</dd></div>
          <div><dt>미배치</dt><dd>계획에 못 담은 과목 {candidate.unplacedCourseCount}개</dd></div>
          <div><dt>학기</dt><dd>추가로 필요한 학기 {candidate.neededExtraTerms}개</dd></div>
        </dl>
      )}
    />
  );
}

export function TrackRecommendationAxes({
  axes,
  courseInputReady,
  storageError,
  activeAxis,
  headingRef,
  onAxisChange,
  onOpenInterestSurvey,
  onOpenCourseInput,
  onOpenGraduationPlan,
}: TrackRecommendationAxesProps) {
  const interest = axes?.interest?.length ? axes.interest : undefined;
  const progress = courseInputReady && axes?.progress.length ? axes.progress : undefined;
  const plan = axes?.plan?.length ? axes.plan : undefined;
  const alignedLeaderTrackIds = findAlignedLeaderTrackIds(interest, progress ?? [], plan);
  const aligned = alignedLeaderTrackIds.length > 0;

  const axisLeaders: Record<RecommendationAxisId, TrackId | undefined> = {
    interest: interest?.[0]?.trackId,
    progress: progress?.[0]?.trackId,
    plan: plan?.[0]?.trackId,
  };

  function moveAxis(event: KeyboardEvent<HTMLButtonElement>, current: RecommendationAxisId) {
    const currentIndex = AXIS_PAGES.findIndex((page) => page.id === current);
    let nextIndex: number | undefined;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % AXIS_PAGES.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + AXIS_PAGES.length) % AXIS_PAGES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = AXIS_PAGES.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    onAxisChange(AXIS_PAGES[nextIndex].id);
  }

  function renderActiveAxis() {
    if (activeAxis === "interest") {
      return (
        <AxisResultCard
          id="interest"
          tabId="recommendation-axis-tab-interest"
          title="관심이 향하는 트랙"
          description="열 개 문항의 관심 방향만 반영합니다. 완료 과목이나 졸업 계획은 이 순서에 섞지 않습니다."
          unavailable={interest ? undefined : {
            message: "관심 설문을 완료하면 흥미 방향에 가까운 트랙을 비교할 수 있어요.",
            actionLabel: "관심 설문 시작하기",
            onAction: onOpenInterestSurvey,
          }}
        >
          {interest ? <InterestCandidates candidates={interest} /> : null}
        </AxisResultCard>
      );
    }

    if (activeAxis === "progress") {
      return (
        <AxisResultCard
          id="progress"
          tabId="recommendation-axis-tab-progress"
          title="현재 완료 과목에서 가까운 트랙"
          description="완료로 표시한 과목만 계산해, 트랙별로 추가 확인할 과목과 부족 학점·모듈을 봅니다."
          assumption={progress?.[0]?.assumption === "track-major-hypothesis"}
          unavailable={progress ? undefined : {
            message: "프로필과 현재까지 완료한 이수 과목을 확인하면 이 기준을 계산할 수 있어요.",
            actionLabel: "이수 과목 입력하기",
            onAction: onOpenCourseInput,
          }}
        >
          {progress ? <ProgressCandidates candidates={progress} /> : null}
        </AxisResultCard>
      );
    }

    return (
      <AxisResultCard
        id="plan"
        tabId="recommendation-axis-tab-plan"
        title="졸업 전 계획에 배치하기 쉬운 트랙"
        description="목표 졸업학기와 학기당 수강량을 기준으로 배치 상태, 미배치 과목, 추가 학기를 따로 봅니다."
        assumption={plan?.[0]?.assumption === "track-major-hypothesis"}
        unavailable={plan ? undefined : {
          message: "현재 학기, 목표 졸업학기, 학기당 수강량을 입력하면 계획 가능성을 비교할 수 있어요.",
          actionLabel: "졸업 계획 입력하기",
          onAction: onOpenGraduationPlan,
        }}
      >
        {plan ? <PlanCandidates candidates={plan} /> : null}
      </AxisResultCard>
    );
  }

  return (
    <main className="recommendation-axes" aria-labelledby="recommendation-axes-title">
      <header className="recommendation-axes-hero">
        <span>INDEPENDENT TRACK INDEX</span>
        <h1 id="recommendation-axes-title" ref={headingRef} tabIndex={-1}>
          세 기준은 합치지 않고, 한 장씩 비교해요
        </h1>
        <p>관심, 현재 완료 과목, 졸업 전 계획은 서로 다른 질문입니다. 기준을 바꾸며 각 페이지의 실제 근거를 확인해 주세요.</p>
      </header>

      {storageError ? (
        <p className="recommendation-storage-error" role="alert">
          답변을 이 브라우저에 저장하지 못했습니다. 새로고침하면 답변이 사라질 수 있습니다.
        </p>
      ) : null}

      <div className="recommendation-index-layout">
        <nav className="recommendation-axis-index" aria-label="독립 추천 기준">
          <span className="recommendation-axis-index__title">PAGE EDGE</span>
          <div role="tablist" aria-label="추천 기준 페이지" aria-orientation="vertical">
            {AXIS_PAGES.map((page) => {
              const selected = activeAxis === page.id;
              const leader = axisLeaders[page.id];
              return (
                <button
                  className={selected ? "active planner-focusable" : "planner-focusable"}
                  id={`recommendation-axis-tab-${page.id}`}
                  data-axis-tab={page.id}
                  type="button"
                  role="tab"
                  aria-controls="recommendation-axis-panel"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  key={page.id}
                  onClick={() => onAxisChange(page.id)}
                  onKeyDown={(event) => moveAxis(event, page.id)}
                >
                  <span>{page.index}</span>
                  <span>
                    <strong>{page.label}</strong>
                    <small>{leader ? `${page.description} · ${trackName(leader)}` : `${page.description} · 입력 필요`}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="recommendation-active-axis">
          {renderActiveAxis()}

          {aligned ? (
            <aside className="recommendation-compass-path recommendation-compass-path--aligned" aria-label="정렬된 Compass Path">
              <Compass aria-hidden="true" size={22} />
              <div>
                <span>Compass Path</span>
                <strong>
                  {alignedLeaderTrackIds.map((trackId) => trackName(trackId)).join(" · ")} 후보가 두 개 이상의 기준에서 선두로 나타났습니다.
                </strong>
                <p>기준이 겹친다는 뜻일 뿐 세 축을 합친 결론이 아닙니다. 각 축의 근거를 다시 확인해 주세요.</p>
              </div>
              <div className="recommendation-compass-path__tracks">
                {alignedLeaderTrackIds.map((trackId) => (
                  <span key={trackId}>
                    <TrackGlyph trackId={trackId} decorative />
                    {trackName(trackId)}
                  </span>
                ))}
              </div>
            </aside>
          ) : (
            <aside className="recommendation-compass-path recommendation-compass-path--diverged" aria-label="서로 다른 기준 방향">
              <Route aria-hidden="true" size={22} />
              <div>
                <span>Compass Path</span>
                <strong>기준의 방향은 서로 다릅니다.</strong>
                <p>축을 바꿔 근거를 직접 비교해 선택해 주세요. 이 화면이 한 트랙을 대신 고르지 않습니다.</p>
              </div>
            </aside>
          )}
        </div>
      </div>

      <footer className="recommendation-axes-footer">
        <Heart aria-hidden="true" size={19} />
        <span>어느 축도 최종 결정을 대신하지 않습니다. 트랙 상세와 공식 안내도 함께 확인하세요.</span>
      </footer>
    </main>
  );
}
