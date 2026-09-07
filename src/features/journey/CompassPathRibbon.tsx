import { ArrowRight, CheckCircle2, CircleDot, Clock3, LockKeyhole } from "lucide-react";

export type CompassPathState = "complete" | "current" | "next" | "pending";

export type CompassPathItem = {
  id: string;
  label: string;
  state: CompassPathState;
  completed: boolean;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
};

const stateLabels: Record<CompassPathState, string> = {
  complete: "완료",
  current: "현재",
  next: "다음",
  pending: "대기",
};

export function CompassPathRibbon({ items }: { items: readonly CompassPathItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      className="planner-compass-path"
      data-path-layout="linear-progress"
      aria-label="자가진단 단계"
    >
      <ol className="planner-compass-path__route">
        {items.map((item) => {
          const reasonId = `compass-path-${item.id}-reason`;
          const visualState = item.available ? item.state : "locked";
          const stateLabel = item.available ? stateLabels[item.state] : "잠김";
          const StateIcon = visualState === "complete"
            ? CheckCircle2
            : visualState === "current"
              ? CircleDot
              : visualState === "next"
                ? ArrowRight
                : visualState === "locked"
                  ? LockKeyhole
                  : Clock3;
          return (
            <li
              key={item.id}
              data-path-segment
              data-journey-stage={item.id}
              data-state={item.state}
              data-visual-state={visualState}
              data-completed={item.completed}
            >
              <button
                className="planner-focusable"
                type="button"
                aria-current={item.state === "current" ? "step" : undefined}
                aria-describedby={!item.available && item.unavailableReason ? reasonId : undefined}
                disabled={!item.available}
                onClick={item.onSelect}
              >
                <span className="planner-compass-path__state">
                  <span
                    className="planner-compass-path__state-icon"
                    data-path-state-icon={visualState}
                    data-current-position={visualState === "current" ? "true" : undefined}
                    aria-hidden="true"
                  >
                    <StateIcon size={17} strokeWidth={2.2} />
                  </span>
                  <span>{stateLabel}</span>
                </span>
                <strong>{item.label}</strong>
              </button>
              {!item.available && item.unavailableReason ? (
                <small id={reasonId}>{item.unavailableReason}</small>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
