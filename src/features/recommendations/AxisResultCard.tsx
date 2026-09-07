import type { ReactNode } from "react";
import { EvidenceBand } from "../../components/EvidenceBand";

type AxisResultCardProps = {
  id: "interest" | "progress" | "plan";
  title: string;
  description: string;
  assumption?: boolean;
  unavailable?: {
    message: string;
    actionLabel: string;
    onAction: () => void;
  };
  children?: ReactNode;
};

export function AxisResultCard({
  id,
  title,
  description,
  assumption = false,
  unavailable,
  children,
}: AxisResultCardProps) {
  const headingId = `recommendation-axis-heading-${id}`;

  return (
    <section
      className={`dc-panel dc-panel-${id}`}
      data-recommendation-panel={id}
      id={`recommendation-axis-section-${id}`}
      aria-labelledby={headingId}
    >
      <header className="dc-result-page__heading">
        <span>독립 기준</span>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </header>

      {assumption ? (
        <div className="dc-hypothesis-band">
          <EvidenceBand state="provided-final-plan-reference">
            트랙형전공으로 전환한다고 가정한 비교
          </EvidenceBand>
        </div>
      ) : null}

      {unavailable ? (
        <div className="dc-unavailable">
          <span>입력 필요</span>
          <h3>이 기준을 아직 열 수 없어요</h3>
          <p>{unavailable.message}</p>
          <button className="planner-focusable" type="button" onClick={unavailable.onAction}>
            {unavailable.actionLabel}
          </button>
        </div>
      ) : children}
    </section>
  );
}
