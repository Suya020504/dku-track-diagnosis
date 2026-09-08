import type { TrackSemesterPlan } from "./lib/trackSemesterPlanner";
import type { TrackCompletionScenario } from "./lib/trackCompletion";

export const PDF_IMPORT_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 50,
  timeoutMs: 15_000,
  maxExtractedCharacters: 1_000_000,
  headerScanBytes: 1_024,
} as const;

export type PdfImportFailureCode =
  | "file-empty"
  | "file-too-large"
  | "mime-mismatch"
  | "signature-mismatch"
  | "password-protected"
  | "invalid-or-corrupt"
  | "page-limit"
  | "text-limit"
  | "no-text-layer"
  | "worker-unavailable"
  | "timeout"
  | "cancelled"
  | "parse-failed";

export class PdfImportError extends Error {
  constructor(
    readonly code: PdfImportFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "PdfImportError";
  }
}

export type PdfTextPage = {
  pageNumber: number;
  text: string;
};

export type PdfMatchKind =
  | "internal-code"
  | "official-code"
  | "exact-name"
  | "verified-alias";

export type PdfMatchedCourse = {
  sourceId: string;
  courseId: string;
  matchKind: PdfMatchKind;
  pageNumbers: number[];
  displayLabel: string;
};

export type PdfAmbiguousCourse = {
  sourceId: string;
  displayLabel: string;
  candidateCourseIds: string[];
  pageNumbers: number[];
};

export type PdfUnmatchedCourse = {
  sourceId: string;
  displayLabel: string;
  pageNumbers: number[];
};

export type PdfImportCandidates = {
  matched: PdfMatchedCourse[];
  ambiguous: PdfAmbiguousCourse[];
  unmatched: PdfUnmatchedCourse[];
};

export type PdfImportCandidateBuilder = (
  pages: readonly PdfTextPage[],
) => PdfImportCandidates;

export type PdfImportDraft = PdfImportCandidates & {
  pageCount: number;
  extractedCharacters: number;
};

export type PdfImportApproval = {
  sourceId: string;
  courseId: string;
};

export type PdfMergeConflict = {
  courseId: string;
  existingStatus: CourseSelectionStatus;
  message: string;
};

export type PdfMergeResult = {
  courseSelections: CourseSelectionRecord[];
  addedCourseIds: string[];
  conflicts: PdfMergeConflict[];
};

export type TrackId =
  | "food-marketing"
  | "regional-development-consulting"
  | "agri-food-distribution"
  | "economics"
  | "food-bio-economy";

export type InterestSurveyAnswer = 1 | 2 | 3 | 4 | 5;

export type InterestSurveyAudience = StudentAffiliation;

export type InterestSurveyState = {
  audience?: InterestSurveyAudience;
  answers: Record<string, InterestSurveyAnswer>;
  currentIndex: number;
  completedAt?: string;
  selectedTrackId?: TrackId;
};

export type EnrollmentType = "primary" | "double-major" | "minor";

export type PlanningSemester =
  | "1-1"
  | "1-2"
  | "2-1"
  | "2-2"
  | "3-1"
  | "3-2"
  | "4-1"
  | "4-2";

export type AcademicSemesterNumber = 1 | 2;
export type AcademicTermId = `${number}-${AcademicSemesterNumber}`;

export type CourseOfferingEvidence =
  | "historical-2026-snapshot"
  | "unknown";

export type CourseOfferingRecord = {
  courseId: string;
  officialCourseCode: string;
  observedProgramSemesters: PlanningSemester[];
  timetableName?: string;
  evidence: CourseOfferingEvidence;
};

export type PlanTerm = "next" | "following" | "later";

export type ServiceGoal =
  | "learn-track-system"
  | "find-track"
  | "check-progress"
  | "plan-graduation";

export type StudentAffiliation = "department-student" | "external-student";
export type MajorRole = "primary" | "double-major" | "minor" | "undecided";
export type OtherMajor = "yes" | "no" | "unsure";
export type EntryIntent = "known-tracks" | "interest-survey" | "completed-courses";

export type StudyPath =
  | "advanced-major"
  | "track-major"
  | "department-with-other-major"
  | "double-major"
  | "minor";

export type RuleApplicability =
  | "student-confirmed"
  | "officially-verified"
  | "reference-only";

export type StudentProfile = {
  goal: ServiceGoal;
  affiliation: StudentAffiliation;
  studyPath: StudyPath;
  majorRole?: MajorRole;
  otherMajor?: OtherMajor;
  entryYear?: number;
  curriculumRuleVersion: "2026-provided-final-plan";
  ruleApplicability: RuleApplicability;
};

export type CourseSelectionStatus = "completed" | "in-progress" | "planned";

export type CourseSelectionRecord = {
  courseId: string;
  status: CourseSelectionStatus;
  plannedTerm?: PlanTerm;
};

export type AdditionalMajorCredit = {
  id: string;
  label: string;
  credits: number;
  status: "student-entered" | "officially-verified";
  note?: string;
};

export type MinimumCourseCombination = {
  courseIds: string[];
  newCourseCount: number;
  newCredits: number;
  unallocatedElectiveCredits: number;
  hardConditionsSatisfied: boolean;
  comparisonKey: string;
};

export type CourseCombinationInput = {
  profile: StudentProfile;
  targetTrackId?: TrackId;
  assumedCourseIds: string[];
  additionalMajorCredits: AdditionalMajorCredit[];
  schedulableCourseIds: Set<string>;
};

export type DiagnosisSnapshot = {
  id: string;
  createdAt: string;
  ruleVersion: "2026-provided-final-plan";
  profile: StudentProfile;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  targetTrackId?: TrackId;
  comparisonTrackIds: TrackId[];
  result: PathProgressResult;
  recommendationAxes?: RecommendationAxes;
  graduationPlan?: GraduationPlanResult;
  trackPlan?: TrackSemesterPlan;
  trackCompletion?: TrackCompletionScenario;
};

export type TrackPlanningState = {
  draft?: GraduationPlanDraft;
  manualTerms?: Record<string, string>;
  result?: TrackSemesterPlan;
};

export type SavedAppStateV2 = {
  version: 2;
  profile?: StudentProfile;
  profileDraft?: Partial<StudentProfile>;
  /** Undefined: no pending edit; null: explicitly targetless profile draft. */
  pendingTargetTrackId?: TrackId | null;
  pendingSelectedTrackIds?: TrackId[];
  entryIntent?: EntryIntent;
  trackPlanning?: TrackPlanningState;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  courseInputReviewedAt?: string;
  targetTrackId?: TrackId;
  comparisonTrackIds: TrackId[];
  interestSurvey?: InterestSurveyState;
  graduationPlanDraft?: GraduationPlanDraft;
  graduationPlanPreferences?: GraduationPlanPreferences;
  graduationPlan?: GraduationPlanResult;
  currentSemester?: PlanningSemester;
  targetGraduationSemester?: PlanningSemester;
  snapshots: DiagnosisSnapshot[];
};

export type RequirementEvidenceStatus =
  | "official-public"
  | "provided-final-plan"
  | "project-derived"
  | "official-review-required";

export type ReviewItem = {
  code:
    | "rule-source"
    | "unknown-course"
    | "additional-credit"
    | "document-conflict"
    | "future-offering"
    | "seasonal-term"
    | "plan-input"
    | "elective-placeholder";
  message: string;
  evidence: RequirementEvidenceStatus;
};

export type GraduationPlanStatus =
  | "currently-satisfied"
  | "regular-plan-possible"
  | "load-adjustment-needed"
  | "extra-term-possible"
  | "official-review-required";

export type GraduationPlanPreferences = {
  currentTerm: AcademicTermId;
  targetGraduationTerm: AcademicTermId;
  maxMajorCoursesPerTerm: number;
  considerSeasonalTerm: boolean;
};

/** Form text stays editable even when it is incomplete or not yet valid. */
export type GraduationPlanDraftValues = {
  currentTerm?: string;
  targetGraduationTerm?: string;
  maxMajorCoursesPerTerm?: string | number;
  considerSeasonalTerm?: boolean;
};

export type GraduationPlanDraft = {
  version: 1;
  values: GraduationPlanDraftValues;
};

export type PlannedCourseOrigin = "in-progress" | "user-planned" | "generated";

export type PlannedCoursePlacement = {
  termId: AcademicTermId;
  courseId: string;
  origin: PlannedCourseOrigin;
  offeringEvidence: CourseOfferingEvidence;
};

export type ElectiveTermAllocation = {
  termId: AcademicTermId;
  slots: number;
  credits: number;
};

export type UnplacedCourseReason =
  | "offering-unknown"
  | "user-plan-conflict"
  | "capacity-before-target"
  | "after-target";

export type UnplacedCourse = {
  courseId: string;
  reason: UnplacedCourseReason;
  message: string;
};

export type GraduationPlanResult = {
  status: GraduationPlanStatus;
  preferences: GraduationPlanPreferences;
  placements: PlannedCoursePlacement[];
  extraTermPlacements: PlannedCoursePlacement[];
  unplacedCourses: UnplacedCourse[];
  electiveAllocations: ElectiveTermAllocation[];
  unallocatedElectiveCredits: number;
  unallocatedElectiveSlots: number;
  unplacedElectiveCredits: number;
  unplacedElectiveSlots: number;
  recommendedMaxMajorCoursesPerTerm?: number;
  neededExtraTerms: number;
  reviewItems: ReviewItem[];
  generatedAt: string;
};

export type GraduationPlanInput = {
  profile: StudentProfile;
  targetTrackId?: TrackId;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  preferences: GraduationPlanPreferences;
  generatedAt: string;
};

export type InterestAxisCandidate = {
  trackId: TrackId;
  score: number;
  closeLeader: boolean;
  reasons: string[];
};

export type ProgressAxisCandidate = {
  trackId: TrackId;
  missingCourseCount: number;
  missingCredits: number;
  missingModuleLabels: string[];
  assumption: "current-path" | "track-major-hypothesis";
};

export type PlanAxisCandidate = {
  trackId: TrackId;
  status: GraduationPlanStatus;
  unplacedCourseCount: number;
  neededExtraTerms: number;
  assumption: "current-path" | "track-major-hypothesis";
};

export type RecommendationAxes = {
  interest?: InterestAxisCandidate[];
  progress: ProgressAxisCandidate[];
  plan?: PlanAxisCandidate[];
  alignedLeaderTrackIds: TrackId[];
};

export type CreditProgress = {
  completedCredits: number;
  requiredCredits: number;
  missingCredits: number;
};

export type RequirementProgress = CreditProgress & {
  completedCourseIds: string[];
  missingCourseIds: string[];
};

export type ModuleId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O";

export type Course = {
  id: string;
  code: string;
  name: string;
  credits: number;
  moduleId: ModuleId;
  recommendedSemester?: string;
  required?: boolean;
  sourceNote?: string;
};

export type CurriculumModule = {
  id: ModuleId;
  name: string;
  category: "liberal" | "foundation" | "major" | "convergence";
  courseCount: number;
  sourceNote?: string;
};

export type TrackRule =
  | {
      type: "major";
      moduleIds: ModuleId[];
      requiredCreditsPerModule: number;
      totalTrackCredits: number;
    }
  | {
      type: "convergence";
      baseModuleIds: ModuleId[];
      requiredCreditsPerBaseModule: number;
      requiredBaseCreditsTotal: number;
      convergenceRequirements: Array<{
        moduleIds: ModuleId[];
        label: string;
        requiredCredits: number;
      }>;
      totalTrackCredits: number;
    };

export type Track = {
  id: TrackId;
  name: string;
  kind: "학과전공" | "융합전공";
  description: string;
  careerKeywords: string[];
  rule: TrackRule;
};

export type DiagnosisInput = {
  trackIds: TrackId[];
  completedCourseIds: string[];
  enrollmentType?: EnrollmentType;
};

export type ModuleProgress = {
  moduleId: ModuleId | "N+O";
  label: string;
  requiredCredits: number;
  completedCredits: number;
  missingCredits: number;
  courseIds: string[];
};

export type TrackDiagnosisResult = {
  trackId: TrackId;
  trackName: string;
  trackKind: Track["kind"];
  enrollmentType: EnrollmentType;
  passed: boolean;
  trackCredits: number;
  missingRequiredCourses: Course[];
  excludedRequiredCourses: Course[];
  moduleProgress: ModuleProgress[];
  recommendedCourses: Course[];
  remainingCourses: Course[];
  completionRate: number;
};

export type PathProgressResult = {
  requiredProgress: RequirementProgress | "not-applicable";
  trackProgress: TrackDiagnosisResult | "not-applicable";
  totalMajorProgress: CreditProgress;
  reviewItems: ReviewItem[];
  status:
    | "current-input-satisfied"
    | "reference-calculation-satisfied"
    | "incomplete"
    | "official-review-required";
};

export type SavedDiagnosisState = {
  curriculumYear: 2026;
  trackIds: TrackId[];
  completedCourseIds: string[];
  enrollmentType: EnrollmentType;
  plannedCourseTerms: Record<string, PlanTerm>;
};

export type DiagnosisResult = {
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  passed: boolean;
  totalCredits: number;
  trackCredits: number;
  requiredCreditsCompleted: number;
  requiredCreditsTotal: number;
  missingRequiredCourses: Course[];
  excludedRequiredCourses: Course[];
  moduleProgress: ModuleProgress[];
  recommendedCourses: Course[];
  remainingCourses: Course[];
  completionRate: number;
  trackResults: TrackDiagnosisResult[];
};

export type TrackRecommendationStatus = "ready" | "close" | "possible" | "long-term";

export type TrackFeasibilityStatus =
  | "needs-current-semester"
  | "complete"
  | "regular"
  | "extra-semester"
  | "long-term";

export type TrackFeasibility = {
  status: TrackFeasibilityStatus;
  label: string;
  detail: string;
  currentSemester?: PlanningSemester;
  remainingRegularSemesters: number | null;
  neededCredits: number;
  neededCourseCount: number;
  regularCapacityCredits: number | null;
  extraSemesterCapacityCredits: number | null;
};

export type TrackRecommendation = {
  rank: number;
  trackId: TrackId;
  trackName: string;
  trackKind: Track["kind"];
  passed: boolean;
  completionRate: number;
  trackCredits: number;
  missingModuleCredits: number;
  missingTotalCredits: number;
  missingModuleCount: number;
  missingRequiredCount: number;
  remainingCourseCount: number;
  matchedModuleLabels: string[];
  missingModuleLabels: string[];
  recommendedCourses: Course[];
  status: TrackRecommendationStatus;
  feasibility: TrackFeasibility;
};
