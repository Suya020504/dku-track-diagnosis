import { useState, type RefObject } from "react";
import { getAllowedStudyPaths } from "../../data/requirementRules2026";
import type {
  ServiceGoal,
  StudentAffiliation,
  StudentProfile,
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
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onChange: (draft: DraftProfile) => void;
  onComplete: (profile: StudentProfile) => void;
};

export function StudyPathSetup({
  profile,
  initialDraft,
  headingRef,
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
  const allowedPaths = draft.affiliation
    ? getAllowedStudyPaths(draft.affiliation)
    : [];
  const valid = Boolean(draft.affiliation && draft.studyPath);

  function update(patch: Partial<DraftProfile>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  }

  function changeAffiliation(affiliation: StudentAffiliation) {
    update({ affiliation, studyPath: undefined });
  }

  return (
    <section className="study-path-setup" aria-labelledby="study-path-title">
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

        {draft.affiliation && (
          <fieldset className="study-path-fieldset">
            <legend>이수 경로</legend>
            <div className="study-path-option-grid path-options">
              {allowedPaths.map((studyPath) => (
                <label className="study-path-option" key={studyPath}>
                  <input
                    type="radio"
                    name="studyPath"
                    checked={draft.studyPath === studyPath}
                    onChange={() => update({ studyPath })}
                  />
                  <span>{STUDY_PATH_LABELS[studyPath]}</span>
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
          {draft.affiliation && draft.studyPath
            ? `${AFFILIATION_LABELS[draft.affiliation]} · ${STUDY_PATH_LABELS[draft.studyPath]} 기준을 사용합니다.`
            : "학생 소속과 이수 경로를 선택해 주세요."}
        </p>
        <button
          className="primary-button study-path-complete"
          type="button"
          disabled={!valid}
          onClick={() => valid && onComplete(draft as StudentProfile)}
        >
          이수 과목 선택으로 이동
        </button>
      </div>
    </section>
  );
}
