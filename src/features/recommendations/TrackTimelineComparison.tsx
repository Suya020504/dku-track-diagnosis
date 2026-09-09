import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { tracks } from "../../data/curriculumData";
import { MAX_TRACK_PLANNING_FUTURE_TERMS } from "../../lib/trackSemesterPlanner";
import type { AcademicTermId, CourseSelectionRecord, GraduationPlanPreferences } from "../../types";
import { compareTrackTimelines, type TrackTimelineComparison as Timeline } from "./compareTrackTimelines";

type Props = {
  courseSelections: readonly CourseSelectionRecord[];
  initialPreferences?: GraduationPlanPreferences;
};

export function TrackTimelineComparison({ courseSelections, initialPreferences }: Props) {
  const [currentTerm, setCurrentTerm] = useState<string>(initialPreferences?.currentTerm ?? "2026-2");
  const [targetTerm, setTargetTerm] = useState<string>(initialPreferences?.targetGraduationTerm ?? "");
  const [load, setLoad] = useState(String(initialPreferences?.maxMajorCoursesPerTerm ?? 4));
  const [comparison, setComparison] = useState<{ key: string; rows: Timeline[] }>();
  const [error, setError] = useState("");
  const currentValid = /^\d{4}-[12]$/.test(currentTerm);
  const distance = currentValid && /^\d{4}-[12]$/.test(targetTerm) ? termNumber(targetTerm) - termNumber(currentTerm) : NaN;
  const targetValid = Number.isFinite(distance) && distance >= 0 && distance <= MAX_TRACK_PLANNING_FUTURE_TERMS;
  const loadValid = /^[1-6]$/.test(load.trim());
  const valid = currentValid && targetValid && loadValid;
  const key = JSON.stringify([currentTerm, targetTerm, load, courseSelections]);
  const isCurrent = comparison?.key === key;

  function compare() {
    if (!valid) return;
    try {
      const rows = compareTrackTimelines(courseSelections, {
        currentTerm: currentTerm as AcademicTermId, targetGraduationTerm: targetTerm as AcademicTermId,
        maxMajorCoursesPerTerm: Number(load.trim()), considerSeasonalTerm: false,
      });
      setComparison({ key, rows });
      setError("");
    } catch {
      setError("학기 비교를 만들지 못했어요. 입력 조건을 확인하고 다시 비교해 주세요.");
    }
  }

  return <section className="track-timeline-comparison" aria-labelledby="track-timeline-title">
    <h2 id="track-timeline-title"><CalendarDays size={21} aria-hidden="true" />내 목표 학기까지 배치해 보기</h2>
    <p>추가 과목 수가 비슷해도 개설 학기에 따라 계획이 달라져요. 같은 조건으로 트랙별 수강 예시를 비교해 보세요.</p>
    <form className="track-timeline-conditions" noValidate onSubmit={event => { event.preventDefault(); compare(); }}>
      <label><span>현재 학기</span><input value={currentTerm} placeholder="2026-2" aria-invalid={!currentValid}
        aria-describedby="track-timeline-period-help" onChange={event => setCurrentTerm(event.target.value)} /></label>
      <label><span>목표 학기</span><input value={targetTerm} placeholder="2028-1" aria-invalid={!targetValid}
        aria-describedby="track-timeline-period-help" onChange={event => setTargetTerm(event.target.value)} /></label>
      <label><span>학기당 최대 과목 수</span><input value={load} inputMode="numeric" aria-invalid={!loadValid}
        aria-describedby="track-timeline-load-help" onChange={event => setLoad(event.target.value)} /></label>
      <button type="submit" disabled={!valid}>{comparison ? "조건 반영해 다시 비교" : "학기 조건으로 비교"}</button>
      <div className="track-timeline-input-help">
        <p id="track-timeline-period-help">연도-학기로 입력해 주세요. 목표는 현재 학기부터 이후 12개 정규학기 안에서 정할 수 있어요.</p>
        <p id="track-timeline-load-help">한 학기에 1~6과목. 새 수업은 다음 학기부터, 수강 중인 수업은 현재 학기에 배치해요.</p>
        {Number.isFinite(distance) && !targetValid && <p role="alert">{distance < 0 ? "목표 학기는 현재 학기와 같거나 이후여야 해요." : "목표 학기를 현재 학기 이후 12개 정규학기 안으로 정해 주세요."}</p>}
      </div>
    </form>
    {error && <p role="alert">{error}</p>}
    {comparison && !isCurrent && <p role="status">조건이나 수강 이력이 바뀌었어요. 다시 비교하면 새 결과가 표시됩니다.</p>}
    {isCurrent && comparison && <div className="track-timeline-results" aria-live="polite">
      <p className="track-timeline-basis">{currentTerm}부터 {targetTerm}까지 · 학기당 최대 {load.trim()}과목 · 각 트랙을 하나씩 비교한 결과</p>
      <p className="track-timeline-scope">수강 중·수강 예정 과목을 통과한다고 가정합니다. 2026년 개설 이력에 따른 예시이며, 실제 개설이나 가장 빠른 완성 시점을 보장하지 않아요.</p>
      <ul className="track-timeline-cards">{comparison.rows.map(row => <li key={row.trackId} data-timeline-track={row.trackId}>
        <h3>{tracks.find(track => track.id === row.trackId)?.name}</h3>
        <strong className={row.status === "unplaced" ? "track-timeline-status--unplaced" : "track-timeline-status--placed"}>
          {row.status === "satisfied" ? "현재 이력으로 모듈 학점 충족" : row.status === "unplaced" ? "목표 안에 전부 배치하지 못했어요" : "목표 안에 후보 과목 배치 가능"}
        </strong>
        <dl><div><dt>예시의 마지막 학기</dt><dd>{row.lastTerm ?? (row.status === "satisfied" ? "추가 배치 없음" : "미배치 해결 후 확인")}</dd></div>
          <div><dt>배치하지 못한 과목</dt><dd>{row.unplacedCount}개</dd></div></dl>
        {row.unplacedCount > 0 && <details><summary>미배치 사유 {row.unplacedCount}개 확인</summary>
          <ul>{row.unplaced.map(item => <li key={item.courseId}>{item.message}</li>)}</ul>
        </details>}
      </li>)}</ul>
      <p className="track-timeline-scope">트랙별 후보 과목 조합 한 가지를 비교했어요. 모듈 학점 기준이며 필수과목·전체 졸업요건은 별도 확인이 필요합니다. 비교만으로 기존 트랙이나 계획은 바뀌지 않아요.</p>
    </div>}
  </section>;
}

function termNumber(term: string): number {
  const [year, semester] = term.split("-").map(Number);
  return year * 2 + semester;
}
