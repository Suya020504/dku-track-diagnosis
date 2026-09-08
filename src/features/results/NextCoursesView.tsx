import type { RefObject } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import "../../styles/planner-candidate-planning.css";
import { ResultDisclosure } from "./ResultDisclosure";
import { TrackGlyph } from "../../components/TrackGlyph";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import { modules } from "../../data/curriculumData";
import type {
  Course,
  CourseSelectionRecord,
  DiagnosisResult,
  PathProgressResult,
  PlanTerm,
  StudentProfile,
} from "../../types";
import { getPathLabel } from "./PathProgressSummary";

const plannedTermLabels: Record<PlanTerm, string> = {
  next: "계획 시작 학기",
  following: "그다음 학기",
  later: "이후 학기",
};

function CoursePlanAction({ course, selection, onChange, planStartTerm }: {
  course: Course;
  selection?: CourseSelectionRecord;
  onChange?: (courseId: string, term: PlanTerm | null) => void;
  planStartTerm?: string;
}) {
  if (selection?.status === "completed" || selection?.status === "in-progress") {
    return <p className="dku-candidate-plan dku-candidate-plan--existing">
      <Check aria-hidden="true" size={16} />이미 입력됨 · {selection.status === "completed" ? "이수 완료" : "수강 중"}
    </p>;
  }
  const planned = selection?.status === "planned";
  if (!onChange && !planned) return null;
  const startLabel = planStartTerm?.replace(/^(\d{4})-([12])$/, "$1년 $2학기");
  return (
    <div className="dku-candidate-plan" aria-label={`${course.name} 계획 선택`}>
      {planned ? <span className="dku-candidate-plan-status" role="status"><Check aria-hidden="true" size={16} />수강 계획에 담김</span> : null}
      {planned && onChange ? <>
        <div className="dku-candidate-plan-term">
          <select aria-label={`${course.name} 계획 학기`} aria-describedby={`candidate-term-help-${course.id}`}
            value={selection?.plannedTerm ?? "later"}
            onChange={(event) => onChange(course.id, event.currentTarget.value as PlanTerm)}>
            {Object.entries(plannedTermLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <small id={`candidate-term-help-${course.id}`}>플래너에서 정한 시작 학기 기준{startLabel ? ` · ${startLabel}` : ""}</small>
        </div>
        <button type="button" className="dku-candidate-plan-remove" aria-label={`${course.name} 계획에서 빼기`} onClick={() => onChange(course.id, null)}>
          계획에서 빼기
        </button>
      </> : onChange ? <button type="button" className="dku-candidate-plan-add" aria-label={`${course.name} 수강 계획에 추가`} onClick={() => onChange(course.id, "later")}>
        <Plus aria-hidden="true" size={16} />수강 계획에 추가
      </button> : <small>{plannedTermLabels[selection?.plannedTerm ?? "later"]}</small>}
    </div>
  );
}

function uniqueRecommendations(result: DiagnosisResult): Course[] {
  const candidates = result.trackResults.length > 0
    ? result.trackResults.flatMap((track) => track.recommendedCourses)
    : result.recommendedCourses;
  return [...new Map(candidates.map((course) => [course.id, course])).values()];
}

function moduleLabel(course: Course): string {
  const module = modules.find((item) => item.id === course.moduleId);
  return module ? `${module.id}. ${module.name}` : `${course.moduleId} 모듈`;
}

function historicalTermLabel(course: Course): string {
  const record = courseOfferings2026[course.id];
  if (!record || record.observedProgramSemesters.length === 0) return "개설 이력 확인 필요";
  const semesters = [...new Set(record.observedProgramSemesters.map((term) => `${term.split("-")[1]}학기`))];
  return `2026 이력 · ${semesters.join("·")}`;
}

function courseContext(course: Course, result: DiagnosisResult) {
  const tracks = result.trackResults.filter((track) => (
    track.recommendedCourses.some((recommended) => recommended.id === course.id)
    || track.remainingCourses.some((remaining) => remaining.id === course.id)
  ));
  const contributionLabels = [...new Set(tracks.flatMap((track) => (
    track.moduleProgress
      .filter((module) => module.missingCredits > 0 && module.courseIds.includes(course.id))
      .map((module) => module.label.replace(`${track.trackName} · `, ""))
  )))];
  const requiredFor = tracks
    .filter((track) => track.missingRequiredCourses.some((required) => required.id === course.id))
    .map((track) => track.trackName);
  const trackNames = tracks.map((track) => track.trackName);

  return {
    reason: requiredFor.length > 0
      ? `${requiredFor.join(", ")} 필수과목 보완`
      : trackNames.length > 0
        ? `${trackNames.join(", ")} 부족 모듈 보완 후보`
        : "입력한 이수 현황을 기준으로 다음 수강 후보로 계산된 과목입니다.",
    contribution: contributionLabels.length > 0
      ? contributionLabels.join(", ")
      : `${moduleLabel(course)} 해당 여부를 학과에서 확인해 주세요.`,
  };
}

function ModuleProgressLedger({ result }: { result: DiagnosisResult }) {
  return (
    <section className="planner-module-ledger" aria-labelledby="module-ledger-title">
      <header>
        <span>모듈별 충족 현황</span>
        <h2 id="module-ledger-title">다음 과목으로 어느 모듈을 채울 수 있나요?</h2>
        <p>퍼센트는 보조 정보입니다. 먼저 부족 학점과 과목 후보를 확인해 주세요.</p>
      </header>
      {result.trackResults.length > 0 ? (
        <div className="planner-module-ledger__tracks">
          {result.trackResults.map((track) => (
            <section key={track.trackId} aria-labelledby={`module-ledger-${track.trackId}`}>
              <header>
                <TrackGlyph trackId={track.trackId} />
                <h3 id={`module-ledger-${track.trackId}`}>{track.trackName}</h3>
              </header>
              <ul>
                {track.moduleProgress.map((module) => {
                  const percentage = module.requiredCredits > 0
                    ? Math.min(100, Math.round((module.completedCredits / module.requiredCredits) * 100))
                    : 0;
                  return (
                    <li key={`${track.trackId}-${module.moduleId}-${module.label}`}>
                      <div>
                        <strong>{module.label.replace(`${track.trackName} · `, "")}</strong>
                        <span>
                          {module.missingCredits > 0
                            ? `${module.missingCredits}학점 보완 필요`
                            : "참고 계산상 기준 도달"}
                        </span>
                      </div>
                      <small>{module.completedCredits}/{module.requiredCredits}학점 · {percentage}%</small>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="planner-directed-empty">
          비교 중인 트랙이 없어 모듈별 표는 표시하지 않습니다. 추천 비교에서 관심 트랙을 먼저 확인해 주세요.
        </p>
      )}
    </section>
  );
}

export function NextCoursesView({
  result,
  profile,
  pathProgress,
  headingRef,
  onOpenRecommendations,
  onGoToPlan,
  courseSelections = [],
  onPlannedCourseChange,
  planStartTerm,
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onOpenRecommendations: () => void;
  onGoToPlan: () => void;
  courseSelections?: readonly CourseSelectionRecord[];
  onPlannedCourseChange?: (courseId: string, term: PlanTerm | null) => void;
  planStartTerm?: string;
}) {
  const selectionByCourseId = new Map(courseSelections.map((selection) => [selection.courseId, selection]));
  const recommendations = uniqueRecommendations(result).sort((a, b) => {
    const required = new Set(result.trackResults.flatMap((track) => track.missingRequiredCourses.map((course) => course.id)));
    return Number(required.has(b.id)) - Number(required.has(a.id));
  });
  const pathLabel = getPathLabel(profile);

  return (
    <div className="planner-result-section planner-next-courses">
      <header className="planner-result-heading">
        <span>다음 · 수강 후보와 계획</span>
        <h1 id="result-next-title" ref={headingRef} tabIndex={-1}>
          다음 수강 후보와 선택 이유를 확인하세요
        </h1>
        <p>
          {pathLabel} 기준 {recommendations.length}개 후보입니다. 필수과목 보완 후보부터 표시합니다. 자동으로 수강 선택하지 않습니다.
        </p>
      </header>

      <p className="dku-results-note">
        학기 정보는 2026년에 확인한 개설 이력을 따릅니다. 과거 개설 이력은 이후 개설을 보장하지 않습니다.
      </p>

      <section className="planner-next-course-list" aria-labelledby="next-course-title">
        <header>
          <span>{pathLabel} 기준</span>
          <h2 id="next-course-title">우선 확인할 과목</h2>
          <p>추천 이유와 어떤 모듈을 채우는지 살펴본 뒤 실제 수강 가능 여부를 확인하세요.</p>
        </header>
        {recommendations.length > 0 ? (
          <div className="dku-results-candidate-rows" aria-label="추천 이유와 개설 이력">
            {recommendations.map((course, index) => {
              const context = courseContext(course, result);
              return (
                <article className="planner-next-course dku-results-candidate-row" key={course.id}>
                  <header className="dku-results-candidate-title"><span>{String(index + 1).padStart(2, "0")}</span><div><small>{course.code}</small><h3>{course.name}</h3></div><strong>{course.credits}학점</strong></header>
                  <p className="dku-results-candidate-reason">{context.reason}</p>
                  <small className="dku-results-note">{historicalTermLabel(course)}</small>
                  <CoursePlanAction course={course} selection={selectionByCourseId.get(course.id)}
                    onChange={onPlannedCourseChange} planStartTerm={planStartTerm} />
                </article>
              );
            })}
          </div>
        ) : (
          <p className="planner-directed-empty">
            {pathProgress.trackProgress === "not-applicable"
              ? `${pathLabel} 경로에는 트랙 모듈을 기준으로 추천할 다음 과목이 없습니다. 추천 비교에서 관심 트랙을 확인하거나 학기 계획에서 전체 전공학점을 채울 후보를 검토해 주세요.`
              : "현재 입력 기준으로 남은 추천 과목이 없습니다. 수강 이력 누락과 향후 개설 여부를 확인 사항에서 점검해 주세요."}
          </p>
        )}
      </section>

      <ResultDisclosure id="result-next-modules" title="과목별로 채울 수 있는 모듈과 모듈별 충족 현황 자세히">
        <dl className="dku-results-contributions">
          {recommendations.map(course => <div key={course.id}><dt>{course.code} {course.name}</dt><dd>{courseContext(course, result).contribution}</dd></div>)}
        </dl>
        <ModuleProgressLedger result={result} />
      </ResultDisclosure>

      <section className="planner-result-next-actions" aria-labelledby="result-next-actions-title">
        <span>다음 행동</span>
        <h2 id="result-next-actions-title">트랙을 비교하거나 학기 계획을 만들어 보세요</h2>
        <p>관심·현재 이수·졸업 계획 기준을 각각 비교해 직접 판단할 수 있습니다. 추천만으로 트랙이 자동 선택되지는 않습니다.</p>
        <div>
          <button className="icon-button" type="button" onClick={onOpenRecommendations}>
            세 기준별 트랙 비교 보기
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className="icon-button" type="button" onClick={onGoToPlan}>
            이 결과로 학기 계획 만들기
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
