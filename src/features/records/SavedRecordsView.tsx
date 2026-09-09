import { useId, useState, type ReactNode, type RefObject } from "react";
import { Archive, ArrowLeft, ArrowRight, CalendarDays, CheckCheck, ChevronDown, ChevronRight, FileClock, GraduationCap, Info, Printer } from "lucide-react";
import { courses, tracks } from "../../data/curriculumData";
import { getMajorContext } from "../../lib/majorContext";
import type { TrackSemesterPlan } from "../../lib/trackSemesterPlanner";
import type { TrackCompletionScenario } from "../../lib/trackCompletion";
import type { DiagnosisSnapshot, GraduationPlanResult, PlannedCoursePlacement, ReviewItem, StudyPath } from "../../types";
import "./saved-records.css";

const courseById = new Map(courses.map((course) => [course.id, course]));
const pathLabels: Record<StudyPath, string> = {
  "advanced-major": "심화전공", "track-major": "트랙형전공", "department-with-other-major": "다전공 이수", "double-major": "복수전공", minor: "부전공",
};
const courseStatusLabels = { completed: "이수 완료", "in-progress": "수강 중", planned: "계획" } as const;
const plannedTermLabels = { next: "계획 시작 학기", following: "그다음 학기", later: "이후 학기" } as const;
const planStatusLabels: Record<GraduationPlanResult["status"], string> = {
  "currently-satisfied": "저장 당시 참고 계산상 충족", "regular-plan-possible": "정규학기 안에 참고 배치", "load-adjustment-needed": "학기당 과목 수 조정 필요", "extra-term-possible": "추가 학기 검토", "official-review-required": "학과 확인 필요",
};
const savedResultLabels = { "current-input-satisfied": "저장 당시 참고 계산상 충족", "reference-calculation-satisfied": "저장 당시 참고 계산상 충족", incomplete: "저장 당시 보완할 조건 있음", "official-review-required": "저장 당시 학과 확인 필요" } as const;

function savedDate(value: string, withTime = false): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "저장일 확인 필요";
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", ...(withTime ? { hour: "2-digit", minute: "2-digit", second: "2-digit" } as const : {}) }).format(date);
}

function recordTrackName(record: DiagnosisSnapshot): string | undefined {
  const ids = record.trackPlan?.selectedTrackIds ?? record.trackCompletion?.trackResults.map(item => item.trackId);
  if (ids?.length) return ids.map(id => tracks.find(track => track.id === id)?.name ?? id).join(" · ");
  if (!record.targetTrackId) return undefined;
  if (record.result.trackProgress !== "not-applicable" && record.result.trackProgress.trackId === record.targetTrackId) return record.result.trackProgress.trackName;
  return tracks.find((track) => track.id === record.targetTrackId)?.name ?? record.targetTrackId;
}

function CourseName({ id }: { id: string }) {
  const course = courseById.get(id);
  return <span>{course?.name ?? id}{!course && <small className="saved-records__unknown">과목명 확인 필요</small>}</span>;
}

function countSavedCourses(record: DiagnosisSnapshot) {
  const counts = { completed: 0, "in-progress": 0, planned: 0 };
  record.courseSelections.forEach((item) => { counts[item.status] += 1; });
  return counts;
}

function RecordListItem({ record, selected, onSelect }: { record: DiagnosisSnapshot; selected: boolean; onSelect: (id: string) => void }) {
  const counts = countSavedCourses(record);
  const pending = [counts["in-progress"] ? `수강 중 ${counts["in-progress"]}과목` : "", counts.planned ? `계획 ${counts.planned}과목` : ""].filter(Boolean).join(" · ");
  return <li><button type="button" data-record-item={record.id} aria-current={selected ? "page" : undefined} onClick={() => onSelect(record.id)}>
    <span><span className="saved-records__list-meta"><time dateTime={record.createdAt}>{savedDate(record.createdAt, true)}</time>
      <small className="saved-records__kind">{record.trackPlan ? "트랙 공동 계획" : record.graduationPlan ? "진단 + 학기 계획" : "진단 기록"}</small></span>
      <strong>{recordTrackName(record) ?? pathLabels[record.profile.studyPath]}</strong>
      <small className="saved-records__list-summary">완료 {counts.completed}과목 · 전공 {record.result.totalMajorProgress.completedCredits}학점</small>
      {pending && <small>{pending}</small>}
    </span><ChevronRight size={19} aria-hidden="true" />
  </button></li>;
}

/** Keep facts mounted for print; disclosure state never changes the saved record. */
function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <section className="saved-records__disclosure">
    <button type="button" data-record-disclosure aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      <strong>{title}</strong><ChevronDown size={18} aria-hidden="true" />
    </button>
    <div id={id} className="saved-records__disclosure-content" data-record-disclosure-content data-collapsed={!expanded}>{children}</div>
  </section>;
}

function ReviewItems({ items }: { items: readonly ReviewItem[] }) {
  return items.length ? <ul className="saved-records__notes">{items.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul> : <p>이 기록에는 별도로 저장된 확인 사항이 없습니다.</p>;
}

function PlanTerms({ plan, extra = false }: { plan: GraduationPlanResult; extra?: boolean }) {
  const placements = extra ? plan.extraTermPlacements : plan.placements;
  const regularEnd = plan.preferences.targetGraduationTerm;
  const allocations = plan.electiveAllocations.filter((item) => extra ? item.termId > regularEnd : item.termId <= regularEnd);
  const termIds = [...new Set([...placements.map((item) => item.termId), ...allocations.map((item) => item.termId)])].sort();
  if (!termIds.length) return <p className="saved-records__muted">{extra ? "추가 학기로 배치된 과목이 없습니다." : "정규학기에 배치된 과목이 없습니다."}</p>;
  const origins: Record<PlannedCoursePlacement["origin"], string> = { "in-progress": "수강 중", "user-planned": "직접 지정", generated: "참고 배치" };
  return <div className="saved-records__terms">{termIds.map((termId) => {
    const items = placements.filter((item) => item.termId === termId);
    const reservation = allocations.filter((item) => item.termId === termId);
    return <section className={extra ? "saved-records__term is-extra" : "saved-records__term"} key={termId} data-record-term={extra ? undefined : termId} data-record-extra-term={extra ? termId : undefined}>
      <header><span>{extra ? "추가 검토 학기" : "정규학기"}</span><h4>{termId}</h4></header>
      <ul>{items.map((item, index) => <li key={`${item.courseId}-${index}`}><strong><CourseName id={item.courseId} /></strong><small>{origins[item.origin]} · {item.offeringEvidence === "historical-2026-snapshot" ? "2026 개설 이력 참고" : "개설 확인 필요"}</small></li>)}
      {reservation.map((item, index) => <li key={`reservation-${index}`} className="saved-records__reservation"><strong>과목 미정 · 학점 예약</strong><span>{item.credits}학점 · {item.slots}자리</span></li>)}</ul>
    </section>;
  })}</div>;
}

function StoredPlan({ plan }: { plan: GraduationPlanResult }) {
  return <section className="saved-records__plan" aria-labelledby="saved-plan-title">
    <header className="saved-records__section-heading"><CalendarDays size={21} aria-hidden="true" /><h3 id="saved-plan-title">함께 저장한 학기 계획</h3></header>
    <p className="saved-records__plan-status">{planStatusLabels[plan.status]}</p>
    <p className="saved-records__muted">{plan.preferences.currentTerm}부터 {plan.preferences.targetGraduationTerm}까지 · 학기당 전공 {plan.preferences.maxMajorCoursesPerTerm}과목 · 계절학기 {plan.preferences.considerSeasonalTerm ? "검토 포함" : "검토 제외"}</p>
    <PlanTerms plan={plan} />
    {(plan.extraTermPlacements.length > 0 || plan.neededExtraTerms > 0 || plan.electiveAllocations.some((item) => item.termId > plan.preferences.targetGraduationTerm)) && <div className="saved-records__extra"><h4>추가 학기 검토 · {plan.neededExtraTerms}학기</h4><PlanTerms plan={plan} extra /></div>}
    <Disclosure title="계획의 남은 조건과 배치 근거">
      <dl className="saved-records__facts">
        <div><dt>계획 생성일</dt><dd>{savedDate(plan.generatedAt, true)}</dd></div>
        <div><dt>과목을 정해야 할 학점</dt><dd>{plan.unallocatedElectiveCredits}학점 · {plan.unallocatedElectiveSlots}자리</dd></div>
        <div><dt>배치하지 못한 학점</dt><dd>{plan.unplacedElectiveCredits}학점 · {plan.unplacedElectiveSlots}자리</dd></div>
        {plan.recommendedMaxMajorCoursesPerTerm !== undefined && <div><dt>조정 검토 과목 수</dt><dd>학기당 {plan.recommendedMaxMajorCoursesPerTerm}과목</dd></div>}
      </dl>
      <p className="saved-records__muted">과목을 정해야 할 학점에는 아직 학기에 배치하지 못한 학점도 포함됩니다. 두 수치를 더하지 않습니다.</p>
      <h4>배치하지 못한 과목 · {plan.unplacedCourses.length}개</h4>
      {plan.unplacedCourses.length ? <ul className="saved-records__course-list">{plan.unplacedCourses.map((item, index) => <li key={`${item.courseId}-${index}`}><strong><CourseName id={item.courseId} /></strong><span>{item.message}</span></li>)}</ul> : <p>이 기록에 미배치 과목은 없습니다.</p>}
      <h4>저장 당시 계획 확인 사항</h4><ReviewItems items={plan.reviewItems} />
    </Disclosure>
  </section>;
}

function StoredTrackCompletion({value}:{value:TrackCompletionScenario}) {
  return <section className="saved-track-completion" aria-label="보관한 트랙 모듈 결과"><h3>저장 당시 트랙 모듈 현황</h3><p>겹치는 과목을 뺀 남은 수강: <strong>{value.unionRemainingCourseCount}과목 · {value.unionRemainingCredits}학점</strong></p><ul>{value.trackResults.map(track=><li key={track.trackId}><strong>{track.trackName}</strong><span>{track.creditedCredits} / {track.requiredCredits}학점 · {track.satisfied?"모듈 조건 충족":`${track.remainingCourseCount}과목 보완`}</span></li>)}</ul></section>;
}

function StoredTrackPlan({plan}:{plan:TrackSemesterPlan}) {
  const terms=[...new Set(plan.placements.map(item=>item.term))].sort();
  return <section className="saved-records__plan" aria-label="보관한 트랙 공동 학기 계획"><header className="saved-records__section-heading"><CalendarDays size={21} aria-hidden="true"/><h3>함께 저장한 트랙 공동 계획</h3></header><p>{plan.preferences.currentTerm} 기준 · 목표 {plan.preferences.targetGraduationTerm} · 학기당 {plan.preferences.maxMajorCoursesPerTerm}과목</p><div className="saved-records__terms">{terms.map(term=><section className="saved-records__term" key={term}><header><h4>{term}</h4></header><ul>{plan.placements.filter(item=>item.term===term).map(item=><li key={item.courseId}><strong><CourseName id={item.courseId}/></strong><small>{item.trackIds.map(id=>tracks.find(t=>t.id===id)?.name??id).join(" · ")}</small></li>)}</ul></section>)}</div>{plan.unplaced.length>0&&<Disclosure title={`배치하지 못한 과목 · ${plan.unplaced.length}개`}><ul className="saved-records__course-list">{plan.unplaced.map(item=><li key={item.courseId}><strong><CourseName id={item.courseId}/></strong><span>{item.message}</span></li>)}</ul></Disclosure>}<p className="saved-records__muted">저장된 계획을 그대로 보여줍니다. 전공 전체 졸업 계획과는 별도예요.</p></section>;
}

function RecordDetail({ record, onPrint, onOpenCurrent, onBackToList }: { record: DiagnosisSnapshot; onPrint: () => void; onOpenCurrent: () => void; onBackToList: () => void }) {
  const track = recordTrackName(record);
  const counts = countSavedCourses(record);
  const required = record.result.requiredProgress;
  const trackProgress = record.result.trackProgress;
  const context=getMajorContext(record.profile);
  return <article className="saved-records__detail" data-record-detail>
    <button type="button" className="saved-records__button is-link saved-records__mobile-back" data-record-back-top onClick={onBackToList}><ArrowLeft size={17} aria-hidden="true" />기록 목록으로</button>
    <header className="saved-records__detail-header"><div><span className="saved-records__eyebrow">저장 기록 · 읽기 전용</span><h2>{track ?? context.label} {record.trackPlan ? "공동 계획" : record.graduationPlan ? "학기 계획" : "진단"}</h2><p>{record.profile.majorRole ? context.label : pathLabels[record.profile.studyPath]} · <time dateTime={record.createdAt}>{savedDate(record.createdAt, true)}</time></p></div>
      <button type="button" className="saved-records__button is-utility" data-record-print onClick={onPrint}><Printer size={18} aria-hidden="true" />저장 기록 인쇄</button>
    </header>
    {record.trackCompletion ? <StoredTrackCompletion value={record.trackCompletion}/> : null}
    {context.academicRequirementsConfirmed ? <div className="saved-records__summary"><div data-record-total><GraduationCap size={23} aria-hidden="true" /><span>전체 전공학점<strong>{record.result.totalMajorProgress.completedCredits} / {record.result.totalMajorProgress.requiredCredits}학점</strong></span></div><div><CheckCheck size={22} aria-hidden="true" /><span>저장 당시 입력 기준<strong>{savedResultLabels[record.result.status]}</strong></span></div></div> : <p className="saved-records__muted">저장 당시 전공 이수 형태가 미정이라 전체 전공학점 기준은 표시하지 않아요.</p>}
    <div className="saved-records__status-counts" aria-label="저장된 과목 상태">{(Object.keys(counts) as Array<keyof typeof counts>).map((status) => <span key={status} data-record-status={status}>{courseStatusLabels[status]} <strong>{counts[status]}과목</strong></span>)}</div>
    <dl className="saved-records__facts saved-records__profile"><div><dt>소속</dt><dd>{record.profile.affiliation === "department-student" ? "식품자원경제학과 학생" : "타 학과 학생"}</dd></div><div><dt>전공 구분</dt><dd>{context.label}</dd></div><div><dt>목표 트랙</dt><dd>{track ?? "미선택"}</dd></div>{record.profile.entryYear && <div><dt>입학 연도</dt><dd>{record.profile.entryYear}년</dd></div>}</dl>
    {context.academicRequirementsConfirmed && !record.trackCompletion && <div className="saved-records__requirements"><div data-record-required><span>필수과목</span><strong>{required === "not-applicable" ? "별도 필수 조건 없음" : `${required.completedCredits} / ${required.requiredCredits}학점`}</strong></div><div data-record-track><span>트랙 조건</span><strong>{trackProgress === "not-applicable" ? "트랙 조건 적용 없음" : `${trackProgress.completionRate}% · ${trackProgress.passed ? "참고 계산상 충족" : "보완 필요"}`}</strong></div></div>}
    {record.trackPlan ? <StoredTrackPlan plan={record.trackPlan}/> : record.graduationPlan ? <StoredPlan plan={record.graduationPlan} /> : <p className="saved-records__plan-empty"><FileClock size={20} aria-hidden="true" />이 기록에는 진단 결과만 저장되어 있습니다. 학기 계획은 포함되어 있지 않습니다.</p>}
    <Disclosure title={`저장한 과목과 추가 전공학점 · ${record.courseSelections.length}과목`}>
      {record.courseSelections.length ? <ul className="saved-records__course-list">{record.courseSelections.map((item, index) => <li key={`${item.courseId}-${index}`}><strong><CourseName id={item.courseId} /></strong><span>{courseStatusLabels[item.status]}{item.status === "planned" && item.plannedTerm ? ` · ${plannedTermLabels[item.plannedTerm]}` : ""}</span></li>)}</ul> : <p>선택한 과목 없이 저장한 기록입니다.</p>}
      <h4>추가 전공학점 · {record.additionalMajorCredits.length}건</h4>
      <p className="saved-records__muted">추가 전공학점은 모듈 과목과 별도로 저장된 항목입니다.</p>
      {record.additionalMajorCredits.length ? <ul className="saved-records__course-list">{record.additionalMajorCredits.map((item, index) => <li key={`${item.id}-${index}`}><strong>{item.label} · {item.credits}학점</strong><span>{item.status === "officially-verified" ? "공식 확인으로 저장됨" : "학생 입력 · 인정 여부 확인 필요"}</span>{item.note && <small>{item.note}</small>}</li>)}</ul> : <p>별도로 입력한 전공학점이 없습니다.</p>}
    </Disclosure>
    {context.academicRequirementsConfirmed && <Disclosure title="저장 당시 이수 조건과 확인 사항">
      <h4>필수과목 조건</h4>{required === "not-applicable" ? <p>이 기록에는 별도 필수 조건이 적용되지 않았습니다.</p> : <><p>완료 {required.completedCredits}학점 · 부족 {required.missingCredits}학점</p><ul className="saved-records__course-list">{required.missingCourseIds.map((id, index) => <li key={`${id}-${index}`}><CourseName id={id} /><span>보완할 필수과목</span></li>)}</ul></>}
      <h4>트랙 모듈별 조건</h4>{trackProgress === "not-applicable" ? <p>이 기록에는 트랙 조건이 적용되지 않았습니다.</p> : <><p>저장된 트랙 관련 학점: {trackProgress.trackCredits}학점</p><ul className="saved-records__course-list">{trackProgress.moduleProgress.map((module, index) => <li key={`${module.moduleId}-${index}`}><strong>{module.label}</strong><span>{module.completedCredits} / {module.requiredCredits}학점 · 부족 {module.missingCredits}학점</span></li>)}</ul></>}
      <h4>저장 당시 확인 사항</h4><ReviewItems items={record.result.reviewItems} />
      <h4>계산 기준 기록</h4><code className="saved-records__rule-version">{record.ruleVersion}</code><p className="saved-records__muted">이 기록에는 원문 파일 정보가 포함되어 있지 않습니다. 현재 자료로 다시 계산하거나 새 PDF를 소급 적용하지 않았습니다.</p>
    </Disclosure>}
    <p className="saved-records__notice"><Info size={18} aria-hidden="true" />실제 개설과 인정 여부는 학과 확인이 필요합니다.</p>
    <footer className="saved-records__actions"><button type="button" className="saved-records__button is-primary" data-record-current onClick={onOpenCurrent}>현재 입력으로 돌아가기<ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="saved-records__button is-link" data-record-back onClick={onBackToList}><ArrowLeft size={17} aria-hidden="true" />기록 목록으로</button></footer>
  </article>;
}

export function SavedRecordsView({ snapshots, recordId, headingRef, saveUnavailable = false, onOpenRecord, onBackToList, onOpenCurrent, onPrint }: {
  snapshots: readonly DiagnosisSnapshot[];
  recordId?: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  saveUnavailable?: boolean;
  onOpenRecord: (id: string) => void;
  onBackToList: () => void;
  onOpenCurrent: () => void;
  onPrint: () => void;
}) {
  const records = [...snapshots].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
  const selected = records.find((record) => record.id === recordId);
  return <main className="saved-records" data-has-record-id={Boolean(recordId)} aria-labelledby="saved-records-title">
    <header className="saved-records__header"><h1 id="saved-records-title" ref={headingRef} tabIndex={-1}><Archive size={27} aria-hidden="true" />저장한 진단과 계획</h1><p>저장 당시의 입력과 결과를 확인하세요. 현재 입력은 바뀌지 않습니다.</p><details className="saved-records__storage-details"><summary>보관 범위와 저장 안내</summary><p className="saved-records__storage-note">최근 12개 기록을 이 브라우저에 보관합니다. 다른 기기와 동기화되지 않으며 브라우저 데이터를 지우면 사라집니다.</p></details></header>
    {records.length === 0 && (!recordId || saveUnavailable) ? <section className="saved-records__empty">{saveUnavailable ? <Info size={38} aria-hidden="true" /> : <Archive size={38} aria-hidden="true" />}<h2>{saveUnavailable ? "저장 기록을 불러올 수 없어요" : "아직 따로 보관한 기록이 없어요"}</h2><p>{saveUnavailable ? "브라우저 저장이 차단되어 있을 수 있습니다. 설정을 확인하거나 현재 입력으로 돌아가세요." : "과목 입력은 자동으로 저장됩니다. 진단 결과나 학기 계획에서 보관한 기록이 여기에 모입니다."}</p><button type="button" className="saved-records__button is-primary" data-record-current onClick={onOpenCurrent}>현재 입력으로 돌아가기<ArrowRight size={18} aria-hidden="true" /></button></section> : <div className="saved-records__frame">
      <nav className="saved-records__list" aria-label="저장 기록 목록"><header><h2>저장 기록 목록</h2><span>{records.length}개</span></header><ol>{records.map((record) => <RecordListItem key={record.id} record={record} selected={record.id === recordId} onSelect={onOpenRecord} />)}</ol></nav>
      {selected ? <RecordDetail key={selected.id} record={selected} onPrint={onPrint} onOpenCurrent={onOpenCurrent} onBackToList={onBackToList} /> : <section className="saved-records__placeholder"><FileClock size={38} aria-hidden="true" /><h2>{recordId ? "이 기록을 찾을 수 없어요" : "기록을 선택해 주세요"}</h2><p>{recordId ? "현재 브라우저에 없는 기록이거나 주소가 바뀌었을 수 있어요. 보관된 목록에서 다시 선택해 주세요." : "날짜와 트랙을 보고 기록을 골라 주세요. 저장 당시의 과목과 결과를 함께 볼 수 있습니다."}</p>{recordId && <button type="button" className="saved-records__button is-primary" data-record-back onClick={onBackToList}>기록 목록으로<ArrowRight size={18} aria-hidden="true" /></button>}{!recordId && <button type="button" className="saved-records__button is-link" data-record-current onClick={onOpenCurrent}>현재 입력으로 돌아가기<ArrowRight size={18} aria-hidden="true" /></button>}</section>}
    </div>}
  </main>;
}
