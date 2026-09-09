import { createContext, useContext, useState, type ReactNode, type RefObject } from "react";
import { BookOpenCheck, CalendarDays, CheckCircle2, Heart, SlidersHorizontal } from "lucide-react";
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
const CandidateChoice = createContext<{ chosen?: TrackId; chosenIds?: readonly TrackId[]; choose?: (id: TrackId) => void }>({});

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
  onChooseTrack?: (trackId: TrackId) => void;
  pendingSelectedTrackIds?: readonly TrackId[];
  onPendingTrackIdsChange?: (ids: TrackId[]) => void;
  onChooseTracks?: (ids: TrackId[]) => void;
};

const AXIS_PAGES: ReadonlyArray<{
  id: RecommendationAxisId;
  Icon: typeof Heart;
  label: string;
  description: string;
}> = [
  { id: "interest", Icon: Heart, label: "관심", description: "답변에서 나타난 관심 분야" },
  { id: "progress", Icon: BookOpenCheck, label: "현재 완료 과목", description: "완료로 표시한 과목" },
  { id: "plan", Icon: CalendarDays, label: "졸업 전 계획", description: "목표 학기까지의 배치" },
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
  secondaryLimit = 4,
  secondaryTitle = "같은 기준으로 비교",
}: {
  candidates: T[];
  relationLabel: (candidate: T, index: number) => string;
  renderEvidence: (candidate: T) => ReactNode;
  leaderTieTrackIds: TrackId[];
  secondaryLimit?: number;
  secondaryTitle?: string;
}) {
  const choice = useContext(CandidateChoice);
  const lead = candidates[0];
  const secondary = candidates.slice(1, secondaryLimit + 1);
  if (!lead) return null;

  return (
    <div className="dc-comparison-ledger">
      <div className="dc-ledger-caption"><strong>트랙별 근거 비교</strong><span>{secondaryTitle}</span></div>
      <ol className="dc-ledger-rows">
        {[lead, ...secondary].map((candidate, index) => (
          <li key={candidate.trackId}>
            <article className={index === 0 ? "dc-track-row dc-track-row--lead" : "dc-track-row"}
              data-track-id={candidate.trackId} data-lead-track={index === 0 ? candidate.trackId : undefined}>
              <header>
                <span>{relationLabel(candidate, index)}</span>
                <h3><TrackGlyph trackId={candidate.trackId} decorative />{trackName(candidate.trackId)}</h3>
              </header>
              <div className="dc-track-evidence">{renderEvidence(candidate)}</div>
              {choice.choose ? <button className="dc-row-choice" type="button"
                  aria-pressed={choice.chosenIds?.includes(candidate.trackId) ?? choice.chosen === candidate.trackId}
                  aria-label={`${trackName(candidate.trackId)} 진단 트랙 선택`}
                  onClick={() => choice.choose?.(candidate.trackId)}>
                  {(choice.chosenIds?.includes(candidate.trackId) ?? choice.chosen === candidate.trackId) ? "선택됨" : "함께 선택"}
              </button> : null}
            </article>
          </li>
        ))}
      </ol>

      {leaderTieTrackIds.length > 1 ? (
        <p className="dc-tie-note">
          동점 후보 사이에는 우열을 정하지 않습니다. 공동 선두 후보: {leaderTieTrackIds.map(trackName).join(" · ")}
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
        if (index === 0) return "이 기준의 선두 후보";
        if (candidate.closeLeader) return "선두와 가까운 후보";
        return "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <ul className="dc-reason-list">
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
      secondaryLimit={4}
      secondaryTitle="같은 기준으로 비교"
      relationLabel={(candidate, index) => {
        if (sameProgressLeader(candidate, top) && hasLeaderTie) return "공동 선두 후보";
        return index === 0 ? "이 기준의 선두 후보" : "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <dl className="dc-evidence-list">
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
        return index === 0 ? "이 기준의 선두 후보" : "비교 후보";
      }}
      renderEvidence={(candidate) => (
        <dl className="dc-evidence-list">
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
  onChooseTrack,
  pendingSelectedTrackIds,
  onPendingTrackIdsChange,
  onChooseTracks,
}: TrackRecommendationAxesProps) {
  const [chosenTrack, setChosenTrack] = useState<TrackId>();
  const [localChosenTracks, setLocalChosenTracks] = useState<TrackId[]>([]);
  const chosenTracks = pendingSelectedTrackIds ?? localChosenTracks;
  const chooseMultiple = (id: TrackId) => {
    const next = chosenTracks.includes(id) ? chosenTracks.filter(item => item !== id) : [...chosenTracks, id];
    setLocalChosenTracks(next); onPendingTrackIdsChange?.(next);
  };
  const interest = axes?.interest?.length ? axes.interest : undefined;
  const progress = courseInputReady && axes?.progress.length ? axes.progress : undefined;
  const plan = axes?.plan?.length ? axes.plan : undefined;
  const alignedLeaderTrackIds = findAlignedLeaderTrackIds(interest, progress ?? [], plan);
  const aligned = alignedLeaderTrackIds.length > 0;
  const availableAxisCount = [interest, progress, plan].filter(Boolean).length;

  const axisLeaders: Record<RecommendationAxisId, TrackId | undefined> = {
    interest: interest?.[0]?.trackId,
    progress: progress?.[0]?.trackId,
    plan: plan?.[0]?.trackId,
  };

  function renderActiveAxis() {
    if (activeAxis === "interest") {
      return (
        <AxisResultCard
          id="interest"
          title="관심이 향하는 트랙"
          description="소속별 관심 질문의 답변만 반영합니다. 완료 과목이나 졸업 계획은 이 순서에 반영하지 않습니다."
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
          title="완료 과목 기준으로 비교한 트랙"
          description="완료 과목을 기준으로 부족한 과목·학점·모듈을 비교합니다."
          assumption={progress?.[0]?.assumption === "track-major-hypothesis"}
          unavailable={progress ? undefined : {
            message: "프로필과 지금까지 이수 완료한 과목을 확인하면 이 기준으로 비교할 수 있어요.",
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
        title="졸업 전 계획에 배치하기 쉬운 트랙"
        description="전공 전체 학사 기준으로 목표 졸업학기까지의 과목 배치, 미배치 과목, 추가 학기를 확인합니다. 선택 트랙 모듈 공동 계획과 별도인 비교입니다."
        assumption={plan?.[0]?.assumption === "track-major-hypothesis"}
        unavailable={plan ? undefined : {
          message: "현재 학기, 목표 졸업학기, 학기당 수강량을 입력하면 계획 가능성을 비교할 수 있어요.",
          actionLabel: "전공 전체 계획 입력하기",
          onAction: onOpenGraduationPlan,
        }}
      >
        {plan ? <PlanCandidates candidates={plan} /> : null}
      </AxisResultCard>
    );
  }

  return (
    <main className="dku-comparison-page" aria-labelledby="recommendation-axes-title">
      <header className="dc-axes-hero">
        <h1 id="recommendation-axes-title" ref={headingRef} tabIndex={-1}>
          나에게 맞는 다섯 트랙을 기준별로 비교해요
        </h1>
        <p>세 기준의 점수는 합치지 않습니다. 근거를 보고 직접 골라 주세요.</p>
      </header>

      {storageError ? (
        <p className="dc-storage-error" role="alert">
          답변을 이 브라우저에 저장하지 못했습니다. 새로고침하면 답변이 사라질 수 있습니다.
        </p>
      ) : null}

      <div className="dc-index-layout">
        <nav className="dc-axis-index" aria-label="트랙 비교 기준">
          <span className="dc-axis-index__title">비교 기준</span>
          <ol className="dc-axis-destinations">
            {AXIS_PAGES.map((page) => {
              const selected = activeAxis === page.id;
              const leader = axisLeaders[page.id];
              const Icon = page.Icon;
              return (
                <li key={page.id}>
                  <button
                    className={selected ? "active dc-focusable" : "dc-focusable"}
                    id={`recommendation-axis-destination-${page.id}`}
                    data-axis-destination={page.id}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => onAxisChange(page.id)}
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>
                      <strong>{page.label}</strong>
                      <small>{leader ? `${page.description} · ${trackName(leader)}` : `${page.description} · 입력 필요`}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="dc-active-axis">
          <CandidateChoice.Provider value={{ chosen: chosenTrack, chosenIds: onChooseTracks ? chosenTracks : undefined, choose: onChooseTracks ? chooseMultiple : onChooseTrack ? setChosenTrack : undefined }}>
            {renderActiveAxis()}
          </CandidateChoice.Provider>

          {(onChooseTrack || onChooseTracks) && (activeAxis === "interest" ? interest : activeAxis === "progress" ? progress : plan) ? (
            <section className="dc-choice-workspace" aria-label="선택한 트랙 진단 확인">
              <p>여러 트랙을 함께 선택할 수 있어요. 전공 구분과 이수 이력은 유지됩니다.</p>
              <button className="dc-confirm-choice" type="button" disabled={onChooseTracks ? !chosenTracks.length : !chosenTrack}
                onClick={() => { if (onChooseTracks && chosenTracks.length) onChooseTracks([...chosenTracks]); else if (chosenTrack) onChooseTrack?.(chosenTrack); }}>
                {onChooseTracks ? (chosenTracks.length ? `${chosenTracks.length}개 트랙으로 이어가기` : "위 후보에서 확인할 트랙을 선택해 주세요") : chosenTrack ? `${trackName(chosenTrack)} 트랙으로 진단 조건 확인` : "위 후보에서 진단할 트랙을 선택해 주세요"}
              </button>
            </section>
          ) : null}

          {availableAxisCount < 2 ? (
            <aside className="dc-axis-summary" aria-label="비교 기준 입력 상태">
              {availableAxisCount === 0 ? "아직 비교에 필요한 입력이 없습니다. 원하는 기준부터 입력해 주세요." : "현재 한 기준만 확인할 수 있어요. 다른 기준을 입력하면 선두 후보를 함께 비교할 수 있습니다."}
            </aside>
          ) : aligned ? (
            <aside className="dc-axis-summary recommendation-axis-summary--aligned" aria-label="두 기준 이상에서 같은 선두 후보">
              <CheckCircle2 aria-hidden="true" size={20} strokeWidth={1.8} />
              <div>
                <span>기준 비교 요약</span>
                <strong>
                  {alignedLeaderTrackIds.map((trackId) => trackName(trackId)).join(" · ")} 후보가 두 개 이상의 기준에서 선두로 나타났습니다.
                </strong>
                <p>각 기준에서 따로 나온 결과가 겹친다는 뜻이며 세 기준을 합친 결론은 아닙니다. 기준별 근거를 다시 확인해 주세요.</p>
              </div>
              <div className="dc-axis-summary__tracks">
                {alignedLeaderTrackIds.map((trackId) => (
                  <span key={trackId}>
                    <TrackGlyph trackId={trackId} decorative />
                    {trackName(trackId)}
                  </span>
                ))}
              </div>
            </aside>
          ) : (
            <aside className="dc-axis-summary recommendation-axis-summary--diverged" aria-label="기준마다 다른 선두 후보">
              <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
              <div>
                <span>기준 비교 요약</span>
                <strong>기준마다 선두 후보가 다릅니다.</strong>
                <p>비교 기준을 바꿔 근거를 확인하고 트랙을 직접 선택해 주세요. 자동으로 선택되지는 않습니다.</p>
              </div>
            </aside>
          )}
        </div>
      </div>

      <footer className="dc-axes-footer">
        <Heart aria-hidden="true" size={20} strokeWidth={1.8} />
        <span>비교 결과는 선택을 돕는 참고 정보입니다. 트랙 상세와 공식 안내도 함께 확인하고 직접 결정하세요.</span>
      </footer>
    </main>
  );
}
