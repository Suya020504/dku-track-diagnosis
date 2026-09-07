import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import type { RefObject } from "react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { tracks } from "../../data/curriculumData";
import type {
  ServiceGoal,
  StudentAffiliation,
  StudyPath,
  TrackId,
} from "../../types";

const AFFILIATION_LABELS: Record<StudentAffiliation, string> = {
  "department-student": "식품자원경제학과 학생",
  "external-student": "타 학과 학생",
};

const STUDY_PATH_LABELS: Record<StudyPath, string> = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
};

const GOAL_LABELS: Record<StudentAffiliation, Record<ServiceGoal, string>> = {
  "department-student": {
    "learn-track-system": "트랙제 구조 이해하기",
    "find-track": "전공 안에서 관심 트랙 찾기",
    "check-progress": "전공 이수 진행도 확인하기",
    "plan-graduation": "졸업 전 전공 계획 확인하기",
  },
  "external-student": {
    "learn-track-system": "식자경 이수 방식 이해하기",
    "find-track": "내 전공과 연결할 트랙 찾기",
    "check-progress": "인정 가능 과목과 진행도 확인하기",
    "plan-graduation": "다전공·부전공 이수 계획 확인하기",
  },
};

export function StudyPathStep({
  affiliation,
  goal,
  studyPath,
  entryYear,
  entryYearValid,
  targetTrackId,
  allowedPaths,
  valid,
  headingRef,
  onGoalChange,
  onStudyPathChange,
  onEntryYearChange,
  onTargetTrackChange,
  onBack,
  onComplete,
}: {
  affiliation?: StudentAffiliation;
  goal: ServiceGoal;
  studyPath?: StudyPath;
  entryYear?: number;
  entryYearValid: boolean;
  targetTrackId?: TrackId;
  allowedPaths: StudyPath[];
  valid: boolean;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onGoalChange: (goal: ServiceGoal) => void;
  onStudyPathChange: (studyPath: StudyPath) => void;
  onEntryYearChange: (entryYear: number | undefined) => void;
  onTargetTrackChange: (trackId: TrackId | undefined) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  if (!affiliation) {
    return (
      <section className="profile-entry-step" data-profile-region="path">
        <header className="profile-entry-band profile-entry-band--mint">
          <span>맞춤 진단 준비 · 이수 경로</span>
          <h1 id="profile-entry-title" ref={headingRef} tabIndex={-1}>
            소속 확인이 먼저 필요해요
          </h1>
        </header>
        <div className="profile-recovery" role="status">
          <strong>소속을 먼저 선택해 주세요.</strong>
          <p>직접 링크로 이 단계에 들어왔습니다. 소속을 선택하면 가능한 이수 경로를 정확히 보여드릴게요.</p>
          <button
            className="profile-secondary-action planner-focusable"
            data-profile-recover
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            소속 선택으로 돌아가기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-entry-step" data-profile-region="path">
      <header className="profile-entry-band profile-entry-band--mint">
        <span>맞춤 진단 준비 · 이수 경로</span>
        <h1 id="profile-entry-title" ref={headingRef} tabIndex={-1}>
          확인할 이수 경로를 정해 주세요
        </h1>
        <p>{AFFILIATION_LABELS[affiliation]}에게 적용되는 선택지만 보여드립니다.</p>
      </header>

      <p className="profile-entry-status profile-entry-status--midyear">
        {"2·3학년도 현재 이수 과목으로 참고 진단할 수 있습니다. 실제 트랙 신청 가능 시기, 적용 학번과 최종 인정 범위는 학과 확인이 필요합니다."}
      </p>

      <fieldset className="profile-entry-fieldset">
        <legend>지금 확인하고 싶은 것</legend>
        <div className="profile-entry-rows profile-entry-rows--compact">
          {(Object.keys(GOAL_LABELS[affiliation]) as ServiceGoal[]).map((candidateGoal) => (
            <label className="profile-entry-row" key={candidateGoal}>
              <input
                type="radio"
                name="goal"
                value={candidateGoal}
                checked={goal === candidateGoal}
                onChange={() => onGoalChange(candidateGoal)}
              />
              <span><strong>{GOAL_LABELS[affiliation][candidateGoal]}</strong></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="profile-entry-fieldset">
        <legend>이수 경로</legend>
        <div className="profile-entry-rows profile-entry-rows--compact">
          {allowedPaths.map((candidatePath) => (
            <label className="profile-entry-row" key={candidatePath}>
              <input
                type="radio"
                name="studyPath"
                value={candidatePath}
                checked={studyPath === candidatePath}
                onChange={() => onStudyPathChange(candidatePath)}
              />
              <span><strong>{STUDY_PATH_LABELS[candidatePath]}</strong></span>
            </label>
          ))}
        </div>
      </fieldset>

      {studyPath === "track-major" ? (
        <fieldset className="profile-entry-fieldset">
          <legend>
            진단할 트랙
            {goal === "find-track" ? <small> (설문 전에는 선택하지 않아도 됩니다)</small> : null}
            {goal === "check-progress" ? <small> (선택 · 목표 없이 5개 트랙 비교 가능)</small> : null}
          </legend>
          <div className="profile-track-rows">
            {goal === "check-progress" ? (
              <label className="profile-track-row">
                <input
                  type="radio"
                  name="targetTrackId"
                  checked={targetTrackId === undefined}
                  data-target-track-choice="compare-all"
                  onChange={() => onTargetTrackChange(undefined)}
                />
                <ListChecks aria-hidden="true" size={24} />
                <span>
                  <strong>아직 정하지 않았어요 · 5개 트랙 비교</strong>
                  <small>현재 이수 과목만으로 가까운 트랙을 나란히 봅니다.</small>
                </span>
              </label>
            ) : null}
            {tracks.map((track) => (
              <label className="profile-track-row" key={track.id}>
                <input
                  type="radio"
                  name="targetTrackId"
                  value={track.id}
                  checked={targetTrackId === track.id}
                  onChange={() => onTargetTrackChange(track.id)}
                />
                <TrackGlyph trackId={track.id} decorative />
                <span>
                  <strong>{track.name}</strong>
                  <small>{track.kind}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="profile-entry-year">
        <span>입학연도 <small>(선택)</small></span>
        <input
          type="number"
          min="2000"
          max="2026"
          inputMode="numeric"
          aria-invalid={entryYearValid ? undefined : true}
          aria-describedby={entryYearValid ? undefined : "profile-entry-year-error"}
          value={entryYear ?? ""}
          onChange={(event) => onEntryYearChange(
            event.target.value ? Number(event.target.value) : undefined,
          )}
        />
        {!entryYearValid ? (
          <small id="profile-entry-year-error" role="alert">
            입학연도는 2000년부터 2026년 사이로 입력해 주세요.
          </small>
        ) : null}
      </label>

      <p className="profile-entry-status" role="status">
        {studyPath && allowedPaths.includes(studyPath)
          ? `${AFFILIATION_LABELS[affiliation]} · ${STUDY_PATH_LABELS[studyPath]} 기준을 사용합니다.`
          : "이수 경로를 선택해 주세요."}
      </p>

      <div className="profile-entry-actions profile-entry-actions--split">
        <button className="profile-back-action planner-focusable" type="button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
          소속으로 돌아가기
        </button>
        <button
          className="primary-button study-path-complete planner-focusable"
          type="button"
          disabled={!valid}
          onClick={onComplete}
        >
          {goal === "find-track" && !targetTrackId
            ? "관심 설문으로 이동"
            : "이수 과목 선택으로 이동"}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </section>
  );
}
