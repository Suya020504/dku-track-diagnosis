import { BookCheck, CalendarRange, ChartNoAxesCombined, UserRoundCheck } from "lucide-react";

const steps = [
  {
    id: "profile",
    label: "소속·경로",
    description: "나에게 적용할 이수 기준을 고릅니다.",
    Icon: UserRoundCheck,
  },
  {
    id: "courses",
    label: "과목 입력",
    description: "지금까지 들은 과목을 직접 선택합니다.",
    Icon: BookCheck,
  },
  {
    id: "result",
    label: "결과 확인",
    description: "현재 상태와 부족 조건을 확인합니다.",
    Icon: ChartNoAxesCombined,
  },
  {
    id: "plan",
    label: "선택형 계획",
    description: "필요할 때 목표 학기까지 계획합니다.",
    Icon: CalendarRange,
  },
] as const;

export function SimulationSteps({
  resultReady,
  planReady,
}: {
  resultReady: boolean;
  planReady: boolean;
}) {
  return (
    <ol className="track-home__steps" aria-label="트랙 시뮬레이션 이용 순서">
      {steps.map((step, index) => {
        const state = step.id === "plan"
          ? planReady ? "ready" : "optional"
          : resultReady ? "complete" : index === 0 ? "current" : "next";
        return (
          <li data-step-state={state} key={step.id}>
            <span className="track-home__step-index">{index + 1}</span>
            <step.Icon aria-hidden="true" size={22} strokeWidth={1.8} />
            <div>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
