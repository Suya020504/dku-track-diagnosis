import { useState } from "react";
import { filterOfficialSections, formatDayPeriod, OFFICIAL_2026_SOURCE, TIMETABLE_QUERY_SCOPES } from "../../data/officialTimetable2026";

export function TimetableReferenceView() {
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("all");
  const [delivery, setDelivery] = useState("all");
  const [scope, setScope] = useState("all");
  const rows = filterOfficialSections(query, day, delivery, scope);
  return <section aria-label="2026-2 실제 강좌 조회">
    <div className="dku-resource-scope-strip"><strong>37분반</strong><span>트랙 25과목 35분반 + 트랙 밖 2과목 2분반</span><a href={OFFICIAL_2026_SOURCE.timetableUrl} target="_blank" rel="noopener noreferrer">공식 시간표 검색 ↗</a></div>
    <div className="dku-resource-toolbar"><label>시간표 검색<input type="search" placeholder="과목명, 학사 과목코드, 교수, 강의실" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label>요일<select value={day} onChange={(event) => setDay(event.target.value)}><option value="all">전체 요일</option>{["월", "화", "수", "목", "금", "토"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>수업방식<select value={delivery} onChange={(event) => setDelivery(event.target.value)}><option value="all">전체 방식</option><option>대면수업</option><option>원격수업</option></select></label>
      <label>조회 구분<select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">전체 범위</option><option value="D-MAJOR">학과 전공</option><option value="D-FOUNDATION">학문기초</option><option value="CONVERGENCE">융합 관련</option></select></label>
    </div>
    <p role="status" className="dku-resource-count">검색 결과 <strong>{rows.length}분반</strong></p>
    <p className="dku-resource-note">원격수업의 표기 시간만으로 충돌을 확정하지 않습니다. 사전녹화 여부가 없는 강좌는 동기식 여부 미표기입니다. 여석·타학과 수강 가능·트랙 인정은 별도 확인하세요.</p>
    {rows.length ? <div className="dku-resource-table-wrap"><table className="dku-resource-data-table dku-resource-timetable"><caption>2026-2 천안 · 2026-09-08 공개조회 스냅샷</caption><thead><tr><th>과목·분반</th><th>학점·교수</th><th>요일·교시·시각</th><th>강의실·수업방식</th><th>확인 사항</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.officialCourseCode}-${row.section}`}>
      <th scope="row"><strong>{row.courseName}</strong><small>학사 과목코드 {row.officialCourseCode} · {row.section}분반</small><small>{row.grade}학년 · {row.projectCourseId ? `트랙 자료 코드 ${row.projectCourseId.toUpperCase()}` : "트랙 밖"}</small></th>
      <td data-label="학점·교수">{row.credits}학점<small>교수 {row.instructor ?? "미표기"}</small></td>
      <td data-label="요일·교시·시각">{row.dayPeriods.map((period, index) => <small key={index}>{formatDayPeriod(period)}</small>)}</td>
      <td data-label="강의실·수업방식">{row.delivery}<small>강의실 {row.room ?? "미표기"}</small>{row.remoteTiming === "asynchronous" && <small>사전녹화온라인강의</small>}{row.remoteTiming === "unknown" && <small>동기식 여부 미표기</small>}</td>
      <td data-label="확인 사항"><small>{row.scope === "D-FOUNDATION" ? "학문기초" : "전공선택"}</small>{row.notes && <small>{row.notes}</small>}{row.changeNote && <small>{row.changeNote}</small>}<details><summary>조회 출처</summary><p>{TIMETABLE_QUERY_SCOPES[row.scope]}</p><p>원문: {row.scheduleRaw}</p><p>강좌 게시·수정일 미표기</p></details></td>
    </tr>)}</tbody></table></div> : <div className="dku-resource-empty" role="status"><strong>조건에 맞는 분반이 없습니다.</strong><p>조회 범위 안에서 검색된 결과입니다. 미개설·폐지를 뜻하지 않습니다.</p><button type="button" onClick={() => { setQuery(""); setDay("all"); setDelivery("all"); setScope("all"); }}>검색 조건 초기화</button></div>}
    <details className="dku-resource-method"><summary>조회 조건과 교시 해석</summary><p>2026 / 2학기 / 천안 · 비로그인 공개조회. 실시간 자동 갱신이 아닌 2026-09-08 정적 스냅샷입니다.</p><ul>{Object.entries(TIMETABLE_QUERY_SCOPES).map(([key, value]) => <li key={key}>{value}</li>)}</ul><p>주간 1~18교시는 30분 단위입니다. 야간 19~24교시는 50분 수업과 5분 간격을 적용합니다. 금21~22는 19:50~21:35입니다. 토요일 분반도 포함합니다.</p><a href={`${OFFICIAL_2026_SOURCE.pdfUrl}#page=138`} target="_blank" rel="noopener noreferrer">공식 교시표 · 파일 138쪽 / 인쇄 4쪽 ↗</a><p>이번 조회에서 나오지 않은 M-5, N-2~N-4, O-1은 폐지나 미래 미개설로 해석하지 않습니다.</p></details>
  </section>;
}
