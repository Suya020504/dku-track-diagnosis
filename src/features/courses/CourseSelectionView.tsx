import { ArrowRight, ChevronDown, Save, ShieldCheck } from "lucide-react";
import type { RefObject } from "react";
import type {
  Course,
  CourseSelectionRecord,
  EnrollmentType,
  PdfImportDraft,
  TrackId,
} from "../../types";
import { CourseLedger } from "./CourseLedger";
import {
  CourseLedgerFilters,
  type CourseGradeFilter,
  type CourseGroupMode,
  type CourseSemesterFilter,
} from "./CourseLedgerFilters";
import { PdfCourseImportPanel } from "./PdfCourseImportPanel";

export type { CourseGradeFilter, CourseGroupMode, CourseSemesterFilter };

const policyByEnrollment: Record<EnrollmentType, { title: string; description: string; marker: string }> = {
  primary: {
    title: "주전공 기준",
    description: "제공된 최종안의 필수 과목을 현재 진단 계산에 반영합니다.",
    marker: "필수 전체 반영",
  },
  "double-major": {
    title: "복수전공 기준",
    description: "1학년 필수 과목은 제외하며, 복수전공 최소학점은 학과 확인이 필요합니다.",
    marker: "1학년 필수 제외",
  },
  minor: {
    title: "부전공 기준",
    description: "1학년 필수 과목은 제외하며, 부전공 학점 기준은 공식 안내 확인이 필요합니다.",
    marker: "1학년 필수 제외",
  },
};

export type CourseSelectionViewProps = {
  courses: Course[];
  courseSelections: CourseSelectionRecord[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  headingRef: RefObject<HTMLHeadingElement | null>;
  resultActionRef: RefObject<HTMLButtonElement | null>;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  mode: CourseGroupMode;
  gradeFilter: CourseGradeFilter;
  semesterFilter: CourseSemesterFilter;
  query: string;
  lastManualSaveAt: string;
  onModeChange: (mode: CourseGroupMode) => void;
  onGradeFilterChange: (grade: CourseGradeFilter) => void;
  onSemesterFilterChange: (semester: CourseSemesterFilter) => void;
  onQueryChange: (query: string) => void;
  onToggleCourse: (courseId: string) => void;
  onSaveCourses: () => void;
  onShowResult: () => void;
  onPdfAnalyzed: (draft: PdfImportDraft) => void;
};

export function CourseSelectionView({
  courses: ledgerCourses,
  courseSelections,
  selectedTrackIds,
  enrollmentType,
  headingRef,
  resultActionRef,
  searchInputRef,
  mode,
  gradeFilter,
  semesterFilter,
  query,
  lastManualSaveAt,
  onModeChange,
  onGradeFilterChange,
  onSemesterFilterChange,
  onQueryChange,
  onToggleCourse,
  onSaveCourses,
  onShowResult,
  onPdfAnalyzed,
}: CourseSelectionViewProps) {
  const policy = policyByEnrollment[enrollmentType];
  const ledgerCourseIds = new Set(ledgerCourses.map((course) => course.id));
  const relevantSelections = courseSelections.filter((selection) => ledgerCourseIds.has(selection.courseId));
  const completedCount = relevantSelections.filter((selection) => selection.status === "completed").length;
  const inProgressCount = relevantSelections.filter((selection) => selection.status === "in-progress").length;
  const plannedCount = relevantSelections.filter((selection) => selection.status === "planned").length;

  function moveFocusToResult(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const resultAction = resultActionRef.current;
    resultAction?.focus();
    resultAction?.scrollIntoView?.({ behavior: "auto", block: "center" });
  }

  return (
    <div className="planner-course-selection-view">
      <header className="planner-course-selection-heading">
        <span>자가진단 · 과목 입력</span>
        <h1 ref={headingRef} tabIndex={-1}>지금까지 이수한 과목을 선택하세요.</h1>
        <p className="course-selection-help">들었던 과목만 체크하세요. 코드와 근거는 필요할 때 펼쳐볼 수 있습니다.</p>
      </header>

      <a
        className="course-result-skip-link"
        href="#diagnosis-result-action"
        onClick={moveFocusToResult}
      >
        결과로 건너뛰기
      </a>

      <section className="course-selection-action-bar" aria-label="과목 입력 현황과 다음 행동">
        <div className="course-selection-status-summary">
          <span>이수 완료 <strong>{completedCount}</strong></span>
          <span>수강 중 <strong>{inProgressCount}</strong></span>
          <span>계획 <strong>{plannedCount}</strong></span>
        </div>
        <button
          id="diagnosis-result-action"
          ref={resultActionRef}
          type="button"
          onClick={onShowResult}
        >
          진단 결과 확인 <ArrowRight aria-hidden="true" size={17} />
        </button>
      </section>

      <CourseLedgerFilters
        mode={mode}
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        query={query}
        searchInputRef={searchInputRef}
        onModeChange={onModeChange}
        onGradeFilterChange={onGradeFilterChange}
        onSemesterFilterChange={onSemesterFilterChange}
        onQueryChange={onQueryChange}
      />

      <CourseLedger
        courses={ledgerCourses}
        courseSelections={courseSelections}
        selectedTrackIds={selectedTrackIds}
        enrollmentType={enrollmentType}
        mode={mode}
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        query={query}
        onToggleCourse={onToggleCourse}
      />

      <details className="course-ledger-policy">
        <summary>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>현재 계산 기준</span>
          <strong>{policy.title}</strong>
          <em>{policy.marker}</em>
          <ChevronDown aria-hidden="true" size={17} />
        </summary>
        <p>{policy.description}</p>
      </details>

      <section className="course-ledger-save-band" aria-label="과목 선택 저장 상태">
        <div>
          <strong>{completedCount}개 과목 이수 완료</strong>
          <span>입력 즉시 이 브라우저에 자동 저장됩니다.</span>
          <small>{lastManualSaveAt ? `직접 저장: ${lastManualSaveAt}` : "직접 저장 기록 없음"}</small>
        </div>
        <button type="button" onClick={onSaveCourses}>
          <Save aria-hidden="true" size={18} />
          지금 저장
        </button>
      </section>

      <PdfCourseImportPanel onAnalyzed={onPdfAnalyzed} />
    </div>
  );
}
