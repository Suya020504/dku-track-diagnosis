import { useState, type RefObject } from "react";
import { BookOpen, CalendarDays, CalendarPlus, CheckCircle2, ExternalLink, Info, RotateCcw, Save } from "lucide-react";
import { TrackGlyph } from "../../components/TrackGlyph";
import type { AcademicTermId, CourseSelectionRecord, GraduationPlanDraftValues, GraduationPlanPreferences, TrackId, TrackPlanningState } from "../../types";
import { buildTrackPlanInputSignature, buildTrackSemesterPlan, MAX_TRACK_PLANNING_FUTURE_TERMS, type TrackSemesterPlan } from "../../lib/trackSemesterPlanner";
import { courses, tracks } from "../../data/curriculumData";
import { isCourseInTrack } from "../../lib/diagnosis";
import "./track-module-planner.css";

export type TrackModulePlannerProps = {
  selectedTrackIds: TrackId[];
  courseSelections: CourseSelectionRecord[];
  state: TrackPlanningState;
  onChangeState: (state: TrackPlanningState) => void;
  onSavePlan: (plan: TrackSemesterPlan) => void;
  onBackToResult: () => void;
  onEditTracks: () => void;
  onOpenApplication: () => void;
  storageError?: boolean;
  saveStatus?: "idle" | "saved" | "error";
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

export function TrackModulePlanner({
  selectedTrackIds, courseSelections, state, onChangeState, onSavePlan,
  onBackToResult, onEditTracks, onOpenApplication, storageError = false, saveStatus = "idle", headingRef,
}: TrackModulePlannerProps) {
  const [generationError, setGenerationError] = useState("");
  const result = state.result;
  const values: GraduationPlanDraftValues = state.draft?.values ?? result?.preferences ?? {
    currentTerm: "2026-2", targetGraduationTerm: "", maxMajorCoursesPerTerm: "4", considerSeasonalTerm: false,
  };
  const currentTerm = values.currentTerm ?? "";
  const targetTerm = values.targetGraduationTerm ?? "";
  const load = String(values.maxMajorCoursesPerTerm ?? "");
  const currentValid = /^\d{4}-[12]$/.test(currentTerm);
  const difference = currentValid && /^\d{4}-[12]$/.test(targetTerm)
    ? termNumber(targetTerm) - termNumber(currentTerm) : Number.NaN;
  const targetValid = Number.isFinite(difference) && difference >= 0 && difference <= MAX_TRACK_PLANNING_FUTURE_TERMS;
  const loadValid = /^[1-6]$/.test(load.trim());
  const valid = currentValid && targetValid && loadValid;
  const selectedTracks = tracks.filter((track) => selectedTrackIds.includes(track.id));
  const resultTracks = tracks.filter((track) => result?.selectedTrackIds.includes(track.id));
  const sourceChanged = Boolean(result && result.inputSignature !== buildTrackPlanInputSignature({
    selectedTrackIds, courseSelections, preferences: result.preferences, manualTerms: state.manualTerms,
    generatedAt: result.generatedAt,
  }));
  const pendingChanges = Boolean(state.draft || sourceChanged);
  const resultTerms = result ? planTerms(result.preferences) : [];
  const rowCourseIds = [...new Set(result?.courseIds ?? [])];
  const unplacedCount = result?.unplaced.length ?? 0;
  const canSave = Boolean(result && !pendingChanges && saveStatus !== "saved");

  function change(patch: Partial<GraduationPlanDraftValues>) {
    setGenerationError("");
    onChangeState({ ...state, draft: { version: 1, values: { ...values, ...patch } } });
  }

  function generate() {
    if (!valid || selectedTracks.length === 0) return;
    const preferences: GraduationPlanPreferences = {
      currentTerm: currentTerm as AcademicTermId,
      targetGraduationTerm: targetTerm as AcademicTermId,
      maxMajorCoursesPerTerm: Number(load.trim()),
      considerSeasonalTerm: values.considerSeasonalTerm ?? false,
    };
    try {
      const nextResult = buildTrackSemesterPlan({
        selectedTrackIds, courseSelections, preferences, manualTerms: state.manualTerms,
        generatedAt: new Date().toISOString(),
      });
      setGenerationError("");
      onChangeState({ ...state, draft: undefined, result: nextResult });
    } catch (error) {
      setGenerationError(error instanceof RangeError ? error.message : "계획을 만들지 못했어요. 조건을 확인하고 다시 시도해 주세요.");
    }
  }

  function moveCourse(courseId: string, term: string) {
    if (!result || pendingChanges) return;
    const manualTerms = { ...state.manualTerms };
    if (term) manualTerms[courseId] = term;
    else delete manualTerms[courseId];
    try {
      const nextResult = buildTrackSemesterPlan({
        selectedTrackIds, courseSelections, preferences: result.preferences, manualTerms,
        generatedAt: new Date().toISOString(),
      });
      setGenerationError("");
      onChangeState({ ...state, draft: undefined, manualTerms, result: nextResult });
    } catch (error) {
      setGenerationError(error instanceof RangeError ? error.message : "학기를 옮기지 못했어요. 조건을 확인하고 다시 시도해 주세요.");
    }
  }

  return <main className="track-module-planner" aria-labelledby="track-module-plan-title">
    <header className="track-module-planner__heading">
      <h1 id="track-module-plan-title" ref={headingRef} tabIndex={-1}><CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />남은 수업을 학기별로 나눠보세요</h1>
      <p>선택한 여러 트랙의 겹치는 과목은 한 번만 담아요.</p>
      <p className="track-module-planner__scope">선택 트랙 모듈 계획 · 전체 졸업 요건은 별도예요.</p>
    </header>
    {storageError && <div className="track-module-planner__notice track-module-planner__notice--error" role="alert">
      이 브라우저에 변경 내용을 저장하지 못했어요. 현재 입력은 화면에 남아 있으니 새로고침 전에 확인해 주세요.
    </div>}
    {generationError && <div className="track-module-planner__notice track-module-planner__notice--error" role="alert">{generationError}</div>}
    {selectedTracks.length === 0 ? <section className="track-module-planner__empty">
      <h2>계획할 트랙을 먼저 선택해 주세요</h2>
      <p>한 개 또는 여러 트랙의 남은 모듈 과목을 함께 배치할 수 있어요.</p>
      <button type="button" onClick={onEditTracks}>트랙 선택하기</button>
    </section> : <>
      <form className="track-module-planner__conditions" noValidate onSubmit={(event) => { event.preventDefault(); generate(); }}>
        <label><span>현재 학기</span><input value={currentTerm} placeholder="2026-2" inputMode="text"
          aria-invalid={!currentValid} aria-describedby="track-module-plan-period-help"
          onChange={(event) => change({ currentTerm: event.target.value })} /></label>
        <label><span>목표 학기</span><input value={targetTerm} placeholder="2028-1" inputMode="text"
          aria-invalid={!targetValid} aria-describedby="track-module-plan-period-help"
          onChange={(event) => change({ targetGraduationTerm: event.target.value })} /></label>
        <label><span>학기당 최대 과목 수</span><input value={load} inputMode="numeric"
          aria-invalid={!loadValid} aria-describedby="track-module-plan-load-help"
          onChange={(event) => change({ maxMajorCoursesPerTerm: event.target.value })} /></label>
        <button type="submit" disabled={!valid}><CalendarPlus size={19} strokeWidth={1.8} aria-hidden="true" />{result ? "조건 반영해 계획 만들기" : "계획 만들기"}</button>
        <div className="track-module-planner__condition-help">
          <p id="track-module-plan-period-help">연도-학기로 입력해 주세요. 현재 학기 이후 최대 12개 정규학기까지 계획할 수 있어요.</p>
          <p id="track-module-plan-load-help">한 학기에 1~6과목. 새 과목은 다음 학기부터, 수강 중인 과목은 현재 학기에 표시해요.</p>
          {Number.isFinite(difference) && !targetValid && <p className="track-module-planner__condition-error">
            {difference < 0 ? "목표 학기는 현재 학기와 같거나 이후여야 해요." : "현재 학기 이후 12개 정규학기를 넘지 않게 목표를 정해 주세요."}
          </p>}
        </div>
      </form>
      {result && pendingChanges && <div className="track-module-planner__notice" data-plan-draft-notice role="status">
        {sourceChanged ? "선택 트랙이나 이수 과목이 바뀌었어요." : "계획 조건을 수정 중이에요."} 아래 표는 이전 계획입니다. 새 조건으로 계획을 만든 뒤 이동하거나 보관해 주세요.
      </div>}
      {state.draft && !result && !storageError && <p className="track-module-planner__notice" role="status">작성 중인 조건이 이 브라우저에 저장되어 있어요. 계획 만들기를 누르면 표에 반영됩니다.</p>}
      {result && <p className="track-module-planner__notice" data-plan-offering-note>2026년 개설 이력으로 만든 계획이에요. 수강신청 전 개설 정보를 확인하세요.</p>}
      <div className="track-module-planner__layout">
        <section className="track-module-planner__workspace" aria-label="학기별 과목 배치">
          {!result ? <div className="track-module-planner__empty">
            <BookOpen size={30} aria-hidden="true" />
            <h2>현재 학기와 목표 학기를 정해 주세요</h2>
            <p>트랙마다 필요한 과목을 모으고, 겹치는 과목은 한 번만 배치합니다. 이수 완료 기록은 바뀌지 않아요.</p>
          </div> : <>
            <p className="track-module-planner__grid-help" id="track-module-plan-grid-help">표를 좌우로 움직여 학기를 확인하세요. 과목 아래 선택 상자로 배치 학기를 바꿀 수 있어요.</p>
            <div className="track-module-planner__table-scroll" tabIndex={0} role="region" aria-label="학기 계획 표 스크롤" aria-describedby="track-module-plan-grid-help">
              <table className="track-module-planner__table" aria-label="과목별 학기 계획" style={{ minWidth: `${218 + resultTerms.length * 158}px` }}>
                <thead><tr><th scope="col">과목</th>{resultTerms.map((term) => <th scope="col" key={term}>
                  {term}<small>{term === result.preferences.currentTerm ? "현재 학기 · 수강 중" : `${termNumber(term) - termNumber(result.preferences.currentTerm)}학기 후`}</small>
                </th>)}</tr></thead>
                <tbody>{rowCourseIds.map((courseId) => {
                  const course = courses.find((item) => item.id === courseId);
                  const placement = result.placements.find((item) => item.courseId === courseId);
                  const unplaced = result.unplaced.find((item) => item.courseId === courseId);
                  const isInProgress = placement?.source === "in-progress" || courseSelections.some((item) => item.courseId === courseId && item.status === "in-progress");
                  const relevantTracks = resultTracks.filter((track) => course && isCourseInTrack(track, course));
                  const selectedTerm = state.manualTerms?.[courseId] ?? placement?.term ?? "";
                  return <tr key={courseId} data-course-id={courseId}>
                    <th scope="row">
                      <strong>{course?.name ?? courseId}</strong>
                      <span className="track-module-planner__course-meta">{course?.code ?? courseId}{course ? ` · ${course.credits}학점` : " · 교과목 확인 필요"}</span>
                      <div className="track-module-planner__course-tags">{relevantTracks.map((track) => <span key={track.id}>{track.name.replace(/ 트랙$/, "")}</span>)}</div>
                      <select className="track-module-planner__term-select" aria-label={`${course?.name ?? courseId} 배치 학기`}
                        value={selectedTerm} disabled={pendingChanges || isInProgress}
                        onChange={(event) => moveCourse(courseId, event.target.value)}>
                        <option value="">{unplaced ? "미배치 · 자동으로 다시 찾기" : "자동 배치로 되돌리기"}</option>
                        {selectedTerm && !resultTerms.includes(selectedTerm as AcademicTermId) && <option value={selectedTerm}>{selectedTerm} · 계획 범위 밖</option>}
                        {resultTerms.map((term) => <option value={term} key={term}>{term}{term === result.preferences.currentTerm ? " · 현재 학기" : ""}</option>)}
                      </select>
                      {isInProgress && <span className="track-module-planner__course-meta">수강 중인 과목은 현재 학기 고정</span>}
                      {unplaced?.reason === "in-progress-term-conflict" && <button type="button"
                        className="track-module-planner__reset-current" disabled={pendingChanges}
                        onClick={() => moveCourse(courseId, result.preferences.currentTerm)}>현재 학기로 되돌리기</button>}
                      {unplaced && <span className="track-module-planner__course-meta">미배치 · 아래 사유 확인</span>}
                    </th>
                    {resultTerms.map((term) => <td key={term}>{placement?.term === term ? <div className={`track-module-planner__placement${isInProgress ? " track-module-planner__placement--current" : ""}`}>
                      <CheckCircle2 size={20} aria-hidden="true" /><span>{course?.name ?? courseId}</span>
                      <small>{isInProgress ? "수강 중 · " : ""}{course ? `${course.credits}학점` : "학점 정보 없음"}</small>
                    </div> : <span className="track-module-planner__vacant" aria-hidden="true">—</span>}</td>)}
                  </tr>;
                })}</tbody>
                <tfoot><tr><th scope="row">학기별 과목 수</th>{resultTerms.map((term) => {
                  const placements = result.placements.filter((item) => item.term === term);
                  const credits = placements.reduce((sum, item) => sum + (courses.find((course) => course.id === item.courseId)?.credits ?? 0), 0);
                  return <td key={term}>{placements.length}개 과목<small>{credits}학점</small></td>;
                })}</tr></tfoot>
              </table>
            </div>
            {rowCourseIds.length === 0 && <div className="track-module-planner__notice" role="status">현재 입력을 기준으로 새로 배치할 트랙 모듈 과목이 없어요.</div>}
            {unplacedCount > 0 && <section className="track-module-planner__unplaced" aria-labelledby="track-module-plan-unplaced-title">
              <h2 id="track-module-plan-unplaced-title">아직 배치하지 못한 과목 {unplacedCount}개</h2>
              <ul>{result.unplaced.map((item) => <li key={`${item.courseId}-${item.reason}`}>
                <strong>{courses.find((course) => course.id === item.courseId)?.name ?? item.courseId}</strong>
                <p>{item.message}</p>
              </li>)}</ul>
            </section>}
            <details className="track-module-planner__assumptions"><summary>이 계획의 계산 범위와 확인할 점</summary>
              <ul>{result.notes.filter(note => !note.startsWith("2026학년도 개설 이력을 참고했습니다.")).map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul>
            </details>
          </>}
        </section>
        <aside aria-label="선택한 트랙" className="track-module-planner__rail">
          <div className="track-module-planner__rail-heading"><h2>선택한 트랙</h2><button type="button" onClick={onEditTracks}>트랙 변경</button></div>
          <ul className="track-module-planner__track-list">{selectedTracks.map((track) => <li key={track.id}><TrackGlyph trackId={track.id} decorative />{track.name}</li>)}</ul>
          <section className="track-module-planner__rail-block"><h3><Info size={17} aria-hidden="true" /> 겹치는 과목은 한 번만</h3>
            <p>여러 트랙에 포함된 같은 과목은 한 번만 담아요.</p>
          </section>
          <section className="track-module-planner__rail-block"><h3>배치 전 확인</h3>
            <p>{!result ? "조건을 입력하면 남은 과목과 미배치 사유를 함께 보여드려요." : unplacedCount > 0 ? `${unplacedCount}개 과목이 미배치 상태예요. 표 아래 사유를 확인하고 학기나 수강량을 조정해 주세요.` : "모든 후보 과목을 학기별로 배치했어요."}</p>
          </section>
          <div className="track-module-planner__actions">
            <button type="button" className="track-module-planner__save" disabled={!canSave} onClick={() => { if (result && canSave) onSavePlan(result); }}>
              <Save size={18} aria-hidden="true" />{saveStatus === "saved" && !pendingChanges ? "보관한 계획" : "이 계획 보관하기"}
            </button>
            <button type="button" onClick={onBackToResult}><RotateCcw size={17} aria-hidden="true" />과목 다시 확인</button>
            <button type="button" className="track-module-planner__application" onClick={onOpenApplication}><ExternalLink size={16} aria-hidden="true" />학과 신청 안내</button>
          </div>
          {saveStatus === "saved" && !pendingChanges && !storageError && <p className="track-module-planner__notice track-module-planner__notice--success" role="status">이 계획을 이 브라우저의 기록에 보관했어요.</p>}
          {saveStatus === "error" && <p className="track-module-planner__notice track-module-planner__notice--error" role="alert">계획을 보관하지 못했어요. 입력은 유지되니 다시 보관해 주세요.</p>}
        </aside>
      </div>
    </>}
  </main>;
}

function termNumber(term: string): number {
  const [year, semester] = term.split("-").map(Number);
  return year * 2 + semester;
}

function planTerms(preferences: GraduationPlanPreferences): AcademicTermId[] {
  const count = Math.min(MAX_TRACK_PLANNING_FUTURE_TERMS, Math.max(0, termNumber(preferences.targetGraduationTerm) - termNumber(preferences.currentTerm)));
  return Array.from({ length: count + 1 }, (_, offset) => {
    const index = termNumber(preferences.currentTerm) - 1 + offset;
    return `${Math.floor(index / 2)}-${index % 2 + 1}` as AcademicTermId;
  });
}
