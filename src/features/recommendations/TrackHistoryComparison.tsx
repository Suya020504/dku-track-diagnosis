import { useMemo, useState, type RefObject } from "react";
import { ArrowRight, BookOpenCheck, Check, Heart, Layers } from "lucide-react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { calculateTrackCompletion } from "../../lib/trackCompletion";
import type { CourseSelectionRecord, GraduationPlanPreferences, TrackId } from "../../types";
import { TrackTimelineComparison } from "./TrackTimelineComparison";
import "./track-history-comparison.css";

export type TrackHistoryComparisonProps = {
  courseSelections: readonly CourseSelectionRecord[];
  selectedTrackIds: readonly TrackId[];
  pendingSelectedTrackIds?: readonly TrackId[];
  onPendingChange?: (ids: TrackId[]) => void;
  onConfirmTracks: (ids: TrackId[]) => void;
  onOpenCourses: () => void;
  onOpenInterest: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  storageError?: boolean;
  initialPlanPreferences?: GraduationPlanPreferences;
};

export function TrackHistoryComparison({courseSelections,selectedTrackIds,pendingSelectedTrackIds,onPendingChange,onConfirmTracks,onOpenCourses,onOpenInterest,headingRef,storageError,initialPlanPreferences}:TrackHistoryComparisonProps) {
  const [localChoice,setLocalChoice]=useState<TrackId[]>([...selectedTrackIds]);
  const chosen=pendingSelectedTrackIds ?? localChoice;
  const result=useMemo(()=>calculateTrackCompletion({selectedTrackIds:chosen,courseSelections}),[chosen,courseSelections]);
  const completedCount=new Set(courseSelections.filter(c=>c.status==="completed").map(c=>c.courseId)).size;
  const change=(id:TrackId)=>{const next=chosen.includes(id)?chosen.filter(t=>t!==id):[...chosen,id];setLocalChoice(next);onPendingChange?.(next);};
  return <main className="track-history-page" aria-labelledby="track-history-title">
    <header><h1 id="track-history-title" ref={headingRef} tabIndex={-1}>들은 과목으로 트랙을 찾아보세요</h1><p>이미 채운 모듈과 앞으로 들을 수업을 비교해요. 여러 트랙을 함께 고를 수 있어요.</p></header>
    <div className="track-history-basis"><span><BookOpenCheck size={20} strokeWidth={1.8} aria-hidden="true" />이수 완료 <strong>{completedCount}과목</strong></span><button type="button" onClick={onOpenCourses}>이수 과목 수정<ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" /></button><button type="button" onClick={onOpenInterest}><Heart size={18} strokeWidth={1.8} aria-hidden="true" />관심으로도 찾아보기</button></div>
    {completedCount===0&&<p className="track-history-empty-note">아직 들은 과목이 없어도 괜찮아요. 트랙마다 앞으로 배울 과목을 먼저 비교해 보세요.</p>}
    <section aria-labelledby="track-history-list-title"><h2 id="track-history-list-title">추가 이수가 적은 트랙부터</h2><p className="track-history-scope">전공 전체 졸업학점이 아닌 트랙 모듈 조건을 비교합니다.</p>
      <div className="track-history-scroll" role="region" aria-label="다섯 트랙 이수 이력 비교표" tabIndex={0}><table><thead><tr><th scope="col">함께 선택</th><th scope="col">트랙</th><th scope="col">채운 모듈 학점</th><th scope="col">남은 과목</th><th scope="col">추가 학점</th></tr></thead><tbody>
        {result.completed.recommendations.map(candidate=><tr key={candidate.trackId} data-history-track={candidate.trackId} data-selected={chosen.includes(candidate.trackId)}><td><label className="track-history-check-target"><input type="checkbox" checked={chosen.includes(candidate.trackId)} onChange={()=>change(candidate.trackId)} aria-label={`${candidate.trackName} 함께 선택`} /></label></td><th scope="row"><TrackGlyph trackId={candidate.trackId} decorative /><div><strong>{candidate.trackName}</strong>{candidate.satisfied?<small className="is-complete"><Check size={18} strokeWidth={1.8} aria-hidden="true" />모듈 조건을 채웠어요</small>:<small>{candidate.moduleProgress.filter(m=>m.missingCredits===0&&!m.isSubconstraint).length}개 모듈 조건 충족</small>}</div></th><td><span>{candidate.creditedCredits} / {candidate.requiredCredits}학점</span><progress max={candidate.requiredCredits} value={candidate.creditedCredits} aria-label={`${candidate.trackName} 모듈 학점`} /></td><td><strong>{candidate.remainingCourseCount}</strong>과목</td><td>{candidate.remainingCredits}학점</td></tr>)}
      </tbody></table></div>
    </section>
    <details className="track-history-timeline-tools"><summary>학기별 배치도 비교해 보고 싶다면</summary><TrackTimelineComparison courseSelections={courseSelections} initialPreferences={initialPlanPreferences} /></details>
    <section className="track-history-selection" aria-label="선택한 트랙의 합산 이수"><Layers size={22} strokeWidth={1.8} aria-hidden="true" /><div><h2>{chosen.length ? `${chosen.length}개 트랙을 함께 확인해요` : "확인할 트랙을 골라 주세요"}</h2><p>{chosen.length ? `겹치는 과목을 빼면 ${result.completed.unionRemainingCourseCount}과목 · ${result.completed.unionRemainingCredits}학점이 남아요.` : "트랙은 한 개만 선택하지 않아도 됩니다."}</p></div><button type="button" disabled={!chosen.length} onClick={()=>onConfirmTracks([...chosen])}>선택한 트랙 현황 보기<ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" /></button></section>
    <p className="track-history-footer">선택을 확정하기 전까지 기존 트랙과 계획은 바뀌지 않아요.</p>
    {storageError&&<p role="alert">선택을 저장하지 못했어요. 화면을 닫기 전에 브라우저 저장 상태를 확인해 주세요.</p>}
  </main>;
}
