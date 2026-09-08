import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, type RefObject } from "react";
import { getMajorContext } from "../../lib/majorContext";
import type { StudentProfile } from "../../types";
import { AdmissionYearSelect } from "./AdmissionYearSelect";

export function MajorInformationStep({ draft, entryYearValid, headingRef, onChange, onBack, onComplete }: {
  draft: Partial<StudentProfile>;
  entryYearValid: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onChange: (patch: Partial<StudentProfile>) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [yearOpen, setYearOpen] = useState(!entryYearValid);
  if (!draft.affiliation) return <section className="dku-profile-step" data-profile-region="path"><p role="status">소속을 먼저 선택해 주세요.</p><button type="button" className="primary-button" data-profile-recover onClick={onBack}>소속 선택으로 돌아가기</button></section>;
  const context = getMajorContext(draft);
  return <section className="dku-profile-step" data-profile-region="path">
    <header className="dku-profile-band dku-profile-band--sky"><span>맞춤 진단 준비 · 내 정보</span><h1 id="dku-profile-title" ref={headingRef} tabIndex={-1}>나의 전공 정보를 확인해 주세요</h1><p>트랙 선택과 전공 이수 형태는 별개예요. 아직 정하지 않았다면 미정으로 시작할 수 있어요.</p></header>
    {draft.affiliation === "department-student" ? <>
      <p className="dku-profile-status">식품자원경제학과 <strong>주전공</strong>으로 설정했어요.</p>
      <fieldset className="dku-profile-fieldset"><legend>다른 학과의 복수전공·부전공도 하고 있나요?</legend><div className="dku-profile-rows dku-profile-rows--compact">{([{ value: "no", label: "아니요" }, { value: "yes", label: "네, 함께 이수하고 있어요" }, { value: "unsure", label: "아직 정하지 않았어요" }] as const).map(option => <label className="dku-profile-row" key={option.value}><input type="radio" name="otherMajor" value={option.value} checked={context.otherMajor === option.value} onChange={() => onChange({ majorRole: "primary", otherMajor: option.value })} /><span><strong>{option.label}</strong></span></label>)}</div></fieldset>
    </> : <fieldset className="dku-profile-fieldset"><legend>식품자원경제학과를 어떻게 이수할 예정인가요?</legend><div className="dku-profile-rows dku-profile-rows--compact">{([{ value: "double-major", label: "복수전공" }, { value: "minor", label: "부전공" }, { value: "undecided", label: "아직 정하지 않았어요" }] as const).map(option => <label className="dku-profile-row" key={option.value}><input type="radio" name="majorRole" value={option.value} checked={context.majorRole === option.value} onChange={() => onChange({ majorRole: option.value })} /><span><strong>{option.label}</strong></span></label>)}</div></fieldset>}
    <details className="dku-profile-options" open={yearOpen} onToggle={event => setYearOpen(event.currentTarget.open)}><summary>입학연도 선택 (선택){draft.entryYear ? ` · ${draft.entryYear}년` : ""}{!entryYearValid ? " · 2000~2026년으로 수정 필요" : ""}</summary><AdmissionYearSelect entryYear={draft.entryYear} valid={entryYearValid} onChange={entryYear => onChange({ entryYear })} /></details>
    <p className="dku-profile-status" role="status">{context.academicRequirementsConfirmed ? `${context.label} 정보를 저장합니다. 최종 전공 인정 조건은 학과에 확인해 주세요.` : "트랙 탐색은 바로 시작할 수 있어요. 전공 이수 형태가 미정이므로 학사 이수 기준은 확정하지 않아요."}</p>
    <div className="dku-profile-actions dku-profile-actions--split"><button className="profile-back-action planner-focusable" type="button" onClick={onBack}><ArrowLeft size={18} aria-hidden="true" />소속으로 돌아가기</button><button type="button" className="primary-button study-path-complete planner-focusable" disabled={!entryYearValid} onClick={onComplete}>내 정보 저장하고 계속<ArrowRight size={18} aria-hidden="true" /></button></div>
  </section>;
}
