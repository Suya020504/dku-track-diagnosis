import type { CreditProgress, PathProgressResult, StudentProfile } from "../../types";

const PATH_LABELS = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
} as const;

function ProgressLine({ label, progress }: { label: string; progress: CreditProgress }) {
  return (
    <section aria-label={`${label} ${progress.completedCredits} / ${progress.requiredCredits}학점`}>
      <strong>{label}</strong>
      <span>{progress.completedCredits} / {progress.requiredCredits}학점</span>
      <progress value={progress.completedCredits} max={progress.requiredCredits} />
      {progress.missingCredits > 0 && <small>{progress.missingCredits}학점 부족</small>}
    </section>
  );
}

export function PathProgressSummary({
  profile,
  result,
}: {
  profile: StudentProfile;
  result: PathProgressResult;
}) {
  const statusLabel = {
    "current-input-satisfied": "현재 입력 기준 충족",
    "reference-calculation-satisfied": "참고 계산상 충족",
    incomplete: "보완할 조건이 있어요",
    "official-review-required": "공식 확인 필요",
  }[result.status];

  return (
    <section aria-labelledby="path-progress-title">
      <p>{PATH_LABELS[profile.studyPath]} 기준</p>
      <h2 id="path-progress-title">{statusLabel}</h2>
      {result.requiredProgress !== "not-applicable" && (
        <ProgressLine label="필수과목 진행도" progress={result.requiredProgress} />
      )}
      {result.trackProgress !== "not-applicable" && (
        <section aria-label="트랙 모듈 진행도">
          <strong>트랙 모듈 진행도</strong>
          {result.trackProgress.moduleProgress.map((module) => (
            <ProgressLine key={module.label} label={module.label} progress={module} />
          ))}
        </section>
      )}
      <ProgressLine
        label={profile.studyPath === "minor" ? "부전공 전공학점" : "전체 전공학점"}
        progress={result.totalMajorProgress}
      />
      {result.reviewItems.length > 0 && (
        <aside aria-labelledby="review-title">
          <h3 id="review-title">공식 확인 필요</h3>
          <ul>
            {result.reviewItems.map((item, index) => (
              <li key={`${item.code}-${index}`}>{item.message}</li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  );
}
