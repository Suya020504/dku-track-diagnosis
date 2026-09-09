import { LockKeyhole, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MobileJourneyItem = {
  id: string;
  label: string;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
  icon?: LucideIcon;
};

function JourneyButton({
  item,
  activeId,
  primary = false,
  onLocked,
}: {
  item: MobileJourneyItem;
  activeId: string;
  primary?: boolean;
  onLocked: (reason: string) => void;
}) {
  const reasonId = `mobile-journey-${item.id}-reason`;
  const locked = !item.available;
  return (
    <div
      className="planner-mobile-nav__item"
      data-mobile-primary={primary || undefined}
      data-mobile-locked={locked || undefined}
    >
      <button
        className="planner-focusable"
        type="button"
        aria-current={activeId === item.id ? "page" : undefined}
        aria-describedby={locked && item.unavailableReason ? reasonId : undefined}
        aria-disabled={locked || undefined}
        onClick={(event) => {
          if (locked) {
            onLocked(item.unavailableReason ?? `${item.label} 화면은 아직 열리지 않았어요.`);
            return;
          }
          item.onSelect();
          event.currentTarget.closest("details")?.removeAttribute("open");
        }}
      >
        {item.icon ? <item.icon size={20} strokeWidth={1.8} aria-hidden="true" focusable="false" /> : null}
        <span>{item.label}</span>
        {locked ? (
          <small data-mobile-lock-label>
            <LockKeyhole aria-hidden="true" size={12} />
            잠김
          </small>
        ) : null}
      </button>
      {locked && item.unavailableReason ? (
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
  const [lockedReason, setLockedReason] = useState<string>();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    setLockedReason(undefined);
    menuRef.current?.removeAttribute("open");
  }, [activeId]);

  return (
    <nav className="planner-mobile-nav" aria-label="주요 화면">
      {lockedReason ? (
        <p className="planner-mobile-nav__locked-reason" role="status" aria-live="polite">
          <LockKeyhole aria-hidden="true" size={15} />
          {lockedReason}
        </p>
      ) : null}
      <div className="planner-mobile-nav__primary">
        {primaryItems.map((item) => (
          <JourneyButton
            key={item.id}
            item={item}
            activeId={activeId}
            primary
            onLocked={setLockedReason}
          />
        ))}
        <details className="planner-mobile-nav__more" ref={menuRef} onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            menuRef.current?.removeAttribute("open");
            menuRef.current?.querySelector("summary")?.focus();
            setLockedReason(undefined);
          }
        }}>
          <summary className="planner-focusable">
            <MoreHorizontal aria-hidden="true" size={18} />
            <span>더보기</span>
          </summary>
          <div className="planner-mobile-nav__menu">
            {moreItems.map((item) => (
              <JourneyButton
                key={item.id}
                item={item}
                activeId={activeId}
                onLocked={setLockedReason}
              />
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
