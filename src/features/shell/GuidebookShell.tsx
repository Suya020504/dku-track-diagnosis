import { useEffect, useState, type ReactNode } from "react";
import type { AppRoute } from "../../lib/appRouting";
import { ExternalLink, HelpCircle, type LucideIcon } from "lucide-react";
import { DEPARTMENT_HOME_URL, DEPARTMENT_YOUTUBE_URL } from "../../data/officialResources";
import { CompassPathRibbon, type CompassPathItem } from "../journey/CompassPathRibbon";
import { LocalSaveStatus, type LocalSaveState } from "./LocalSaveStatus";
import { MobileJourneyNav, type MobileJourneyItem } from "./MobileJourneyNav";

export type GuidebookNavItem = {
  id: string;
  index: string;
  label: string;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
  icon?: LucideIcon;
};

export type GuidebookExternalLink = {
  id: string;
  label: string;
  href: string;
};

export const DEPARTMENT_EXTERNAL_LINKS = [
  {
    id: "department-home",
    label: "학과 홈페이지",
    href: DEPARTMENT_HOME_URL,
  },
  {
    id: "department-youtube",
    label: "학과 YouTube",
    href: DEPARTMENT_YOUTUBE_URL,
  },
] as const satisfies readonly GuidebookExternalLink[];

export function GuidebookShell({
  serviceView = "landing",
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
  children,
}: {
  serviceView?: AppRoute["view"];
  activeId: string;
  mobileActiveId?: string;
  currentLabel: string;
  guideItems: readonly GuidebookNavItem[];
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
  children: ReactNode;
}) {
  const [unavailableMessage, setUnavailableMessage] = useState<string>();
  useEffect(() => { setUnavailableMessage(undefined); }, [activeId]);
  return (
    <div className="planner-app planner-guidebook-shell" data-service-zone={serviceView}>
      <div
        className="planner-shell-background"
        aria-hidden={modalOpen ? true : undefined}
        inert={modalOpen ? true : undefined}
      >
        <a className="planner-skip-link planner-focusable" href="#planner-main-content">
          본문으로 건너뛰기
        </a>
        <header className="planner-shell-header">
          <a
            className="planner-shell-wordmark planner-focusable"
            href="/"
            aria-label="식품자원경제학과 트랙 안내 · 자가진단 홈으로"
            onClick={(event) => {
              const home = guideItems.find((item) => item.id === "start");
              if (!home || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              home.onSelect();
            }}
          >
            <img src="/dku-logo.png" width="76" height="36" alt="단국대학교" />
            <span className="planner-shell-wordmark__divider" aria-hidden="true" />
            <span className="planner-shell-wordmark__copy">
              <strong>식품자원경제학과</strong>
              <small>트랙 안내 · 자가진단</small>
              <span className="planner-shell-current-step">현재 · {currentLabel}</span>
            </span>
          </a>
          <nav className="planner-shell-primary-nav" aria-label="주요 서비스">
            {guideItems.map((item) => (
              <button
                className="planner-focusable"
                type="button"
                key={item.id}
                aria-current={activeId === item.id ? "page" : undefined}
                aria-disabled={!item.available || undefined}
                title={!item.available ? item.unavailableReason ?? "앞 단계를 완료하면 이용할 수 있어요." : undefined}
                onClick={() => {
                  if (item.available) { setUnavailableMessage(undefined); item.onSelect(); }
                  else setUnavailableMessage(item.unavailableReason ?? "앞 단계를 완료하면 이용할 수 있어요.");
                }}
              >
                {item.icon ? <item.icon size={19} strokeWidth={1.8} aria-hidden="true" focusable="false" /> : null}
                <span>{item.label}</span>
                {!item.available ? <small className="planner-shell-unavailable">이용 조건 확인</small> : null}
              </button>
            ))}
          </nav>
          <div className="planner-shell-actions">
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
                    {item.icon ? <item.icon size={18} strokeWidth={1.8} aria-hidden="true" focusable="false" /> : null}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            ) : null}
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
        {unavailableMessage ? <p className="planner-shell-availability" role="status">{unavailableMessage}</p> : null}
        <div className="planner-shell-layout is-immersive">
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
