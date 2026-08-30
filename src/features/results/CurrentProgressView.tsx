import type { RefObject } from "react";
import { TrackGlyph } from "../../components/TrackGlyph";
import type {
  DiagnosisResult,
  PathProgressResult,
  StudentProfile,
  TrackDiagnosisResult,
} from "../../types";
import {
  getSafePathStatusLabel,
  PathProgressSummary,
} from "./PathProgressSummary";

function shortModuleLabel(label: string, trackName: string): string {
  return label.replace(`${trackName} · `, "");
}

function TrackComparisonRow({ track }: { track: TrackDiagnosisResult }) {
  const missingModules = track.moduleProgress.filter((module) => module.missingCredits > 0);
  const hasUnmetCondition = missingModules.length > 0 || track.missingRequiredCourses.length > 0;

  return (
    <article className="planner-track-comparison__row">
      <header>
        <TrackGlyph trackId={track.trackId} />
        <div>
          <span>{track.trackKind}</span>
          <h3>{track.trackName}</h3>
        </div>
        <strong>
          {hasUnmetCondition ? "보완할 트랙 조건이 있어요" : "참고 계산상 트랙 조건 도달"}
        </strong>
      </header>
      <dl>
        <div>
          <dt>트랙 인정 학점</dt>
          <dd>{track.trackCredits}학점</dd>
        </div>
        <div>
          <dt>보완 조건</dt>
          <dd>{missingModules.length}개</dd>
        </div>
        <div>
          <dt>진행률</dt>
          <dd><small>{track.completionRate}% · 참고 비율</small></dd>
        </div>
      </dl>
      {missingModules.length > 0 ? (
        <ul className="planner-track-comparison__gaps" aria-label={`${track.trackName} 부족 모듈`}>
          {missingModules.map((module) => {
            const candidates = track.remainingCourses.filter((course) => (
              module.courseIds.includes(course.id)
            ));

            return (
              <li key={`${track.trackId}-${module.moduleId}-${module.label}`}>
                <div>
                  <strong>{shortModuleLabel(module.label, track.trackName)}</strong>
                  <span>{module.missingCredits}학점 보완 필요</span>
                </div>
                <small>
                  {candidates.length > 0
                    ? `후보: ${candidates.slice(0, 3).map((course) => course.name).join(", ")}`
                    : "해당 모듈의 남은 과목을 확인해 주세요."}
                </small>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="planner-directed-empty">현재 체크 기준으로 더 채워야 할 트랙 모듈이 없습니다.</p>
      )}
    </article>
  );
}

export function CurrentProgressView({
  result,
  profile,
  pathProgress,
  headingRef,
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const statusLabel = getSafePathStatusLabel(pathProgress.status);

  return (
    <div className="planner-result-section planner-current-progress">
      <header className="planner-result-heading">
        <span>현재 · 계산된 진행 경로</span>
        <h1 id="result-current-title" ref={headingRef} tabIndex={-1}>
          {statusLabel}. 현재 경로를 단계별로 확인하세요
        </h1>
        <p>
          입력한 완료 과목만 현재 진행에 반영했습니다. 진행률은 판단을 돕는 보조 정보이며,
          최종 적용 여부는 확인 사항에서 다시 점검해 주세요.
        </p>
      </header>

      <PathProgressSummary profile={profile} result={pathProgress} />

      <section className="planner-track-comparison" aria-labelledby="track-comparison-title">
        <header>
          <span>트랙 비교</span>
          <h2 id="track-comparison-title">선택한 트랙의 학점과 조건별 부족분</h2>
          <p>서로 겹칠 수 있는 조건의 부족 학점은 합산하지 않습니다. 조건별 남은 학점과 후보 과목을 각각 확인하세요.</p>
        </header>
        {result.trackResults.length > 0 ? (
          <div className="planner-track-comparison__list">
            {result.trackResults.map((track) => (
              <TrackComparisonRow track={track} key={track.trackId} />
            ))}
          </div>
        ) : (
          <p className="planner-directed-empty">
            이 이수 경로에는 비교 중인 트랙이 없습니다. 전체 전공학점 진행을 확인한 뒤
            ‘다음’에서 트랙 추천 또는 학기 계획으로 이동할 수 있습니다.
          </p>
        )}
      </section>
    </div>
  );
}
