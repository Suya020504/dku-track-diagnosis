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
    <nav className="planner-compass-path" aria-label="학업 여정">
      <ol>
        {items.map((item) => {
          const reasonId = `compass-path-${item.id}-reason`;
          return (
            <li
              key={item.id}
              data-journey-stage={item.id}
              data-state={item.state}
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
                <span>{stateLabels[item.state]}</span>
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
