export type TrackId =
  | "food-marketing"
  | "regional-development-consulting"
  | "agri-food-distribution"
  | "economics"
  | "food-bio-economy";

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

export type SavedDiagnosisState = {
  curriculumYear: 2026;
  trackIds: TrackId[];
  completedCourseIds: string[];
  enrollmentType: EnrollmentType;
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
