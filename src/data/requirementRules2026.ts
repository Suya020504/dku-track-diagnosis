import type {
  ModuleId,
  RequirementEvidenceStatus,
  StudentAffiliation,
  StudentProfile,
  StudyPath,
  TrackId,
} from "../types";

export const REQUIRED_COURSE_VARIANTS = {
  "starred-six-2026": {
    courseIds: ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"],
    requiredCredits: 18,
    evidence: "provided-final-plan" as RequirementEvidenceStatus,
    allowsOfficialCompletion: false,
  },
} as const;

export type TrackRequirement =
  | { type: "major"; moduleIds: ModuleId[]; creditsPerModule: 6; totalCredits: 30 }
  | {
      type: "food-bio";
      baseModuleIds: ["F", "H", "I"];
      creditsPerBaseModule: 3;
      baseCreditsTotal: 15;
      moduleMCredits: 8;
      moduleNOCredits: 7;
      totalCredits: 30;
    };

export type RequirementRule = {
  affiliation: StudentAffiliation;
  studyPath: StudyPath;
  totalMajorCredits: 63 | 48 | 45 | 42 | 21;
  requiredCourseVariantId: "starred-six-2026" | null;
  trackRule: TrackRequirement | null;
  evidence: RequirementEvidenceStatus;
  forcesOfficialReview: boolean;
};

export function getAllowedStudyPaths(affiliation: StudentAffiliation): StudyPath[] {
  return affiliation === "department-student"
    ? ["advanced-major", "track-major", "department-with-other-major"]
    : ["double-major", "minor", "track-major"];
}

const MAJOR_TRACK_MODULES: Record<Exclude<TrackId, "food-bio-economy">, ModuleId[]> = {
  "food-marketing": ["F", "H", "I", "J", "L"],
  "regional-development-consulting": ["D", "E", "H", "I", "K"],
  "agri-food-distribution": ["F", "G", "J", "K", "L"],
  economics: ["D", "E", "G", "J", "L"],
};

function getTrackRequirement(trackId: TrackId | undefined): TrackRequirement {
  if (!trackId) throw new Error("A target track is required for the track-major path");
  if (trackId === "food-bio-economy") {
    return {
      type: "food-bio",
      baseModuleIds: ["F", "H", "I"],
      creditsPerBaseModule: 3,
      baseCreditsTotal: 15,
      moduleMCredits: 8,
      moduleNOCredits: 7,
      totalCredits: 30,
    };
  }
  return { type: "major", moduleIds: MAJOR_TRACK_MODULES[trackId], creditsPerModule: 6, totalCredits: 30 };
}

export function getRequirementRule(profile: StudentProfile, trackId?: TrackId): RequirementRule {
  const key = `${profile.affiliation}:${profile.studyPath}`;
  const referenceOnly = profile.ruleApplicability !== "officially-verified";
  const base = {
    affiliation: profile.affiliation,
    studyPath: profile.studyPath,
    evidence: "provided-final-plan" as RequirementEvidenceStatus,
  };
  switch (key) {
    case "department-student:advanced-major":
      return { ...base, totalMajorCredits: 63, requiredCourseVariantId: "starred-six-2026", trackRule: null, forcesOfficialReview: true };
    case "department-student:track-major":
      return { ...base, totalMajorCredits: 63, requiredCourseVariantId: "starred-six-2026", trackRule: getTrackRequirement(trackId), forcesOfficialReview: true };
    case "department-student:department-with-other-major":
      return { ...base, totalMajorCredits: 42, requiredCourseVariantId: "starred-six-2026", trackRule: null, forcesOfficialReview: true };
    case "external-student:double-major":
      return { ...base, totalMajorCredits: 42, requiredCourseVariantId: "starred-six-2026", trackRule: null, forcesOfficialReview: true };
    case "external-student:minor":
      return { ...base, totalMajorCredits: 21, requiredCourseVariantId: null, trackRule: null, forcesOfficialReview: referenceOnly };
    case "external-student:track-major": {
      if (!trackId) throw new Error("A target track is required for the track-major path");
      const totals: Record<TrackId, 48 | 45 | 42> = {
        "food-marketing": 42,
        "regional-development-consulting": 45,
        "agri-food-distribution": 45,
        economics: 48,
        "food-bio-economy": 42,
      };
      return {
        ...base,
        totalMajorCredits: totals[trackId],
        requiredCourseVariantId: "starred-six-2026",
        trackRule: getTrackRequirement(trackId),
        evidence: trackId === "economics" ? "official-review-required" : "provided-final-plan",
        forcesOfficialReview: true,
      };
    }
    default:
      throw new Error(`Unsupported affiliation and study path: ${key}`);
  }
}
