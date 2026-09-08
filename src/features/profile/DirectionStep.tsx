import { ArrowLeft, ArrowRight, BookOpen, CircleCheck, Crosshair } from "lucide-react";
import type { RefObject } from "react";
import type { EntryIntent } from "../../types";
const options = [
  { id: "known-tracks", title: "트랙을 정했어요", detail: "여러 트랙을 함께 선택할 수 있어요.", Icon: CircleCheck },
  { id: "interest-survey", title: "관심으로 찾아볼래요", detail: "짧은 질문으로 배우고 싶은 분야를 찾아요.", Icon: Crosshair },
  { id: "completed-courses", title: "들은 과목으로 찾아볼래요", detail: "지금 이력에서 완성하기 가까운 트랙을 비교해요.", Icon: BookOpen },
] as const;
export function DirectionStep({ value = "known-tracks", onChange, onContinue, onBack, headingRef }: { value?: EntryIntent; onChange: (intent: EntryIntent) => void; onContinue: (intent: EntryIntent) => void; onBack: () => void; headingRef?: RefObject<HTMLHeadingElement | null> }) {
  return <section className="dku-profile-step" data-profile-region="direction"><header className="dku-profile-band dku-profile-band--sky"><span>트랙 완성 여정 · 시작 방법</span><h1 id="dku-profile-title" ref={headingRef} tabIndex={-1}>어디서부터 시작할까요?</h1><p>나에게 맞는 방법을 선택하고, 트랙 완성 여정을 시작해요.</p></header><fieldset className="dku-profile-fieldset"><legend className="sr-only">시작 방법 선택</legend><div className="dku-profile-rows">{options.map(({ id, title, detail, Icon }) => <label className="dku-profile-row" key={id}><input type="radio" name="entryIntent" value={id} checked={value === id} onChange={() => onChange(id)} /><Icon size={30} aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></label>)}</div></fieldset><div className="dku-profile-actions dku-profile-actions--split"><button className="profile-back-action" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />내 정보 수정</button><button className="primary-button" type="button" data-start-direction onClick={() => onContinue(value)}>선택한 방법으로 시작하기<ArrowRight size={18} aria-hidden="true" /></button></div><p className="dku-profile-status">수강 이력은 한 번만 입력해요. 학기 계획은 선택이에요.</p></section>;
}
