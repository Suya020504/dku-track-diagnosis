import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, Clock3, Save, ShieldCheck } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { getCourseInputPolicy } from "../../lib/courseInputPolicy";
import type {
  Course,
  CourseSelectionRecord,
  CourseSelectionStatus,
  EnrollmentType,
  PdfImportDraft,
  PlanTerm,
  StudentProfile,
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

export type CourseSelectionViewProps = {
  courses: Course[];
  courseSelections: CourseSelectionRecord[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  profile?: StudentProfile;
  targetTrackId?: TrackId;
  additionalCreditsContent?: ReactNode;
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
  onCourseStatusChange: (courseId: string, status: CourseSelectionStatus | null, plannedTerm?: PlanTerm) => void;
  onSaveCourses: () => void;
  onShowResult: () => void;
  onPdfAnalyzed: (draft: PdfImportDraft) => void;
};

export function CourseSelectionView({
  courses: ledgerCourses,
  courseSelections,
  selectedTrackIds,
  enrollmentType,
  profile,
  targetTrackId,
  additionalCreditsContent,
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
  onCourseStatusChange,
  onSaveCourses,
  onShowResult,
  onPdfAnalyzed,
}: CourseSelectionViewProps) {
  const policy = getCourseInputPolicy(profile, targetTrackId);
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
    <div className="dku-courses-page">
      <header className="dku-courses-heading">
        <h1 ref={headingRef} tabIndex={-1}>지금까지 이수한 과목을 선택하세요.</h1>
        <p className="dku-courses-help">학년과 관계없이 들었던 과목을 찾아 체크하세요. 수강 중이거나 계획한 과목은 상태를 바꿔 입력할 수 있어요.</p>
        <p className="dku-courses-total" aria-label="전체 선택 과목 수" aria-live="polite">선택한 과목 <strong>{relevantSelections.length}개</strong></p>
      </header>

      <a
        className="course-result-skip-link"
        href="#diagnosis-result-action"
        onClick={moveFocusToResult}
      >
        결과로 건너뛰기
      </a>

      <section className="dku-courses-actions" aria-label="과목 입력 현황과 다음 단계">
        <div className="dku-courses-counts">
          <span><CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.8} />이수 완료 <strong>{completedCount}</strong></span>
          <span><Clock3 aria-hidden="true" size={18} strokeWidth={1.8} />수강 중 <strong>{inProgressCount}</strong></span>
          <span><CalendarDays aria-hidden="true" size={18} strokeWidth={1.8} />수강 계획 <strong>{plannedCount}</strong></span>
        </div>
        <button
          id="diagnosis-result-action"
          ref={resultActionRef}
          type="button"
          onClick={onShowResult}
        >
          진단 결과 확인 <ArrowRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </section>

      <div className="dku-courses-workspace">
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
        profile={profile}
        targetTrackId={targetTrackId}
        mode={mode}
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        query={query}
        onToggleCourse={onToggleCourse}
        onCourseStatusChange={onCourseStatusChange}
      />
      </div>

      <details className="dku-check-policy">
        <summary>
          <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.8} />
          <span>전공 전체 학사 기준</span>
          <strong>{policy.title}</strong>
          <em>{policy.marker}</em>
          <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} />
        </summary>
        <p className="dku-check-policy-scope">아래는 전공 전체 학점과 모듈 내 필수 기준입니다. 트랙 결과는 선택한 트랙의 모듈 학점만 따로 계산해요.</p>
        <p>{policy.description}</p>
        <p>직접 진단은 트랙 전공 45과목을 대상으로 합니다. 학과 교육과정 47과목·트랙 구성 49과목·실제 시간표 37분반은 서로 범위가 다릅니다. 학사 과목코드나 시간표 과목명으로도 검색할 수 있습니다. 트랙 밖 과목은 이 목록과 진단 학점에 자동 포함되지 않습니다.</p>
      </details>

      {additionalCreditsContent}

      <section className="dku-check-save-band" aria-label="과목 선택 저장 상태">
        <div>
          <strong>{completedCount}개 과목 이수 완료</strong>
          <span>입력 즉시 이 브라우저에 자동 저장됩니다.</span>
          <small>{lastManualSaveAt ? `직접 저장: ${lastManualSaveAt}` : "직접 저장 기록 없음"}</small>
        </div>
        <button type="button" onClick={onSaveCourses}>
          <Save aria-hidden="true" size={18} strokeWidth={1.8} />
          지금 저장
        </button>
      </section>

      <PdfCourseImportPanel onAnalyzed={onPdfAnalyzed} />
    </div>
  );
}
