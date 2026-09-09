import { useState, type RefObject } from "react";
import { ArrowRight, History } from "lucide-react";
import type { Track } from "../../types";
import { ServiceGlyph, type ServiceGlyphKind } from "../../components/ServiceGlyph";
import { EntryChoices, type EntryChoice } from "../journey/EntryChoices";
import "./journey-home.css";

export type LandingPlannerStatus = "empty" | "needs-profile" | "needs-courses" | "needs-track" | "ready" | "saved-plan";
export type TrackServiceLandingProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>; tracks: readonly Track[];
  plannerStatus: LandingPlannerStatus; resultReady: boolean;
  onStartSimulation: () => void; onOpenGuide: () => void;
  onOpenRecommendation: () => void; onPlannerAction?: () => void; saveUnavailable?: boolean;
  entryIntent?: EntryChoice; onEntryIntentChange?: (intent: EntryChoice) => void;
  onStartIntent?: (intent: EntryChoice) => void; onResumeResult?: () => void;
  onOpenExample?: () => void;
};
const journeySteps: {label:string; glyph:ServiceGlyphKind}[] = [
  {label:"내 정보",glyph:"profile"}, {label:"트랙 선택",glyph:"tracks"},
  {label:"이수 현황",glyph:"courses"}, {label:"학기 계획",glyph:"plan"},
];

export function TrackServiceLanding(props: TrackServiceLandingProps) {
  const [localIntent,setLocalIntent]=useState<EntryChoice>(props.entryIntent ?? "known-tracks");
  const intent=props.entryIntent ?? localIntent;
  const returning=props.plannerStatus!=="empty";
  function start() {
    if(props.onStartIntent) props.onStartIntent(intent);
    else if(intent==="interest-survey") props.onOpenRecommendation();
    else props.onStartSimulation();
  }
  return <main className="journey-home" data-returning={returning} aria-labelledby="track-home-title">
    <div className="journey-home-main">
      <section className="journey-home-hero">
        <div className="journey-home-copy">
          <h1 id="track-home-title" ref={props.headingRef} tabIndex={-1}><span>내 수업으로</span>{" "}<span><em className="journey-home-accent">트랙</em>을 완성해요</span></h1>
          <p>들은 과목을 확인하고, 남은 수업부터 계획까지 이어가세요.</p>
          <button type="button" onClick={props.onOpenGuide}>트랙제와 5개 트랙 알아보기<ArrowRight size={18} aria-hidden="true"/></button>
        </div>
        {returning && <section className="journey-home-resume" data-resume-state={props.plannerStatus} aria-label="이전 입력 이어보기">
          <History size={20} aria-hidden="true"/><div><strong>{props.plannerStatus === "saved-plan" ? "저장한 학기 계획이 있어요" : props.resultReady ? "이전에 확인한 트랙이 있어요" : "입력하던 내용이 남아 있어요"}</strong><p>{props.resultReady ? "내 결과를 다시 확인하거나, 이번 학기 과목을 반영하세요." : "저장된 정보는 그대로 두고 이어갈 수 있어요."}</p></div>
          <div className="journey-home-resume-actions">
            {props.plannerStatus === "saved-plan" && <button type="button" onClick={props.onPlannerAction ?? props.onStartSimulation}>저장한 계획 보기<ArrowRight size={17} aria-hidden="true"/></button>}
            <button type="button" onClick={props.resultReady ? props.onResumeResult ?? props.onPlannerAction ?? props.onStartSimulation : props.onPlannerAction ?? props.onStartSimulation}>{props.resultReady ? "내 결과 다시 보기" : "이전 입력 이어보기"}<ArrowRight size={17} aria-hidden="true"/></button>
          </div>
        </section>}
        <img src="/illustrations/track-journey-notebook-studio.webp" width="1100" height="733" alt="노트와 여러 분야의 수업 카드를 함께 펼친 학업 책상" fetchPriority="high"/>
      </section>
      <section className="journey-home-entry" aria-labelledby="journey-start-title">
        <h2 id="journey-start-title">어디서부터 시작할까요?</h2>
        <p>나에게 맞는 방법을 선택하세요. 수강 이력은 한 번만 입력해요.</p>
        {props.onOpenExample && <div className="journey-home-example"><span>입력 전에 어떤 결과가 나오는지 궁금하다면</span><button type="button" onClick={props.onOpenExample}>예시 결과 먼저 보기<ArrowRight size={17} aria-hidden="true"/></button></div>}
        <EntryChoices value={intent} onChange={next=>{setLocalIntent(next);props.onEntryIntentChange?.(next);}}/>
        <div className="journey-home-actions">
          <button type="button" className="journey-home-start" onClick={start}>선택한 방법으로 시작하기<ArrowRight size={20} aria-hidden="true"/></button>
        </div>
      </section>
    </div>
    <ol className="journey-home-steps" aria-label="트랙 확인 이용 순서">{journeySteps.map(({label,glyph},index)=><li key={label}><ServiceGlyph kind={glyph} size={24}/><strong>{label}{index===3&&<small>선택</small>}</strong>{index<3&&<ArrowRight size={16} aria-hidden="true"/>}</li>)}</ol>
    <footer className="journey-home-footer"><p>여러 트랙을 함께 선택할 수 있어요. 학기 계획은 필요할 때만 이용하세요.</p>{props.saveUnavailable&&<p role="alert">브라우저에 저장하지 못하고 있어요. 입력한 내용은 화면을 닫기 전에 확인해 주세요.</p>}</footer>
  </main>;
}
