import type { RefObject } from "react";
import { Printer } from "lucide-react";
import type { ResultSection } from "../../lib/appRouting";
import type {
  DiagnosisResult,
  CourseSelectionRecord,
  PathProgressResult,
  PlanTerm,
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
  { id: "current", index: "01", label: "현재", description: "이수 현황" },
  { id: "next", index: "02", label: "다음", description: "추천 과목" },
  { id: "confirm", index: "03", label: "확인", description: "학과 확인" },
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
  courseSelections,
  onPlannedCourseChange,
  planStartTerm,
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
  courseSelections?: readonly CourseSelectionRecord[];
  onPlannedCourseChange?: (courseId: string, term: PlanTerm | null) => void;
  planStartTerm?: string;
}) {
  return (
    <div className="dku-results-page">
      <nav className="planner-result-page-band no-print" aria-label="결과 페이지">
        <div>
          {RESULT_PAGES.map((page) => (
            <button
              className={section === page.id ? "active planner-focusable" : "planner-focusable"}
              data-result-section={page.id}
              id={`result-section-${page.id}`}
              aria-current={section === page.id ? "page" : undefined}
              type="button"
              key={page.id}
              onClick={() => onSectionChange(page.id)}
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
      {section !== "confirm" ? <div className="dku-results-forward no-print">
        <span>{section === "current" ? "입력한 완료 과목을 기준으로 계산했어요" : "후보를 정했다면 실제 수강 조건을 점검하세요"}</span>
        <button type="button" className="primary-button" onClick={() => onSectionChange(section === "current" ? "next" : "confirm")}>
          {section === "current" ? "다음 수강 후보 확인" : "공식 확인 사항 보기"} →
        </button>
      </div> : null}

      <section
        className="planner-result-active-page"
        data-result-panel={section}
        id={`result-panel-${section}`}
      >
        {section === "current" ? (
          <CurrentProgressView
            result={result}
            profile={profile}
            pathProgress={pathProgress}
            headingRef={headingRef}
            courseSelections={courseSelections}
          />
        ) : section === "next" ? (
          <NextCoursesView
            result={result}
            profile={profile}
            pathProgress={pathProgress}
            headingRef={headingRef}
            onOpenRecommendations={onOpenRecommendations}
            onGoToPlan={onGoToPlan}
            courseSelections={courseSelections}
            onPlannedCourseChange={onPlannedCourseChange}
            planStartTerm={planStartTerm}
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
