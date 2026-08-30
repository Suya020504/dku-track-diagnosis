import { useMemo } from "react";
import { modules } from "../../data/curriculumData";
import {
  getModuleLabel,
  isModuleInAnyTrack,
  isRequiredCourseApplicable,
} from "../../lib/diagnosis";
import type {
  Course,
  CourseSelectionRecord,
  EnrollmentType,
  ModuleId,
  TrackId,
} from "../../types";
import type {
  CourseGradeFilter,
  CourseGroupMode,
  CourseSemesterFilter,
} from "./CourseLedgerFilters";
import { CourseLedgerRow } from "./CourseLedgerRow";

type LedgerGroup = {
  id: string;
  label: string;
  note: string;
  courses: Course[];
};

const semesterSlots = [
  { key: "1-1", label: "1학년 1학기" },
  { key: "1-2", label: "1학년 2학기" },
  { key: "2-1", label: "2학년 1학기" },
  { key: "2-2", label: "2학년 2학기" },
  { key: "3-1", label: "3학년 1학기" },
  { key: "3-2", label: "3학년 2학기" },
  { key: "4-1", label: "4학년 1학기" },
  { key: "4-2", label: "4학년 2학기" },
] as const;

function semesterRank(semester?: string): number {
  if (!semester) return 99;
  return semesterSlots.findIndex((slot) => slot.key === semester);
}

function matchesSemesterFilters(
  course: Course,
  gradeFilter: CourseGradeFilter,
  semesterFilter: CourseSemesterFilter,
): boolean {
  if (!course.recommendedSemester) {
    return gradeFilter === "all" || gradeFilter === "unknown" || semesterFilter === "unknown";
  }
  if (gradeFilter === "unknown" || semesterFilter === "unknown") return false;
  const [grade, semester] = course.recommendedSemester.split("-");
  return (gradeFilter === "all" || gradeFilter === grade)
    && (semesterFilter === "all" || semesterFilter === semester);
}

function buildSemesterGroups(visibleCourses: Course[]): LedgerGroup[] {
  const groups = semesterSlots.flatMap((slot) => {
    const groupedCourses = visibleCourses.filter((course) => course.recommendedSemester === slot.key);
    return groupedCourses.length > 0 ? [{
      id: `course-ledger-group-semester-${slot.key}`,
      label: slot.label,
      note: `${groupedCourses.length}개 과목`,
      courses: groupedCourses,
    }] : [];
  });
  const unknownCourses = visibleCourses.filter((course) => !course.recommendedSemester);
  return unknownCourses.length > 0 ? [...groups, {
    id: "course-ledger-group-semester-unknown",
    label: "학기 미정",
    note: "개설 학기는 학과 확인 필요",
    courses: unknownCourses,
  }] : groups;
}

function buildModuleGroups(visibleCourses: Course[], selectedTrackIds: TrackId[]): LedgerGroup[] {
  const moduleIds = [...new Set(visibleCourses.map((course) => course.moduleId))]
    .sort((left, right) => left.localeCompare(right));
  return moduleIds.map((moduleId) => {
    const groupedCourses = visibleCourses.filter((course) => course.moduleId === moduleId);
    return {
      id: `course-ledger-group-module-${moduleId.toLowerCase()}`,
      label: getModuleLabel(moduleId),
      note: isModuleInAnyTrack(selectedTrackIds, moduleId)
        ? "선택 트랙 관련 모듈"
        : `${groupedCourses.length}개 과목`,
      courses: groupedCourses,
    };
  });
}

function evidenceText(course: Course): string {
  if (course.sourceNote) return course.sourceNote;
  const moduleSource = modules.find((module) => module.id === course.moduleId)?.sourceNote;
  return moduleSource ?? "2026 교육과정 제공 최종안 참고";
}

export type CourseLedgerProps = {
  courses: Course[];
  courseSelections: CourseSelectionRecord[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  mode: CourseGroupMode;
  gradeFilter: CourseGradeFilter;
  semesterFilter: CourseSemesterFilter;
  query: string;
  onToggleCourse: (courseId: string) => void;
};

export function CourseLedger({
  courses: ledgerCourses,
  courseSelections,
  selectedTrackIds,
  enrollmentType,
  mode,
  gradeFilter,
  semesterFilter,
  query,
  onToggleCourse,
}: CourseLedgerProps) {
  const selectionByCourseId = useMemo(
    () => new Map(courseSelections.map((selection) => [selection.courseId, selection])),
    [courseSelections],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const visibleCourses = useMemo(() => ledgerCourses
    .filter((course) => matchesSemesterFilters(course, gradeFilter, semesterFilter))
    .filter((course) => !normalizedQuery || [
      course.code,
      course.name,
      getModuleLabel(course.moduleId),
    ].join(" ").toLocaleLowerCase("ko").includes(normalizedQuery))
    .sort((left, right) => semesterRank(left.recommendedSemester) - semesterRank(right.recommendedSemester)
      || left.moduleId.localeCompare(right.moduleId)
      || left.code.localeCompare(right.code)), [
        gradeFilter,
        ledgerCourses,
        normalizedQuery,
        semesterFilter,
      ]);
  const groups = mode === "semester"
    ? buildSemesterGroups(visibleCourses)
    : buildModuleGroups(visibleCourses, selectedTrackIds);
  const selectedVisibleCount = visibleCourses.filter((course) => {
    const status = selectionByCourseId.get(course.id)?.status;
    return status === "completed" || status === "in-progress";
  }).length;

  function focusGroup(event: React.MouseEvent<HTMLAnchorElement>, groupId: string) {
    event.preventDefault();
    const heading = document.getElementById(groupId)?.querySelector<HTMLHeadingElement>("h3");
    heading?.focus();
    heading?.scrollIntoView?.({ behavior: "auto", block: "center" });
  }

  return (
    <section className="course-ledger" aria-labelledby="course-ledger-title">
      <header className="course-ledger-summary">
        <div>
          <span>전공 과목 선택 원장</span>
          <h2 id="course-ledger-title">직접 선택</h2>
        </div>
        <p><strong>{selectedVisibleCount}</strong> / {visibleCourses.length}개 완료·수강 중</p>
      </header>

      {groups.length > 0 ? (
        <nav
          className="course-ledger-index"
          aria-label={mode === "semester" ? "학기 그룹 빠른 이동" : "모듈 그룹 빠른 이동"}
        >
          {groups.map((group) => (
            <a
              href={`#${group.id}`}
              key={group.id}
              onClick={(event) => focusGroup(event, group.id)}
            >
              {group.label}
            </a>
          ))}
        </nav>
      ) : null}

      {groups.length === 0 ? (
        <div className="course-ledger-empty" role="status">
          <strong>조건에 맞는 과목이 없습니다.</strong>
          <span>검색어나 학년·학기 필터를 바꿔보세요.</span>
        </div>
      ) : (
        <div className="course-ledger-groups">
          {groups.map((group) => (
            <section className="course-ledger-group" id={group.id} key={group.id}>
              <header>
                <h3 tabIndex={-1}>{group.label}</h3>
                <span>{group.note}</span>
              </header>
              <div>
                {group.courses.map((course) => (
                  <CourseLedgerRow
                    key={course.id}
                    course={course}
                    selection={selectionByCourseId.get(course.id)}
                    moduleLabel={getModuleLabel(course.moduleId as ModuleId)}
                    evidenceText={evidenceText(course)}
                    trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)}
                    requiredForEnrollment={isRequiredCourseApplicable(course, enrollmentType)}
                    onToggleCourse={onToggleCourse}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
