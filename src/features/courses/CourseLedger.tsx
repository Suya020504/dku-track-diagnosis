import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { modules } from "../../data/curriculumData";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
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
      id: `dku-check-group-semester-${slot.key}`,
      label: slot.label,
      note: `${groupedCourses.length}개 과목`,
      courses: groupedCourses,
    }] : [];
  });
  const unknownCourses = visibleCourses.filter((course) => !course.recommendedSemester);
  return unknownCourses.length > 0 ? [...groups, {
    id: "dku-check-group-semester-unknown",
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
      id: `dku-check-group-module-${moduleId.toLowerCase()}`,
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
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [groupOpenState, setGroupOpenState] = useState<Record<string, boolean>>({});
  const selectionByCourseId = useMemo(
    () => new Map(courseSelections.map((selection) => [selection.courseId, selection])),
    [courseSelections],
  );
  const normalizedQuery = query.replace(/\s+/g, "").toLocaleLowerCase("ko");
  const matchingCourses = useMemo(() => ledgerCourses
    .filter((course) => matchesSemesterFilters(course, gradeFilter, semesterFilter))
    .filter((course) => !normalizedQuery || [
      course.code,
      course.name,
      courseOfferings2026[course.id]?.officialCourseCode,
      courseOfferings2026[course.id]?.timetableName,
      getModuleLabel(course.moduleId),
    ].join(" ").replace(/\s+/g, "").toLocaleLowerCase("ko").includes(normalizedQuery))
    .sort((left, right) => semesterRank(left.recommendedSemester) - semesterRank(right.recommendedSemester)
      || left.moduleId.localeCompare(right.moduleId)
      || left.code.localeCompare(right.code)), [
        gradeFilter,
        ledgerCourses,
        normalizedQuery,
        semesterFilter,
      ]);
  const visibleCourses = selectedOnly
    ? matchingCourses.filter((course) => selectionByCourseId.has(course.id))
    : matchingCourses;
  const groups = mode === "semester"
    ? buildSemesterGroups(visibleCourses)
    : buildModuleGroups(visibleCourses, selectedTrackIds);
  const selectedMatchingCount = matchingCourses.filter((course) => selectionByCourseId.has(course.id)).length;
  const forceGroupsOpen = selectedOnly || Boolean(normalizedQuery)
    || gradeFilter !== "all" || semesterFilter !== "all";
  const expansionKey = `${selectedOnly}-${normalizedQuery}-${gradeFilter}-${semesterFilter}`;

  return (
    <section
      className="dku-check"
      data-dku-check-mode={mode}
      aria-labelledby="dku-check-title"
    >
      <header className="dku-check-summary">
        <div>
          <span>빠른 과목 체크</span>
          <h2 id="dku-check-title" tabIndex={-1}>
            {mode === "semester" ? "학기별 과목" : "모듈별 과목"}
          </h2>
        </div>
        <div className="dku-check-summary-actions">
          <p><strong>{selectedMatchingCount}</strong> / {matchingCourses.length}개 선택</p>
          <button
            type="button"
            aria-pressed={selectedOnly}
            onClick={() => setSelectedOnly((current) => !current)}
          >
            선택한 과목만
          </button>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="dku-check-empty" role="status">
          <strong>{selectedOnly ? "선택한 과목이 없습니다." : "조건에 맞는 과목이 없습니다."}</strong>
          <span>{selectedOnly ? "전체 과목으로 돌아가 처음부터 체크해 보세요." : "검색어나 학년·학기 필터를 바꿔보세요."}</span>
          {selectedOnly ? (
            <button type="button" onClick={() => setSelectedOnly(false)}>전체 과목 보기</button>
          ) : null}
        </div>
      ) : (
        <div className="dku-check-groups">
          {groups.map((group, index) => {
            const groupSelectedCount = group.courses.filter((course) => selectionByCourseId.has(course.id)).length;
            const groupOpen = forceGroupsOpen || (groupOpenState[group.id] ?? index === 0);
            return (
            <details
              className="dku-check-group"
              id={group.id}
              key={`${group.id}-${expansionKey}`}
              open={groupOpen}
              onToggle={(event) => {
                if (forceGroupsOpen) return;
                const open = event.currentTarget.open;
                setGroupOpenState((current) => current[group.id] === open
                  ? current
                  : { ...current, [group.id]: open });
              }}
            >
              <summary>
                <span className="dku-check-group-title">
                  <h3>{group.label}</h3>
                  {mode === "module" && group.note === "선택 트랙 관련 모듈" ? <small>{group.note}</small> : null}
                </span>
                <span>선택 {groupSelectedCount} / {group.courses.length}</span>
                <ChevronDown aria-hidden="true" size={18} />
              </summary>
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
                    showTerm={mode === "module"}
                    onToggleCourse={onToggleCourse}
                  />
                ))}
              </div>
            </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
