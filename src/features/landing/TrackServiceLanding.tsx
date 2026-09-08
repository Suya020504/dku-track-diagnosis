import type { RefObject } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Track } from "../../types";
import { SimulationSteps } from "./SimulationSteps";
import { TrackPreviewAccordion } from "./TrackPreviewAccordion";

export type LandingPlannerStatus =
  | "empty"
  | "needs-profile"
  | "needs-courses"
  | "needs-track"
  | "ready"
  | "saved-plan";

type ResumeDetail = {
  title: string;
  description: string;
  actionLabel?: string;
  Icon: typeof ClipboardCheck;
};

const resumeDetails: Record<LandingPlannerStatus, ResumeDetail> = {
  empty: {
    title: "처음이어도 괜찮아요",
    description: "학생 유형과 들은 과목부터 차례로 확인해요. 입력 내용은 이 브라우저에 자동 저장돼요.",
    Icon: ClipboardCheck,
  },
  "needs-profile": {
    title: "입력하던 진단이 있어요",
    description: "소속과 이수 경로를 확인한 뒤 바로 이어갈 수 있어요.",
    actionLabel: "진단 이어가기",
    Icon: RotateCcw,
  },
  "needs-courses": {
    title: "과목 선택부터 이어가세요",
    description: "저장된 학생 유형은 그대로 두고 들은 과목만 마저 확인하면 됩니다.",
    actionLabel: "이수 과목 확인하기",
    Icon: RotateCcw,
  },
  "needs-track": {
    title: "현재 결과를 비교할 수 있어요",
    description: "목표 트랙이 없어도 다섯 트랙의 진행도를 비교하고 방향을 정할 수 있어요.",
    actionLabel: "트랙 비교 보기",
    Icon: CheckCircle2,
  },
  ready: {
    title: "진단 결과가 준비됐어요",
    description: "현재 결과를 바탕으로 목표 학기까지의 참고 계획도 만들 수 있어요. 계획 만들기는 선택 사항이에요.",
    actionLabel: "학기 플래너 열기",
    Icon: CheckCircle2,
  },
  "saved-plan": {
    title: "저장한 학기 계획이 있어요",
    description: "이전에 만든 계획과 공식 확인 항목을 그대로 이어서 살펴보세요.",
    actionLabel: "저장한 계획 보기",
    Icon: BookOpenCheck,
  },
};

export type TrackServiceLandingProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  tracks: readonly Track[];
  plannerStatus: LandingPlannerStatus;
  resultReady: boolean;
  onStartSimulation: () => void;
  onOpenGuide: () => void;
  onOpenRecommendation: () => void;
  onPlannerAction?: () => void;
  saveUnavailable?: boolean;
};

export function TrackServiceLanding({
  headingRef,
  tracks,
  plannerStatus,
  resultReady,
  onStartSimulation,
  onOpenGuide,
  onOpenRecommendation,
  onPlannerAction,
  saveUnavailable = false,
}: TrackServiceLandingProps) {
  const resume = resumeDetails[plannerStatus];
  const ResumeIcon = resume.Icon;

  return (
    <main className="track-home dku-home-page" aria-labelledby="track-home-title">
      <section className="track-home__hero">
        <div className="track-home__hero-copy">
          <p className="track-home__service-label">단국대 학생을 위한 트랙제 안내·자가진단</p>
          <h1 id="track-home-title" ref={headingRef} tabIndex={-1}>
            식품자원경제학과 <em>트랙 안내</em>
          </h1>
          <p className="track-home__hero-description">
            트랙별로 배우는 내용을 살펴보고, 들은 과목으로 남은 이수 조건을 확인하세요.
          </p>
          <div className="track-home__hero-actions">
            <button
              className="track-home__primary-action planner-focusable"
              data-action-priority="primary"
              type="button"
              onClick={onStartSimulation}
            >
              내 트랙 확인하기
              <ArrowRight aria-hidden="true" size={20} />
            </button>
            <button
              className="track-home__secondary-action planner-focusable"
              data-action-priority="secondary"
              type="button"
              onClick={onOpenGuide}
            >
              트랙제 먼저 알아보기
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
          <p className="track-home__trust-copy">
            자가진단 결과는 학업 계획을 돕는 참고 정보이며 실제 인정 기준은 학과 확인이 필요합니다.
          </p>
        </div>
        <figure className="track-home__hero-visual">
          <img
            src="/illustrations/track-service-hero-desk-v2.webp"
            alt="과목 체크 카드와 노트가 놓인 하늘색·민트 학업 계획 책상"
            width="1536"
            height="1024"
            fetchPriority="high"
          />
        </figure>
      </section>

      {saveUnavailable ? <p className="track-home__save-note" role="alert">브라우저 저장이 제한되어 있어요. 지금 입력한 내용은 탭을 닫기 전에 확인해 주세요.</p> : null}
      {plannerStatus !== "empty" ? (
      <section className="track-home__resume" data-resume-state={plannerStatus}>
        <div className="track-home__resume-icon"><ResumeIcon aria-hidden="true" /></div>
        <div>
          <h2>{resume.title}</h2>
          <p>{resume.description}</p>
        </div>
        {resume.actionLabel && onPlannerAction ? (
          <button className="planner-focusable" type="button" onClick={onPlannerAction}>
            {resume.actionLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        ) : null}
      </section>
      ) : !saveUnavailable ? <p className="track-home__save-note">학생 유형 → 이수 과목 → 진단 결과 · 입력은 이 브라우저에 자동 저장돼요.</p> : null}

      <section className="track-home__flow" aria-labelledby="track-home-flow-title">
        <div className="track-home__section-heading">
          <span>진단은 세 단계면 충분해요</span>
          <h2 id="track-home-flow-title">들은 과목에서 다음 과목까지</h2>
        </div>
        <SimulationSteps resultReady={resultReady} planReady={plannerStatus === "ready" || plannerStatus === "saved-plan"} />
      </section>

      <section className="track-home__optional" aria-label="선택해서 이용하는 서비스">
        <div>
          <Sparkles aria-hidden="true" size={24} />
          <h2>관심부터 살펴보고 싶다면</h2>
          <p>진단과 별개로 소속에 맞는 관심 질문에 답하며 다섯 트랙을 비교해 보세요.</p>
          <button className="planner-focusable" type="button" onClick={onOpenRecommendation}>관심으로 트랙 추천받기 <ArrowRight aria-hidden="true" size={17} /></button>
        </div>
        <div>
          <BookOpenCheck aria-hidden="true" size={24} />
          <h2>다음 학기 계획은 선택이에요</h2>
          <p>진단 결과를 확인한 뒤 필요한 경우에만 목표 학기와 수강량을 정해 계획할 수 있어요.</p>
          <span>결과 확인 후 이용 · 필수 진단에 포함되지 않아요</span>
        </div>
      </section>

      <section className="track-home__tracks" aria-labelledby="track-home-tracks-title">
        <div className="track-home__section-heading">
          <span>2026 교육과정 기준</span>
          <h2 id="track-home-tracks-title">다섯 트랙을 한눈에 비교해 보세요</h2>
          <p>트랙 이름을 누르면 학습 주제와 연결 분야를 간단히 확인할 수 있습니다.</p>
        </div>
        <TrackPreviewAccordion tracks={tracks} onOpenGuide={onOpenGuide} />
      </section>

    </main>
  );
}
