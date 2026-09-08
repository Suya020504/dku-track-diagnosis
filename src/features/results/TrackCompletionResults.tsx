import { useMemo, useState, type RefObject } from "react";
import { ArrowRight, Bookmark, BookOpen, CalendarDays, Check, ChevronDown, GraduationCap, Layers, Plus, Printer, SlidersHorizontal } from "lucide-react";
import { courses, tracks } from "../../data/curriculumData";
import { TrackGlyph } from "../../components/TrackGlyph";
import { calculateTrackCompletion, type TrackCompletionCandidate } from "../../lib/trackCompletion";
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
    <header><h3><TrackGlyph trackId={candidate.trackId} decorative />{candidate.trackName}</h3><span>{candidate.creditedCredits} / {candidate.requiredCredits}학점</span></header>
    <progress max={candidate.requiredCredits} value={candidate.creditedCredits} aria-label={`${candidate.trackName} ${preview ? "예상 " : ""}모듈 학점 ${candidate.creditedCredits} / ${candidate.requiredCredits}`} />
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
  const inProgressCount = courseSelections.filter(c => c.status === "in-progress").length;
  const context = getMajorContext(profile);
  const suggestion = shown.discoveryCandidates[0];
  const extra = shown.discoveryCandidates.find(c => c.trackId === discovery);
  const isPlanned = (id: string) => courseSelections.some(c => c.courseId === id && (c.status === "planned" || c.status === "in-progress"));

  return <main className="track-completion-page" aria-labelledby="track-completion-title">
    <header className="track-completion-heading"><h1 id="track-completion-title" ref={headingRef} tabIndex={-1}>선택한 트랙, 남은 수업을 확인하세요</h1>
      <div className="track-completion-selected" aria-label="선택한 트랙">{computation.selectedTrackIds.map(id => <span key={id}><TrackGlyph trackId={id} decorative />{trackName(id)}</span>)}
      <button type="button" onClick={props.onEditTracks}><SlidersHorizontal size={17} aria-hidden="true" />트랙 변경</button>{props.onEditCourses&&<button type="button" onClick={props.onEditCourses}>이수 과목 수정<ArrowRight size={17} aria-hidden="true"/></button>}</div>
    </header>
    <section className="track-completion-total" aria-label="겹치는 과목을 뺀 트랙 모듈 수강 목록">
      <BookOpen size={30} aria-hidden="true" /><div><span>{preview ? "수강 중 과목을 통과했을 때" : "함께 이수할 과목"}</span><strong>{shown.unionRemainingCourseCount}과목 <span>·</span> {shown.unionRemainingCredits}학점</strong></div>
      <p>선택 트랙의 모듈 조건 기준 · 중복 과목 제외</p>
      <button type="button" data-open-track-plan onClick={props.onOpenPlan}><CalendarDays size={20} aria-hidden="true" />이 과목으로 계획하기<ArrowRight size={18} aria-hidden="true" /></button>
    </section>
    <div className="track-completion-columns">
      <section className="track-completion-courses" aria-labelledby="track-next-courses-title"><header><h2 id="track-next-courses-title">앞으로 들을 과목</h2><p>필요한 모듈을 채우는 과목 조합이에요. 학기 계획에서 배치를 조정할 수 있어요.</p></header>
        {shown.unionRemainingCourseCount ? <div className="track-completion-table-scroll" role="region" aria-label="남은 과목 표" tabIndex={0}><table><thead><tr><th scope="col">과목명</th><th scope="col">학점</th><th scope="col">함께 채우는 트랙</th><th scope="col">계획</th></tr></thead><tbody>
          {shown.suggestedCourses.map(item => <tr key={item.courseId} data-track-course={item.courseId}><th scope="row"><span>{courseMap.get(item.courseId)?.name ?? item.courseId}</span><small>{item.moduleId} 모듈</small></th><td>{item.credits}학점</td><td><div className="track-course-coverage">{item.selectedTrackIds.map(id => <span key={id}>{trackName(id)}</span>)}</div></td><td>
            <button type="button" data-plan-course={item.courseId} disabled={isPlanned(item.courseId)} onClick={() => props.onPlanCourse(item.courseId)} aria-label={`${courseMap.get(item.courseId)?.name ?? item.courseId} ${isPlanned(item.courseId) ? "계획에 담김" : "계획에 담기"}`}>
              {isPlanned(item.courseId) ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{isPlanned(item.courseId) ? "담김" : "계획에 담기"}
            </button>
          </td></tr>)}
        </tbody></table></div> : <div className="track-completion-empty"><Check size={30} aria-hidden="true" /><h3>{shown.trackResults.length ? "선택한 트랙의 모듈 조건을 채웠어요" : "확인할 트랙을 골라 주세요"}</h3><p>{shown.trackResults.length ? "전공 전체의 이수 조건은 아래에서 따로 확인하고, 학과 신청 안내도 살펴보세요." : "여러 트랙을 함께 고를 수 있어요."}</p><button type="button" onClick={shown.trackResults.length ? props.onOpenApplication : props.onEditTracks}>{shown.trackResults.length ? "트랙 신청 안내 보기" : "트랙 선택하기"}<ArrowRight size={17} aria-hidden="true" /></button></div>}
        {!shown.canCompleteWithKnownCourses && <p role="status">현재 교육과정에서 조합을 찾지 못한 조건이 있어요. 남은 모듈을 확인해 주세요.</p>}
      </section>
      <aside className="track-completion-side" aria-labelledby="track-modules-title"><h2 id="track-modules-title">트랙별 이수 현황</h2><label className="track-completion-preview"><input type="checkbox" aria-label="수강 중 과목까지 미리보기" checked={preview} disabled={!inProgressCount} onChange={e => setPreview(e.target.checked)} /><span>{inProgressCount ? `수강 중 과목까지 미리보기 · ${inProgressCount}과목` : "수강 중인 과목이 없어요"}</span></label>
        {preview && <p className="track-completion-preview-note">수강 중 과목을 통과했을 때의 예상이에요. 현재 이수 완료 기록은 바뀌지 않아요.</p>}
        {shown.trackResults.map(candidate => <TrackProgress key={candidate.trackId} candidate={candidate} preview={preview} />)}
      </aside>
    </div>
    {suggestion && <section className="track-completion-discovery" aria-labelledby="track-discovery-title"><div><h2 id="track-discovery-title">함께 확인해 볼 트랙이 있어요</h2><p>선택 트랙의 과목 조합을 마친 뒤 추가되는 이수를 비교해요.</p></div>
      <div className="track-discovery-choice"><TrackGlyph trackId={suggestion.trackId} decorative /><div><strong>{suggestion.trackName}</strong><span>{suggestion.satisfied ? "현재 이력으로 모듈 조건을 채웠어요" : `선택한 조합에 ${suggestion.additionalCourseCount}과목 · ${suggestion.additionalCredits}학점 추가`}</span></div><button type="button" onClick={() => setDiscovery(discovery === suggestion.trackId ? undefined : suggestion.trackId)} aria-expanded={discovery === suggestion.trackId}>추가 부담 비교<ArrowRight size={17} aria-hidden="true" /></button></div>
      {extra && <div className="track-discovery-detail"><h3>{extra.trackName}을 함께 선택하면</h3><ul>{extra.additionalCourseIds.map(id => <li key={id}>{courseMap.get(id)?.name ?? id} <span>{courseMap.get(id)?.credits}학점</span></li>)}</ul>{!extra.additionalCourseIds.length && <p>지금 제안한 수강 조합에 추가할 과목이 없어요.</p>}<button type="button" onClick={() => { props.onAddTrack(extra.trackId); setDiscovery(undefined); }}>이 트랙도 함께 확인하기<Plus size={17} aria-hidden="true" /></button></div>}
    </section>}
    <details className="track-completion-academic"><summary><GraduationCap size={22} aria-hidden="true" /><span>전공 전체 학점과 학번별 조건</span><ChevronDown size={18} aria-hidden="true" /></summary><div>
      <p>트랙 모듈 이수와 전공 전체의 이수 조건은 따로 확인해요.</p>
      {pathProgress && context.academicRequirementsConfirmed ? <PathProgressSummary profile={profile} result={pathProgress} /> : <div className="track-completion-context"><p>전공 전체 학점을 확인하려면 {context.majorRole === "primary" ? "다른 전공을 함께 이수하는지" : "복수전공·부전공 구분을"} 알려주세요.</p><button type="button" onClick={props.onEditProfile}>내 정보 확인하기<ArrowRight size={17} aria-hidden="true" /></button></div>}
      <AcademicMajorRequirements profile={profile} courseSelections={courseSelections} />
    </div></details>
    <footer className="track-completion-footer"><span><Layers size={17} aria-hidden="true" />수강 계획은 이수 완료와 별도로 저장돼요.</span><div><button type="button" onClick={props.onPrint ?? (() => window.print())}><Printer size={18} aria-hidden="true" />결과 인쇄</button><button type="button" onClick={props.onSaveDiagnosis}><Bookmark size={18} aria-hidden="true" />진단 보관하기</button><button type="button" onClick={props.onOpenApplication}>신청 안내 보기<ArrowRight size={17} aria-hidden="true" /></button></div>{props.saveStatus && <p role="status">{props.saveStatus}</p>}</footer>
  </main>;
}
