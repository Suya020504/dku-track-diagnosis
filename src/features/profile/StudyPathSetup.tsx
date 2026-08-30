import { useState, type RefObject } from "react";
import { tracks } from "../../data/curriculumData";
import { getAllowedStudyPaths } from "../../data/requirementRules2026";
import type {
  ServiceGoal,
  StudentAffiliation,
  StudentProfile,
  StudyPath,
  TrackId,
} from "../../types";

const AFFILIATION_LABELS = {
  "department-student": "식품자원경제학과 입학생",
  "external-student": "타 학과 학생",
} as const;

const STUDY_PATH_LABELS = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
} as const;

const GOAL_LABELS: Record<ServiceGoal, string> = {
  "learn-track-system": "트랙제 이해하기",
  "find-track": "관심 트랙 찾기",
  "check-progress": "현재 진행도 확인하기",
  "plan-graduation": "졸업 전 계획 확인하기",
};

type DraftProfile = Partial<StudentProfile> &
  Pick<StudentProfile, "goal" | "curriculumRuleVersion" | "ruleApplicability">;

type StudyPathSetupProps = {
  profile?: StudentProfile;
  initialDraft?: Partial<StudentProfile>;
  targetTrackId?: TrackId;
  profileStage?: "affiliation" | "path";
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onTargetTrackChange?: (trackId: TrackId | undefined) => void;
  onProfileStageChange?: (stage: "affiliation" | "path") => void;
  onChange: (draft: DraftProfile) => void;
  onComplete: (profile: StudentProfile) => void;
};

export function StudyPathSetup({
  profile,
  initialDraft,
  targetTrackId,
  profileStage = "affiliation",
  headingRef,
  onTargetTrackChange,
  onProfileStageChange,
  onChange,
  onComplete,
}: StudyPathSetupProps) {
  const [draft, setDraft] = useState<DraftProfile>({
    goal: "check-progress",
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
    ...initialDraft,
    ...profile,
  });
  const [draftTargetTrackId, setDraftTargetTrackId] = useState<TrackId | undefined>(targetTrackId);
  const allowedPaths = draft.affiliation
    ? getAllowedStudyPaths(draft.affiliation)
    : [];
  const pathValid = Boolean(
    draft.affiliation &&
      draft.studyPath &&
      allowedPaths.includes(draft.studyPath),
  );
  const targetTrackRequired = draft.studyPath === "track-major" && draft.goal !== "find-track";
  const valid = pathValid &&
    (!targetTrackRequired || Boolean(draftTargetTrackId));

  function update(patch: Partial<DraftProfile>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  }

  function changeAffiliation(affiliation: StudentAffiliation) {
    update({ affiliation, studyPath: undefined });
  }

  function changeStudyPath(studyPath: StudyPath) {
    if (studyPath !== "track-major") changeTargetTrack(undefined);
    update({ studyPath });
  }

  function changeTargetTrack(trackId: TrackId | undefined) {
    setDraftTargetTrackId(trackId);
    onTargetTrackChange?.(trackId);
  }

  function complete() {
    if (!valid || !draft.affiliation || !draft.studyPath) return;
    onComplete({
      ...draft,
      affiliation: draft.affiliation,
      studyPath: draft.studyPath,
    });
  }

  return (
    <section className="study-path-setup" aria-labelledby="study-path-title" data-profile-stage={profileStage}>
      <div className="study-path-setup-card">
        <header className="study-path-setup-head">
          <span>맞춤 진단 시작</span>
          <h1
            className="step-focus-heading"
            id="study-path-title"
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
          >
            내 상황에 맞는 이수 기준을 먼저 확인해요.
          </h1>
          <p>
            소속과 이수 경로에 따라 적용되는 기준이 달라집니다. 현재 상황에
            가장 가까운 항목을 선택해 주세요.
          </p>
        </header>

        <div className="study-path-stage-index" role="tablist" aria-label="프로필 입력 단계">
          <button
            data-profile-stage="affiliation"
            type="button"
            role="tab"
            aria-selected={profileStage === "affiliation"}
            onClick={() => onProfileStageChange?.("affiliation")}
          >
            소속 확인
          </button>
          <button
            data-profile-stage="path"
            type="button"
            role="tab"
            aria-selected={profileStage === "path"}
            onClick={() => onProfileStageChange?.("path")}
          >
            이수 경로
          </button>
        </div>

        <div data-profile-region="affiliation" hidden={profileStage !== "affiliation"}>
          <fieldset className="study-path-fieldset">
            <legend>학생 소속</legend>
            <div className="study-path-option-grid">
              {(Object.keys(AFFILIATION_LABELS) as StudentAffiliation[]).map(
                (affiliation) => (
                  <label className="study-path-option" key={affiliation}>
                    <input
                      type="radio"
                      name="affiliation"
                      checked={draft.affiliation === affiliation}
                      onChange={() => changeAffiliation(affiliation)}
                    />
                    <span>{AFFILIATION_LABELS[affiliation]}</span>
                  </label>
                ),
              )}
            </div>
          </fieldset>
          <button
            className="primary-button"
            type="button"
            disabled={!draft.affiliation}
            onClick={() => onProfileStageChange?.("path")}
          >
            이수 경로 선택
          </button>
        </div>

        <div data-profile-region="path" hidden={profileStage !== "path"}>
          <button className="text-button" type="button" onClick={() => onProfileStageChange?.("affiliation")}>
            소속 다시 선택
          </button>
          {!draft.affiliation ? (
            <p className="study-path-status" role="status">소속을 먼저 선택해 주세요. 소속을 선택한 뒤 이수 경로를 정할 수 있습니다.</p>
          ) : (
            <>
              <fieldset className="study-path-fieldset">
                <legend>지금 확인하고 싶은 것</legend>
                <div className="study-path-option-grid goal-options">
                  {(Object.keys(GOAL_LABELS) as ServiceGoal[]).map((goal) => (
                    <label className="study-path-option" key={goal}>
                      <input
                        type="radio"
                        name="goal"
                        checked={draft.goal === goal}
                        onChange={() => update({ goal })}
                      />
                      <span>{GOAL_LABELS[goal]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="study-path-fieldset">
                <legend>이수 경로</legend>
                <div className="study-path-option-grid path-options">
                  {allowedPaths.map((studyPath) => (
                    <label className="study-path-option" key={studyPath}>
                      <input
                        type="radio"
                        name="studyPath"
                        checked={draft.studyPath === studyPath}
                        onChange={() => changeStudyPath(studyPath)}
                      />
                      <span>{STUDY_PATH_LABELS[studyPath]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {draft.studyPath === "track-major" && (
                <fieldset className="study-path-fieldset">
                  <legend>
                    진단할 트랙
                    {draft.goal === "find-track" && (
                      <small> (설문 전에는 선택하지 않아도 됩니다)</small>
                    )}
                  </legend>
                  <div className="study-path-option-grid track-options">
                    {tracks.map((track) => (
                      <label className="study-path-option" key={track.id}>
                        <input
                          type="radio"
                          name="targetTrackId"
                          checked={draftTargetTrackId === track.id}
                          onChange={() => changeTargetTrack(track.id)}
                        />
                        <span>
                          <strong>{track.name}</strong>
                          <small>{track.kind}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <label className="study-path-entry-year">
                <span>입학연도 <small>(선택)</small></span>
                <input
                  type="number"
                  min="2000"
                  max="2026"
                  value={draft.entryYear ?? ""}
                  onChange={(event) =>
                    update({
                      entryYear: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </label>

              <p className="study-path-status" role="status">
                {draft.studyPath
                  ? `${AFFILIATION_LABELS[draft.affiliation]} · ${STUDY_PATH_LABELS[draft.studyPath]} 기준을 사용합니다.`
                  : "이수 경로를 선택해 주세요."}
              </p>
              <button
                className="primary-button study-path-complete"
                type="button"
                disabled={!valid}
                onClick={complete}
              >
                {draft.goal === "find-track" && !draftTargetTrackId
                  ? "관심 설문으로 이동"
                  : "이수 과목 선택으로 이동"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
