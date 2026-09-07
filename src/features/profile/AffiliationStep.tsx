import { ArrowRight, GraduationCap, Building2 } from "lucide-react";
import type { RefObject } from "react";
import type { StudentAffiliation } from "../../types";

const AFFILIATION_LABELS: Record<StudentAffiliation, { title: string; detail: string }> = {
  "department-student": {
    title: "식품자원경제학과 학생",
    detail: "심화전공·트랙형전공·다전공 이수 기준을 확인합니다.",
  },
  "external-student": {
    title: "타 학과 학생",
    detail: "복수전공·부전공·트랙형전공 기준을 확인합니다.",
  },
};

export function AffiliationStep({
  value,
  headingRef,
  onChange,
  onNext,
}: {
  value?: StudentAffiliation;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onChange: (affiliation: StudentAffiliation) => void;
  onNext: () => void;
}) {
  return (
    <section className="dku-profile-step" data-profile-region="affiliation">
      <header className="dku-profile-band dku-profile-band--sky">
        <span>맞춤 진단 준비 · 소속</span>
        <h1 id="dku-profile-title" ref={headingRef} tabIndex={-1}>
          현재 소속을 선택해 주세요
        </h1>
        <p>소속에 따라 다음 단계에서 선택할 수 있는 이수 경로가 달라집니다.</p>
      </header>

      <fieldset className="dku-profile-fieldset" aria-labelledby="affiliation-question">
        <legend id="affiliation-question">나는 어디에 해당하나요?</legend>
        <div className="dku-profile-rows">
          {(Object.keys(AFFILIATION_LABELS) as StudentAffiliation[]).map((affiliation) => {
            const label = AFFILIATION_LABELS[affiliation];
            return (
              <label className="dku-profile-row" key={affiliation}>
                <input
                  type="radio"
                  name="affiliation"
                  value={affiliation}
                  checked={value === affiliation}
                  onChange={() => onChange(affiliation)}
                />
                {affiliation === "department-student" ? <GraduationCap aria-hidden="true" size={30} /> : <Building2 aria-hidden="true" size={30} />}
                <span>
                  <strong>{label.title}</strong>
                  <small>{label.detail}</small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="dku-profile-actions">
        <p className="dku-profile-choice-summary" aria-live="polite">{value ? `${AFFILIATION_LABELS[value].title} 기준으로 시작합니다.` : "소속만 선택하면 다음으로 갈 수 있어요."}</p>
        <button
          className="primary-button planner-focusable"
          data-profile-next
          type="button"
          disabled={!value}
          onClick={onNext}
        >
          이수 경로 선택
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </section>
  );
}
