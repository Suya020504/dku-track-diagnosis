import type { RefObject } from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, LockKeyhole } from "lucide-react";
import { CourseModuleTrackFigure } from "../education/CourseModuleTrackFigure";
import { CompassPathRibbon, type CompassPathItem } from "../journey/CompassPathRibbon";
import { TrackPreviewStrip } from "./TrackPreviewStrip";

export type PlannerLandingProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onFindTrack: () => void;
  onStartDiagnosis: () => void;
  onPlannerAction?: () => void;
  journeyItems: readonly CompassPathItem[];
  plannerStatus: LandingPlannerStatus;
};

export type LandingPlannerStatus =
  | "empty"
  | "needs-profile"
  | "needs-courses"
  | "needs-track"
  | "ready"
  | "saved-plan";

type PlannerStatusDetail = {
  title: string;
  description: string;
  statusLabel: string;
  actionLabel?: string;
  terms: ReadonlyArray<{
    title: string;
    rows: ReadonlyArray<readonly [string, string]>;
  }>;
};

const plannerStatusDetails: Record<LandingPlannerStatus, PlannerStatusDetail> = {
  empty: {
    title: "관심을 찾으면 계획표가 펼쳐져요",
    description: "트랙과 완료 과목을 확인하기 전에는 계획을 계산하지 않습니다.",
    statusLabel: "입력 전 잠김",
    terms: [
      {
        title: "다음 학기",
        rows: [
          ["전공 과목 후보", "관심 트랙 선택 후 표시"],
          ["확인할 모듈", "이수 과목 입력 후 표시"],
        ],
      },
      {
        title: "그다음 학기",
        rows: [
          ["이어 들을 과목", "계획 단계에서 표시"],
          ["개설 이력 확인", "계획 단계에서 함께 확인"],
        ],
      },
    ],
  },
  "needs-profile": {
    title: "다음은 학생 유형을 확인할 차례예요",
    description: "학생 유형과 이수 경로를 확인한 뒤 완료 과목 입력을 이어가세요.",
    statusLabel: "학생 유형 확인 필요",
    actionLabel: "진단 정보 이어가기",
    terms: [
      {
        title: "현재 단계",
        rows: [
          ["학생 유형", "입력 필요"],
          ["이수 경로", "입력 필요"],
        ],
      },
      {
        title: "자가진단",
        rows: [
          ["이수 과목", "학생 유형 확인 후 입력"],
          ["학기 계획", "진단 완료 후 열림"],
        ],
      },
    ],
  },
  "needs-courses": {
    title: "다음은 이수 과목을 확인할 차례예요",
    description: "완료한 과목을 검토하면 학기 계획을 열 수 있어요.",
    statusLabel: "이수 과목 확인 필요",
    actionLabel: "이수 과목 확인하기",
    terms: [
      {
        title: "입력한 상태",
        rows: [
          ["학생 유형", "입력됨"],
          ["이수 경로", "저장됨"],
        ],
      },
      {
        title: "학기 계획",
        rows: [
          ["계획표", "이수 과목 확인 후 열림"],
          ["개설 이력", "계획 단계에서 함께 확인"],
        ],
      },
    ],
  },
  "needs-track": {
    title: "학기 계획 전에 목표 트랙을 골라 주세요",
    description: "기준별 비교에서 목표 방향을 선택하면 계획을 열 수 있어요.",
    statusLabel: "트랙 선택 필요",
    actionLabel: "트랙 비교 보기",
    terms: [
      {
        title: "확인한 상태",
        rows: [
          ["이수 과목", "검토 완료"],
          ["목표 트랙", "선택 필요"],
        ],
      },
      {
        title: "학기 계획",
        rows: [
          ["계획표", "목표 트랙 선택 후 열림"],
          ["개설 이력", "계획 단계에서 함께 확인"],
        ],
      },
    ],
  },
  ready: {
    title: "입력한 상태로 학기 계획을 만들 수 있어요",
    description: "완료 과목과 목표 트랙을 바탕으로 계획 입력을 이어가세요.",
    statusLabel: "계획 준비 완료",
    actionLabel: "학기 계획 열기",
    terms: [
      {
        title: "확인한 상태",
        rows: [
          ["이수 과목", "검토 완료"],
          ["목표 방향", "선택 완료"],
        ],
      },
      {
        title: "학기 계획",
        rows: [
          ["계획표", "입력 가능"],
          ["개설 이력", "계획에서 함께 확인"],
        ],
      },
    ],
  },
  "saved-plan": {
    title: "저장한 학기 계획이 있어요",
    description: "이전에 만든 계획을 다시 열어 일정과 확인 항목을 살펴보세요.",
    statusLabel: "저장한 계획 사용 가능",
    actionLabel: "저장한 계획 보기",
    terms: [
      {
        title: "저장한 계획",
        rows: [
          ["학기 일정", "다시 열어 확인"],
          ["확인 항목", "계획 화면에서 확인"],
        ],
      },
      {
        title: "다음 행동",
        rows: [
          ["계획표", "저장한 내용 보기"],
          ["조건 수정", "계획 화면에서 변경"],
        ],
      },
    ],
  },
};

export function PlannerLanding({
  headingRef,
  onFindTrack,
  onStartDiagnosis,
  onPlannerAction,
  journeyItems,
  plannerStatus,
}: PlannerLandingProps) {
  const planner = plannerStatusDetails[plannerStatus];
  const PlannerStatusIcon = plannerStatus === "empty"
    ? LockKeyhole
    : plannerStatus === "needs-profile" || plannerStatus === "needs-courses" || plannerStatus === "needs-track"
      ? ClipboardCheck
      : CheckCircle2;

  return (
    <main className="planner-landing" aria-labelledby="planner-landing-title">
      <section className="planner-landing__first-view">
        <div className="planner-landing__hero">
          <div className="planner-landing__copy">
            <h1 id="planner-landing-title" ref={headingRef} tabIndex={-1}>
              <span data-landing-title-line>내 관심을 따라,</span>{" "}
              <span data-landing-title-line>전공 로드맵을 완성해요</span>
            </h1>
            <p>
              관심 질문으로 트랙을 찾고, 완료 과목을 다음 학기 계획까지 연결해 보세요.
            </p>
            <div className="planner-landing__actions">
              <button
                className="planner-landing__primary-action planner-focusable"
                data-action-priority="primary"
                type="button"
                onClick={onFindTrack}
              >
                내 관심 트랙 찾기
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button
                className="planner-landing__secondary-action planner-focusable"
                data-action-priority="secondary"
                type="button"
                onClick={onStartDiagnosis}
              >
                이수 과목 바로 진단
              </button>
            </div>
          </div>

          <figure className="planner-landing__compass-plane">
            <img
              src="/campus-compass-illustration.webp"
              alt="전공 학습 경로와 다음 학기를 가리키는 캠퍼스 컴퍼스 일러스트"
              width="2048"
              height="1024"
              fetchPriority="high"
            />
            <figcaption>전공 학습 경로를 표현한 개념 설명 이미지</figcaption>
          </figure>
        </div>

        <div className="planner-landing__journey">
          <CompassPathRibbon items={journeyItems} />
        </div>

        <section
          className="planner-landing__locked-planner"
          data-planner-status={plannerStatus}
          aria-labelledby="locked-planner-title"
        >
          <header>
            <div>
              <h2 id="locked-planner-title">{planner.title}</h2>
              <p>{planner.description}</p>
            </div>
            <div className="planner-landing__planner-controls">
              <span className="planner-landing__lock-state" role="status">
                <PlannerStatusIcon aria-hidden="true" size={17} />
                {planner.statusLabel}
              </span>
              {planner.actionLabel && onPlannerAction ? (
                <button
                  className="planner-landing__planner-action planner-focusable"
                  type="button"
                  onClick={onPlannerAction}
                >
                  {planner.actionLabel}
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
              ) : null}
            </div>
          </header>
          <ol className="planner-landing__planner-ledger" aria-label="학기 플래너 상태 미리보기">
            {planner.terms.map((term) => (
              <li key={term.title}>
                <h3>{term.title}</h3>
                <dl>
                  {term.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <section className="planner-landing__tracks" aria-labelledby="track-preview-title">
        <div className="planner-landing__section-copy">
          <h2 id="track-preview-title">다섯 방향을 먼저 펼쳐 보세요</h2>
          <p>현재 교육과정의 트랙 이름과 표식을 그대로 사용합니다.</p>
        </div>
        <TrackPreviewStrip />
      </section>

      <CourseModuleTrackFigure />
    </main>
  );
}
