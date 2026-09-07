import type { RefObject } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  CircleMinus,
  ClipboardCheck,
} from "lucide-react";

export type GraduationPlanPrerequisiteState = "ready" | "pending" | "not-applicable";

export type GraduationPlanPrerequisiteReadiness = {
  profile: GraduationPlanPrerequisiteState;
  courses: GraduationPlanPrerequisiteState;
  target: GraduationPlanPrerequisiteState;
};

function ReadinessIcon({
  state,
  kind,
}: {
  state: GraduationPlanPrerequisiteState;
  kind: "profile" | "courses" | "target";
}) {
  if (state === "not-applicable") return <CircleMinus aria-hidden="true" size={20} />;
  if (state === "pending") return <CircleDashed aria-hidden="true" size={20} />;
  return kind === "courses"
    ? <ClipboardCheck aria-hidden="true" size={20} />
    : <CheckCircle2 aria-hidden="true" size={20} />;
}

export function GraduationPlanPrerequisite({
  readiness,
  headingRef,
  onRecover,
}: {
  readiness: GraduationPlanPrerequisiteReadiness;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRecover: () => void;
}) {
  const recoveryLabel = readiness.profile === "pending"
    ? "프로필 입력 시작"
    : readiness.courses === "pending"
      ? "프로필·이수 과목 확인"
      : readiness.target === "pending"
        ? "목표 트랙 검토로 이동"
        : "입력 상태 확인";

  return (
    <main className="dku-plan-page dku-plan-prerequisite" aria-labelledby="plan-entry-title">
      <header className="dku-plan-heading">
        <span className="dku-plan-eyebrow">선택 도구 · 졸업 계획 준비</span>
        <h1 id="plan-entry-title" ref={headingRef} tabIndex={-1}>
          졸업 계획 전에 입력 상태를 확인해 주세요
        </h1>
        <p>
          이 단계에서는 특정 트랙을 자동으로 고르거나 계획을 계산하지 않습니다.
          먼저 필요한 입력을 확인해 주세요. 현재 이수 진단만 원한다면 이 도구를 쓰지 않아도 됩니다.
        </p>
      </header>
      <section className="dku-plan-readiness">
        <h2>계획에 필요한 세 가지</h2>
        <ul aria-label="졸업 계획 사전 입력 상태">
          <li
            className={readiness.profile}
            data-plan-readiness="profile"
            data-state={readiness.profile}
          >
            <ReadinessIcon state={readiness.profile} kind="profile" />
            <span>프로필 {readiness.profile === "ready" ? "입력됨" : "입력 필요"}</span>
          </li>
          <li
            className={readiness.courses}
            data-plan-readiness="courses"
            data-state={readiness.courses}
          >
            <ReadinessIcon state={readiness.courses} kind="courses" />
            <span>이수 과목 {readiness.courses === "ready" ? "검토됨" : "확인 필요"}</span>
          </li>
          <li
            className={readiness.target}
            data-plan-readiness="target"
            data-state={readiness.target}
          >
            <ReadinessIcon state={readiness.target} kind="target" />
            <span>
              목표 트랙 {readiness.target === "ready"
                ? "준비됨"
                : readiness.target === "not-applicable"
                  ? "적용 대상 아님"
                  : "선택 필요"}
            </span>
          </li>
        </ul>
      </section>
        <div className="dku-plan-result-actions">
          <button className="primary-button" type="button" onClick={onRecover}>
            {recoveryLabel}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
    </main>
  );
}
