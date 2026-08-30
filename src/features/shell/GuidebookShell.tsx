import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { CompassPathRibbon, type CompassPathItem } from "../journey/CompassPathRibbon";
import { GuideIndex, type GuideIndexItem } from "./GuideIndex";
import { LocalSaveStatus, type LocalSaveState } from "./LocalSaveStatus";
import { MobileJourneyNav, type MobileJourneyItem } from "./MobileJourneyNav";

export function GuidebookShell({
  activeId,
  mobileActiveId = activeId,
  currentLabel,
  guideItems,
  mobilePrimaryItems,
  mobileMoreItems,
  utilityItems = [],
  utilityActiveId,
  journeyItems,
  saveState,
  onOpenHelp,
  children,
}: {
  activeId: string;
  mobileActiveId?: string;
  currentLabel: string;
  guideItems: readonly GuideIndexItem[];
  mobilePrimaryItems: readonly MobileJourneyItem[];
  mobileMoreItems: readonly MobileJourneyItem[];
  utilityItems?: readonly MobileJourneyItem[];
  utilityActiveId?: string;
  journeyItems: readonly CompassPathItem[];
  saveState: LocalSaveState;
  onOpenHelp: () => void;
  children: ReactNode;
}) {
  return (
    <div className="planner-app planner-guidebook-shell">
      <a className="planner-skip-link planner-focusable" href="#planner-main-content">
        본문으로 건너뛰기
      </a>
      <header className="planner-shell-header">
        <div className="planner-shell-wordmark">
          <strong>단국대학교 식품자원경제학과</strong>
          <span>트랙진단 학업 플래너</span>
        </div>
        <span className="planner-shell-current-step">현재 · {currentLabel}</span>
        {utilityItems.length > 0 ? (
          <nav className="planner-shell-utility" aria-label="보조 화면">
            {utilityItems.map((item) => (
              <button
                className="planner-focusable"
                type="button"
                key={item.id}
                aria-current={utilityActiveId === item.id ? "page" : undefined}
                disabled={!item.available}
                onClick={item.onSelect}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="planner-shell-actions">
          <button
            className="planner-shell-help planner-focusable"
            type="button"
            aria-label="도움말 열기"
            onClick={onOpenHelp}
          >
            <HelpCircle aria-hidden="true" size={17} />
            <span>도움말</span>
          </button>
          <LocalSaveStatus state={saveState} />
        </div>
      </header>
      <div className="planner-shell-layout">
        <GuideIndex items={guideItems} activeId={activeId} />
        <div className="planner-shell-page">
          <CompassPathRibbon items={journeyItems} />
          <div className="planner-shell-content" id="planner-main-content" tabIndex={-1}>{children}</div>
        </div>
      </div>
      <MobileJourneyNav
        activeId={mobileActiveId}
        primaryItems={mobilePrimaryItems}
        moreItems={mobileMoreItems}
      />
    </div>
  );
}
