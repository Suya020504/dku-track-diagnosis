import { useState } from "react";
import { departmentCurriculum, normalizeCourseSearch, OFFICIAL_2026_SOURCE } from "../../data/officialTimetable2026";

export function CurriculumReferenceView() {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("all");
  const rows = departmentCurriculum.filter((course) => normalizeCourseSearch(`${course.courseName} ${course.officialCourseCode}`).includes(normalizeCourseSearch(query)) && (grade === "all" || String(course.grade) === grade));
  return <section aria-label="학과 정규 교과과정">
    <div className="dku-resource-scope-strip"><strong>학과 전체 47과목</strong><span>트랙과 겹치는 A–L 37과목 + 트랙 밖 10과목</span><a href={OFFICIAL_2026_SOURCE.departmentCurriculumUrl} target="_blank" rel="noopener noreferrer">학과 교과과정 원문 ↗</a></div>
    <div className="dku-resource-toolbar"><label>교육과정 검색<input type="search" placeholder="과목명 또는 학사 과목코드" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>학년<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="all">전체 학년</option>{[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}학년</option>)}</select></label><span role="status">{rows.length}과목</span></div>
    <p className="dku-resource-note">2026-09-08 확인 · 원문 게시·개정연도 미표기. 학년·학기는 교육과정상 배치이며 해당 학기 개설 보장이 아닙니다. 트랙 밖 과목을 진단 학점에 자동 합산하지 않습니다.</p>
    <details className="dku-resource-method"><summary>과목명과 배치 학기 안내</summary><p>47과목의 이름·학사 과목코드·학점·학년·학기는 학과 교과과정 표기를 따릅니다. 트랙 자료와 띄어쓰기나 표현이 다를 수 있으므로 학사 과목코드로 구분하세요. 이 배치 학기는 실제 강좌 시간표와 별개입니다.</p></details>
    {rows.length ? <div className="dku-resource-table-wrap"><table className="dku-resource-data-table"><caption>학과 현재 공개 교과과정 · 47과목 중 {rows.length}과목</caption><thead><tr><th>학년·학기</th><th>과목명</th><th>학사 과목코드</th><th>학점</th><th>트랙 자료 연결</th></tr></thead><tbody>{rows.map((course) => <tr key={course.officialCourseCode}><td data-label="학년·학기">{course.grade}학년 {course.semester}학기</td><th scope="row">{course.courseName}</th><td data-label="학사 과목코드">{course.officialCourseCode}</td><td data-label="학점">{course.credits}학점</td><td data-label="트랙 자료 연결">{course.projectCourseId?.toUpperCase() ?? "트랙 밖 · 전공선택"}</td></tr>)}</tbody></table></div> : <p className="dku-resource-empty" role="status">조건에 맞는 과목이 없습니다. 검색어나 학년 필터를 바꿔보세요.</p>}
  </section>;
}
