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
