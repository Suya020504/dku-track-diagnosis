import type { RefObject } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Compass,
} from "lucide-react";

export function GraduationPlanPrerequisite({
  hasProfile,
  courseInputReady,
  targetTrackReady,
  headingRef,
  onRecover,
}: {
  hasProfile: boolean;
  courseInputReady: boolean;
  targetTrackReady: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRecover: () => void;
}) {
  const recoveryLabel = !hasProfile
    ? "프로필 입력 시작"
    : !courseInputReady
      ? "프로필·이수 과목 확인"
      : "목표 트랙 검토로 이동";

  return (
    <main className="plan-entry-shell" aria-labelledby="plan-entry-title">
      <section className="plan-entry-card">
        <span>졸업 계획 준비</span>
        <h1 id="plan-entry-title" ref={headingRef} tabIndex={-1}>
          졸업 계획 전에 입력 상태를 확인해 주세요
        </h1>
        <p>
          이 단계에서는 특정 트랙을 자동으로 고르거나 계획을 계산하지 않습니다.
          아래 입력 상태를 확인하고, 추천 비교로 돌아가기까지 한 복구 경로로 보완해 주세요.
        </p>
        <ul aria-label="졸업 계획 사전 입력 상태">
          <li
            className={hasProfile ? "ready" : "pending"}
            data-plan-readiness="profile"
            data-ready={hasProfile ? "true" : "false"}
          >
            <CheckCircle2 aria-hidden="true" size={20} />
            <span>프로필 {hasProfile ? "입력됨" : "입력 필요"}</span>
          </li>
          <li
            className={courseInputReady ? "ready" : "pending"}
            data-plan-readiness="courses"
            data-ready={courseInputReady ? "true" : "false"}
          >
            <ClipboardCheck aria-hidden="true" size={20} />
            <span>이수 과목 {courseInputReady ? "검토됨" : "확인 필요"}</span>
          </li>
          <li
            className={targetTrackReady ? "ready" : "pending"}
            data-plan-readiness="target"
            data-ready={targetTrackReady ? "true" : "false"}
          >
            <Compass aria-hidden="true" size={20} />
            <span>목표 트랙 {targetTrackReady ? "준비됨" : "선택 필요"}</span>
          </li>
        </ul>
        <div className="plan-entry-actions">
          <button className="primary-button" type="button" onClick={onRecover}>
            {recoveryLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
