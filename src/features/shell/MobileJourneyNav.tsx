import { MoreHorizontal } from "lucide-react";

export type MobileJourneyItem = {
  id: string;
  label: string;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
};

function JourneyButton({
  item,
  activeId,
  primary = false,
}: {
  item: MobileJourneyItem;
  activeId: string;
  primary?: boolean;
}) {
  const reasonId = `mobile-journey-${item.id}-reason`;
  return (
    <div className="planner-mobile-nav__item" data-mobile-primary={primary || undefined}>
      <button
        className="planner-focusable"
        type="button"
        aria-current={activeId === item.id ? "page" : undefined}
        aria-describedby={!item.available && item.unavailableReason ? reasonId : undefined}
        disabled={!item.available}
        onClick={(event) => {
          item.onSelect();
          event.currentTarget.closest("details")?.removeAttribute("open");
        }}
      >
        {item.label}
      </button>
      {!item.available && item.unavailableReason ? (
        <span className="sr-only" id={reasonId}>{item.unavailableReason}</span>
      ) : null}
    </div>
  );
}

export function MobileJourneyNav({
  activeId,
  primaryItems,
  moreItems,
}: {
  activeId: string;
  primaryItems: readonly MobileJourneyItem[];
  moreItems: readonly MobileJourneyItem[];
}) {
  return (
    <nav className="planner-mobile-nav" aria-label="주요 화면">
      <div className="planner-mobile-nav__primary">
        {primaryItems.map((item) => (
          <JourneyButton key={item.id} item={item} activeId={activeId} primary />
        ))}
        <details className="planner-mobile-nav__more">
          <summary className="planner-focusable">
            <MoreHorizontal aria-hidden="true" size={18} />
            <span>더보기</span>
          </summary>
          <div className="planner-mobile-nav__menu">
            {moreItems.map((item) => (
              <JourneyButton key={item.id} item={item} activeId={activeId} />
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
