import { BookCheck, ChartNoAxesCombined, UserRoundCheck } from "lucide-react";

const steps = [
  {
    id: "profile",
    label: "이수 유형",
    description: "나에게 적용할 이수 기준을 고릅니다.",
    Icon: UserRoundCheck,
  },
  {
    id: "courses",
    label: "이수 과목",
    description: "지금까지 들은 과목을 직접 선택합니다.",
    Icon: BookCheck,
  },
  {
    id: "result",
    label: "진단 결과",
    description: "현재 상태와 부족 조건을 확인합니다.",
    Icon: ChartNoAxesCombined,
  },
] as const;

export function SimulationSteps({
  resultReady,
}: {
  resultReady: boolean;
  planReady: boolean;
}) {
  return (
    <ol className="track-home__steps" aria-label="트랙 시뮬레이션 이용 순서">
      {steps.map((step, index) => {
        const state = resultReady ? "complete" : index === 0 ? "current" : "next";
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
