import type { ReactNode } from "react";

type AxisResultCardProps = {
  id: "interest" | "progress" | "plan";
  title: string;
  description: string;
  active?: boolean;
  assumption?: string;
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
  active = false,
  assumption,
  unavailable,
  children,
}: AxisResultCardProps) {
  const headingId = `recommendation-axis-${id}`;
  return (
    <section
      className={active ? `axis-result-card axis-${id} active` : `axis-result-card axis-${id}`}
      aria-labelledby={headingId}
      aria-current={active ? "true" : undefined}
    >
      <header>
        <span>독립 기준</span>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
        {assumption && <small className="axis-assumption">{assumption}</small>}
      </header>
      {unavailable ? (
        <div className="axis-unavailable">
          <p>{unavailable.message}</p>
          <button type="button" onClick={unavailable.onAction}>{unavailable.actionLabel}</button>
        </div>
      ) : children}
    </section>
  );
}
