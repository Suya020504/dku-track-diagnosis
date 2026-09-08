import { useEffect, useRef } from "react";
import type { ResourceSection } from "../../lib/appRouting";
import { CurriculumReferenceView } from "./CurriculumReferenceView";
import { ModuleReferenceView } from "./ModuleReferenceView";
import { OfficialResourcesView } from "./OfficialResourcesView";
import { TrackSystemOverview } from "./TrackSystemOverview";
import { TimetableReferenceView } from "./TimetableReferenceView";

const pages = [
  { id: "tracks", label: "트랙", title: "다섯 트랙, 다섯 가지 학습 방향", body: "배우고 싶은 분야가 있다면 관련 모듈을 살펴보세요." },
  { id: "modules", label: "모듈", title: "15개 모듈에 담긴 49과목", body: "모듈을 펼치면 과목과 학점, 학사 과목코드를 볼 수 있습니다." },
  { id: "curriculum", label: "교육과정", title: "학과 교육과정 47과목", body: "현재 학과 홈페이지의 교과과정입니다. 게시·개정연도는 표시되어 있지 않습니다." },
  { id: "timetable", label: "시간표", title: "2026년 2학기 실제 시간표", body: "천안 캠퍼스 공개검색에서 확인한 37분반입니다. 2026-09-08 조회 시점의 자료로 자동 갱신되지 않습니다." },
  { id: "official", label: "공식 근거", title: "원문과 학과에서 확인하기", body: "교육과정에서 과목 구성을, 시간표에서 개설 강좌를, 안내 영상에서 제도 설명을 확인하세요." },
] as const;
export const RESOURCE_SECTION_TITLES: Record<ResourceSection, string> = {
  tracks: "5개 트랙 자료", modules: "모듈·과목 자료", curriculum: "학과 교육과정 자료",
  timetable: "2026-2 실제 시간표", official: "공식 근거·문의",
};
export type ResourceIndexViewProps = { section: ResourceSection; onSectionChange: (section: ResourceSection) => void };
export function ResourceIndexView({ section, onSectionChange }: ResourceIndexViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = pages.find((page) => page.id === section) ?? pages[0];
  const next = pages[(pages.findIndex((page) => page.id === section) + 1) % pages.length];
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [section]);
  return <div className="dku-resource-page">
    <nav className="dku-resource-nav" aria-label="자료 읽기 순서">
      {pages.map((page) => <button key={page.id} type="button" aria-current={section === page.id ? "page" : undefined} data-resource-section={page.id} onClick={() => onSectionChange(page.id)}>{page.label}</button>)}
    </nav>
    <article data-resource-page={section} aria-labelledby={`resource-page-${section}`}>
      <header className="dku-resource-heading"><span>자료실 / {current.label}</span>
        <h1 ref={headingRef} tabIndex={-1} id={`resource-page-${section}`}>{current.title}</h1><p>{current.body}</p>
      </header>
      {section === "tracks" && <TrackSystemOverview />}
      {section === "modules" && <ModuleReferenceView />}
      {section === "curriculum" && <CurriculumReferenceView />}
      {section === "timetable" && <TimetableReferenceView />}
      {section === "official" && <OfficialResourcesView />}
    </article>
    <footer className="dku-resource-footer"><p>학과 공개·제공 자료를 바탕으로 안내합니다. 개인별 적용과 최종 이수 인정은 학과에서 확인해 주세요.</p>
      <button type="button" onClick={() => onSectionChange(next.id)}>{next.label} 보기 →</button>
    </footer>
  </div>;
}
