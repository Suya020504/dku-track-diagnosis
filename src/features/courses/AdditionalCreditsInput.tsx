import { useId, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { addManualMajorCredit, extraDepartmentCourses, findDepartmentCredit, toggleDepartmentCredit } from "../../lib/additionalCredits";
import type { AdditionalMajorCredit } from "../../types";
import "./additional-credits.css";

export function AdditionalCreditsInput({ credits, onChange }: {
  credits: readonly AdditionalMajorCredit[];
  onChange: (credits: AdditionalMajorCredit[]) => void;
}) {
  const prefix = useId();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState("");
  const total = credits.reduce((sum, item) => sum + item.credits, 0);
  return <details className="additional-credits">
    <summary>
      <span><strong>목록 밖에서 이수한 전공학점</strong><small>세미나·인턴십·현장실습·기타 인정학점 · 선택 입력</small></span>
      <span className="additional-credits__total">{total}학점 <ChevronDown size={17} aria-hidden="true" /></span>
    </summary>
    <div className="additional-credits__body">
      <p id={`${prefix}-note`}>이미 이수한 학점만 입력하세요. 전체 전공학점에는 합산하지만 트랙 모듈이나 필수과목을 채운 것으로 계산하지 않습니다. 전공 인정 여부는 학과에서 확인해 주세요.</p>
      <fieldset aria-describedby={`${prefix}-note`}>
        <legend>학과 과목 중 이수한 과목 선택</legend>
        <div className="additional-credits__options">
          {extraDepartmentCourses.map(course => {
            const id = `department:${course.officialCourseCode}`;
            const selected = Boolean(findDepartmentCredit(credits, course.officialCourseCode));
            return <label key={id}>
              <input type="checkbox" checked={selected} onChange={() => {
                onChange(toggleDepartmentCredit(credits, course.officialCourseCode));
                setMessage(`${course.courseName} ${selected ? "선택 해제" : "이수 완료로 추가"}`);
              }} />
              <span>{course.courseName}<small>{course.officialCourseCode}</small></span>
              <strong>{course.credits}학점</strong>
            </label>;
          })}
        </div>
      </fieldset>
      <form className="additional-credits__form" onSubmit={event => {
        event.preventDefault();
        const result = addManualMajorCredit(credits, { id: `manual:${crypto.randomUUID()}`, label, credits: Number(amount) });
        setError(result.error);
        if (result.error) return;
        onChange(result.credits);
        setMessage(`${label.trim()} ${amount}학점을 추가했어요.`);
        setLabel(""); setAmount("");
      }}>
        <h3>그 밖의 인정 전공학점</h3>
        <p>위에서 체크한 과목은 다시 입력하지 마세요. 교양학점과 앞으로 들을 학점은 제외합니다.</p>
        <div>
          <label htmlFor={`${prefix}-label`}>내용<input id={`${prefix}-label`} value={label} maxLength={100} onChange={event => setLabel(event.target.value)} placeholder="예: 교환학생 인정 전공학점" required aria-describedby={error ? `${prefix}-error` : undefined} /></label>
          <label htmlFor={`${prefix}-amount`}>이수 학점<input id={`${prefix}-amount`} type="number" inputMode="decimal" min="0.5" max="300" step="0.5" value={amount} onChange={event => setAmount(event.target.value)} required aria-describedby={error ? `${prefix}-error` : undefined} /></label>
          <button type="submit" className="icon-button"><Plus size={16} aria-hidden="true" /> 학점 추가</button>
        </div>
        {error ? <p id={`${prefix}-error`} className="additional-credits__error" role="alert">{error}</p> : null}
      </form>
      {credits.length > 0 ? <section aria-label="추가한 전공학점">
        <h3>추가한 학점 <span>{total}학점</span></h3>
        <ul className="additional-credits__saved">
          {credits.map(item => <li key={item.id}>
            <div><strong>{item.label}</strong><small>{item.status === "officially-verified" ? "기존 저장 기록: 공식 확인" : "직접 입력 · 학과 확인 필요"}</small></div>
            <span>{item.credits}학점</span>
            <button type="button" className="icon-button" aria-label={`${item.label} 학점 삭제`} onClick={() => {
              onChange(credits.filter(credit => credit.id !== item.id)); setMessage(`${item.label} 학점을 삭제했어요.`);
            }}><Trash2 size={16} aria-hidden="true" /><span>삭제</span></button>
          </li>)}
        </ul>
      </section> : null}
      <p className="additional-credits__feedback" role="status">{message}</p>
    </div>
  </details>;
}
