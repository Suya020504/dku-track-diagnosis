import type { RefObject } from "react";
import { ArrowRight } from "lucide-react";
import { ResultDisclosure } from "./ResultDisclosure";
import { TrackGlyph } from "../../components/TrackGlyph";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import { modules } from "../../data/curriculumData";
import type {
  Course,
  DiagnosisResult,
  PathProgressResult,
  StudentProfile,
} from "../../types";
import { getPathLabel } from "./PathProgressSummary";

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
        : "입력한 이수 현황에서 다음 확인 후보로 계산된 과목입니다.",
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
        <h2 id="module-ledger-title">다음 과목이 채울 모듈을 함께 보세요</h2>
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
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onOpenRecommendations: () => void;
  onGoToPlan: () => void;
}) {
  const recommendations = uniqueRecommendations(result).sort((a, b) => {
    const required = new Set(result.trackResults.flatMap((track) => track.missingRequiredCourses.map((course) => course.id)));
    return Number(required.has(b.id)) - Number(required.has(a.id));
  });
  const pathLabel = getPathLabel(profile);

  return (
    <div className="planner-result-section planner-next-courses">
      <header className="planner-result-heading">
        <span>다음 · 선택할 과목과 행동</span>
        <h1 id="result-next-title" ref={headingRef} tabIndex={-1}>
          다음 수강 후보와 선택 이유를 확인하세요
        </h1>
        <p>
          {pathLabel} 기준 {recommendations.length}개 후보입니다. 필수 보완 후보를 먼저 표시하며, 자동으로 수강 선택하지 않습니다.
        </p>
      </header>

      <p className="dku-results-note">
        2026 이력 스냅샷을 바탕으로 학기 정보를 표시합니다. 과거 개설 이력은 이후 개설을 보장하지 않습니다.
      </p>

      <section className="planner-next-course-list" aria-labelledby="next-course-title">
        <header>
          <span>{pathLabel} 기준</span>
          <h2 id="next-course-title">우선 확인할 과목</h2>
          <p>추천 이유와 모듈 기여를 읽은 뒤 실제 수강 가능 여부를 확인하세요.</p>
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
                </article>
              );
            })}
          </div>
        ) : (
          <p className="planner-directed-empty">
            {pathProgress.trackProgress === "not-applicable"
              ? `${pathLabel} 경로에는 트랙 모듈 기반 다음 과목이 없습니다. 추천 비교에서 관심 트랙을 확인하거나 학기 계획에서 전체 전공학점 후보를 검토해 주세요.`
              : "현재 입력 기준으로 남은 추천 과목이 없습니다. 수강 이력 누락과 향후 개설 여부를 확인 사항에서 점검해 주세요."}
          </p>
        )}
      </section>

      <ResultDisclosure id="result-next-modules" title="과목별 모듈 기여와 모듈별 충족 현황 자세히">
        <dl className="dku-results-contributions">
          {recommendations.map(course => <div key={course.id}><dt>{course.code} {course.name}</dt><dd>{courseContext(course, result).contribution}</dd></div>)}
        </dl>
        <ModuleProgressLedger result={result} />
      </ResultDisclosure>

      <section className="planner-result-next-actions" aria-labelledby="result-next-actions-title">
        <span>다음 행동</span>
        <h2 id="result-next-actions-title">비교하거나 학기 계획에 담아 보세요</h2>
        <p>추천은 트랙을 자동 선택하지 않습니다. 관심·현재 이수·졸업 계획 기준을 나눠 직접 판단할 수 있습니다.</p>
        <div>
          <button className="icon-button" type="button" onClick={onOpenRecommendations}>
            세 기준별 트랙 비교 보기
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className="icon-button" type="button" onClick={onGoToPlan}>
            추천 과목을 학기 계획에 담기
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
