import type { RefObject } from "react";
import type {
  AcademicTermId,
  GraduationPlanResult as GraduationPlanResultValue,
  GraduationPlanStatus,
  PlannedCoursePlacement,
} from "../../types";
import { OfficialCheckQuestions } from "./OfficialCheckQuestions";
import { TermPlanColumn } from "./TermPlanColumn";
import { UnplacedCourseList } from "./UnplacedCourseList";

const statusHeadings: Record<GraduationPlanStatus, string> = {
  "currently-satisfied": "현재 입력 기준으로 충족했어요",
  "regular-plan-possible": "목표 학기 안에 참고 계획을 만들었어요",
  "load-adjustment-needed": "학기당 수강량 조정이 필요해요",
  "extra-term-possible": "추가 학기가 필요할 가능성이 있어요",
  "official-review-required": "계획 전에 공식 확인이 필요해요",
};

function termIndex(termId: AcademicTermId): number {
  const [year, semester] = termId.split("-").map(Number);
  return year * 2 + semester - 1;
}

type TermPlanView = {
  termId: AcademicTermId;
  placements: PlannedCoursePlacement[];
  electiveCredits: number;
  electiveSlots: number;
  extraTerm: boolean;
};

function buildTermPlanViews(result: GraduationPlanResultValue): TermPlanView[] {
  const targetIndex = termIndex(result.preferences.targetGraduationTerm);
  const allPlacements = [...result.placements, ...result.extraTermPlacements];
  const termIds = [...new Set<AcademicTermId>([
    ...allPlacements.map((item) => item.termId),
    ...result.electiveAllocations.map((item) => item.termId),
  ])].sort((left, right) => termIndex(left) - termIndex(right));
  if (termIds.length === 0) termIds.push(result.preferences.currentTerm);

  return termIds.map((termId) => {
    const electiveAllocation = result.electiveAllocations.find((item) => item.termId === termId);
    return {
      termId,
      placements: allPlacements.filter((item) => item.termId === termId),
      electiveCredits: electiveAllocation?.credits ?? 0,
      electiveSlots: electiveAllocation?.slots ?? 0,
      extraTerm: termIndex(termId) > targetIndex,
    };
  });
}

function PlanStatusSummary({
  result,
  headingRef,
}: {
  result: GraduationPlanResultValue;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const detail = result.status === "load-adjustment-needed"
    ? `학기당 최대 ${result.recommendedMaxMajorCoursesPerTerm ?? result.preferences.maxMajorCoursesPerTerm}과목을 기준으로 다시 배치한 참고안입니다.`
    : result.status === "extra-term-possible"
      ? `입력한 목표 뒤로 ${result.neededExtraTerms}개 정규학기를 더 살펴본 참고안입니다.`
      : result.status === "currently-satisfied"
        ? "완료로 입력한 과목과 학점만 기준으로 계산했습니다. 공식 인정 여부는 별도로 확인해 주세요."
        : result.status === "official-review-required"
          ? "현재 자료만으로 배치하거나 판단하기 어려운 항목을 확인 목록에 남겼습니다."
          : "입력한 목표 학기와 수강량 안에서 과목과 익명 선택 전공 자리를 나눴습니다.";

  return (
    <header className={`plan-status-summary status-${result.status}`}>
      <span>학기별 참고 계획</span>
      <h1 ref={headingRef} tabIndex={-1}>{statusHeadings[result.status]}</h1>
      <p>{detail}</p>
    </header>
  );
}

export function GraduationPlanResult({
  result,
  step,
  onEdit,
  onShowChecks,
  onSave,
  saveDisabled = false,
  headingRef,
}: {
  result: GraduationPlanResultValue;
  step: "schedule" | "checks";
  onEdit: () => void;
  onShowChecks: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  if (step === "checks") {
    return (
      <main className="graduation-plan-page plan-checks-page">
        <UnplacedCourseList items={result.unplacedCourses} headingRef={headingRef} />
        {result.unplacedElectiveCredits > 0 && (
          <section className="plan-check-section unplaced-elective-summary" aria-labelledby="unplaced-elective-title">
            <div className="plan-check-heading">
              <span>학기 배정 필요</span>
              <h2 id="unplaced-elective-title">
                학기 미배정 선택전공 {result.unplacedElectiveCredits}학점
              </h2>
            </div>
            <p>
              목표 학기와 추가 두 학기 안의 입력 수강량으로는 {result.unplacedElectiveSlots}개 자리를
              배정하지 못했습니다. 과목과 수강 시기는 학과에 공식 확인해 주세요.
            </p>
          </section>
        )}
        <OfficialCheckQuestions items={result.reviewItems} />
        <section className="plan-next-actions" aria-labelledby="plan-next-actions-title">
          <span>다음 행동</span>
          <h2 id="plan-next-actions-title">확인 결과를 반영해 계획을 다듬어 주세요</h2>
          <div>
            <button className="primary-button" type="button" onClick={onEdit}>조건 수정</button>
            <a className="secondary-button" href="?view=diagnosis&step=courses">이수 과목 선택으로 돌아가기</a>
            <a className="secondary-button" href="?view=resources">공식 자료 열기</a>
          </div>
        </section>
      </main>
    );
  }

  const termPlans = buildTermPlanViews(result);

  return (
    <main className="graduation-plan-page plan-schedule-page">
      <PlanStatusSummary result={result} headingRef={headingRef} />
      <p className="future-offering-warning">
        <strong>최근 개설 패턴 기준</strong>
        2026학년도 개설 이력을 다음 학기에 반복해 배치한 참고안이며, 실제 반복 개설을 보장하지 않습니다.
      </p>
      <div className="term-plan-board" aria-label="학기별 참고 계획">
        {termPlans.map((term) => (
          <TermPlanColumn
            key={term.termId}
            termId={term.termId}
            placements={term.placements}
            electiveCredits={term.electiveCredits}
            electiveSlots={term.electiveSlots}
            extraTerm={term.extraTerm}
          />
        ))}
      </div>
      <div className="plan-result-actions">
        <button className="primary-button" type="button" onClick={onSave} disabled={saveDisabled}>계획 저장</button>
        <button className="secondary-button" type="button" onClick={onShowChecks}>확인할 항목 보기</button>
        <button className="text-button" type="button" onClick={onEdit}>조건 수정</button>
      </div>
    </main>
  );
}
