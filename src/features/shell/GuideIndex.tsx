export type GuideIndexItem = {
  id: string;
  index: string;
  label: string;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
};

export function GuideIndex({
  items,
  activeId,
}: {
  items: readonly GuideIndexItem[];
  activeId: string;
}) {
  return (
    <nav className="planner-guide-index" aria-label="안내책자 색인">
      <span className="planner-guide-index__title">GUIDE INDEX</span>
      <ol>
        {items.map((item) => {
          const reasonId = `guide-index-${item.id}-reason`;
          return (
            <li key={item.id} data-active={activeId === item.id || undefined}>
              <button
                className="planner-focusable"
                type="button"
                aria-current={activeId === item.id ? "page" : undefined}
                aria-describedby={!item.available && item.unavailableReason ? reasonId : undefined}
                disabled={!item.available}
                onClick={item.onSelect}
              >
                <span>{item.index}</span>
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
