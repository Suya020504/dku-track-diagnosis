import { ArrowRight } from "lucide-react";
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
    <section className="profile-entry-step" data-profile-region="affiliation">
      <header className="profile-entry-band profile-entry-band--sky">
        <span>맞춤 진단 준비 · 소속</span>
        <h1 id="profile-entry-title" ref={headingRef} tabIndex={-1}>
          현재 소속을 선택해 주세요
        </h1>
        <p>소속에 따라 다음 단계에서 선택할 수 있는 이수 경로가 달라집니다.</p>
      </header>

      <fieldset className="profile-entry-fieldset" aria-labelledby="affiliation-question">
        <legend id="affiliation-question">나는 어디에 해당하나요?</legend>
        <div className="profile-entry-rows">
          {(Object.keys(AFFILIATION_LABELS) as StudentAffiliation[]).map((affiliation) => {
            const label = AFFILIATION_LABELS[affiliation];
            return (
              <label className="profile-entry-row" key={affiliation}>
                <input
                  type="radio"
                  name="affiliation"
                  value={affiliation}
                  checked={value === affiliation}
                  onChange={() => onChange(affiliation)}
                />
                <span>
                  <strong>{label.title}</strong>
                  <small>{label.detail}</small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="profile-entry-actions">
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
