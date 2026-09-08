import { useState, type RefObject } from "react";
import { ArrowRight, History } from "lucide-react";
import type { Track } from "../../types";
import { EntryChoices, type EntryChoice } from "../journey/EntryChoices";
import "./journey-home.css";

export type LandingPlannerStatus = "empty" | "needs-profile" | "needs-courses" | "needs-track" | "ready" | "saved-plan";
export type TrackServiceLandingProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>; tracks: readonly Track[];
  plannerStatus: LandingPlannerStatus; resultReady: boolean;
  onStartSimulation: () => void; onOpenGuide: () => void; onOpenStructure: () => void;
  onOpenRecommendation: () => void; onPlannerAction?: () => void; saveUnavailable?: boolean;
  entryIntent?: EntryChoice; onEntryIntentChange?: (intent: EntryChoice) => void;
  onStartIntent?: (intent: EntryChoice) => void; onResumeResult?: () => void;
};
export function TrackServiceLanding(props: TrackServiceLandingProps) {
  const [localIntent,setLocalIntent]=useState<EntryChoice>(props.entryIntent ?? "known-tracks");
  const intent=props.entryIntent ?? localIntent;
  const returning=props.plannerStatus!=="empty";
  function start(){
    if(props.onStartIntent) props.onStartIntent(intent);
    else if(intent==="interest-survey") props.onOpenRecommendation();
    else props.onStartSimulation();
  }
  return <main className="journey-home" data-returning={returning} aria-labelledby="track-home-title">
    <section className="journey-home-hero"><div><h1 id="track-home-title" ref={props.headingRef} tabIndex={-1}>내 수업으로 트랙을 완성해요</h1><p>들은 과목을 확인하고, 남은 수업부터 계획까지 이어가세요.</p><button type="button" onClick={props.onOpenGuide}>트랙제 먼저 알아보기<ArrowRight size={18} aria-hidden="true"/></button></div><img src="/illustrations/track-journey-notebook.webp" width="1180" height="590" alt="노트와 여러 분야의 수업을 상징하는 민트·하늘색 카드" fetchPriority="high" /></section>
    <ol className="journey-home-steps" aria-label="트랙 확인 이용 순서">{["내 정보","트랙 선택","이수 현황","학기 계획"].map((label,i)=><li key={label}><span>{i+1}</span><strong>{label}{i===3&&<small>선택</small>}</strong></li>)}</ol>
    {returning&&<section className="journey-home-resume" data-resume-state={props.plannerStatus} aria-label="이전 입력 이어보기"><History size={22} aria-hidden="true"/><div><strong>{props.plannerStatus === "saved-plan" ? "저장한 학기 계획이 있어요" : props.resultReady?"이전에 확인한 트랙이 있어요":"입력하던 내용이 남아 있어요"}</strong><p>{props.resultReady?"내 결과를 다시 확인하거나, 이번 학기 과목을 반영하세요.":"저장된 정보는 그대로 두고 이어갈 수 있어요."}</p></div>{props.plannerStatus === "saved-plan" && <button type="button" onClick={props.onPlannerAction ?? props.onStartSimulation}>저장한 계획 보기<ArrowRight size={18} aria-hidden="true"/></button>}<button type="button" onClick={props.resultReady ? props.onResumeResult ?? props.onPlannerAction ?? props.onStartSimulation : props.onPlannerAction ?? props.onStartSimulation}>{props.resultReady?"내 결과 다시 보기":"이전 입력 이어보기"}<ArrowRight size={18} aria-hidden="true"/></button></section>}
    <section className="journey-home-entry" aria-labelledby="journey-start-title"><h2 id="journey-start-title">어디서부터 시작할까요?</h2><p>나에게 맞는 방법을 선택하세요. 수강 이력은 한 번만 입력해요.</p><EntryChoices value={intent} onChange={next=>{setLocalIntent(next);props.onEntryIntentChange?.(next);}}/>
      <div className="journey-home-actions"><button type="button" className="journey-home-start" onClick={start}>선택한 방법으로 시작하기<ArrowRight size={20} aria-hidden="true"/></button><button type="button" className="journey-home-track-guide" onClick={props.onOpenStructure}>5개 트랙 자세히 보기<ArrowRight size={17} aria-hidden="true"/></button></div>
    </section>
    <footer className="journey-home-footer"><p>여러 트랙을 함께 선택할 수 있어요. 학기 계획은 필요할 때만 이용하세요.</p>{props.saveUnavailable&&<p role="alert">브라우저에 저장하지 못하고 있어요. 입력한 내용은 화면을 닫기 전에 확인해 주세요.</p>}</footer>
  </main>;
}
