import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, LockKeyhole } from "lucide-react";
import type { RefObject } from "react";
import type { LandingPlannerStatus } from "../landing/PlannerLanding";
import { CampusJourneyMap, type CampusJourneyStop } from "./CampusJourneyMap";

const PLANNER_COPY: Record<LandingPlannerStatus, {
  title: string;
  description: string;
  status: string;
  action?: string;
}> = {
  empty: {
    title: "학기 플래너는 진단 뒤 선택하세요",
    description: "자가진단만 마쳐도 결과와 5개 트랙 비교를 볼 수 있습니다.",
    status: "선택 서비스",
  },
  "needs-profile": {
    title: "먼저 학생 유형을 확인해 주세요",
    description: "자가진단을 마친 뒤 필요할 때 학기 계획을 만들 수 있습니다.",
    status: "진단 정보 필요",
    action: "진단 정보 이어가기",
  },
  "needs-courses": {
    title: "이수 과목을 확인하면 결과가 열려요",
    description: "학기 플래너를 만들지 않아도 현재 진행도와 다음 과목을 확인할 수 있습니다.",
    status: "과목 확인 필요",
    action: "이수 과목 확인하기",
  },
  "needs-track": {
    title: "플래너를 만들 때만 목표 트랙이 필요해요",
    description: "목표가 없어도 5개 트랙 자가진단은 완료할 수 있습니다.",
    status: "목표 트랙 선택 필요",
    action: "목표 트랙 선택하기",
  },
  ready: {
    title: "학기 계획까지 이어볼까요?",
    description: "자가진단 결과를 바탕으로 학기별 참고 계획을 만들 수 있습니다.",
    status: "플래너 사용 가능",
    action: "학기 플래너 열기",
  },
  "saved-plan": {
    title: "저장한 학기 계획이 있어요",
    description: "이전에 만든 계획을 다시 열어 일정과 확인 항목을 살펴보세요.",
    status: "저장한 계획 있음",
    action: "저장한 계획 보기",
  },
};

export function CampusMapLanding({
  headingRef,
  mapStops,
  plannerStatus,
  onPlannerAction,
  onOpenTrackGuide,
}: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  mapStops: readonly CampusJourneyStop[];
  plannerStatus: LandingPlannerStatus;
  onPlannerAction?: () => void;
  onOpenTrackGuide: () => void;
}) {
  const planner = PLANNER_COPY[plannerStatus];
  const StatusIcon = plannerStatus === "empty"
    ? LockKeyhole
    : plannerStatus === "ready" || plannerStatus === "saved-plan"
      ? CheckCircle2
      : ClipboardCheck;

  return (
    <main className="campus-map-landing" aria-labelledby="campus-journey-title">
      <CampusJourneyMap
        stops={mapStops}
        headingRef={headingRef}
        onOpenTrackGuide={onOpenTrackGuide}
      />

      <section
        className="campus-map-landing__planner-secondary"
        data-planner-status={plannerStatus}
        aria-labelledby="campus-map-planner-title"
      >
        <div className="campus-map-landing__planner-copy">
          <span>보조 서비스 · 선택</span>
          <h2 id="campus-map-planner-title">{planner.title}</h2>
          <p>{planner.description}</p>
        </div>
        <div className="campus-map-landing__planner-action">
          <span role="status">
            <StatusIcon aria-hidden="true" size={18} />
            {planner.status}
          </span>
          {onPlannerAction ? (
            <button className="planner-focusable" type="button" onClick={onPlannerAction}>
              {planner.action}
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          ) : (
            <span className="campus-map-landing__planner-disabled">
              <CalendarDays aria-hidden="true" size={17} />
              자가진단 후 선택 가능
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
