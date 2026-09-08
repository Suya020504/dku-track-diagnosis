import type { ReactNode } from "react";
import { ResultDisclosure } from "./ResultDisclosure";
import { EvidenceBand } from "../../components/EvidenceBand";
import { courses, tracks } from "../../data/curriculumData";
import type { EvidenceState } from "../../data/evidenceSources";
import type {
  CreditProgress,
  PathProgressResult,
  StudentProfile,
} from "../../types";

const PATH_LABELS = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
} as const;

const STATUS_LABELS: Record<PathProgressResult["status"], string> = {
  "current-input-satisfied": "참고 계산상 충족",
  "reference-calculation-satisfied": "참고 계산상 충족",
  incomplete: "보완할 조건이 있어요",
  "official-review-required": "학과 확인 필요",
};

export function getPathLabel(profile: StudentProfile): string {
  return PATH_LABELS[profile.studyPath];
}

export function getSafePathStatusLabel(status: PathProgressResult["status"]): string {
  return STATUS_LABELS[status];
}

function evidenceForProfile(profile: StudentProfile): EvidenceState {
  if (profile.ruleApplicability === "officially-verified") {
    return "official-public-confirmed";
  }
  if (profile.ruleApplicability === "reference-only") {
    return "provided-final-plan-reference";
  }
  return "department-confirmation-required";
}

function progressPercentage(progress: CreditProgress): number {
  if (progress.requiredCredits <= 0) return 0;
  return Math.min(100, Math.round((progress.completedCredits / progress.requiredCredits) * 100));
}

function ProgressStep({
  label,
  progress,
  completionLabel = "참고 계산상 기준 도달",
  children,
}: {
  label: string;
  progress: CreditProgress;
  completionLabel?: string;
  children?: ReactNode;
}) {
  const percentage = progressPercentage(progress);

  return (
    <li className="planner-progress-path__step">
      <span className="planner-progress-path__marker" aria-hidden="true" />
      <div className="planner-progress-path__content">
        <div className="planner-progress-path__heading">
          <strong>{label}</strong>
          <small className="planner-progress-path__percentage">{percentage}% 진행</small>
        </div>
        <span className="planner-progress-path__credits">
          {progress.completedCredits} / {progress.requiredCredits}학점
        </span>
        <progress
          value={Math.min(progress.completedCredits, progress.requiredCredits)}
          max={Math.max(1, progress.requiredCredits)}
          aria-label={`${label} ${progress.completedCredits} / ${progress.requiredCredits}학점`}
        />
        {progress.missingCredits > 0 ? (
          <small className="planner-progress-path__missing">{progress.missingCredits}학점 보완 필요</small>
        ) : (
          <small className="planner-progress-path__complete">{completionLabel}</small>
        )}
        {children}
      </div>
    </li>
  );
}

export function PathProgressSummary({
  profile,
  result,
}: {
  profile: StudentProfile;
  result: PathProgressResult;
}) {
  const pathLabel = getPathLabel(profile);
  const statusLabel = getSafePathStatusLabel(result.status);
  const evidenceState = evidenceForProfile(profile);
  const trackProgress = result.trackProgress === "not-applicable"
    ? undefined
    : result.trackProgress;
  const trackDefinition = trackProgress
    ? tracks.find((track) => track.id === trackProgress.trackId)
    : undefined;
  const trackCreditRequirement = trackDefinition?.rule.totalTrackCredits;
  const clampedTrackCredits = trackProgress && trackCreditRequirement !== undefined
    ? Math.min(Math.max(0, trackProgress.trackCredits), trackCreditRequirement)
    : undefined;
  const trackCreditProgress = trackProgress && trackCreditRequirement !== undefined
    ? {
        completedCredits: clampedTrackCredits ?? 0,
        requiredCredits: trackCreditRequirement,
        missingCredits: trackCreditRequirement - (clampedTrackCredits ?? 0),
      }
    : undefined;
  const hasUnmetTrackCondition = trackProgress?.moduleProgress.some(
    (module) => module.missingCredits > 0,
  ) ?? false;
  const hasIntermediateSteps = result.requiredProgress !== "not-applicable" || trackCreditProgress;
  const missingRequiredCourses = result.requiredProgress === "not-applicable"
    ? []
    : result.requiredProgress.missingCourseIds
        .map((courseId) => courses.find((course) => course.id === courseId))
        .filter((course) => course !== undefined);

  return (
    <section className="dku-results-summary" aria-labelledby="path-progress-title">
      <header className="planner-path-progress__header">
        <div>
          <span>적용 이수 경로</span>
          <h2 id="path-progress-title">{pathLabel}</h2>
        </div>
        <strong className="planner-path-progress__status">{statusLabel}</strong>
      </header>

      {!hasIntermediateSteps ? (
        <p className="planner-directed-empty">
          이 경로에는 별도 필수과목·트랙 모듈 단계가 없어 전체 전공학점 진행부터 확인합니다.
        </p>
      ) : null}

      <ol className="planner-progress-path" aria-label={`${pathLabel} 학점 현황 · 별도 계산`}>
        {result.requiredProgress !== "not-applicable" ? (
          <ProgressStep label="필수과목 진행" progress={result.requiredProgress}>
          </ProgressStep>
        ) : <li className="dku-results-na"><strong>필수과목</strong><span>이 경로는 별도 필수 조건 적용 없음</span></li>}

        {trackProgress && trackCreditProgress ? (
          <ProgressStep label="트랙 관련 학점 진행" progress={trackCreditProgress} completionLabel="참고 계산상 학점 기준 도달">
            {hasUnmetTrackCondition ? <small className="planner-progress-path__missing">보완할 트랙 조건이 있어요</small> : null}
          </ProgressStep>
        ) : <li className="dku-results-na"><strong>트랙 조건</strong><span>{result.trackProgress === "not-applicable" ? "이 경로는 트랙 조건 적용 없음" : "트랙 기준 확인 필요"}</span></li>}
        <ProgressStep label={profile.studyPath === "minor" ? "부전공 전공학점" : "전체 전공학점 진행"} progress={result.totalMajorProgress} />
      </ol>
      <EvidenceBand state={evidenceState}>
        {pathLabel} · {profile.entryYear ? `${profile.entryYear}학번 입력` : "입력한 학적 정보"} 기준.
        개인별 최종 적용은 학과 확인이 필요합니다.
      </EvidenceBand>
      <p className="dku-results-note">각 기준은 따로 확인합니다. 겹치는 조건의 부족 학점은 합산하지 않습니다.</p>
      {missingRequiredCourses.length > 0 ? <ResultDisclosure id="result-required-detail" title={`보완할 필수과목 · ${missingRequiredCourses.length}개 확인`}>
              <ul className="planner-progress-path__modules" aria-label="보완할 필수과목">
                {missingRequiredCourses.map((course) => (
                  <li key={course.id}>
                    <span>{course.code} {course.name}</span>
                    <small>{course.credits}학점 · 보완 후보</small>
                  </li>
                ))}
              </ul>
      </ResultDisclosure> : null}
      {trackProgress ? <ResultDisclosure id="result-module-detail" title="트랙 모듈별 조건 확인">
            <ul className="planner-progress-path__modules" aria-label="트랙 모듈별 진행">
              {trackProgress.moduleProgress.map((module) => (
                <li key={`${trackProgress.trackId}-${module.moduleId}-${module.label}`}>
                  <span>{module.label.replace(`${trackProgress.trackName} · `, "")}</span>
                  <small>
                    {module.completedCredits}/{module.requiredCredits}학점
                    {module.missingCredits > 0 ? ` · ${module.missingCredits}학점 보완` : " · 기준 도달"}
                  </small>
                </li>
              ))}
            </ul>
      </ResultDisclosure> : null}
    </section>
  );
}
