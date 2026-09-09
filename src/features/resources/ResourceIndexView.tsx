import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, CalendarDays, Files, GraduationCap, Layers3 } from "lucide-react";
import type { ResourceSection } from "../../lib/appRouting";
import { CurriculumReferenceView } from "./CurriculumReferenceView";
import { ModuleReferenceView } from "./ModuleReferenceView";
import { OfficialResourcesView } from "./OfficialResourcesView";
import { TrackSystemOverview } from "./TrackSystemOverview";
import { TimetableReferenceView } from "./TimetableReferenceView";

const pages = [
  { id: "tracks", label: "트랙", Icon: BookOpen, title: "다섯 트랙, 다섯 가지 학습 방향", body: "배우고 싶은 분야가 있다면 관련 모듈을 살펴보세요." },
  { id: "modules", label: "모듈", Icon: Layers3, title: "15개 모듈에 담긴 49과목", body: "모듈을 펼치면 과목과 학점, 학사 과목코드를 볼 수 있습니다." },
  { id: "curriculum", label: "교육과정", Icon: GraduationCap, title: "학년·학기별 교과로드맵", body: "배울 과목을 학기별로 비교해 보세요." },
  { id: "timetable", label: "시간표", Icon: CalendarDays, title: "2026년 2학기 시간표", body: "과목을 찾아 요일과 수업 시간을 확인하세요." },
  { id: "official", label: "학교 자료", Icon: Files, title: "학교 자료 바로가기", body: "신청과 수업 준비에 필요한 학교 안내를 모았습니다." },
] as const;
export const RESOURCE_SECTION_TITLES: Record<ResourceSection, string> = {
  tracks: "5개 트랙 자료", modules: "모듈·과목 자료", curriculum: "학과 교육과정 자료",
  timetable: "2026-2 실제 시간표", official: "학교 자료·문의",
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
    <nav className="dku-resource-nav" aria-label="자료 선택">
      {pages.map((page) => <button key={page.id} type="button" aria-current={section === page.id ? "page" : undefined} data-resource-section={page.id} onClick={() => onSectionChange(page.id)}><page.Icon size={18} aria-hidden="true" /><span>{page.label}</span></button>)}
    </nav>
    <article data-resource-page={section} aria-labelledby={`resource-page-${section}`}>
      <header className="dku-resource-heading">
        <h1 ref={headingRef} tabIndex={-1} id={`resource-page-${section}`}>{current.title}</h1><p>{current.body}</p>
      </header>
      {section === "tracks" && <TrackSystemOverview />}
      {section === "modules" && <ModuleReferenceView />}
      {section === "curriculum" && <CurriculumReferenceView />}
      {section === "timetable" && <TimetableReferenceView />}
      {section === "official" && <OfficialResourcesView />}
    </article>
    <footer className="dku-resource-footer"><p>다음 자료도 함께 살펴보세요.</p>
      <button type="button" onClick={() => onSectionChange(next.id)}>{next.label} 보기 <ArrowRight size={17} aria-hidden="true" /></button>
    </footer>
  </div>;
}
