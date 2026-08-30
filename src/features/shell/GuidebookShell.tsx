import type { ReactNode } from "react";
import { ExternalLink, HelpCircle } from "lucide-react";
import { CompassPathRibbon, type CompassPathItem } from "../journey/CompassPathRibbon";
import { GuideIndex, type GuideIndexItem } from "./GuideIndex";
import { LocalSaveStatus, type LocalSaveState } from "./LocalSaveStatus";
import { MobileJourneyNav, type MobileJourneyItem } from "./MobileJourneyNav";

export type GuidebookExternalLink = {
  id: string;
  label: string;
  href: string;
};

export const DEPARTMENT_EXTERNAL_LINKS = [
  {
    id: "department-home",
    label: "학과 홈페이지",
    href: "https://cms.dankook.ac.kr/web/ere",
  },
  {
    id: "department-youtube",
    label: "학과 YouTube",
    href: "https://www.youtube.com/@FoodandResourcesEconomics_dku/videos",
  },
] as const satisfies readonly GuidebookExternalLink[];

export function GuidebookShell({
  activeId,
  mobileActiveId = activeId,
  currentLabel,
  guideItems,
  mobilePrimaryItems,
  mobileMoreItems,
  utilityItems = [],
  externalLinks = DEPARTMENT_EXTERNAL_LINKS,
  utilityActiveId,
  journeyItems,
  saveState,
  onOpenHelp,
  modalOpen = false,
  modal,
  immersive = false,
  children,
}: {
  activeId: string;
  mobileActiveId?: string;
  currentLabel: string;
  guideItems: readonly GuideIndexItem[];
  mobilePrimaryItems: readonly MobileJourneyItem[];
  mobileMoreItems: readonly MobileJourneyItem[];
  utilityItems?: readonly MobileJourneyItem[];
  externalLinks?: readonly GuidebookExternalLink[];
  utilityActiveId?: string;
  journeyItems: readonly CompassPathItem[];
  saveState: LocalSaveState;
  onOpenHelp: (invoker: HTMLButtonElement) => void;
  modalOpen?: boolean;
  modal?: ReactNode;
  immersive?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="planner-app planner-guidebook-shell">
      <div
        className="planner-shell-background"
        aria-hidden={modalOpen ? true : undefined}
        inert={modalOpen ? true : undefined}
      >
        <a className="planner-skip-link planner-focusable" href="#planner-main-content">
          본문으로 건너뛰기
        </a>
        <header className="planner-shell-header">
          <div className="planner-shell-wordmark">
            <strong>단국대학교 식품자원경제학과</strong>
            <span>전공 여정 지도 · 트랙 자가진단</span>
          </div>
          <span className="planner-shell-current-step">현재 · {currentLabel}</span>
          {immersive ? (
            <nav className="planner-shell-map-nav" aria-label="주요 서비스">
              {guideItems.map((item) => (
                <button
                  className="planner-focusable"
                  type="button"
                  key={item.id}
                  aria-current={activeId === item.id ? "page" : undefined}
                  disabled={!item.available}
                  onClick={item.onSelect}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}
          {!immersive && utilityItems.length > 0 ? (
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
            {externalLinks.length > 0 ? (
              <nav className="planner-shell-external-links" aria-label="학과 공식 링크">
                {externalLinks.map((link) => (
                  <a
                    className="planner-focusable"
                    href={link.href}
                    key={link.id}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{link.label}</span>
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                ))}
              </nav>
            ) : null}
            <button
              className="planner-shell-help planner-focusable"
              type="button"
              aria-label="도움말 열기"
              onClick={(event) => onOpenHelp(event.currentTarget)}
            >
              <HelpCircle aria-hidden="true" size={17} />
              <span>도움말</span>
            </button>
            <LocalSaveStatus state={saveState} />
          </div>
        </header>
        <div className={immersive ? "planner-shell-layout is-immersive" : "planner-shell-layout"}>
          {!immersive ? <GuideIndex items={guideItems} activeId={activeId} /> : null}
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
      {modal}
    </div>
  );
}
