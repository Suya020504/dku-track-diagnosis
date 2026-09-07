import { ChevronDown, Search } from "lucide-react";
import type { RefObject } from "react";

export type CourseGroupMode = "semester" | "module";
export type CourseGradeFilter = "all" | "1" | "2" | "3" | "4" | "unknown";
export type CourseSemesterFilter = "all" | "1" | "2" | "unknown";

type CourseLedgerFiltersProps = {
  mode: CourseGroupMode;
  gradeFilter: CourseGradeFilter;
  semesterFilter: CourseSemesterFilter;
  query: string;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onModeChange: (mode: CourseGroupMode) => void;
  onGradeFilterChange: (grade: CourseGradeFilter) => void;
  onSemesterFilterChange: (semester: CourseSemesterFilter) => void;
  onQueryChange: (query: string) => void;
};

const gradeOptions: Array<{ value: CourseGradeFilter; label: string }> = [
  { value: "all", label: "전체 학년" },
  { value: "1", label: "1학년" },
  { value: "2", label: "2학년" },
  { value: "3", label: "3학년" },
  { value: "4", label: "4학년" },
  { value: "unknown", label: "학기 미정" },
];

const semesterOptions: Array<{ value: CourseSemesterFilter; label: string }> = [
  { value: "all", label: "전체 학기" },
  { value: "1", label: "1학기" },
  { value: "2", label: "2학기" },
  { value: "unknown", label: "학기 미정" },
];

export function CourseLedgerFilters({
  mode,
  gradeFilter,
  semesterFilter,
  query,
  searchInputRef,
  onModeChange,
  onGradeFilterChange,
  onSemesterFilterChange,
  onQueryChange,
}: CourseLedgerFiltersProps) {
  const gradeLabel = gradeOptions.find((option) => option.value === gradeFilter)?.label ?? "전체 학년";
  const semesterLabel = semesterOptions.find((option) => option.value === semesterFilter)?.label ?? "전체 학기";

  return (
    <section className="course-ledger-filters" aria-label="과목 원장 필터">
      <label className="course-ledger-search">
        <Search aria-hidden="true" size={18} />
        <span className="sr-only">과목 검색</span>
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          placeholder="과목명 또는 과목코드 검색"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>

      <div className="course-ledger-mode" aria-label="과목 묶음 방식">
        <button
          type="button"
          aria-pressed={mode === "semester"}
          className={mode === "semester" ? "is-active" : undefined}
          onClick={() => onModeChange("semester")}
        >
          학년·학기별
        </button>
        <button
          type="button"
          aria-pressed={mode === "module"}
          className={mode === "module" ? "is-active" : undefined}
          onClick={() => onModeChange("module")}
        >
          모듈별
        </button>
      </div>

      <details className="course-ledger-more-filters">
        <summary>
          <span>추가 필터</span>
          <small>{gradeLabel} · {semesterLabel}</small>
          <ChevronDown aria-hidden="true" size={18} />
        </summary>
        <div className="course-ledger-more-filter-content">
          <div className="course-ledger-filter-row">
            <span>학년</span>
            <div className="course-ledger-filter-options" aria-label="학년 선택">
              {gradeOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={gradeFilter === option.value}
                  onClick={() => onGradeFilterChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="course-ledger-filter-row">
            <span>학기</span>
            <div className="course-ledger-filter-options" aria-label="학기 선택">
              {semesterOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={semesterFilter === option.value}
                  onClick={() => onSemesterFilterChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
