import type { RequirementEvidenceStatus, ReviewItem } from "../../types";
import { getEvidenceSource, type EvidenceState } from "../../data/evidenceSources";

const officialQuestions: Record<ReviewItem["code"], string> = {
  "rule-source": "내 입학연도와 이수 경로에 적용되는 공식 기준은 무엇인가요?",
  "unknown-course": "입력한 과목을 전공 또는 트랙 과목으로 인정받을 수 있나요?",
  "additional-credit": "추가로 입력한 전공학점의 인정 범위와 증빙은 무엇인가요?",
  "document-conflict": "서로 다른 공식 문서 중 내 상황에 적용할 기준은 무엇인가요?",
  "future-offering": "실제 개설 학기와 폐강 여부는 언제 어디에서 확인할 수 있나요?",
  "seasonal-term": "계절학기에 개설되는 과목과 전공 인정 범위가 있나요?",
  "plan-input": "현재 목표 학기와 수강량에서 조정해야 할 우선순위는 무엇인가요?",
  "elective-placeholder": "선택 전공학점으로 인정되는 과목 목록은 무엇인가요?",
};

type ReviewEvidenceDisplay = {
  state: EvidenceState | "project-derived";
  label: string;
};

const reviewEvidenceDisplay: Record<RequirementEvidenceStatus, ReviewEvidenceDisplay> = {
  "official-public": {
    state: "official-public-confirmed",
    label: getEvidenceSource("official-public-confirmed").label,
  },
  "provided-final-plan": {
    state: "provided-final-plan-reference",
    label: getEvidenceSource("provided-final-plan-reference").label,
  },
  "project-derived": {
    state: "project-derived",
    label: "서비스 참고 계산",
  },
  "official-review-required": {
    state: "department-confirmation-required",
    label: getEvidenceSource("department-confirmation-required").label,
  },
};

export function OfficialCheckQuestions({ items }: { items: ReviewItem[] }) {
  const questions = [...new Map(
    items.map((item) => [officialQuestions[item.code], item]),
  ).entries()];

  return (
    <section
      className="dku-plan-official"
      aria-labelledby="official-check-title"
      data-check-ledger="official-questions"
    >
      <div className="dku-plan-subheading">
        <span>공식 확인 필요</span>
        <h2 id="official-check-title">학과에 확인할 질문</h2>
      </div>

      {items.length === 0 ? (
        <p className="plan-check-empty">현재 계산에서 추가로 생성된 공식 확인 항목은 없습니다.</p>
      ) : (
        <>
          <details className="official-review-items" open>
            <summary>계획에서 확인된 검토 항목 · {items.length}건</summary>
            <ul>
              {items.map((item, index) => {
                const evidence = reviewEvidenceDisplay[item.evidence];
                return (
                  <li
                    key={`${item.code}-${index}`}
                    data-evidence-state={evidence.state}
                  >
                    <span>{item.message}</span>
                    <small>{evidence.label}</small>
                  </li>
                );
              })}
            </ul>
          </details>
          <ol className="official-question-list">
            {questions.map(([question, item]) => (
              <li key={question}>
                <strong>{question}</strong>
                <span>{item.evidence === "official-review-required" ? "공식 답변 필요" : "공식 자료로 재확인"}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
