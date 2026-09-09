import { useMemo, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, FlaskConical } from "lucide-react";
import { courses, tracks } from "../../data/curriculumData";
import { calculateTrackCompletion } from "../../lib/trackCompletion";
import { buildTrackSemesterPlan } from "../../lib/trackSemesterPlanner";
import type { CourseSelectionRecord, TrackId } from "../../types";
import "./example-experience.css";

export const EXAMPLE_COURSE_IDS = ["f-1", "f-2", "h-1", "i-1", "j-1", "l-1"] as const;
const sampleSelections: CourseSelectionRecord[] = EXAMPLE_COURSE_IDS.map(courseId=>({courseId,status:"completed"}));
const courseName = (id:string) => courses.find(c=>c.id===id)?.name ?? id;

/** Uses the live calculators with a fixed fictional record, never browser storage. */
export function ExampleExperience({headingRef,onStart,onHome}:{headingRef?:RefObject<HTMLHeadingElement|null>;onStart:()=>void;onHome:()=>void}) {
  const [twoTracks,setTwoTracks] = useState(false);
  const [panel,setPanel] = useState<"result"|"plan">("result");
  const selectedTrackIds = useMemo<TrackId[]>(()=>twoTracks?["food-marketing","agri-food-distribution"]:["food-marketing"],[twoTracks]);
  const result = useMemo(()=>calculateTrackCompletion({selectedTrackIds,courseSelections:sampleSelections}).completed,[selectedTrackIds]);
  const plan = useMemo(()=>buildTrackSemesterPlan({selectedTrackIds,courseSelections:sampleSelections,preferences:{currentTerm:"2026-2",targetGraduationTerm:"2028-2",maxMajorCoursesPerTerm:3,considerSeasonalTerm:false},generatedAt:"2026-09-09T00:00:00.000Z"}),[selectedTrackIds]);
  const terms=[...new Set(plan.placements.map(p=>p.term))].sort();
  return <main className="example-experience" aria-labelledby="example-experience-title">
    <header className="example-experience__heading"><button type="button" onClick={onHome}><ArrowLeft size={17} aria-hidden="true"/>홈으로</button><span className="example-experience__label"><FlaskConical size={18} aria-hidden="true"/>예시 체험 · 가상 수강 이력</span><h1 id="example-experience-title" ref={headingRef} tabIndex={-1}>입력 없이 결과를 먼저 살펴보세요</h1><p>가상의 학생이 들은 수업으로 남은 과목과 학기 계획이 어떻게 나오는지 확인해 보세요. 예시를 바꿔도 내 수강 이력과 저장 기록은 그대로예요.</p></header>
    <section className="example-experience__record" aria-labelledby="example-record-title"><div><h2 id="example-record-title">이 학생은 6과목을 이수했어요</h2><p>아래 과목을 모두 이수 완료한 것으로 가정합니다.</p><details><summary>가상 수강 이력 6과목 보기</summary><ul>{EXAMPLE_COURSE_IDS.map(id=><li key={id}>{courseName(id)}</li>)}</ul></details></div><div className="example-experience__choice"><p>확인할 트랙을 바꿔 보세요</p><div role="group" aria-label="예시 목표 트랙"><button type="button" aria-pressed={!twoTracks} onClick={()=>setTwoTracks(false)}>푸드마케팅만</button><button type="button" aria-pressed={twoTracks} onClick={()=>setTwoTracks(true)}>두 트랙 함께</button></div><small>{twoTracks?"푸드마케팅 + 농식품유통":"푸드마케팅"}</small></div></section>
    <nav className="example-experience__tabs" aria-label="예시 화면 선택"><button type="button" aria-pressed={panel==="result"} onClick={()=>setPanel("result")}><BookOpenCheck size={19} aria-hidden="true"/>예시 결과</button><button type="button" aria-pressed={panel==="plan"} onClick={()=>setPanel("plan")}><CalendarDays size={19} aria-hidden="true"/>예시 학기 계획</button></nav>
    {panel==="result"?<section className="example-experience__panel" data-example-result aria-labelledby="example-result-title"><div className="example-experience__summary"><h2 id="example-result-title">이 조합으로 모듈 조건을 채워요</h2><strong>{result.unionRemainingCourseCount}과목 · {result.unionRemainingCredits}학점 남음</strong><p>선택한 트랙에 겹치는 과목은 한 번만 셉니다. 아래는 조건을 채우는 추천 조합이며, 졸업 필수 과목 목록과는 달라요.</p></div><ul className="example-experience__course-list">{result.suggestedCourses.map(c=><li key={c.courseId}><strong>{courseName(c.courseId)}</strong><span>{c.credits}학점 · {c.selectedTrackIds.map(id=>tracks.find(t=>t.id===id)?.name).join(" · ")}</span></li>)}</ul><button type="button" className="example-experience__next" onClick={()=>setPanel("plan")}>이 과목의 예시 계획 보기<ArrowRight size={18} aria-hidden="true"/></button></section>:<section className="example-experience__panel" data-example-plan aria-labelledby="example-plan-title"><h2 id="example-plan-title">남은 수업을 학기별로 나눈 모습이에요</h2><p>현재 2026-2 · 목표 2028-2 · 학기당 최대 3과목으로 계산한 가상 계획입니다. 2026년 개설 이력을 참고하므로 미래 개설이나 최단 완료 시점을 보장하지 않아요.</p><div className="example-experience__terms">{terms.map(term=><section key={term}><h3>{term}</h3><ul>{plan.placements.filter(p=>p.term===term).map(p=><li key={p.courseId}>{courseName(p.courseId)}</li>)}</ul></section>)}</div>{plan.unplaced.length>0&&<p role="status">이 조건으로 배치하지 못한 과목이 {plan.unplaced.length}개 있어요. 실제 계획에서는 미배치 사유를 함께 확인할 수 있어요.</p>}</section>}
    <footer className="example-experience__footer"><p>내 결과에서는 과목별 대체 선택과 트랙별 학기 조건도 확인할 수 있어요.</p><button type="button" onClick={onStart}>내 수강 이력으로 시작하기<ArrowRight size={18} aria-hidden="true"/></button><small>예시 과목은 내 기록에 저장되지 않습니다.</small></footer>
  </main>;
}
