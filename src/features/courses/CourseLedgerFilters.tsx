import { CalendarDays, ChevronDown, Layers, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
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
  { value: "all", label: "전체" },
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
    <section className="dku-check-filters" aria-label="과목 목록 필터">
      <label className="dku-check-search">
        <Search aria-hidden="true" size={20} strokeWidth={1.8} />
        <span className="dku-check-search-label">과목 검색</span>
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          placeholder="과목명 또는 과목코드 검색"
          onChange={(event) => {
            onGradeFilterChange("all");
            onSemesterFilterChange("all");
            onQueryChange(event.currentTarget.value);
          }}
        />
      </label>

      <div className="dku-check-grade-tabs" role="group" aria-label="학년 선택">
        {gradeOptions.map((option) => (
          <button type="button" key={option.value} aria-pressed={gradeFilter === option.value}
            onClick={() => {
              onGradeFilterChange(option.value);
              if (option.value === "unknown") onSemesterFilterChange("all");
            }}>{option.label}</button>
        ))}
      </div>

      <details className="dku-check-more-filters">
        <summary>
          <SlidersHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>정렬·추가 필터</span>
          <small>{gradeLabel} · {semesterLabel}</small>
          <ChevronDown aria-hidden="true" size={18} strokeWidth={1.8} />
        </summary>
        <div className="dku-check-more-filter-content">
          <div className="dku-check-mode" aria-label="과목 정렬 방식">
            <button
              type="button"
              aria-pressed={mode === "semester"}
              className={mode === "semester" ? "is-active" : undefined}
              onClick={() => onModeChange("semester")}
            >
              <CalendarDays aria-hidden="true" size={18} strokeWidth={1.8} />학년·학기별
            </button>
            <button
              type="button"
              aria-pressed={mode === "module"}
              className={mode === "module" ? "is-active" : undefined}
              onClick={() => onModeChange("module")}
            >
              <Layers aria-hidden="true" size={18} strokeWidth={1.8} />모듈별
            </button>
          </div>

          <div className="dku-check-filter-row">
            <span>학기</span>
            <div className="dku-check-filter-options" aria-label="학기 선택">
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
      {gradeFilter !== "all" || semesterFilter !== "all" ? (
        <div className="dku-check-applied-filters" aria-label="적용 중인 필터">
          <span>{gradeLabel} · {semesterLabel}</span>
          <button type="button" onClick={() => {
            onGradeFilterChange("all");
            onSemesterFilterChange("all");
          }}><RotateCcw aria-hidden="true" size={18} strokeWidth={1.8} />필터 초기화</button>
        </div>
      ) : null}
    </section>
  );
}
