import { useRef, useState, type RefObject } from "react";
import { getAllowedStudyPaths } from "../../data/requirementRules2026";
import type { ProfileStage } from "../../lib/appRouting";
import type {
  ServiceGoal,
  StudentAffiliation,
  StudentProfile,
  StudyPath,
  TrackId,
} from "../../types";
import { AffiliationStep } from "./AffiliationStep";
import { StudyPathStep } from "./StudyPathStep";

export type DraftProfile = Partial<StudentProfile> &
  Pick<StudentProfile, "goal" | "curriculumRuleVersion" | "ruleApplicability">;

export type ProfileFlowProps = {
  profile?: StudentProfile;
  initialDraft?: Partial<StudentProfile>;
  targetTrackId?: TrackId;
  profileStage?: ProfileStage;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onTargetTrackChange?: (trackId: TrackId | undefined) => void;
  onProfileStageChange?: (stage: ProfileStage) => void;
  onChange: (draft: DraftProfile) => void;
  onComplete: (profile: StudentProfile) => void;
};

export function ProfileFlow({
  profile,
  initialDraft,
  targetTrackId,
  profileStage = "affiliation",
  headingRef,
  onTargetTrackChange,
  onProfileStageChange,
  onChange,
  onComplete,
}: ProfileFlowProps) {
  const [draft, setDraft] = useState<DraftProfile>(() => ({
    goal: "check-progress",
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
    ...(initialDraft !== undefined ? initialDraft : profile),
  }));
  const [draftTargetTrackId, setDraftTargetTrackId] = useState<TrackId | undefined>(targetTrackId);
  const submittedRef = useRef(false);
  const allowedPaths = draft.affiliation ? getAllowedStudyPaths(draft.affiliation) : [];
  const pathValid = Boolean(
    draft.affiliation && draft.studyPath && allowedPaths.includes(draft.studyPath),
  );
  const targetTrackRequired = draft.studyPath === "track-major" && draft.goal !== "find-track";
  const valid = pathValid && (!targetTrackRequired || Boolean(draftTargetTrackId));

  function update(patch: Partial<DraftProfile>) {
    const next = { ...draft, ...patch };
    submittedRef.current = false;
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
    submittedRef.current = false;
    setDraftTargetTrackId(trackId);
    onTargetTrackChange?.(trackId);
  }

  function complete() {
    if (submittedRef.current || !valid || !draft.affiliation || !draft.studyPath) return;
    submittedRef.current = true;
    onComplete({
      ...draft,
      affiliation: draft.affiliation,
      studyPath: draft.studyPath,
    });
  }

  return (
    <section className="profile-flow" aria-labelledby="profile-entry-title" data-profile-stage={profileStage}>
      <ol className="profile-stage-markers" aria-label="프로필 입력 단계">
        <li
          data-profile-stage-marker="affiliation"
          aria-current={profileStage === "affiliation" ? "step" : undefined}
        >
          <span aria-hidden="true" />
          <strong>소속</strong>
        </li>
        <li
          data-profile-stage-marker="path"
          aria-current={profileStage === "path" ? "step" : undefined}
        >
          <span aria-hidden="true" />
          <strong>이수 경로</strong>
        </li>
      </ol>

      {profileStage === "affiliation" ? (
        <AffiliationStep
          value={draft.affiliation}
          headingRef={headingRef}
          onChange={changeAffiliation}
          onNext={() => onProfileStageChange?.("path")}
        />
      ) : (
        <StudyPathStep
          affiliation={draft.affiliation}
          goal={draft.goal as ServiceGoal}
          studyPath={draft.studyPath}
          entryYear={draft.entryYear}
          targetTrackId={draftTargetTrackId}
          allowedPaths={allowedPaths}
          valid={valid}
          headingRef={headingRef}
          onGoalChange={(goal) => update({ goal })}
          onStudyPathChange={changeStudyPath}
          onEntryYearChange={(entryYear) => update({ entryYear })}
          onTargetTrackChange={changeTargetTrack}
          onBack={() => onProfileStageChange?.("affiliation")}
          onComplete={complete}
        />
      )}
    </section>
  );
}
