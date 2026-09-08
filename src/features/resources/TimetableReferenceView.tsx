import { useRef, useState } from "react";
import { filterOfficialSections, formatDayPeriod, OFFICIAL_2026_SOURCE, type OfficialClassSection } from "../../data/officialTimetable2026";
import { createWeeklyTimetable, TEACHING_DAYS, type WeeklyMeeting } from "./timetableStudent";
import "./timetable-student.css";

const scopeLabels = { "D-MAJOR": "학과 전공", "D-FOUNDATION": "학문기초", CONVERGENCE: "융합 관련" };
const sectionKey = (row: OfficialClassSection) => `${row.officialCourseCode}-${row.section}`;
const deliveryLabel = (row: OfficialClassSection) => row.remoteTiming === "asynchronous"
  ? "온라인·사전녹화" : row.remoteTiming === "unknown" ? "온라인·시간 확인" : "대면";

function CourseDetails({ row, id, onClose }: { row: OfficialClassSection; id: string; onClose: () => void }) {
  return <div className="dku-tt-detail" id={id} role="region" aria-label={`${row.courseName} ${row.section}분반 상세 정보`} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <dl>
      <div><dt>학사 과목코드</dt><dd>{row.officialCourseCode} · {row.section}분반</dd></div>
      <div><dt>교수</dt><dd>{row.instructor ?? "미표기"}</dd></div>
      <div><dt>학년·학점</dt><dd>{row.grade}학년 · {row.credits}학점 · {scopeLabels[row.scope]}</dd></div>
      <div><dt>수업 시간</dt><dd>{row.dayPeriods.length ? row.dayPeriods.map((period, index) => <span key={index}>{formatDayPeriod(period)}{period.room ? ` · ${period.room}` : ""}</span>) : "시간 미정"}</dd></div>
      <div><dt>수업방식</dt><dd>{deliveryLabel(row)}{row.remoteTiming === "unknown" ? " · 실시간 여부는 강의계획서에서 확인하세요." : ""}</dd></div>
      {row.remoteTiming === "asynchronous" && <div><dt>온라인 수업</dt><dd>표의 교시와 별개로 사전녹화 강의를 수강합니다.</dd></div>}
      {row.notes && row.remoteTiming !== "asynchronous" && <div><dt>수강 안내</dt><dd>{row.notes}</dd></div>}
      {row.changeNote && <div><dt>변경 안내</dt><dd>{row.changeNote}</dd></div>}
    </dl>
    <button type="button" onClick={onClose}>상세 닫기</button>
  </div>;
}

type SectionButtonProps = {
  row: OfficialClassSection; occurrence: string; selected: string | null;
  onSelect: (key: string, trigger: HTMLButtonElement) => void; onClose: () => void;
  meeting?: WeeklyMeeting;
};
function SectionButton({ row, occurrence, selected, onSelect, onClose, meeting }: SectionButtonProps) {
  const open = selected === occurrence;
  const detailId = `timetable-detail-${occurrence}`;
  return <>
    <button type="button" className="dku-tt-course" data-scope={row.scope} aria-expanded={open} aria-controls={open ? detailId : undefined}
      aria-label={`${row.courseName} ${row.section}분반 상세${meeting ? ` · ${meeting.day} ${meeting.startLabel}` : ""}`}
      onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); onClose(); } }}
      onClick={(event) => onSelect(occurrence, event.currentTarget)}>
      <strong>{row.courseName}</strong>
      <span>{row.section}분반 · {row.instructor ?? "교수 미표기"}</span>
      {meeting && <><span className="dku-tt-time">{meeting.startLabel}–{meeting.endLabel}</span>
        <span>{row.delivery === "원격수업" ? deliveryLabel(row) : meeting.period.room ?? "강의실 미표기"}</span></>}
    </button>
    {open && <CourseDetails row={row} id={detailId} onClose={onClose} />}
  </>;
}

export function TimetableReferenceView() {
  const [query, setQuery] = useState("");
  const [day, setDay] = useState("all");
  const [delivery, setDelivery] = useState("all");
  const [scope, setScope] = useState("all");
  const [view, setView] = useState<"weekly" | "list">("weekly");
  const [selected, setSelected] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const rows = filterOfficialSections(query, day, delivery, scope);
  const weekly = createWeeklyTimetable(rows, day);
  const caption = `${OFFICIAL_2026_SOURCE.academicYear}-${OFFICIAL_2026_SOURCE.semester} · ${OFFICIAL_2026_SOURCE.campus} · ${OFFICIAL_2026_SOURCE.observedAt} 확인`;
  function reset() { setQuery(""); setDay("all"); setDelivery("all"); setScope("all"); setSelected(null); }
  function closeDetails() { setSelected(null); triggerRef.current?.focus(); }
  function selectSection(key: string, trigger: HTMLButtonElement) { triggerRef.current = trigger; setSelected(selected === key ? null : key); }
  const sectionButtonProps = { selected, onSelect: selectSection, onClose: closeDetails };

  return <section className="dku-tt" aria-label="2026-2 실제 강좌 조회">
    <div className="dku-tt-filters">
      <label className="dku-tt-search">시간표 검색<input type="search" placeholder="과목명, 과목코드, 교수, 강의실" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} /></label>
      <label>요일<select value={day} onChange={(event) => { setDay(event.target.value); setSelected(null); }}><option value="all">전체 요일</option>{TEACHING_DAYS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>수업방식<select value={delivery} onChange={(event) => { setDelivery(event.target.value); setSelected(null); }}><option value="all">전체 방식</option><option>대면수업</option><option>원격수업</option></select></label>
      <label>조회 구분<select value={scope} onChange={(event) => { setScope(event.target.value); setSelected(null); }}><option value="all">전체 범위</option>{Object.entries(scopeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <div className="dku-tt-actions">
      <div className="dku-tt-view-toggle" role="group" aria-label="시간표 보기 방식">
        <button type="button" aria-pressed={view === "weekly"} onClick={() => { setView("weekly"); setSelected(null); }}>요일별 시간표</button>
        <button type="button" aria-pressed={view === "list"} onClick={() => { setView("list"); setSelected(null); }}>분반 목록</button>
      </div>
      <span role="status" className="dku-tt-count">{rows.length}분반</span>
      <button className="dku-tt-reset" type="button" aria-label="검색 조건 초기화" onClick={reset}>초기화</button>
    </div>

    {rows.length ? <>
      <div className="dku-tt-caption"><span>{caption}</span><a href={OFFICIAL_2026_SOURCE.timetableUrl} target="_blank" rel="noopener noreferrer">공식 시간표 ↗</a></div>
      {view === "weekly" ? <>
        {weekly.meetings.length > 0 && <div className="dku-tt-scroll" role="region" aria-label="요일별 시간표 가로 스크롤" tabIndex={0}>
          <table className="dku-tt-table dku-tt-weekly" aria-label="요일별 시간표" data-single-day={weekly.days.length === 1 || undefined}>
            <caption>수업 시작 시각 순 · 과목을 누르면 상세 정보</caption>
            <colgroup><col className="dku-tt-clock-column" />{weekly.days.map((value) => <col key={value} />)}</colgroup>
            <thead><tr><th scope="col">시작 시각</th>{weekly.days.map((value) => <th scope="col" key={value}>{value}</th>)}</tr></thead>
            <tbody>{weekly.starts.map((start) => <tr key={start.minutes}>
              <th scope="row">{start.label}</th>
              {weekly.days.map((value) => <td key={value}><div className="dku-tt-cell-stack">
                {weekly.meetings.filter((meeting) => meeting.day === value && meeting.start === start.minutes).map((meeting) => <div key={meeting.key} data-section-key={meeting.sectionKey}>
                  <SectionButton row={meeting.section} occurrence={meeting.key} meeting={meeting} {...sectionButtonProps} />
                </div>)}
              </div></td>)}
            </tr>)}</tbody>
          </table>
        </div>}
        {weekly.unscheduled.length > 0 && <section className="dku-tt-unscheduled" aria-label="온라인·시간 미정 수업">
          <h2>온라인·시간 미정</h2>
          <ul>{weekly.unscheduled.map((row) => <li key={sectionKey(row)} data-section-key={sectionKey(row)}>
            <SectionButton row={row} occurrence={`unscheduled-${sectionKey(row)}`} {...sectionButtonProps} />
            <span>{row.remoteTiming === "asynchronous" ? "사전녹화 · 고정 시간표에서 제외" : "시간 미정 · 강의계획서 확인"}</span>
          </li>)}</ul>
        </section>}
      </> : <div className="dku-tt-scroll" role="region" aria-label="분반 목록 가로 스크롤" tabIndex={0}>
        <table className="dku-tt-table dku-tt-list" aria-label="분반 목록">
          <caption>과목을 누르면 수강 안내와 전체 분반 정보를 볼 수 있습니다.</caption>
          <thead><tr><th scope="col">과목·분반</th><th scope="col">학점</th><th scope="col">요일·시각</th><th scope="col">강의실·수업방식</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={sectionKey(row)} data-section-key={sectionKey(row)}>
            <th scope="row"><SectionButton row={row} occurrence={`list-${sectionKey(row)}`} {...sectionButtonProps} /><small>{row.officialCourseCode} · {scopeLabels[row.scope]}</small></th>
            <td>{row.credits}학점</td>
            <td>{row.remoteTiming === "asynchronous" ? <span>사전녹화 온라인</span> : row.dayPeriods.length ? row.dayPeriods.map((period, index) => <span key={index}>{formatDayPeriod(period)}</span>) : <span>시간 미정</span>}</td>
            <td><span>{deliveryLabel(row)}</span><small>{row.room ?? (row.delivery === "원격수업" ? "온라인" : "강의실 미표기")}</small></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </> : <div className="dku-resource-empty" role="status"><strong>조건에 맞는 분반이 없습니다.</strong><p>검색 조건을 초기화해 다시 확인하세요. 미개설·폐지를 뜻하지 않습니다.</p></div>}
  </section>;
}
