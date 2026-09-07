import type { RefObject } from "react";
import type {
  AcademicTermId,
  GraduationPlanResult as GraduationPlanResultValue,
  GraduationPlanStatus,
  PlannedCoursePlacement,
} from "../../types";
import { EvidenceBand } from "../../components/EvidenceBand";
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
    <header className={`dku-plan-heading status-${result.status}`}>
      <span className="dku-plan-eyebrow">선택 도구 · 학기별 참고 계획</span>
      <h1 ref={headingRef} tabIndex={-1}>{statusHeadings[result.status]}</h1>
      <p>{detail}</p>
    </header>
  );
}

function PlannerRouteLine({
  step,
  onShowSchedule,
  onShowChecks,
  onEdit,
}: {
  step: "schedule" | "checks";
  onShowSchedule: () => void;
  onShowChecks: () => void;
  onEdit: () => void;
}) {
  return (
    <nav className="dku-plan-tabs" aria-label="졸업 계획 단계">
      <button
        type="button"
        aria-current={step === "schedule" ? "page" : undefined}
        onClick={onShowSchedule}
      >
        일정
      </button>
      <button
        type="button"
        aria-current={step === "checks" ? "page" : undefined}
        onClick={onShowChecks}
      >
        확인
      </button>
      <button type="button" onClick={onEdit}>조건 수정</button>
    </nav>
  );
}

export function GraduationPlanResult({
  result,
  step,
  onEdit,
  onShowSchedule,
  onShowChecks,
  onSave,
  saveDisabled = false,
  headingRef,
}: {
  result: GraduationPlanResultValue;
  step: "schedule" | "checks";
  onEdit: () => void;
  onShowSchedule: () => void;
  onShowChecks: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  if (step === "checks") {
    return (
      <main className="dku-plan-page dku-plan-checks">
        <PlannerRouteLine
          step="checks"
          onShowSchedule={onShowSchedule}
          onShowChecks={onShowChecks}
          onEdit={onEdit}
        />
        <div className="dku-plan-check-layout">
        <UnplacedCourseList items={result.unplacedCourses} headingRef={headingRef} />
        {result.unplacedElectiveCredits > 0 && (
          <section className="dku-plan-unplaced-credits" aria-labelledby="unplaced-elective-title">
            <div className="dku-plan-subheading">
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
        </div>
        <section className="dku-plan-next-actions" aria-labelledby="plan-next-actions-title">
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
    <main className="dku-plan-page dku-plan-schedule">
      <PlannerRouteLine
        step="schedule"
        onShowSchedule={onShowSchedule}
        onShowChecks={onShowChecks}
        onEdit={onEdit}
      />
      <PlanStatusSummary result={result} headingRef={headingRef} />
      <dl className="dku-plan-conditions">
        <div><dt>시작 학기</dt><dd>{result.preferences.currentTerm}</dd></div>
        <div><dt>목표 졸업 학기</dt><dd>{result.preferences.targetGraduationTerm}</dd></div>
        <div><dt>학기당 입력 한도</dt><dd>전공 {result.preferences.maxMajorCoursesPerTerm}과목</dd></div>
      </dl>
      <EvidenceBand state="historical-2026-snapshot">
        최근 개설 패턴 기준인 2026학년도 개설 이력을 다음 학기에 반복해 배치한 참고안이며,
        실제 반복 개설을 보장하지 않습니다.
      </EvidenceBand>
      <p className="dku-plan-legend"><span>실선: 과목을 정한 참고 배치</span><span>점선: 과목 미정 · 학점 예약</span></p>
      <section
        className="term-plan-board"
        aria-label="학기별 참고 계획"
        data-planner-layout="semester-columns"
        data-mobile-layout="vertical-timeline"
      >
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
      </section>
      <footer className="dku-plan-result-actions">
        <p>실제 시간표와 학점 인정은 확인 화면에서 점검해 주세요.</p>
        <button className="primary-button" type="button" onClick={onSave} disabled={saveDisabled}>계획 저장</button>
      </footer>
    </main>
  );
}
