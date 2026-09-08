import type { MajorRole, OtherMajor, StudentProfile, StudyPath } from "../types";

/** Reads older academic paths without rewriting their saved source. */
export function getMajorContext(profile?: Partial<StudentProfile>): {
  majorRole: MajorRole;
  otherMajor?: OtherMajor;
  label: string;
  academicRequirementsConfirmed: boolean;
} {
  if (profile?.affiliation === "department-student") {
    const otherMajor = profile.otherMajor ?? (profile.studyPath === "advanced-major" ? "no" : profile.studyPath === "department-with-other-major" ? "yes" : "unsure");
    return { majorRole: "primary", otherMajor, label: "식품자원경제학과 주전공", academicRequirementsConfirmed: otherMajor !== "unsure" };
  }
  const majorRole = profile?.majorRole ?? (profile?.studyPath === "double-major" || profile?.studyPath === "minor" ? profile.studyPath : "undecided");
  return { majorRole, label: majorRole === "double-major" ? "식품자원경제학과 복수전공" : majorRole === "minor" ? "식품자원경제학과 부전공" : "전공 이수 형태 미정", academicRequirementsConfirmed: majorRole === "double-major" || majorRole === "minor" };
}

/** Compatibility bridge only: the selected-track calculation does not use this academic path. */
export function bridgeProfileMajorContext(draft: Partial<StudentProfile>): Partial<StudentProfile> {
  if (!draft.affiliation) return draft;
  const context = getMajorContext(draft);
  let studyPath: StudyPath;
  if (draft.affiliation === "department-student") {
    studyPath = context.otherMajor === "no" ? "advanced-major" : context.otherMajor === "yes" ? "department-with-other-major" : "track-major";
  } else {
    studyPath = context.majorRole === "double-major" || context.majorRole === "minor" ? context.majorRole : "track-major";
  }
  return { ...draft, majorRole: context.majorRole, ...(context.otherMajor ? { otherMajor: context.otherMajor } : {}), studyPath };
}
