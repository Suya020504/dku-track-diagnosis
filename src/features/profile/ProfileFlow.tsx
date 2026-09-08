import { useRef, useState, type RefObject } from "react";
import { bridgeProfileMajorContext } from "../../lib/majorContext";
import type { ProfileStage } from "../../lib/appRouting";
import type {
  EntryIntent,
  StudentAffiliation,
  StudentProfile,
  TrackId,
} from "../../types";
import { AffiliationStep } from "./AffiliationStep";
import { MajorInformationStep } from "./MajorInformationStep";
import { DirectionStep } from "./DirectionStep";

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
  entryIntent?: EntryIntent;
  onEntryIntentChange?: (intent: EntryIntent) => void;
  onStartDirection?: (intent: EntryIntent) => void;
};

export function ProfileFlow({
  profile,
  initialDraft,
  profileStage = "affiliation",
  headingRef,
  onProfileStageChange,
  onChange,
  onComplete,
  entryIntent,
  onEntryIntentChange,
  onStartDirection,
}: ProfileFlowProps) {
  const [draft, setDraft] = useState<DraftProfile>(() => ({
    goal: "check-progress",
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
    ...(initialDraft !== undefined ? initialDraft : profile),
  }));
  const [direction, setDirection] = useState<EntryIntent>(entryIntent ?? "known-tracks");
  const submittedRef = useRef(false);
  const entryYearValid = draft.entryYear === undefined || (
    Number.isInteger(draft.entryYear)
    && draft.entryYear >= 2000
    && draft.entryYear <= 2026
  );
  const valid = Boolean(draft.affiliation) && entryYearValid;

  function update(patch: Partial<DraftProfile>) {
    const next = { ...draft, ...patch };
    submittedRef.current = false;
    setDraft(next);
    onChange(next);
  }

  function changeAffiliation(affiliation: StudentAffiliation) {
    update({ affiliation, studyPath: undefined, majorRole: affiliation === "department-student" ? "primary" : "undecided", otherMajor: undefined });
  }

  function complete() {
    if (submittedRef.current || !valid || !draft.affiliation) return;
    const completed = bridgeProfileMajorContext(draft);
    if (!completed.studyPath) return;
    submittedRef.current = true;
    onComplete({
      ...draft, ...completed,
      affiliation: draft.affiliation,
      studyPath: completed.studyPath,
    });
  }

  return (
    <section className="dku-profile-page" aria-labelledby="dku-profile-title" data-profile-stage={profileStage}>
      <ol className="dku-profile-stages" aria-label="프로필 입력 단계">
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
          <strong>내 정보</strong>
        </li>
        <li data-profile-stage-marker="direction" aria-current={profileStage === "direction" ? "step" : undefined}><span aria-hidden="true" /><strong>시작 방법</strong></li>
      </ol>

      {profileStage === "affiliation" ? (
        <AffiliationStep
          value={draft.affiliation}
          headingRef={headingRef}
          onChange={changeAffiliation}
          onNext={() => onProfileStageChange?.("path")}
        />
      ) : profileStage === "direction" && profile ? (
        <DirectionStep value={entryIntent ?? direction} headingRef={headingRef} onChange={intent => { setDirection(intent); onEntryIntentChange?.(intent); }} onContinue={intent => onStartDirection?.(intent)} onBack={() => onProfileStageChange?.("path")} />
      ) : (
        <MajorInformationStep
          draft={draft}
          entryYearValid={entryYearValid}
          headingRef={headingRef}
          onChange={update}
          onBack={() => onProfileStageChange?.("affiliation")}
          onComplete={complete}
        />
      )}
    </section>
  );
}
