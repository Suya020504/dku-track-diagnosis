import { useId, useRef, useState } from "react";
import { departmentCurriculum, OFFICIAL_2026_SOURCE, type DepartmentCourse } from "../../data/officialTimetable2026";
import { buildCurriculumRoadmap } from "./curriculumRoadmap";
import "./curriculum-roadmap.css";

function CurriculumCourseTile({ course, expanded, onToggle, onClose }: {
  course: DepartmentCourse;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const detailId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function closeDetail() {
    onClose();
    buttonRef.current?.focus();
  }

  return <div className="dku-roadmap-course" onKeyDown={(event) => {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation();
      closeDetail();
    }
  }}>
    <button
      ref={buttonRef}
      type="button"
      className="dku-roadmap-course-button"
      data-curriculum-course={course.officialCourseCode}
      aria-label={`${course.courseName}, ${course.credits}학점, 과목 정보`}
      aria-expanded={expanded}
      aria-controls={expanded ? detailId : undefined}
      onClick={onToggle}
    >
      <span className="dku-roadmap-course-name">{course.courseName}</span>
      <span className="dku-roadmap-course-credit">{course.credits}학점 <span aria-hidden="true">{expanded ? "−" : "+"}</span></span>
    </button>
    {expanded ? <div id={detailId} className="dku-roadmap-course-detail" role="region" aria-label={`${course.courseName} 과목 정보`}>
      <dl>
        <div><dt>학사 과목코드</dt><dd>{course.officialCourseCode}</dd></div>
        <div><dt>학점</dt><dd>{course.credits}학점</dd></div>
        <div><dt>배치 학기</dt><dd>{course.grade}학년 {course.semester}학기</dd></div>
      </dl>
      <button type="button" aria-label={`${course.courseName} 과목 정보 닫기`} onClick={closeDetail}>닫기</button>
    </div> : null}
  </div>;
}

export function CurriculumReferenceView() {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("all");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const instructionsId = useId();
  const tableId = useId();
  const roadmap = buildCurriculumRoadmap(departmentCurriculum, { query, grade });
  const years = [...new Set(roadmap.columns.map((column) => column.grade))];

  return <section className="dku-curriculum-roadmap" aria-label="학과 정규 교과과정">
    <div className="dku-roadmap-intro">
      <strong>학과 전체 {departmentCurriculum.length}과목</strong>
      <span>1학년부터 4학년까지, 학기별 학습 흐름</span>
      <a href={OFFICIAL_2026_SOURCE.departmentCurriculumUrl} target="_blank" rel="noopener noreferrer">학과 교과과정 원문 ↗</a>
    </div>

    <div className="dku-resource-toolbar dku-roadmap-toolbar">
      <label>교육과정 검색<input ref={searchRef} type="search" placeholder="과목명 또는 학사 과목코드" value={query} onChange={(event) => {
        setQuery(event.target.value);
        setExpandedCode(null);
      }} /></label>
      <label>학년<select value={grade} onChange={(event) => {
        setGrade(event.target.value);
        setExpandedCode(null);
      }}>
        <option value="all">전체 학년</option>
        {[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}학년</option>)}
      </select></label>
      <span className="dku-roadmap-count" role="status" aria-live="polite">{roadmap.courseCount}과목</span>
    </div>

    <div className="dku-roadmap-reading-guide">
      <p id={instructionsId}>학년을 고르거나 표를 좌우로 살펴보세요. 과목을 누르면 상세 정보가 열립니다.</p>
    </div>

    {roadmap.courseCount > 0 ? <div
      className="dku-roadmap-scroll"
      data-curriculum-scroll
      role="region"
      aria-label="학년·학기별 교육과정 표"
      aria-describedby={instructionsId}
      tabIndex={0}
    >
      <table className={`dku-roadmap-table${grade !== "all" ? " dku-roadmap-table-single-year" : ""}`}>
        <caption>학습분야별 학기 배치 · {roadmap.courseCount}과목</caption>
        <colgroup><col className="dku-roadmap-area-column" /></colgroup>
        {years.map((year) => <colgroup key={year} span={2} />)}
        <thead>
          <tr>
            <th rowSpan={2} className="dku-roadmap-corner">학습분야</th>
            {years.map((year) => <th key={year} id={`${tableId}-year-${year}`} scope="colgroup" colSpan={2}>{year}학년</th>)}
          </tr>
          <tr>{roadmap.columns.map((column) => <th key={column.id} id={`${tableId}-semester-${column.id}`} scope="col">{column.semester}학기</th>)}</tr>
        </thead>
        <tbody>
          {roadmap.rows.map((row) => <tr key={row.id} data-learning-area={row.id}>
            <th id={`${tableId}-area-${row.id}`} scope="row" className="dku-roadmap-row-heading">{row.label}</th>
            {row.cells.map((cell) => <td key={cell.columnId} data-semester={cell.columnId} headers={`${tableId}-area-${row.id} ${tableId}-year-${cell.columnId.split("-")[0]} ${tableId}-semester-${cell.columnId}`}>
              {cell.courses.length > 0 ? <div className="dku-roadmap-cell-courses">
                {cell.courses.map((course) => <CurriculumCourseTile
                  key={course.officialCourseCode}
                  course={course}
                  expanded={expandedCode === course.officialCourseCode}
                  onToggle={() => setExpandedCode((current) => current === course.officialCourseCode ? null : course.officialCourseCode)}
                  onClose={() => setExpandedCode(null)}
                />)}
              </div> : <span className="dku-roadmap-no-course" aria-label="배치 과목 없음">—</span>}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div> : <div className="dku-resource-empty dku-roadmap-empty" role="status">
      <p>조건에 맞는 과목이 없습니다. 검색어나 학년 필터를 바꿔 보세요.</p>
      <button type="button" onClick={() => {
        setQuery("");
        setGrade("all");
        setExpandedCode(null);
        searchRef.current?.focus();
      }}>전체 교육과정 보기</button>
    </div>}
  </section>;
}
