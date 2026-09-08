import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { modules } from "../../data/curriculumData";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import { getCourseInputPolicy } from "../../lib/courseInputPolicy";
import { getModuleLabel, isModuleInAnyTrack } from "../../lib/diagnosis";
import type { Course, CourseSelectionRecord, CourseSelectionStatus, EnrollmentType, PlanTerm, StudentProfile, TrackId } from "../../types";
import type { CourseGradeFilter, CourseGroupMode, CourseSemesterFilter } from "./CourseLedgerFilters";
import { CourseLedgerRow } from "./CourseLedgerRow";

const phoneQuery = "(max-width: 600px)";
function subscribePageSize(notify: () => void) {
  const media = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(phoneQuery) : undefined;
  if (typeof media?.addEventListener === "function") {
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
}
const browserPageSize = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(phoneQuery).matches ? 6 : 12;

function semesterRank(semester?: string): number {
  if (!semester) return 99;
  const [grade, term] = semester.split("-").map(Number);
  return grade * 2 + term;
}

function matchesSemesterFilters(course: Course, grade: CourseGradeFilter, semester: CourseSemesterFilter): boolean {
  if (!course.recommendedSemester) {
    return (grade === "all" || grade === "unknown") && (semester === "all" || semester === "unknown");
  }
  if (grade === "unknown" || semester === "unknown") return false;
  const [courseGrade, courseSemester] = course.recommendedSemester.split("-");
  return (grade === "all" || grade === courseGrade) && (semester === "all" || semester === courseSemester);
}

function evidenceText(course: Course): string {
  if (course.sourceNote) return course.sourceNote;
  return modules.find((module) => module.id === course.moduleId)?.sourceNote ?? "2026 교육과정 제공 최종안 참고";
}

export type CourseLedgerProps = {
  courses: Course[];
  courseSelections: CourseSelectionRecord[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  profile?: StudentProfile;
  targetTrackId?: TrackId;
  mode: CourseGroupMode;
  gradeFilter: CourseGradeFilter;
  semesterFilter: CourseSemesterFilter;
  query: string;
  onToggleCourse: (courseId: string) => void;
  onCourseStatusChange: (courseId: string, status: CourseSelectionStatus | null, plannedTerm?: PlanTerm) => void;
};

export function CourseLedger({
  courses: ledgerCourses, courseSelections, selectedTrackIds, profile, targetTrackId,
  mode, gradeFilter, semesterFilter, query, onToggleCourse, onCourseStatusChange,
}: CourseLedgerProps) {
  const [selectedOnly, setSelectedOnly] = useState(false);
  const pageSize = useSyncExternalStore(subscribePageSize, browserPageSize, () => 12);
  const filterKey = `${mode}:${gradeFilter}:${semesterFilter}:${query}:${selectedOnly}:${pageSize}`;
  const [pagination, setPagination] = useState({ filterKey, page: 1 });
  const selectionByCourseId = useMemo(() => new Map(courseSelections.map((selection) => [selection.courseId, selection])), [courseSelections]);
  const policy = getCourseInputPolicy(profile, targetTrackId);
  const normalizedQuery = query.replace(/\s+/g, "").toLocaleLowerCase("ko");
  const matchingCourses = useMemo(() => ledgerCourses
    .filter((course) => matchesSemesterFilters(course, gradeFilter, semesterFilter))
    .filter((course) => !normalizedQuery || [course.code, course.name,
      courseOfferings2026[course.id]?.officialCourseCode, courseOfferings2026[course.id]?.timetableName,
      getModuleLabel(course.moduleId),
    ].join(" ").replace(/\s+/g, "").toLocaleLowerCase("ko").includes(normalizedQuery))
    .sort((left, right) => (mode === "module"
      ? left.moduleId.localeCompare(right.moduleId)
      : semesterRank(left.recommendedSemester) - semesterRank(right.recommendedSemester))
      || left.moduleId.localeCompare(right.moduleId) || left.code.localeCompare(right.code)),
  [ledgerCourses, gradeFilter, semesterFilter, normalizedQuery, mode]);
  const visibleCourses = selectedOnly ? matchingCourses.filter((course) => selectionByCourseId.has(course.id)) : matchingCourses;
  const selectedMatchingCount = matchingCourses.filter((course) => selectionByCourseId.has(course.id)).length;
  const pageCount = Math.max(1, Math.ceil(visibleCourses.length / pageSize));
  const currentPage = pagination.filterKey === filterKey ? Math.min(pagination.page, pageCount) : 1;
  const pageCourses = visibleCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Only filter changes reset navigation; selection changes keep stable course keys and focus.
  if (pagination.filterKey !== filterKey) setPagination({ filterKey, page: 1 });

  return (
    <section className="dku-check" data-dku-check-mode={mode} aria-labelledby="dku-check-title">
      <header className="dku-check-summary">
        <div><h2 id="dku-check-title" tabIndex={-1}>과목 목록</h2></div>
        <div className="dku-check-summary-actions">
          <p><strong>{selectedMatchingCount}</strong> / {matchingCourses.length}개 선택</p>
          <button type="button" aria-pressed={selectedOnly} onClick={() => setSelectedOnly((current) => !current)}>
            <span className="dku-check-toggle" aria-hidden="true" />선택한 과목만
          </button>
        </div>
      </header>
      {visibleCourses.length === 0 ? (
        <div className="dku-check-empty" role="status">
          <strong>{selectedOnly ? "선택한 과목이 없습니다." : "조건에 맞는 과목이 없습니다."}</strong>
          <span>{selectedOnly ? "전체 과목으로 돌아가 처음부터 체크해 보세요." : "검색어나 학년·학기 필터를 바꿔 보세요."}</span>
          {selectedOnly ? <button type="button" onClick={() => setSelectedOnly(false)}>전체 과목 보기</button> : null}
        </div>
      ) : (
        <div className="dku-check-list">
          {pageCourses.map((course) => (
            <CourseLedgerRow key={course.id} course={course} selection={selectionByCourseId.get(course.id)}
              moduleLabel={getModuleLabel(course.moduleId)} evidenceText={evidenceText(course)}
              trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)}
              requiredForEnrollment={policy.requiredCourseIds.includes(course.id)}
              onToggleCourse={onToggleCourse} onCourseStatusChange={onCourseStatusChange} />
          ))}
        </div>
      )}
      <nav className="dku-check-pagination" aria-label="과목 목록 페이지">
        <p aria-live="polite">검색 결과 {visibleCourses.length}개{visibleCourses.length ? ` · ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, visibleCourses.length)}번째` : ""}</p>
        <div>
          <button type="button" disabled={currentPage === 1 || !visibleCourses.length} onClick={() => setPagination({ filterKey, page: currentPage - 1 })}>
            <ChevronLeft aria-hidden="true" size={16} />이전
          </button>
          <span aria-live="polite" aria-atomic="true">{currentPage} / {pageCount}<span className="sr-only"> 페이지</span></span>
          <button type="button" disabled={currentPage === pageCount || !visibleCourses.length} onClick={() => setPagination({ filterKey, page: currentPage + 1 })}>
            다음<ChevronRight aria-hidden="true" size={16} />
          </button>
        </div>
      </nav>
    </section>
  );
}
