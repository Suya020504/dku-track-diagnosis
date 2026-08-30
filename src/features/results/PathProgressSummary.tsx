import type { ReactNode } from "react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { courses } from "../../data/curriculumData";
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
  children,
}: {
  label: string;
  progress: CreditProgress;
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
          <small className="planner-progress-path__complete">참고 계산상 기준 도달</small>
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
  const trackCreditProgress = trackProgress
    ? {
        completedCredits: trackProgress.trackCredits,
        requiredCredits: trackProgress.moduleProgress.reduce(
          (sum, module) => sum + module.requiredCredits,
          0,
        ),
        missingCredits: trackProgress.moduleProgress.reduce(
          (sum, module) => sum + module.missingCredits,
          0,
        ),
      }
    : undefined;
  const hasIntermediateSteps = result.requiredProgress !== "not-applicable" || trackCreditProgress;
  const missingRequiredCourses = result.requiredProgress === "not-applicable"
    ? []
    : result.requiredProgress.missingCourseIds
        .map((courseId) => courses.find((course) => course.id === courseId))
        .filter((course) => course !== undefined);

  return (
    <section className="planner-path-progress" aria-labelledby="path-progress-title">
      <header className="planner-path-progress__header">
        <div>
          <span>적용 이수 경로</span>
          <h2 id="path-progress-title">{pathLabel}</h2>
        </div>
        <strong className="planner-path-progress__status">{statusLabel}</strong>
      </header>

      <EvidenceBand state={evidenceState}>
        {pathLabel} 경로와 {profile.entryYear ? `${profile.entryYear}학번 입력` : "입력한 학적 정보"}에
        따라 계산했습니다. 개인별 최종 적용 범위는 학과 안내와 함께 확인해 주세요.
      </EvidenceBand>

      {!hasIntermediateSteps ? (
        <p className="planner-directed-empty">
          이 경로에는 별도 필수과목·트랙 모듈 단계가 없어 전체 전공학점 진행부터 확인합니다.
        </p>
      ) : null}

      <ol className="planner-progress-path" aria-label={`${pathLabel} 수직 진행 경로`}>
        {result.requiredProgress !== "not-applicable" ? (
          <ProgressStep label="필수과목 진행" progress={result.requiredProgress}>
            {missingRequiredCourses.length > 0 ? (
              <ul className="planner-progress-path__modules" aria-label="보완할 필수과목">
                {missingRequiredCourses.map((course) => (
                  <li key={course.id}>
                    <span>{course.code} {course.name}</span>
                    <small>{course.credits}학점 · 보완 후보</small>
                  </li>
                ))}
              </ul>
            ) : null}
          </ProgressStep>
        ) : null}

        {trackProgress && trackCreditProgress ? (
          <ProgressStep label="트랙 모듈 진행" progress={trackCreditProgress}>
            <ul className="planner-progress-path__modules" aria-label="트랙 모듈별 진행">
              {trackProgress.moduleProgress.map((module) => (
                <li key={`${trackProgress.trackId}-${module.moduleId}`}>
                  <span>{module.label.replace(`${trackProgress.trackName} · `, "")}</span>
                  <small>
                    {module.completedCredits}/{module.requiredCredits}학점
                    {module.missingCredits > 0 ? ` · ${module.missingCredits}학점 보완` : " · 기준 도달"}
                  </small>
                </li>
              ))}
            </ul>
          </ProgressStep>
        ) : null}

        <ProgressStep
          label={profile.studyPath === "minor" ? "부전공 전공학점" : "전체 전공학점 진행"}
          progress={result.totalMajorProgress}
        />
      </ol>
    </section>
  );
}
