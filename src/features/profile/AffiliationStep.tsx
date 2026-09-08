import { ArrowRight, GraduationCap, Building2 } from "lucide-react";
import type { RefObject } from "react";
import type { StudentAffiliation } from "../../types";

const AFFILIATION_LABELS: Record<StudentAffiliation, { title: string; detail: string }> = {
  "department-student": {
    title: "식품자원경제학과 학생",
    detail: "주전공 정보를 확인하고 원하는 트랙을 탐색해요.",
  },
  "external-student": {
    title: "타 학과 학생",
    detail: "복수전공·부전공을 고려 중이거나 아직 미정이어도 시작해요.",
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
        <p>내 정보를 한 번 확인하고, 트랙 선택과 수강 이력 입력을 이어가요.</p>
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
          내 정보 확인
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </section>
  );
}
