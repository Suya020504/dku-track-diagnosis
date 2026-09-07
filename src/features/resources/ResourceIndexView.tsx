import { useEffect, useRef } from "react";
import type { ResourceSection } from "../../lib/appRouting";
import { CurriculumReferenceView } from "./CurriculumReferenceView";
import { ModuleReferenceView } from "./ModuleReferenceView";
import { OfficialResourcesView } from "./OfficialResourcesView";
import { TrackSystemOverview } from "./TrackSystemOverview";

const resourcePages = [
  {
    id: "tracks",
    index: "01",
    label: "트랙",
    title: "다섯 트랙의 학습 방향을 읽어보세요",
    body: "실제 트랙 이름, 연결 모듈, 현재 자료의 이수 기준을 한 페이지에서 설명합니다.",
  },
  {
    id: "modules",
    index: "02",
    label: "모듈",
    title: "모듈과 과목의 관계를 확인하세요",
    body: "15개 모듈을 기초·학과전공·융합전공으로 나누고 2026 개설 이력과 함께 보여줍니다.",
  },
  {
    id: "curriculum",
    index: "03",
    label: "교육과정",
    title: "과목에서 학기 계획까지 연결해 보세요",
    body: "과목→모듈→트랙 관계와 추천 시점별 교육과정표를 분리해 읽습니다.",
  },
  {
    id: "official",
    index: "04",
    label: "공식 근거",
    title: "원문과 확인 경로를 마지막에 점검하세요",
    body: "학교 공개 자료, 시간표 검색, 학과 홈페이지와 YouTube 채널을 구분합니다.",
  },
] as const satisfies ReadonlyArray<{
  id: ResourceSection;
  index: string;
  label: string;
  title: string;
  body: string;
}>;

export const RESOURCE_SECTION_TITLES: Record<ResourceSection, string> = {
  tracks: "5개 트랙 자료",
  modules: "모듈·과목 자료",
  curriculum: "2026 교육과정 자료",
  official: "공식 근거·문의",
};

export type ResourceIndexViewProps = {
  section: ResourceSection;
  onSectionChange: (section: ResourceSection) => void;
};

export function ResourceIndexView({ section, onSectionChange }: ResourceIndexViewProps) {
  const currentPage = resourcePages.find((page) => page.id === section) ?? resourcePages[0];
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [section]);

  return (
    <div className="planner-resources">
      <nav className="planner-resource-index" aria-label="자료 읽기 순서">
        {resourcePages.map((page) => (
          <button
            aria-current={page.id === section ? "page" : undefined}
            className="planner-focusable"
            data-resource-section={page.id}
            key={page.id}
            onClick={() => onSectionChange(page.id)}
            type="button"
          >
            <span>{page.index}</span>
            <strong>{page.label}</strong>
          </button>
        ))}
      </nav>

      <article className="planner-resource-page" data-resource-page={section} aria-labelledby={`resource-page-${section}`}>
        <header className="planner-resource-page__header">
          <p>자료 {currentPage.index} · {currentPage.label}</p>
          <h1 id={`resource-page-${section}`} ref={headingRef} tabIndex={-1}>{currentPage.title}</h1>
          <p>{currentPage.body}</p>
        </header>

        {section === "tracks" && <TrackSystemOverview />}
        {section === "modules" && <ModuleReferenceView />}
        {section === "curriculum" && <CurriculumReferenceView />}
        {section === "official" && <OfficialResourcesView />}
      </article>

      <footer className="planner-resource-disclaimer">
        <strong>학생용 참고 도구</strong>
        <span>
          생성한 개념 설명 이미지에는 학교 로고·인장을 사용하지 않았고 공식 학교 이미지가 아닙니다.
          이 학생 제작 도구는 학교 공식 페이지와 구분됩니다. 최종 이수 판정은 학교와 학과의 공식 확인을 따릅니다.
        </span>
      </footer>
    </div>
  );
}
