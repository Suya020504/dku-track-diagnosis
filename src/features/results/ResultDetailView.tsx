import type { KeyboardEvent, RefObject } from "react";
import { Printer } from "lucide-react";
import type { ResultSection } from "../../lib/appRouting";
import type {
  DiagnosisResult,
  PathProgressResult,
  StudentProfile,
} from "../../types";
import { CurrentProgressView } from "./CurrentProgressView";
import { NextCoursesView } from "./NextCoursesView";
import { OfficialChecksView } from "./OfficialChecksView";

const RESULT_PAGES: ReadonlyArray<{
  id: ResultSection;
  index: string;
  label: string;
  description: string;
}> = [
  { id: "current", index: "01", label: "현재", description: "진행 경로" },
  { id: "next", index: "02", label: "다음", description: "과목과 행동" },
  { id: "confirm", index: "03", label: "확인", description: "공식 점검" },
];

export function ResultDetailView({
  result,
  profile,
  pathProgress,
  section,
  headingRef,
  onSectionChange,
  onOpenRecommendations,
  onGoToPlan,
  onPrint,
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  section: ResultSection;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSectionChange: (section: ResultSection) => void;
  onOpenRecommendations: () => void;
  onGoToPlan: () => void;
  onPrint: () => void;
}) {
  function moveSection(event: KeyboardEvent<HTMLButtonElement>, current: ResultSection) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = RESULT_PAGES.findIndex((page) => page.id === current);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + RESULT_PAGES.length) % RESULT_PAGES.length;
    onSectionChange(RESULT_PAGES[nextIndex].id);
  }

  return (
    <div className="planner-result-view">
      <nav className="planner-result-page-band no-print" aria-label="결과 페이지">
        <div role="tablist" aria-label="진단 결과 상세 보기">
          {RESULT_PAGES.map((page) => (
            <button
              className={section === page.id ? "active planner-focusable" : "planner-focusable"}
              data-result-section={page.id}
              id={`result-section-${page.id}`}
              role="tab"
              aria-controls={`result-panel-${page.id}`}
              aria-selected={section === page.id}
              tabIndex={section === page.id ? 0 : -1}
              type="button"
              key={page.id}
              onClick={() => onSectionChange(page.id)}
              onKeyDown={(event) => moveSection(event, page.id)}
            >
              <span className="planner-result-page-band__index">{page.index}</span>
              <span>
                <strong>{page.label}</strong>
                <small>{page.description}</small>
              </span>
            </button>
          ))}
        </div>
      </nav>

      <section
        className="planner-result-active-page"
        data-result-panel={section}
        id={`result-panel-${section}`}
        role="tabpanel"
        aria-labelledby={`result-section-${section}`}
      >
        {section === "current" ? (
          <CurrentProgressView
            result={result}
            profile={profile}
            pathProgress={pathProgress}
            headingRef={headingRef}
          />
        ) : section === "next" ? (
          <NextCoursesView
            result={result}
            profile={profile}
            pathProgress={pathProgress}
            headingRef={headingRef}
            onOpenRecommendations={onOpenRecommendations}
            onGoToPlan={onGoToPlan}
          />
        ) : (
          <OfficialChecksView
            result={result}
            profile={profile}
            pathProgress={pathProgress}
            headingRef={headingRef}
          />
        )}
      </section>

      {section === "current" ? (
        <button
          className="planner-result-continue planner-focusable no-print"
          type="button"
          onClick={() => onSectionChange("next")}
        >
          <span>
            <small>다음 페이지</small>
            <strong>관심·이수 과목·졸업 계획을 따로 비교해요</strong>
          </span>
          <span>세 기준별 트랙 비교 보기</span>
        </button>
      ) : null}

      <section className="planner-result-print no-print" aria-label="결과 저장과 인쇄">
        <div>
          <strong>현재 결과 페이지 저장</strong>
          <span>브라우저 인쇄 창에서 PDF 저장 또는 프린터 출력을 선택할 수 있습니다.</span>
        </div>
        <button className="print-button planner-focusable" type="button" onClick={onPrint}>
          <Printer aria-hidden="true" size={18} />
          결과 저장/인쇄
        </button>
      </section>
    </div>
  );
}
