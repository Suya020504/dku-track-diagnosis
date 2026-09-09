import { useMemo, useState, type RefObject } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Compass, GraduationCap, Info, LayoutGrid, Plus, Printer, SlidersHorizontal } from "lucide-react";
import { courses, tracks } from "../../data/curriculumData";
import { TrackGlyph } from "../../components/TrackGlyph";
import { calculateTrackCompletion, type TrackCompletionCandidate } from "../../lib/trackCompletion";
import { getTrackCourseChoices } from "../../lib/trackCourseChoices";
import { getMajorContext } from "../../lib/majorContext";
import type { CourseSelectionRecord, PathProgressResult, StudentProfile, TrackId } from "../../types";
import { AcademicMajorRequirements } from "./AcademicMajorRequirements";
import { PathProgressSummary } from "./PathProgressSummary";
import "./track-completion-results.css";

const courseMap = new Map(courses.map(c => [c.id, c]));
const trackName = (id: TrackId) => tracks.find(t => t.id === id)?.name ?? id;
const stripModule = (label: string) => label.replace(/^[A-Z]\.?\s*/, "");

function TrackProgress({ candidate, preview }: { candidate: TrackCompletionCandidate; preview: boolean }) {
  return <section className="track-result-progress" aria-label={`${candidate.trackName} 모듈 이수 현황`}>
    <header><h3><TrackGlyph trackId={candidate.trackId} decorative />{candidate.trackName}</h3></header>
    <div className="track-result-meter"><progress max={candidate.requiredCredits} value={candidate.creditedCredits} aria-label={`${candidate.trackName} ${preview ? "예상 " : ""}모듈 학점 ${candidate.creditedCredits} / ${candidate.requiredCredits}`} /><strong data-completion-rate={candidate.trackId}>{candidate.completionRate}%</strong></div>
    <dl className="track-result-facts"><div><dt><span className="track-result-dot" />{preview ? "예상 모듈 학점" : "반영된 모듈 학점"}</dt><dd>{candidate.creditedCredits} / {candidate.requiredCredits}학점</dd></div><div><dt><span className="track-result-dot track-result-dot-remaining" />남은 추천 조합</dt><dd>{candidate.remainingCourseCount}과목 · {candidate.remainingCredits}학점</dd></div></dl>
    <details><summary>{candidate.satisfied ? "채운 모듈 확인" : "남은 모듈 확인"}<ChevronDown size={17} aria-hidden="true" /></summary>
      <ul>{candidate.moduleProgress.map(module => <li key={module.key}><span>{stripModule(module.label)}{module.isSubconstraint ? " · 세부 조건" : ""}</span><strong>{Math.min(module.completedCredits, module.requiredCredits)} / {module.requiredCredits}</strong></li>)}</ul>
    </details>
  </section>;
}

export type TrackCompletionResultsProps = {
  selectedTrackIds: readonly TrackId[];
  courseSelections: readonly CourseSelectionRecord[];
  profile: StudentProfile;
  pathProgress?: PathProgressResult;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onEditTracks: () => void;
  onAddTrack: (trackId: TrackId) => void;
  onPlanCourse: (courseId: string) => void;
  onOpenPlan: () => void;
  onSaveDiagnosis: () => void;
  onOpenApplication: () => void;
  onEditProfile: () => void;
  onEditCourses?: () => void;
  onPrint?: () => void;
  saveStatus?: string;
};

export function TrackCompletionResults(props: TrackCompletionResultsProps) {
  const { selectedTrackIds, courseSelections, profile, pathProgress, headingRef } = props;
  const [preview, setPreview] = useState(false);
  const [discovery, setDiscovery] = useState<TrackId>();
  const computation = useMemo(() => calculateTrackCompletion({ selectedTrackIds, courseSelections, includeInProgress: true }), [selectedTrackIds, courseSelections]);
  const current = computation.completed;
  const shown = preview ? computation.inProgressPreview ?? current : current;
  const courseChoices = useMemo(() => new Map(getTrackCourseChoices(shown).map(choice => [choice.courseId, choice])), [shown]);
  const inProgressCount = courseSelections.filter(c => c.status === "in-progress").length;
  const context = getMajorContext(profile);
  const suggestion = shown.discoveryCandidates[0];
  const extra = shown.discoveryCandidates.find(c => c.trackId === discovery);

  return <main className="track-completion-page" aria-labelledby="track-completion-title">
    <div className="track-completion-columns">
    <section className="track-completion-report" aria-labelledby="track-completion-title">
    <header className="track-completion-heading">
      {computation.selectedTrackIds.length > 0 && <div className="track-completion-status"><span><Check size={21} strokeWidth={2.5} aria-hidden="true" /></span>진단 완료</div>}
      <h1 id="track-completion-title" ref={headingRef} tabIndex={-1}>{computation.selectedTrackIds.length ? "내 트랙의 남은 수업을 확인하세요." : "확인할 트랙을 골라 주세요"}</h1>
      {computation.selectedTrackIds.length > 0 && <p className="track-completion-intro">진단을 마쳤어요. 입력한 수강 이력을 바탕으로, 선택한 트랙의 모듈 이수에 필요한 과목을 안내해요.</p>}
      <div className="track-completion-selected" aria-label="선택한 트랙">{computation.selectedTrackIds.map(id => <span key={id}><TrackGlyph trackId={id} decorative />{trackName(id)}</span>)}
      <details className="track-completion-edit"><summary><SlidersHorizontal size={16} aria-hidden="true" />입력 수정<ChevronDown size={16} aria-hidden="true" /></summary><div>
        <button type="button" onClick={props.onEditTracks}>트랙 변경</button>
        {props.onEditCourses && <button type="button" onClick={props.onEditCourses}>이수 과목 수정</button>}
        <button type="button" onClick={props.onEditProfile}>내 정보 수정</button>
      </div></details></div>
    </header>
    <section className="track-completion-total" aria-label="겹치는 과목을 뺀 트랙 모듈 수강 목록">
      <div className="track-completion-summary-part"><span className="track-completion-summary-icon"><ClipboardCheck size={29} strokeWidth={1.6} aria-hidden="true" /></span><div><h2>{preview ? "수강 중 과목을 통과했을 때" : "추천 조합 기준"}</h2><p>선택한 트랙의 모듈을 이수할 수 있도록,<br />지금까지의 수강 이력을 반영했어요.</p></div></div>
      <div className="track-completion-summary-part"><span className="track-completion-summary-icon"><BookOpen size={29} strokeWidth={1.6} aria-hidden="true" /></span><div><strong>{shown.unionRemainingCourseCount}과목 · {shown.unionRemainingCredits}학점 남음</strong><p>겹치는 과목은 한 번만 계산했어요.</p></div></div>
    </section>
      <section className="track-completion-courses" aria-labelledby="track-next-courses-title"><header><h2 id="track-next-courses-title">모듈 조건을 채우는 추천 조합</h2><p>아래 목록은 가능한 조합 중 하나예요. 모두 필수로 들어야 한다는 뜻은 아니에요. 다른 과목으로 바꿀 수 있는지도 함께 확인할 수 있어요.</p></header>
        {shown.unionRemainingCourseCount ? <div className="track-completion-table-scroll" role="region" aria-label="남은 과목 표" tabIndex={0}><table role="table"><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">과목명</th><th role="columnheader" scope="col">학점</th><th role="columnheader" scope="col">함께 채우는 트랙</th><th role="columnheader" scope="col">대체 과목 정보</th></tr></thead><tbody role="rowgroup">
          {shown.suggestedCourses.map(item => {
            const course = courseMap.get(item.courseId);
            const choice = courseChoices.get(item.courseId);
            return <tr role="row" key={item.courseId} data-track-course={item.courseId}><th role="rowheader" scope="row"><span>{course?.name ?? item.courseId}</span><small>{item.moduleId} 모듈</small>
              {course?.required && <small className="track-course-required-note">모듈 내 필수 표식 있음 · 별도 확인</small>}
            </th><td role="cell" className="track-course-credits">{item.credits}학점</td><td role="cell" className="track-course-tracks"><div className="track-course-coverage">{item.selectedTrackIds.map(id => <span key={id} data-coverage-track={id}>{trackName(id)}</span>)}</div></td><td role="cell" className="track-course-choice-cell">
              {choice?.alternativeCourseIds.length ? <details className="track-course-alternatives" data-course-alternatives={item.courseId}>
                <summary aria-label={`${course?.name ?? item.courseId} 대체 후보 ${choice.alternativeCourseIds.length}개 보기`}>대체 후보 {choice.alternativeCourseIds.length}개 보기<ChevronDown size={14} aria-hidden="true" /></summary>
                <p>다른 추천 과목은 유지하고 이 과목 하나만 바꿀 때, 선택한 모든 트랙의 모듈 학점을 채우는 후보예요.</p>
                <ul>{choice.alternativeCourseIds.map(id => <li key={id}><span>{courseMap.get(id)?.name ?? id}</span><small>{courseMap.get(id)?.credits}학점</small></li>)}</ul>
                {course?.required && <p>모듈 내 필수 과목의 대체 인정 여부는 별도 확인이 필요해요.</p>}
                <p>조회용 목록이에요. 여러 과목을 동시에 바꾸면 조건이 달라질 수 있으며, 목록을 열어도 계획은 바뀌지 않아요.</p>
              </details> : <small className="track-course-choice-status">{choice?.checked ? "현재 조합에서 한 과목 대체 후보 없음" : "대체 가능 여부 확인 필요"}</small>}
            </td></tr>;
          })}
        </tbody></table></div> : <div className="track-completion-empty"><Check size={30} aria-hidden="true" /><h3>{shown.trackResults.length ? "선택한 트랙의 모듈 조건을 채웠어요" : "확인할 트랙을 골라 주세요"}</h3><p>{shown.trackResults.length ? "전공 전체의 이수 조건은 아래에서 따로 확인할 수 있어요." : "여러 트랙을 함께 고를 수 있어요."}</p>{!shown.trackResults.length && <button type="button" onClick={props.onEditTracks}>트랙 선택하기<ArrowRight size={17} aria-hidden="true" /></button>}</div>}
        {!shown.canCompleteWithKnownCourses && <p role="status">현재 교육과정에서 조합을 찾지 못한 조건이 있어요. 남은 모듈을 확인해 주세요.</p>}
      </section>
      <div className="track-course-choice-guide"><Info size={17} aria-hidden="true" /><p>모듈 내 필수 과목과 학번별 전공필수는 아래 ‘전공 전체 학점과 학번별 조건’에서 함께 확인하세요.</p></div>
      <details className="track-completion-academic"><summary><GraduationCap size={19} aria-hidden="true" /><span>전공 전체 학점과 학번별 조건</span><ChevronDown size={17} aria-hidden="true" /></summary><div>
        <p>트랙 모듈 이수와 전공 전체의 이수 조건은 따로 확인해요.</p>
        {pathProgress && context.academicRequirementsConfirmed ? <PathProgressSummary profile={profile} result={pathProgress} /> : <div className="track-completion-context"><p>전공 전체 학점을 확인하려면 {context.majorRole === "primary" ? "다른 전공을 함께 이수하는지" : "복수전공·부전공 구분을"} 알려주세요.</p><button type="button" onClick={props.onEditProfile}>내 정보 확인하기<ArrowRight size={17} aria-hidden="true" /></button></div>}
        <AcademicMajorRequirements profile={profile} courseSelections={courseSelections} />
      </div></details>
      {computation.selectedTrackIds.length > 0 && <div className="track-completion-record-tools"><div className="track-completion-storage-note"><CheckCircle2 size={21} aria-hidden="true" /><div><strong>현재 입력은 자동 저장돼요.</strong><p>입력 자동 저장과 별도로, 지금의 진단 결과를 기록으로 남길 수 있어요.</p></div></div><div className="track-completion-record-actions"><button type="button" data-primary-result-action className="track-completion-save" onClick={props.onSaveDiagnosis}>진단 보관하기<ArrowRight size={18} aria-hidden="true" /></button><button type="button" className="track-completion-print" onClick={props.onPrint ?? (() => window.print())}>결과 인쇄<Printer size={18} aria-hidden="true" /></button></div>{props.saveStatus && <p className="track-completion-save-status" role="status">{props.saveStatus}</p>}</div>}
    </section>
      <aside className="track-completion-side" aria-labelledby="track-modules-title"><h2 id="track-modules-title">트랙별 이수 현황</h2><p className="track-completion-side-intro">선택한 {shown.trackResults.length}개 트랙의 이수 현황을 한눈에 확인하세요.</p>
        {inProgressCount > 0 && <label className="track-completion-preview"><input type="checkbox" aria-label="수강 중 과목까지 미리보기" checked={preview} onChange={e => setPreview(e.target.checked)} /><span>수강 중 과목까지 미리보기 · {inProgressCount}과목</span></label>}
        {preview && <p className="track-completion-preview-note">수강 중 과목을 통과했을 때의 예상이에요. 현재 이수 완료 기록은 바뀌지 않아요.</p>}
        {shown.trackResults.map(candidate => <TrackProgress key={candidate.trackId} candidate={candidate} preview={preview} />)}
        <div className="track-completion-side-note"><Info size={22} aria-hidden="true" /><div><h3>안내 사항</h3><p>{preview ? "수강 중 과목을 통과한다고 가정한 예상 현황이에요." : "이수 현황은 지금까지 입력한 완료 과목을 기준으로 계산했어요."} 모듈마다 인정 학점이 달라 전체 이수 학점과는 다를 수 있어요.</p></div></div>
      </aside>
    </div>
    <footer className="track-completion-footer"><details className="track-completion-extra-tools"><summary><span className="track-completion-tools-icon"><LayoutGrid size={24} aria-hidden="true" /></span><span className="track-completion-tools-title"><strong>필요할 때 더 해보기</strong><small>수강 계획, 다른 트랙 탐색, 신청 안내를 이용할 수 있어요.</small></span><span className="track-completion-tools-preview" aria-hidden="true"><span><CalendarDays size={20} />수강 계획</span><span><Compass size={20} />다른 트랙 탐색</span><span><ClipboardCheck size={20} />신청 안내</span></span><ChevronDown size={18} aria-hidden="true" /></summary><div className="track-completion-tools-content">
      <p>{computation.selectedTrackIds.length ? "진단은 완료됐어요. 추가 기능은 필요할 때 이용하세요." : "트랙을 선택해 진단한 뒤, 필요한 추가 도구를 이용할 수 있어요."}</p>
      <div className="track-completion-tool-actions"><button type="button" data-open-track-plan onClick={props.onOpenPlan}><CalendarDays size={18} aria-hidden="true" />학기별 수강 계획 만들기</button><button type="button" onClick={props.onOpenApplication}>신청 안내 보기<ArrowRight size={17} aria-hidden="true" /></button></div>
    {suggestion && <details className="track-completion-discovery"><summary><BookOpen size={20} aria-hidden="true" /><span>다른 트랙도 함께 확인하기</span><ChevronDown size={18} aria-hidden="true" /></summary><div className="track-discovery-content"><p>선택 트랙의 과목 조합을 마친 뒤 추가되는 이수를 비교해요.</p>
      <div className="track-discovery-choice"><TrackGlyph trackId={suggestion.trackId} decorative /><div><strong>{suggestion.trackName}</strong><span>{suggestion.satisfied ? "현재 이력으로 모듈 조건을 채웠어요" : `선택한 조합에 ${suggestion.additionalCourseCount}과목 · ${suggestion.additionalCredits}학점 추가`}</span></div><button type="button" onClick={() => setDiscovery(discovery === suggestion.trackId ? undefined : suggestion.trackId)} aria-expanded={discovery === suggestion.trackId}>추가 부담 비교<ArrowRight size={17} aria-hidden="true" /></button></div>
      {extra && <div className="track-discovery-detail"><h3>{extra.trackName}을 함께 선택하면</h3><ul>{extra.additionalCourseIds.map(id => <li key={id}>{courseMap.get(id)?.name ?? id} <span>{courseMap.get(id)?.credits}학점</span></li>)}</ul>{!extra.additionalCourseIds.length && <p>지금 제안한 수강 조합에 추가할 과목이 없어요.</p>}<button type="button" onClick={() => { props.onAddTrack(extra.trackId); setDiscovery(undefined); }}>이 트랙도 함께 확인하기<Plus size={17} aria-hidden="true" /></button></div>}
    </div></details>}
    </div></details></footer>
  </main>;
}
