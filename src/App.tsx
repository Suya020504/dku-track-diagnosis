import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Instagram,
  Layers3,
  ListChecks,
  Mail,
  MoreHorizontal,
  PlayCircle,
  Printer,
  RotateCcw,
  Save,
  Search,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import { courses, CURRICULUM_YEAR, modules, tracks } from "./data/curriculumData";
import { StudyPathSetup } from "./features/profile/StudyPathSetup";
import { GraduationPlanResult } from "./features/planning/GraduationPlanResult";
import { GraduationPlanSetup } from "./features/planning/GraduationPlanSetup";
import { InterestSurvey } from "./features/recommendations/InterestSurvey";
import { TrackRecommendationAxes } from "./features/recommendations/TrackRecommendationAxes";
import { PathProgressSummary } from "./features/results/PathProgressSummary";
import { PdfCourseImportPanel } from "./features/courses/PdfCourseImportPanel";
import { PdfMatchReview } from "./features/courses/PdfMatchReview";
import {
  calculateDiagnosis,
  getCoursesByModule,
  getModuleLabel,
  getTracks,
  isRequiredCourseApplicable,
  isModuleInAnyTrack,
} from "./lib/diagnosis";
import { calculatePathProgress } from "./lib/progressEngine";
import { buildRecommendationAxes } from "./lib/recommendationEngine";
import { calculateGraduationPlan } from "./lib/graduationPlanner";
import { mergeApprovedPdfMatches } from "./lib/pdfCourseMatching";
import {
  appendDiagnosisSnapshot,
  createEmptyAppState,
  loadAppState,
  saveAppState,
} from "./lib/storage";
import {
  resolveAppRoute,
  writeAppRouteToHistory,
  type AppRoute,
} from "./lib/appRouting";
import {
  resolveDiagnosisStep,
  type DiagnosisStep,
} from "./lib/viewRouting";
import type {
  Course,
  DiagnosisResult,
  GraduationPlanPreferences,
  GraduationPlanResult as GraduationPlanResultValue,
  EnrollmentType,
  InterestSurveyState,
  ModuleId,
  ModuleProgress,
  PlanTerm,
  PlanningSemester,
  PathProgressResult,
  PdfImportApproval,
  PdfImportDraft,
  PdfMergeConflict,
  RecommendationAxes,
  SavedAppStateV2,
  StudentProfile,
  Track,
  TrackDiagnosisResult,
  TrackId,
  TrackRecommendation,
  TrackRecommendationStatus,
} from "./types";

type ViewId = "landing" | "overview" | "resources" | "modules" | "diagnosis" | "recommendation" | "plan" | "result" | "contact";
type GradeFilter = "all" | "1" | "2" | "3" | "4" | "unknown";
type SemesterFilter = "all" | "1" | "2" | "unknown";
type LabPlanningSemester = PlanningSemester | "unselected";
type SharedModuleSuggestion = {
  label: string;
  trackNames: string[];
};
type SharedCourseSuggestion = {
  course: Course;
  trackNames: string[];
};
type TrackNeededCoursePlan = {
  trackId: TrackId;
  trackName: string;
  trackKind: Track["kind"];
  passed: boolean;
  completionRate: number;
  neededCourses: number;
  rows: TrackNeededCourseRow[];
};
type TrackNeededCourseRow = {
  label: string;
  neededCourses: number;
  missingCredits: number;
  note: string;
  candidates: Course[];
};
type ExperimentInsight = {
  label: string;
  title: string;
  detail: string;
  tone: "good" | "notice" | "warning";
};
type ExperimentPlan = {
  loadLabel: string;
  loadDetail: string;
  remainingSemesterText: string;
  perSemesterText: string;
  priorityCourses: Course[];
  insights: ExperimentInsight[];
  actions: string[];
};
type GuideStep = {
  title: string;
  body: string;
  items?: string[];
  action: string;
  viewId: ViewId;
};

const primaryViewItems: Array<{
  id: "diagnosis" | "result" | "recommendation";
  label: string;
  step: string;
  icon: typeof FileText;
}> = [
  { id: "diagnosis", label: "자가진단", step: "1", icon: ClipboardCheck },
  { id: "result", label: "결과", step: "2", icon: BookOpenCheck },
  { id: "recommendation", label: "추천 비교", step: "3", icon: Compass },
];

const secondaryViewItems: Array<{ id: ViewId; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "트랙제 안내", icon: FileText },
  { id: "resources", label: "공식 자료", icon: PlayCircle },
  { id: "contact", label: "문의사항", icon: Mail },
];

const GUIDE_STORAGE_KEY = "track-sim:guide:v1";
const OFFICIAL_CURRICULUM_URL = "https://www.dankook.ac.kr/documents/d/kor/2026-1-_-260119-pdf?download=true";
const OFFICIAL_TRACK_VIDEO_URL = "https://www.youtube.com/watch?v=osc9yOuq0IU";
const DEPARTMENT_URL = "https://cms.dankook.ac.kr/web/ere";

const guideSteps: GuideStep[] = [
  {
    title: "1. 자가진단에서 내 이수 정보를 입력합니다",
    body: "이수유형과 관심 트랙을 고른 뒤, 이미 수강했거나 이수 예정인 과목을 체크합니다.",
    items: ["주전공·복수전공·부전공 선택", "관심 트랙 복수 선택", "학년·학기별 전공 이수 표에서 과목 체크"],
    action: "자가진단 열기",
    viewId: "diagnosis",
  },
  {
    title: "2. 결과에서 지금 상태를 확인합니다",
    body: "선택한 트랙별 진행률과 남은 과목, 부족 모듈, 필수 누락을 필요한 순서대로 확인합니다.",
    items: ["전체 진행률과 남은 과목 수", "트랙별 충족·부족 상태", "어느 모듈에서 몇 과목이 더 필요한지 확인"],
    action: "결과 보기",
    viewId: "result",
  },
  {
    title: "3. 추천 비교에서 기준을 나눠 봅니다",
    body: "관심, 현재 이수 과목, 졸업 전 계획을 섞지 않고 각각의 기준으로 트랙을 비교합니다.",
    items: ["관심 설문 기준", "완료한 이수 과목 기준", "졸업 전 계획 가능성 기준"],
    action: "추천 기준 비교하기",
    viewId: "recommendation",
  },
  {
    title: "4. 더보기에서 공식 자료를 확인합니다",
    body: "트랙제 안내, 학과 홈페이지, 안내 영상, 교육과정표는 필요할 때 더보기 메뉴에서 확인할 수 있습니다.",
    items: ["트랙제 안내와 이용 방법", "학과 홈페이지와 유튜브", "트랙별 모듈 및 교육과정표"],
    action: "공식 자료 보기",
    viewId: "resources",
  },
];

const videoResources = [
  {
    id: "RqfQRmLa4g0",
    title: "트랙제 핵심 소개 영상",
    description: "모듈형 트랙제의 취지, 증명서 표시 안내, 5개 트랙 구분을 빠르게 이해할 수 있는 요약 영상입니다.",
  },
  {
    id: "nhELHq51gdY",
    title: "트랙제 안내영상 1",
    description: "모듈형 교육과정과 트랙제의 기본 흐름을 처음 확인하는 영상입니다.",
  },
  {
    id: "iuXHSSuc0UQ",
    title: "트랙제 안내영상 2",
    description: "트랙제가 왜 필요한지, 어떤 기준으로 과목을 묶어 보는지 확인하는 자료입니다.",
  },
  {
    id: "osc9yOuq0IU",
    title: "트랙제 안내영상 3",
    description: "트랙별 모듈 구성과 수강 계획을 세울 때 참고할 수 있는 안내 영상입니다.",
    start: 4,
  },
  {
    id: "Vx9HdOxKEiU",
    title: "트랙제 안내영상 4",
    description: "자가진단을 하기 전에 트랙 신청 흐름을 다시 점검하기 좋은 영상입니다.",
  },
];

const departmentLinks = [
  {
    title: "학과 YouTube",
    description: "식품자원경제학과 공식 유튜브 영상 모음으로 이동합니다.",
    href: "https://www.youtube.com/@FoodandResourcesEconomics_dku/videos",
    label: "채널 바로가기",
  },
  {
    title: "학과 홈페이지",
    description: "단국대학교 식품자원경제학과 공식 홈페이지로 이동합니다.",
    href: "https://cms.dankook.ac.kr/web/ere",
    label: "홈페이지 바로가기",
  },
];

const curriculumSlots = [
  { key: "1-1", label: "1학년 1학기" },
  { key: "1-2", label: "1학년 2학기" },
  { key: "2-1", label: "2학년 1학기" },
  { key: "2-2", label: "2학년 2학기" },
  { key: "3-1", label: "3학년 1학기" },
  { key: "3-2", label: "3학년 2학기" },
  { key: "4-1", label: "4학년 1학기" },
  { key: "4-2", label: "4학년 2학기" },
] as const;

const enrollmentOptions: Array<{
  id: EnrollmentType;
  label: string;
  title: string;
  description: string;
}> = [
  {
    id: "primary",
    label: "주전공",
    title: "주전공 기준",
    description: "PDF 필수 과목을 모두 필수 누락 계산에 반영합니다.",
  },
  {
    id: "double-major",
    label: "복수전공",
    title: "복수전공 기준",
    description: "1학년 필수 과목은 필수 누락에서 제외해 진단합니다.",
  },
  {
    id: "minor",
    label: "부전공",
    title: "부전공 기준",
    description: "1학년 필수 과목은 제외하고, 부전공 학점 기준은 공식 안내 확인이 필요합니다.",
  },
];

const trackKindGuides = [
  {
    kind: "학과전공" as const,
    title: "학과전공 트랙",
    description: "식품자원경제학과 전공 모듈을 중심으로 5개 모듈을 깊게 채우는 방식입니다.",
  },
  {
    kind: "융합전공" as const,
    title: "융합전공 트랙",
    description: "학과 전공 모듈에 바이오헬스·식품영양·식품공학 계열 모듈을 결합합니다.",
  },
];

const updateHistory = [
  {
    date: "2026.06.18",
    title: "수강신청 전략과 가독성 보강",
    items: [
      "실험실 탭을 추가해 현재 학년·학기 기준 남은 학기와 학기당 목표 과목을 계산합니다.",
      "설명, 자가진단, 결과, 트랙 추천 화면의 긴 문장을 줄이고 모바일 텍스트 잘림을 정리했습니다.",
      "필수 과목 누락, 트랙별 부족 과목, 3학점 기준 남은 과목 계산을 더 눈에 띄게 다듬었습니다.",
    ],
  },
  {
    date: "2026.06.11",
    title: "배포 준비와 협업 문서 정리",
    items: [
      "GitHub 저장소와 Vercel 배포 설정을 정리하고 배포 URL을 README에 기록했습니다.",
      "README, CHANGELOG, CONTRIBUTING 문서를 추가해 변경 이유와 검증 방법을 남기기 쉽게 만들었습니다.",
      "트랙 추천에서 현재 학년·학기를 입력하면 정규학기 가능 여부를 계산하는 기반을 추가했습니다.",
    ],
  },
  {
    date: "2026.06.10",
    title: "MVP 초기 구현",
    items: [
      "Vite, React, TypeScript 기반의 정적 웹앱을 구성했습니다.",
      "2026학년도 식품자원경제학과 트랙, 모듈, 과목 데이터를 구조화했습니다.",
      "자가진단, 결과 확인, 브라우저 저장, 기본 테스트와 빌드 검증 구조를 만들었습니다.",
    ],
  },
];

function getSelectedTrackIds(state: SavedAppStateV2): TrackId[] {
  return [...new Set([
    ...(state.targetTrackId ? [state.targetTrackId] : []),
    ...state.comparisonTrackIds,
  ])];
}

function getEnrollmentTypeForProfile(profile?: StudentProfile): EnrollmentType {
  if (profile?.studyPath === "double-major") return "double-major";
  if (profile?.studyPath === "minor") return "minor";
  return "primary";
}

function viewForRoute(route: AppRoute): ViewId {
  if (route.view === "recommendation") return "recommendation";
  if (route.view === "plan") return "plan";
  if (route.view === "diagnosis") return "diagnosis";
  return route.view;
}

function requestsPdfReview(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("view") === "diagnosis" &&
    params.get("step") === "courses" &&
    params.get("input") === "pdf-review";
}

function emptyInterestSurveyState(): InterestSurveyState {
  return { answers: {}, currentIndex: 0 };
}

export function startEntryFlowTransition(
  current: SavedAppStateV2,
  goal: "check-progress" | "find-track",
): { state: SavedAppStateV2; route: AppRoute } {
  const nextProfile = current.profile ? { ...current.profile, goal } : undefined;
  const state: SavedAppStateV2 = {
    ...applyPlanningSourceChange(current, { profile: nextProfile }),
    profileDraft: {
      ...current.profileDraft,
      goal,
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: "reference-only",
    },
  };
  return {
    state,
    route: goal === "find-track"
      ? { view: "recommendation", step: "survey" }
      : { view: "diagnosis", step: "profile" },
  };
}

export function chooseInterestTrackTransition(
  current: SavedAppStateV2,
  trackId: TrackId,
): { state: SavedAppStateV2; route: AppRoute } {
  const interestSurvey = current.interestSurvey ?? emptyInterestSurveyState();
  const nextProfile = current.profile ? { ...current.profile, goal: "find-track" as const } : undefined;
  return {
    state: {
      ...applyPlanningSourceChange(current, { profile: nextProfile, targetTrackId: trackId }),
      profileDraft: {
        ...current.profileDraft,
        goal: "find-track",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      comparisonTrackIds: current.comparisonTrackIds.filter((id) => id !== trackId),
      interestSurvey: { ...interestSurvey, selectedTrackId: trackId },
    },
    route: { view: "diagnosis", step: "profile" },
  };
}

type PlanningSourcePatch = Partial<Pick<
  SavedAppStateV2,
  "profile" | "targetTrackId" | "courseSelections" | "additionalMajorCredits"
>>;

function hasPatchField<K extends keyof PlanningSourcePatch>(
  patch: PlanningSourcePatch,
  key: K,
): patch is PlanningSourcePatch & Required<Pick<PlanningSourcePatch, K>> {
  return Object.prototype.hasOwnProperty.call(patch, key);
}

function stablePlanningValue(value: unknown): string {
  if (!Array.isArray(value)) return JSON.stringify(value);
  return JSON.stringify(
    [...value].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
  );
}

function reviewedCourseKey(state: SavedAppStateV2): string {
  return JSON.stringify(
    state.courseSelections
      .filter((selection) => selection.status !== "planned")
      .map((selection) => `${selection.status}:${selection.courseId}`)
      .sort(),
  );
}

export function applyPlanningSourceChange(
  current: SavedAppStateV2,
  patch: PlanningSourcePatch,
): SavedAppStateV2 {
  const next: SavedAppStateV2 = { ...current, ...patch };
  const profileChanged = hasPatchField(patch, "profile") &&
    stablePlanningValue(current.profile) !== stablePlanningValue(patch.profile);
  const targetChanged = hasPatchField(patch, "targetTrackId") &&
    current.targetTrackId !== patch.targetTrackId;
  const coursesChanged = hasPatchField(patch, "courseSelections") &&
    stablePlanningValue(current.courseSelections) !== stablePlanningValue(patch.courseSelections);
  const creditsChanged = hasPatchField(patch, "additionalMajorCredits") &&
    stablePlanningValue(current.additionalMajorCredits) !== stablePlanningValue(patch.additionalMajorCredits);
  const reviewedCoursesChanged = coursesChanged && reviewedCourseKey(current) !== reviewedCourseKey(next);
  const planSourceChanged = profileChanged || targetChanged || coursesChanged || creditsChanged;
  const reviewedSourceChanged = profileChanged || targetChanged || reviewedCoursesChanged || creditsChanged;

  return {
    ...next,
    graduationPlan: planSourceChanged ? undefined : current.graduationPlan,
    courseInputReviewedAt: reviewedSourceChanged ? undefined : current.courseInputReviewedAt,
  };
}

export function changePlannedCourseTerm(
  current: SavedAppStateV2,
  courseId: string,
  plannedTerm: PlanTerm | null,
): SavedAppStateV2 {
  const hasReviewedSelection = current.courseSelections.some(
    (selection) => selection.courseId === courseId && selection.status !== "planned",
  );
  if (hasReviewedSelection) return current;
  const withoutExistingPlan = current.courseSelections.filter(
    (selection) => !(selection.courseId === courseId && selection.status === "planned"),
  );
  return applyPlanningSourceChange(current, {
    courseSelections: plannedTerm
      ? [...withoutExistingPlan, { courseId, status: "planned", plannedTerm }]
      : withoutExistingPlan,
  });
}

export function completeProfileTransition(
  current: SavedAppStateV2,
  profile: StudentProfile,
): { state: SavedAppStateV2; step: DiagnosisStep; route: AppRoute } {
  const trackMajor = profile.studyPath === "track-major";
  const targetTrackId = trackMajor
    ? current.targetTrackId ?? (
        profile.goal === "find-track" ? current.interestSurvey?.selectedTrackId : undefined
      )
    : undefined;
  const state: SavedAppStateV2 = {
    ...applyPlanningSourceChange(current, { profile, targetTrackId }),
    profileDraft: undefined,
    comparisonTrackIds: trackMajor ? current.comparisonTrackIds : [],
  };
  const step = resolveDiagnosisStep("?view=diagnosis&step=courses", state);
  const hasChosenDirection = trackMajor
    ? Boolean(state.targetTrackId)
    : Boolean(state.interestSurvey?.selectedTrackId);
  const route: AppRoute = profile.goal === "find-track" && !hasChosenDirection
    ? { view: "recommendation", step: "survey" }
    : { view: "diagnosis", step };
  return { state, step, route };
}

export function reviewCourseInputTransition(
  current: SavedAppStateV2,
  courseInputReviewedAt: string,
): SavedAppStateV2 {
  return { ...current, courseInputReviewedAt };
}

export function saveCompletedCoursesManually(
  current: SavedAppStateV2,
  savedAt: Date,
  storage?: Storage,
): { storageError: boolean; lastManualSaveAt: string } {
  const saved = saveAppState(current, storage);
  return {
    storageError: !saved,
    lastManualSaveAt: saved ? formatSaveTime(savedAt) : "",
  };
}

export function createGraduationPlanTransition(
  current: SavedAppStateV2,
  preferences: GraduationPlanPreferences,
  generatedAt: string,
): {
  state: SavedAppStateV2;
  result: GraduationPlanResultValue;
  route: AppRoute;
} {
  if (!current.profile) {
    throw new Error("A student profile is required before graduation planning");
  }
  if (current.profile.studyPath === "track-major" && !current.targetTrackId) {
    throw new Error("A target track is required before graduation planning");
  }

  const result = calculateGraduationPlan({
    profile: current.profile,
    targetTrackId: current.targetTrackId,
    courseSelections: current.courseSelections,
    additionalMajorCredits: current.additionalMajorCredits,
    preferences,
    generatedAt,
  });
  return {
    state: {
      ...current,
      graduationPlanPreferences: preferences,
      graduationPlan: result,
    },
    result,
    route: { view: "plan", step: "schedule" },
  };
}

export function saveGraduationPlanSnapshotTransition(
  current: SavedAppStateV2,
  input: {
    id: string;
    createdAt: string;
    pathResult: PathProgressResult;
    recommendationAxes: RecommendationAxes;
    plan: GraduationPlanResultValue;
  },
): SavedAppStateV2 {
  if (!current.profile) {
    throw new Error("A student profile is required before saving a graduation plan");
  }
  if (!current.graduationPlan) {
    throw new Error("A current graduation plan is required before saving a snapshot");
  }
  if (JSON.stringify(input.plan) !== JSON.stringify(current.graduationPlan)) {
    throw new Error("The supplied graduation plan is not the current plan");
  }
  if (current.snapshots.some(
    (snapshot) => snapshot.graduationPlan?.generatedAt === current.graduationPlan?.generatedAt,
  )) {
    return current;
  }

  return appendDiagnosisSnapshot(current, {
    id: input.id,
    createdAt: input.createdAt,
    ruleVersion: current.profile.curriculumRuleVersion,
    profile: { ...current.profile },
    courseSelections: current.courseSelections.map((selection) => ({ ...selection })),
    additionalMajorCredits: current.additionalMajorCredits.map((credit) => ({ ...credit })),
    targetTrackId: current.targetTrackId,
    comparisonTrackIds: [...current.comparisonTrackIds],
    result: input.pathResult,
    recommendationAxes: input.recommendationAxes,
    graduationPlan: current.graduationPlan,
  });
}

function App({ storage }: { storage?: Storage } = {}) {
  const appStorage = storage ?? window.localStorage;
  const [savedState, setSavedState] = useState<SavedAppStateV2>(() => loadAppState(appStorage));
  const [storageError, setStorageError] = useState(false);
  const [pdfImportDraft, setPdfImportDraft] = useState<PdfImportDraft>();
  const [pdfImportRecoveryNotice, setPdfImportRecoveryNotice] = useState(
    () => requestsPdfReview(window.location.search),
  );
  const [pdfInputRoute, setPdfInputRoute] = useState<"pdf-review">();
  const [pdfMergeConflicts, setPdfMergeConflicts] = useState<PdfMergeConflict[]>([]);
  const [pdfReviewSaveError, setPdfReviewSaveError] = useState(false);
  const [diagnosisStep, setDiagnosisStep] = useState<DiagnosisStep>(() => {
    const route = resolveAppRoute(window.location.search, savedState);
    if (route.view === "diagnosis") return route.step;
    if (route.view === "result") return "result";
    return resolveDiagnosisStep("?view=diagnosis&step=profile", savedState);
  });
  const [activeView, setActiveView] = useState<ViewId>(() =>
    viewForRoute(resolveAppRoute(window.location.search, savedState)),
  );
  const [recommendationStep, setRecommendationStep] = useState<"survey" | "axes">(() => {
    const route = resolveAppRoute(window.location.search, savedState);
    return route.view === "recommendation" ? route.step : "survey";
  });
  const [recommendationAxis, setRecommendationAxis] = useState<"interest" | "progress" | "plan" | undefined>(() => {
    const route = resolveAppRoute(window.location.search, savedState);
    return route.view === "recommendation" ? route.axis : undefined;
  });
  const [planStep, setPlanStep] = useState<"setup" | "schedule" | "checks">(() => {
    const route = resolveAppRoute(window.location.search, savedState);
    return route.view === "plan" ? route.step : "setup";
  });
  const [planDraft, setPlanDraft] = useState<Partial<GraduationPlanPreferences>>(
    () => savedState.graduationPlanPreferences ?? {},
  );
  const [planSaveStatus, setPlanSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const selectedTrackIds = useMemo(() => getSelectedTrackIds(savedState), [savedState]);
  const [trackSetupOpen, setTrackSetupOpen] = useState(() => selectedTrackIds.length === 0);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>("all");
  const [lastManualSaveAt, setLastManualSaveAt] = useState("");
  const [guideOpen, setGuideOpen] = useState(() => !loadGuideDismissed());
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const planHeadingRef = useRef<HTMLHeadingElement>(null);
  const initialLocationSyncedRef = useRef(false);
  const savingPlanGeneratedAtRef = useRef<string | undefined>(undefined);
  const completedCourseIds = useMemo(
    () => savedState.courseSelections
      .filter((selection) => selection.status === "completed")
      .map((selection) => selection.courseId),
    [savedState.courseSelections],
  );
  const enrollmentType = getEnrollmentTypeForProfile(savedState.profile);
  const requiresTrack = savedState.profile?.studyPath === "track-major";
  const selectedTracks = useMemo(() => getTracks(selectedTrackIds), [selectedTrackIds]);
  const result = useMemo(
    () =>
      calculateDiagnosis({
        trackIds: selectedTrackIds,
        completedCourseIds,
        enrollmentType,
      }),
    [completedCourseIds, enrollmentType, selectedTrackIds],
  );
  const pathProgress = useMemo(
    () => {
      const profile = savedState.profile;
      if (!profile || (profile.studyPath === "track-major" && !savedState.targetTrackId)) {
        return undefined;
      }

      return calculatePathProgress({
        profile,
        courseSelections: savedState.courseSelections,
        additionalMajorCredits: savedState.additionalMajorCredits,
        courseInputReviewedAt: savedState.courseInputReviewedAt,
        targetTrackId: savedState.targetTrackId,
      });
    },
    [savedState],
  );
  const recommendationAxes = useMemo(() => {
    const base = {
      profile: savedState.profile,
      courseSelections: savedState.courseSelections,
      additionalMajorCredits: savedState.additionalMajorCredits,
      interestSurvey: savedState.interestSurvey,
    };
    if (!savedState.graduationPlanPreferences) return buildRecommendationAxes(base);
    return buildRecommendationAxes({
      ...base,
      graduationPlanPreferences: savedState.graduationPlanPreferences,
      generatedAt: savedState.graduationPlan?.generatedAt ?? new Date().toISOString(),
    });
  }, [savedState]);
  useEffect(() => {
    function syncFromLocation() {
      const requestedPdfReview = requestsPdfReview(window.location.search);
      const next = resolveAppRoute(window.location.search, savedState, {
        hasPdfImportDraft: Boolean(pdfImportDraft),
      });
      if (requestedPdfReview && !pdfImportDraft) {
        setPdfImportRecoveryNotice(true);
      }
      writeAppRouteToHistory(next, "replace");
      applyRoute(next);
    }

    if (!initialLocationSyncedRef.current) {
      initialLocationSyncedRef.current = true;
      syncFromLocation();
    }
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [pdfImportDraft, savedState]);

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [diagnosisStep]);

  useEffect(() => {
    if (activeView === "diagnosis" && diagnosisStep === "courses" && !pdfInputRoute) {
      stepHeadingRef.current?.focus();
    }
  }, [activeView, diagnosisStep, pdfInputRoute]);

  useEffect(() => {
    if (activeView !== "plan") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "plan") return;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "plan") return;
    planHeadingRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView, planStep]);

  function persist(updater: (current: SavedAppStateV2) => SavedAppStateV2) {
    setSavedState((current) => {
      const next = updater(current);
      setStorageError(!saveAppState(next, appStorage));
      return next;
    });
  }

  function applyRoute(route: AppRoute) {
    setActiveView(viewForRoute(route));
    setPdfInputRoute(route.view === "diagnosis" ? route.input : undefined);
    if (route.view === "diagnosis") setDiagnosisStep(route.step);
    if (route.view === "result") setDiagnosisStep("result");
    if (route.view === "recommendation") {
      setRecommendationStep(route.step);
      setRecommendationAxis(route.axis);
    }
    if (route.view === "plan") setPlanStep(route.step);
  }

  function navigateAppRoute(route: AppRoute) {
    writeAppRouteToHistory(route, "push");
    applyRoute(route);
  }

  function updateProfileDraft(profileDraft: Partial<StudentProfile>) {
    persist((current) => ({ ...current, profileDraft }));
  }

  function completeProfile(profile: StudentProfile) {
    const transition = completeProfileTransition(savedState, profile);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    setPlanSaveStatus("idle");
    setTrackSetupOpen(false);
    navigateAppRoute(transition.route);
  }

  function changeTargetTrack(targetTrackId: TrackId | undefined) {
    persist((current) => ({
      ...applyPlanningSourceChange(current, { targetTrackId }),
      comparisonTrackIds: targetTrackId
        ? current.comparisonTrackIds.filter((trackId) => trackId !== targetTrackId)
        : [],
    }));
    setPlanSaveStatus("idle");
  }

  function navigateDiagnosisStep(step: DiagnosisStep) {
    navigateAppRoute(step === "result"
      ? { view: "result" }
      : { view: "diagnosis", step });
  }

  function openPdfMatchReview(draft: PdfImportDraft) {
    setPdfImportDraft(draft);
    setPdfImportRecoveryNotice(false);
    setPdfMergeConflicts([]);
    setPdfReviewSaveError(false);
    navigateAppRoute({ view: "diagnosis", step: "courses", input: "pdf-review" });
  }

  function returnToDirectCourseInput(mode: "push" | "replace", clearDraft: boolean) {
    if (clearDraft) setPdfImportDraft(undefined);
    setPdfMergeConflicts([]);
    setPdfReviewSaveError(false);
    const route: AppRoute = { view: "diagnosis", step: "courses" };
    writeAppRouteToHistory(route, mode);
    applyRoute(route);
  }

  function approvePdfMatches(approvals: PdfImportApproval[]) {
    if (!pdfImportDraft) return;
    const merged = mergeApprovedPdfMatches(
      savedState.courseSelections,
      pdfImportDraft,
      approvals,
    );
    setPdfMergeConflicts(merged.conflicts);
    setPdfReviewSaveError(false);
    if (merged.addedCourseIds.length === 0) return;

    const next = applyPlanningSourceChange(savedState, {
      courseSelections: merged.courseSelections,
    });
    if (!saveAppState(next, appStorage)) {
      setStorageError(true);
      setPdfReviewSaveError(true);
      return;
    }

    setStorageError(false);
    setSavedState(next);
    setPlanSaveStatus("idle");
    setPdfImportRecoveryNotice(false);
    returnToDirectCourseInput("replace", true);
  }

  function toggleTrack(trackId: TrackId) {
    persist((current) => {
      const currentTrackIds = getSelectedTrackIds(current);
      const exists = currentTrackIds.includes(trackId);
      const nextTrackIds = exists
        ? currentTrackIds.filter((id) => id !== trackId)
        : [...currentTrackIds, trackId];

      return {
        ...applyPlanningSourceChange(current, { targetTrackId: nextTrackIds[0] }),
        comparisonTrackIds: nextTrackIds.slice(1),
      };
    });
    setPlanSaveStatus("idle");
  }

  function toggleCourse(courseId: string) {
    persist((current) => {
      const exists = current.courseSelections.some(
        (selection) => selection.courseId === courseId &&
          (selection.status === "completed" || selection.status === "in-progress"),
      );
      const remaining = current.courseSelections.filter((selection) => selection.courseId !== courseId);
      return applyPlanningSourceChange(current, {
        courseSelections: exists
          ? remaining
          : [...remaining, { courseId, status: "completed" }],
      });
    });
    setPlanSaveStatus("idle");
  }

  function resetState(nextView: ViewId = activeView) {
    const next = createEmptyAppState();
    setStorageError(!saveAppState(next, appStorage));
    setSavedState(next);
    setGradeFilter("all");
    setSemesterFilter("all");
    setLastManualSaveAt("");
    setActiveView(nextView);
    navigateDiagnosisStep("profile");
  }

  function saveCompletedCoursesNow() {
    const feedback = saveCompletedCoursesManually(savedState, new Date(), appStorage);
    setStorageError(feedback.storageError);
    setLastManualSaveAt(feedback.lastManualSaveAt);
  }

  function confirmCourseInput() {
    if (requiresTrack && !savedState.targetTrackId) {
      navigateDiagnosisStep("profile");
      return;
    }
    const next = reviewCourseInputTransition(savedState, new Date().toISOString());
    setStorageError(!saveAppState(next, appStorage));
    setSavedState(next);
    navigateDiagnosisStep(resolveDiagnosisStep("?view=result&step=result", next));
  }

  function editProfile() {
    navigateDiagnosisStep("profile");
  }

  function openGuide() {
    setGuideStepIndex(0);
    setGuideOpen(true);
  }

  function closeGuide() {
    saveGuideDismissed();
    setGuideOpen(false);
  }

  function moveGuideStep(nextIndex: number) {
    setGuideStepIndex(Math.min(Math.max(nextIndex, 0), guideSteps.length - 1));
  }

  function goToGuideStepView(viewId: ViewId) {
    if (viewId === "diagnosis") {
      navigateDiagnosisStep(resolveDiagnosisStep("?view=diagnosis&step=courses", savedState));
      return;
    }
    if (viewId === "result") {
      navigateDiagnosisStep(resolveDiagnosisStep("?view=result&step=result", savedState));
      return;
    }
    if (viewId === "recommendation") {
      navigateAppRoute({ view: "recommendation", step: "axes" });
      return;
    }
    navigateAppRoute({ view: viewId as "overview" | "resources" | "modules" | "contact" });
  }

  function startEntryFlow(goal: "check-progress" | "find-track") {
    const transition = startEntryFlowTransition(savedState, goal);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    setGuideOpen(false);
    navigateAppRoute(transition.route);
  }

  function changeInterestSurvey(value: InterestSurveyState) {
    persist((current) => ({ ...current, interestSurvey: value }));
  }

  function chooseInterestTrack(trackId: TrackId) {
    const transition = chooseInterestTrackTransition(savedState, trackId);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    navigateAppRoute(transition.route);
  }

  function openCourseInputFromAxes() {
    if (!savedState.profile) {
      startEntryFlow("check-progress");
      return;
    }
    const nextState: SavedAppStateV2 = {
      ...applyPlanningSourceChange(savedState, {
        profile: { ...savedState.profile, goal: "check-progress" },
      }),
      profileDraft: undefined,
    };
    setStorageError(!saveAppState(nextState, appStorage));
    setSavedState(nextState);
    navigateAppRoute({
      view: "diagnosis",
      step: resolveDiagnosisStep("?view=diagnosis&step=courses", nextState),
    });
  }

  function submitGraduationPlan(preferences: GraduationPlanPreferences) {
    const transition = createGraduationPlanTransition(
      savedState,
      preferences,
      new Date().toISOString(),
    );
    const saved = saveAppState(transition.state, appStorage);
    setStorageError(!saved);
    setSavedState(transition.state);
    setPlanDraft(preferences);
    setPlanSaveStatus("idle");
    savingPlanGeneratedAtRef.current = undefined;
    navigateAppRoute(transition.route);
  }

  function editGraduationPlanInputs() {
    setPlanDraft(savedState.graduationPlanPreferences ?? {});
    setPlanSaveStatus("idle");
    navigateAppRoute({ view: "plan", step: "setup" });
  }

  function saveGraduationPlanSnapshot() {
    if (!pathProgress || !savedState.graduationPlan) return;
    const planGeneratedAt = savedState.graduationPlan.generatedAt;
    const alreadySaved = savedState.snapshots.some(
      (snapshot) => snapshot.graduationPlan?.generatedAt === planGeneratedAt,
    );
    if (alreadySaved || savingPlanGeneratedAtRef.current === planGeneratedAt) return;
    savingPlanGeneratedAtRef.current = planGeneratedAt;
    const createdAt = new Date().toISOString();
    const id = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `graduation-plan-${createdAt}-${savedState.snapshots.length + 1}`;
    const next = saveGraduationPlanSnapshotTransition(savedState, {
      id,
      createdAt,
      pathResult: pathProgress,
      recommendationAxes,
      plan: savedState.graduationPlan,
    });
    const saved = saveAppState(next, appStorage);
    setStorageError(!saved);
    if (!saved) {
      savingPlanGeneratedAtRef.current = undefined;
      setPlanSaveStatus("error");
      return;
    }
    setSavedState(next);
    setPlanSaveStatus("saved");
  }

  if (activeView === "landing") {
    return (
      <LandingPage
        onStartDiagnosis={() => startEntryFlow("check-progress")}
        onFindTrack={() => startEntryFlow("find-track")}
      />
    );
  }

  if (activeView === "recommendation") {
    return (
      <div className="recommendation-page-shell">
        <header className="recommendation-page-header">
          <button
            className="recommendation-brand"
            type="button"
            onClick={() => navigateAppRoute({ view: "landing" })}
          >
            <img src="/dku-seal.svg" alt="" aria-hidden="true" />
            <span><strong>식품자원경제학과</strong><small>트랙 추천</small></span>
          </button>
          <nav aria-label="트랙 추천 화면">
            <button
              className={recommendationStep === "survey" ? "active" : ""}
              type="button"
              aria-current={recommendationStep === "survey" ? "page" : undefined}
              onClick={() => navigateAppRoute({ view: "recommendation", step: "survey" })}
            >
              관심 설문
            </button>
            <button
              className={recommendationStep === "axes" ? "active" : ""}
              type="button"
              aria-current={recommendationStep === "axes" ? "page" : undefined}
              onClick={() => navigateAppRoute({ view: "recommendation", step: "axes" })}
            >
              기준별 비교
            </button>
          </nav>
        </header>
        {recommendationStep === "survey" ? (
          <InterestSurvey
            value={savedState.interestSurvey ?? emptyInterestSurveyState()}
            storageError={storageError}
            onChange={changeInterestSurvey}
            onChooseTrack={chooseInterestTrack}
            onSkipToDiagnosis={() => startEntryFlow("check-progress")}
          />
        ) : (
          <TrackRecommendationAxes
            axes={recommendationAxes}
            courseInputReady={Boolean(savedState.profile && savedState.courseInputReviewedAt)}
            storageError={storageError}
            activeAxis={recommendationAxis}
            onOpenInterestSurvey={() => navigateAppRoute({ view: "recommendation", step: "survey" })}
            onOpenCourseInput={openCourseInputFromAxes}
            onOpenGraduationPlan={() => navigateAppRoute({ view: "plan", step: "setup" })}
          />
        )}
      </div>
    );
  }

  if (activeView === "plan") {
    const missingTargetTrack = savedState.profile?.studyPath === "track-major"
      && !savedState.targetTrackId;
    const prerequisitesReady = Boolean(
      savedState.profile
      && savedState.courseInputReviewedAt
      && !missingTargetTrack,
    );
    if (!prerequisitesReady) {
      return (
        <GraduationPlanPrerequisite
          hasProfile={Boolean(savedState.profile)}
          courseInputReady={Boolean(savedState.courseInputReviewedAt)}
          targetTrackReady={!missingTargetTrack}
          headingRef={planHeadingRef}
          onBack={() => navigateAppRoute({ view: "recommendation", step: "axes", axis: "plan" })}
          onEditPrerequisites={openCourseInputFromAxes}
        />
      );
    }

    const planAlreadySaved = Boolean(savedState.graduationPlan && savedState.snapshots.some(
      (snapshot) => snapshot.graduationPlan?.generatedAt === savedState.graduationPlan?.generatedAt,
    ));
    return (
      <div className="graduation-plan-shell">
        <div className="graduation-plan-topbar">
          <button
            className="text-button"
            type="button"
            onClick={() => navigateAppRoute({ view: "recommendation", step: "axes", axis: "plan" })}
          >
            추천 비교로 돌아가기
          </button>
          <span>저장된 입력은 이 브라우저에서만 사용합니다.</span>
        </div>

        {storageError && planSaveStatus !== "error" && (
          <p className="storage-error" role="alert">
            이 브라우저에 계획 변경을 저장하지 못했습니다. 새로고침 전에 입력을 확인해 주세요.
          </p>
        )}
        {planSaveStatus === "saved" && (
          <p className="plan-save-feedback success" role="status">
            계획을 이 브라우저에 저장했습니다.
          </p>
        )}
        {planSaveStatus === "error" && (
          <p className="plan-save-feedback error" role="alert">
            계획을 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인해 주세요.
          </p>
        )}

        {planStep === "setup" ? (
          <main className="graduation-plan-setup-page" aria-labelledby="graduation-plan-setup-title">
            <header className="graduation-plan-setup-heading">
              <span>졸업 계획 조건</span>
              <h1 id="graduation-plan-setup-title" ref={planHeadingRef} tabIndex={-1}>
                학기별 참고 계획의 범위를 정해 주세요
              </h1>
              <p>검토한 이수 과목은 그대로 두고, 앞으로 배치할 학기와 한 학기 수강량만 입력합니다.</p>
            </header>
            <GraduationPlanSetup
              value={planDraft}
              onChange={(value) => {
                setPlanDraft(value);
                setPlanSaveStatus("idle");
              }}
              onSubmit={submitGraduationPlan}
            />
          </main>
        ) : (
          <GraduationPlanResult
            result={savedState.graduationPlan!}
            step={planStep}
            headingRef={planHeadingRef}
            onEdit={editGraduationPlanInputs}
            onShowChecks={() => navigateAppRoute({ view: "plan", step: "checks" })}
            onSave={saveGraduationPlanSnapshot}
            saveDisabled={planAlreadySaved}
          />
        )}
      </div>
    );
  }

  if (diagnosisStep === "profile" || !savedState.profile) {
    return (
      <div className="profile-step-shell">
        {storageError && (
          <p className="storage-error" role="alert">
            이 브라우저에 변경 내용을 저장하지 못했습니다. 탭을 닫기 전에 입력 내용을 확인해 주세요.
          </p>
        )}
        <StudyPathSetup
          profile={savedState.profile}
          initialDraft={savedState.profileDraft}
          targetTrackId={savedState.targetTrackId}
          headingRef={stepHeadingRef}
          onTargetTrackChange={changeTargetTrack}
          onChange={updateProfileDraft}
          onComplete={completeProfile}
        />
      </div>
    );
  }

  const activePrimaryViewId = activeView;

  return (
    <div className="app-shell service-shell">
      <header className="service-header">
        <button className="brand-mark brand-button service-brand" type="button" onClick={() => navigateAppRoute({ view: "landing" })}>
          <img className="brand-seal" src="/dku-seal.svg" alt="" aria-hidden="true" />
          <div>
            <strong>단국대학교</strong>
            <span>식품자원경제학과 트랙진단</span>
          </div>
        </button>

        <nav className="service-primary-nav" aria-label="자가진단 주요 단계">
          {primaryViewItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activePrimaryViewId === item.id ? "service-nav-button active" : "service-nav-button"}
                type="button"
                aria-current={activePrimaryViewId === item.id ? "step" : undefined}
                onClick={() => {
                  if (item.id === "diagnosis") {
                    navigateDiagnosisStep(resolveDiagnosisStep("?view=diagnosis&step=courses", savedState));
                   } else if (item.id === "result") {
                     navigateDiagnosisStep(resolveDiagnosisStep("?view=result&step=result", savedState));
                   } else {
                     navigateAppRoute({ view: "recommendation", step: "axes" });
                   }
                }}
              >
                <small>{item.step}</small>
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="service-header-actions">
          <button className="service-help-button" type="button" aria-label="사이트 사용법 열기" onClick={openGuide}>
            <HelpCircle aria-hidden="true" size={18} />
            <span>사용법</span>
          </button>
          <details className="service-more-menu">
            <summary aria-label="더보기 메뉴">
              <MoreHorizontal aria-hidden="true" size={20} />
              <span>더보기</span>
            </summary>
            <div className="service-more-popover">
              {secondaryViewItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    className={activeView === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={(event) => {
                      navigateAppRoute({ view: item.id as "overview" | "resources" | "modules" | "contact" });
                      event.currentTarget.closest("details")?.removeAttribute("open");
                    }}
                  >
                    <Icon aria-hidden="true" size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </details>
        </div>
      </header>

      {storageError && (
        <p className="storage-error service-storage-error" role="alert">
          이 브라우저에 변경 내용을 저장하지 못했습니다. 탭을 닫기 전에 입력 내용을 확인해 주세요.
        </p>
      )}

      <main className="workspace service-workspace">
        {activeView === "overview" && (
          <section className="primary-panel full-panel">
            <OverviewView />
          </section>
        )}

        {activeView === "resources" && (
          <section className="primary-panel full-panel">
            <ResourcesView />
          </section>
        )}

        {activeView === "modules" && (
          <div className="view-layout">
            <TrackPicker
              selectedTrackIds={selectedTrackIds}
              enrollmentType={enrollmentType}
              onToggleTrack={toggleTrack}
              onEditProfile={editProfile}
              onReset={resetState}
            />
            <section className="primary-panel">
              <ModulesView selectedTrackIds={selectedTrackIds} />
            </section>
          </div>
        )}

        {activeView === "diagnosis" && pdfInputRoute === "pdf-review" && pdfImportDraft && (
          <section className="primary-panel full-panel pdf-review-panel-shell">
            <PdfMatchReview
              draft={pdfImportDraft}
              conflicts={pdfMergeConflicts}
              saveError={pdfReviewSaveError}
              headingRef={stepHeadingRef}
              onApprove={approvePdfMatches}
              onBack={() => returnToDirectCourseInput("push", false)}
              onCancel={() => returnToDirectCourseInput("replace", true)}
              onSearchCourse={() => returnToDirectCourseInput("push", false)}
            />
          </section>
        )}

        {activeView === "diagnosis" && pdfInputRoute !== "pdf-review" && (
          <div className="view-layout">
            {requiresTrack && (trackSetupOpen ? (
              <TrackPicker
                selectedTrackIds={selectedTrackIds}
                enrollmentType={enrollmentType}
                onToggleTrack={toggleTrack}
                onEditProfile={editProfile}
                onReset={resetState}
                onContinue={() => setTrackSetupOpen(false)}
              />
            ) : (
              <TrackSetupSummary
                selectedTrackNames={selectedTracks.map((track) => track.name)}
                enrollmentType={enrollmentType}
                onEdit={() => setTrackSetupOpen(true)}
              />
            ))}
            <div className="content-grid">
              <section className="primary-panel">
                {pdfImportRecoveryNotice && (
                  <p className="pdf-import-recovery-notice" role="status">
                    개인정보 보호를 위해 PDF 검수 내용은 새로고침 후 저장하지 않았어요. 직접 선택은 그대로 유지됩니다.
                  </p>
                )}
                <DiagnosisView
                  completedCourseIds={completedCourseIds}
                  selectedTrackIds={selectedTrackIds}
                  enrollmentType={enrollmentType}
                  headingRef={stepHeadingRef}
                  gradeFilter={gradeFilter}
                  semesterFilter={semesterFilter}
                  onGradeFilterChange={setGradeFilter}
                  onSemesterFilterChange={setSemesterFilter}
                  onToggleCourse={toggleCourse}
                  onSaveCourses={saveCompletedCoursesNow}
                  onPdfAnalyzed={openPdfMatchReview}
                  lastManualSaveAt={lastManualSaveAt}
                />
              </section>

              <DiagnosisPanel
                result={result}
                selectedTrackNames={selectedTracks.map((track) => track.name)}
                enrollmentType={enrollmentType}
                completedCount={completedCourseIds.length}
                allowResult={!requiresTrack || Boolean(savedState.targetTrackId)}
                onShowResult={confirmCourseInput}
              />
            </div>
          </div>
        )}

        {activeView === "result" && savedState.profile && pathProgress && (
          <section className="primary-panel full-panel">
            <ResultDetailView
              result={result}
              profile={savedState.profile}
              pathProgress={pathProgress}
              headingRef={stepHeadingRef}
              onOpenRecommendations={() => navigateAppRoute({ view: "recommendation", step: "axes" })}
              onGoToPlan={() => navigateAppRoute({ view: "plan", step: "setup" })}
            />
          </section>
        )}

        {activeView === "contact" && (
          <section className="primary-panel full-panel compact-panel">
            <ContactView />
          </section>
        )}
      </main>
      {guideOpen && (
        <GuideDialog
          activeStepIndex={guideStepIndex}
          onClose={closeGuide}
          onMoveStep={moveGuideStep}
          onGoToView={goToGuideStepView}
        />
      )}
    </div>
  );
}

function GraduationPlanPrerequisite({
  hasProfile,
  courseInputReady,
  targetTrackReady,
  headingRef,
  onBack,
  onEditPrerequisites,
}: {
  hasProfile: boolean;
  courseInputReady: boolean;
  targetTrackReady: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onEditPrerequisites: () => void;
}) {
  return (
    <main className="plan-entry-shell" aria-labelledby="plan-entry-title">
      <section className="plan-entry-card">
        <span>졸업 계획 준비</span>
        <h1 id="plan-entry-title" ref={headingRef} tabIndex={-1}>
          졸업 계획 전에 입력 상태를 확인해 주세요
        </h1>
        <p>
          이 단계에서는 특정 트랙을 자동으로 고르거나 계획을 계산하지 않습니다.
          프로필과 완료한 이수 과목을 먼저 확인한 뒤, 기준별 추천으로 돌아가 판단해 주세요.
        </p>
        <ul aria-label="졸업 계획 사전 입력 상태">
          <li className={hasProfile ? "ready" : "pending"}>
            <CheckCircle2 aria-hidden="true" size={20} />
            <span>프로필 {hasProfile ? "입력됨" : "입력 필요"}</span>
          </li>
          <li className={courseInputReady ? "ready" : "pending"}>
            <ClipboardCheck aria-hidden="true" size={20} />
            <span>이수 과목 {courseInputReady ? "검토됨" : "확인 필요"}</span>
          </li>
          {!targetTrackReady && (
            <li className="pending">
              <Compass aria-hidden="true" size={20} />
              <span>목표 트랙 선택 필요</span>
            </li>
          )}
        </ul>
        <div className="plan-entry-actions">
          <button className="primary-button" type="button" onClick={onEditPrerequisites}>
            프로필·이수 과목 확인
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className="icon-button" type="button" onClick={onBack}>
            추천 비교로 돌아가기
          </button>
        </div>
      </section>
    </main>
  );
}

function LandingPage({
  onStartDiagnosis,
  onFindTrack,
}: {
  onStartDiagnosis: () => void;
  onFindTrack: () => void;
}) {
  const questions = [
    { title: "내 과목은 어느 트랙에 가까울까?", value: "푸드마케팅", meta: "현재 예시 60%" },
    { title: "앞으로 무엇을 더 들어야 할까?", value: "4과목", meta: "부족 모듈 2개" },
    { title: "다음 학기는 어떻게 짤까?", value: "식품유통경제학", meta: "우선 추천 과목" },
  ];
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPreviewProgress(60);
      return;
    }
    setPreviewProgress(0);
    const startedAt = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const ratio = Math.min((now - startedAt) / 480, 1);
      setPreviewProgress(Math.round((1 - Math.pow(1 - ratio, 3)) * 60));
      if (ratio < 1) frameId = window.requestAnimationFrame(tick);
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeQuestion]);

  return (
    <div className="v2-landing" id="landing-top">
      <header className="v2-landing-header">
        <a className="v2-landing-brand" href="#landing-top" aria-label="처음으로">
          <img src="/dku-seal.svg" alt="" aria-hidden="true" />
          <span><strong>식품자원경제학과</strong><small>트랙제 자가진단</small></span>
        </a>
        <nav aria-label="랜딩페이지 안내">
          <a href="#track-system">트랙제란?</a>
          <a href="#service-flow">이용 방법</a>
          <button type="button" onClick={onStartDiagnosis}>자가진단 바로 시작</button>
        </nav>
      </header>

      <main>
        <section className="v2-hero" aria-labelledby="v2-hero-title">
          <div className="v2-container v2-hero-grid">
            <div className="v2-hero-copy">
              <p className="v2-eyebrow">2026 식품자원경제학과 교육과정 기준</p>
              <h1 id="v2-hero-title">이수 과목을 체크하고,<br />남은 전공 방향은<br /><span>한눈에 확인하세요.</span></h1>
              <p>트랙제를 처음 접해도 괜찮아요. 현재 이수 과목부터 입력하면 가까운 트랙과 부족한 모듈, 다음 수강 우선순위를 차례대로 보여드립니다.</p>
              <div className="v2-hero-actions">
                <button type="button" onClick={onStartDiagnosis}>자가진단 바로 시작 <ArrowRight aria-hidden="true" size={19} /></button>
                <button className="v2-secondary-action" type="button" onClick={onFindTrack}>내 관심 트랙 찾기 <Heart aria-hidden="true" size={18} /></button>
              </div>
              <p className="v2-privacy"><ShieldCheck aria-hidden="true" size={16} /> 로그인 없이 이용 · 입력은 현재 브라우저에만 저장</p>
            </div>

            <div className="v2-hero-demo" aria-label="자가진단 결과 미리보기">
              <div className="v2-demo-top">
                <span>내 트랙 찾기</span>
                <small>예시 화면</small>
              </div>
              <div className="v2-demo-questions" role="tablist" aria-label="궁금한 내용 선택">
                {questions.map((question, index) => (
                  <button
                    className={activeQuestion === index ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={activeQuestion === index}
                    key={question.title}
                    onClick={() => setActiveQuestion(index)}
                  >
                    <span>{index + 1}</span>{question.title}
                  </button>
                ))}
              </div>
              <div className="v2-demo-result" aria-live="polite">
                <div>
                  <small>{questions[activeQuestion].meta}</small>
                  <strong>{questions[activeQuestion].value}</strong>
                </div>
                <span>{previewProgress}%</span>
                <progress max="100" value={previewProgress} aria-label={`예시 진행률 ${previewProgress}%`} />
              </div>
              <ul className="v2-demo-course-list">
                <li><span>식품유통경제학</span><small>이수 완료</small></li>
                <li><span>마케팅조사분석</span><small>이수 완료</small></li>
                <li className="next"><span>농식품정책론</span><small>다음 추천</small></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="v2-track-explainer" id="track-system" aria-labelledby="v2-track-title">
          <div className="v2-container">
            <div className="v2-section-heading">
              <p className="v2-eyebrow">트랙제 이해</p>
              <h2 id="v2-track-title">과목을 모듈로 묶고,<br />모듈을 진로 방향으로 연결해요.</h2>
              <p>트랙은 관심 분야에 맞는 전공 과목을 체계적으로 선택하도록 돕는 교육과정입니다. 과목 하나가 모듈을 채우고, 관련 모듈들이 하나의 트랙을 만듭니다.</p>
            </div>
            <div className="v2-relation-flow" aria-label="과목에서 트랙으로 이어지는 예시">
              <div><small>과목</small><strong>식품유통경제학</strong></div>
              <ArrowRight aria-hidden="true" size={22} />
              <div><small>모듈</small><strong>F. 유통무역</strong></div>
              <ArrowRight aria-hidden="true" size={22} />
              <div className="highlight"><small>트랙</small><strong>푸드마케팅</strong></div>
            </div>
            <div className="v2-official-note">
              <span>트랙은 선택형 교육과정이며 세부 인정 기준은 최신 학과 안내를 따릅니다.</span>
              <a href={OFFICIAL_CURRICULUM_URL} target="_blank" rel="noreferrer">2026 공식 교육과정 <ExternalLink aria-hidden="true" size={14} /></a>
            </div>
          </div>
        </section>

        <section className="v2-benefits" aria-labelledby="v2-benefit-title">
          <div className="v2-container v2-benefit-layout">
            <div className="v2-section-heading">
              <p className="v2-eyebrow">왜 확인해야 할까요?</p>
              <h2 id="v2-benefit-title">수강신청을 하기 전에<br />전공의 방향을 먼저 정할 수 있어요.</h2>
            </div>
            <div className="v2-benefit-rows">
              <article><span>01</span><div><strong>진로에 맞는 전문성</strong><p>관심 분야와 연결된 과목을 모듈 단위로 골라 전공 공부의 방향을 선명하게 만듭니다.</p></div></article>
              <article><span>02</span><div><strong>내가 채운 조건의 가시화</strong><p>복잡한 교육과정표 대신 충족한 모듈과 부족한 과목을 내 이력 기준으로 확인합니다.</p></div></article>
              <article><span>03</span><div><strong>바뀌어도 이어지는 계획</strong><p>공통 모듈과 겹치는 과목을 확인해 복수 트랙이나 진로 변경에도 유연하게 대비합니다.</p></div></article>
            </div>
          </div>
        </section>

        <section className="v2-service-flow" id="service-flow" aria-labelledby="v2-flow-title">
          <div className="v2-container">
            <div className="v2-section-heading centered">
              <p className="v2-eyebrow">서비스 이용 흐름</p>
              <h2 id="v2-flow-title">한 번에 하나씩만 확인하세요.</h2>
              <p>긴 표를 모두 이해할 필요 없이, 현재 상태에서 필요한 다음 단계만 이어서 보여드립니다.</p>
            </div>
            <ol className="v2-flow-list">
              <li><span>1</span><ClipboardCheck aria-hidden="true" size={22} /><div><strong>이수 과목 체크</strong><p>학년·학기 또는 모듈별로 들은 과목을 선택합니다.</p></div></li>
              <li><span>2</span><Compass aria-hidden="true" size={22} /><div><strong>맞춤 트랙 진단</strong><p>충족 여부와 가까운 추가 트랙을 비교합니다.</p></div></li>
              <li><span>3</span><CalendarDays aria-hidden="true" size={22} /><div><strong>학기 계획 연결</strong><p>부족한 과목을 다음·다다음 학기로 나눠 봅니다.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="v2-final-cta" aria-labelledby="v2-final-title">
          <div className="v2-container">
            <div><small>학생이 만든 비공식 보조 도구</small><h2 id="v2-final-title">다음 수강신청,<br />내 상태를 알고 시작하세요.</h2></div>
            <button type="button" onClick={onStartDiagnosis}>자가진단 바로 시작 <ArrowRight aria-hidden="true" size={20} /></button>
          </div>
        </section>
      </main>
      <footer className="v2-footer"><div className="v2-container"><span>단국대학교 식품자원경제학과 트랙제 자가진단</span><small>최종 이수 인정 여부는 학과 공식 안내로 확인하세요.</small></div></footer>
    </div>
  );
}

function LegacyLandingPage({ onStart }: { onStart: () => void }) {
  const [activeTrackId, setActiveTrackId] = useState<TrackId>("food-marketing");
  const [activePreviewTab, setActivePreviewTab] = useState<"summary" | "modules" | "courses" | "recommendations">("summary");
  const [activeHeroQuestion, setActiveHeroQuestion] = useState(0);
  const [heroProgress, setHeroProgress] = useState(0);
  const activeTrack = tracks.find((track) => track.id === activeTrackId) ?? tracks[0];
  const activeModuleIds = getTrackModuleIds(activeTrack);
  const heroQuestions = [
    {
      title: "내가 들은 과목은 어느 트랙에 들어갈까?",
      focus: "track",
    },
    {
      title: "필수 과목은 얼마나 남았을까?",
      focus: "remaining",
    },
    {
      title: "다음 학기에는 무엇을 먼저 들어야 할까?",
      focus: "priority",
    },
  ] as const;
  const relationRows = [
    ["식품유통경제학", "F. 유통무역"],
    ["마케팅조사분석", "H. 머천다이징"],
    ["농식품정책론", "I. 농식품정책"],
    ["식품가격분석", "J. 프라이싱"],
    ["계량경제학", "L. 경제성평가"],
  ];
  const benefitItems = [
    {
      icon: GraduationCap,
      title: "진로에 맞는 전문성을 키울 수 있어요",
      body: "졸업 후 진로를 고려해 구성된 트랙을 기준으로 관심 분야의 과목을 체계적으로 선택할 수 있습니다.",
    },
    {
      icon: Layers3,
      title: "공부한 세부 분야를 분명하게 보여줄 수 있어요",
      body: "학과 공식 안내는 이수 트랙을 세부적으로 드러낼 수 있다고 설명합니다.",
    },
    {
      icon: Scale,
      title: "여러 트랙을 유연하게 설계할 수 있어요",
      body: "겹치는 모듈을 활용해 복수 트랙으로 확장하고, 희망 트랙도 학기별로 조정할 수 있습니다.",
    },
  ];
  const previewModules = [
    { label: "F. 유통무역", value: 80, status: "충족" },
    { label: "H. 머천다이징", value: 60, status: "충족" },
    { label: "I. 농식품정책", value: 40, status: "부족" },
    { label: "J. 프라이싱", value: 75, status: "충족" },
    { label: "L. 경제성평가", value: 20, status: "부족" },
  ];
  const previewTabs = [
    { id: "summary" as const, label: "요약" },
    { id: "modules" as const, label: "모듈 현황" },
    { id: "courses" as const, label: "과목 현황" },
    { id: "recommendations" as const, label: "다음 수강 추천" },
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setHeroProgress(60);
      return;
    }

    setHeroProgress(0);
    const startedAt = performance.now();
    let frameId = 0;
    const updateProgress = (time: number) => {
      const ratio = Math.min((time - startedAt) / 520, 1);
      const easedRatio = 1 - Math.pow(1 - ratio, 3);
      setHeroProgress(Math.round(easedRatio * 60));
      if (ratio < 1) frameId = window.requestAnimationFrame(updateProgress);
    };
    frameId = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeHeroQuestion]);

  return (
    <div className="landing-page" id="landing-top">
      <header className="landing-header">
        <a className="landing-brand" href="#landing-top" aria-label="랜딩페이지 처음으로">
          <img src="/dku-logo.png" alt="단국대학교" />
          <span>
            <strong>식품자원경제학과</strong>
            <small>트랙제 자가진단</small>
          </span>
        </a>
      </header>

      <main>
        <section className="landing-section landing-hero" aria-labelledby="landing-title">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-story">
              <div className="landing-hero-copy">
                <h1 id="landing-title">
                  수강신청 전에,<br />
                  내 전공 방향부터<br />
                  <span>확인하세요</span>
                </h1>
                <p className="landing-lead">
                  식품자원경제학과 트랙은 졸업 후 진로와 연결됩니다. 교과과정을 이해하고 나에게 맞는 과목을
                  선택해 학업 계획을 세워보세요.
                </p>
              </div>
              <figure className="landing-hero-media">
                <img
                  src="/landing-student.jpg"
                  alt="교내 학습 공간에서 노트북으로 수강 계획을 확인하는 학생"
                  fetchPriority="high"
                />
              </figure>
            </div>

            <section className="landing-diagnostic" aria-labelledby="landing-diagnostic-title">
              <ol className="landing-diagnostic-stepper" aria-label="진단 진행 단계">
                <li className="active"><span>1</span><strong>질문 선택</strong></li>
                <li><span>2</span><strong>이수·연계 과목 체크</strong></li>
                <li><span>3</span><strong>결과 확인</strong></li>
              </ol>

              <div className="landing-question-picker">
                <h2 id="landing-diagnostic-title">지금 가장 궁금한 건 무엇인가요?</h2>
                <div className="landing-question-options">
                  {heroQuestions.map((question, index) => (
                    <button
                      className={activeHeroQuestion === index ? "active" : ""}
                      type="button"
                      key={question.title}
                      aria-pressed={activeHeroQuestion === index}
                      onClick={() => setActiveHeroQuestion(index)}
                    >
                      <span>{index + 1}</span>
                      <strong>{question.title}</strong>
                      <ArrowRight aria-hidden="true" size={19} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="landing-live-result" aria-live="polite">
                <div className="landing-live-result-head">
                  <strong>진단 결과 미리보기</strong>
                  <span><i aria-hidden="true" />실시간 분석</span>
                </div>
                <div className="landing-live-metrics" key={activeHeroQuestion}>
                  <div className={heroQuestions[activeHeroQuestion].focus === "track" ? "active" : ""}>
                    <span>푸드마케팅</span>
                    <strong>{heroProgress}%</strong>
                    <progress max="100" value={heroProgress} aria-label={`푸드마케팅 예시 진행률 ${heroProgress}퍼센트`} />
                  </div>
                  <div className={heroQuestions[activeHeroQuestion].focus === "remaining" ? "active" : ""}>
                    <span>남은 과목</span>
                    <strong>4<small>개</small></strong>
                    <ClipboardCheck aria-hidden="true" size={25} />
                  </div>
                  <div className={heroQuestions[activeHeroQuestion].focus === "priority" ? "active" : ""}>
                    <span>다음 우선순위</span>
                    <strong>식품유통경제학</strong>
                    <BookOpenCheck aria-hidden="true" size={25} />
                  </div>
                </div>
              </div>

              <button className="landing-diagnostic-cta" type="button" onClick={onStart}>
                내 이수 현황 확인하기
                <ArrowRight aria-hidden="true" size={21} />
              </button>
              <p className="landing-diagnostic-note">
                <ShieldCheck aria-hidden="true" size={15} />
                로그인 없이 이용 가능 · 입력 내용은 이 브라우저에만 저장돼요
              </p>
            </section>
          </div>
        </section>

        <section className="landing-service-strip" id="landing-why" aria-labelledby="landing-service-strip-title">
          <div className="landing-container">
            <h2 id="landing-service-strip-title" className="sr-only">자가진단에서 확인할 수 있는 내용</h2>
            <div className="landing-service-strip-list">
              <div><Compass aria-hidden="true" size={27} /><strong>내 트랙 적합도<br />한눈에 확인</strong></div>
              <div><ClipboardCheck aria-hidden="true" size={27} /><strong>필요 과목과 이수 현황<br />실시간 분석</strong></div>
              <div><CalendarDays aria-hidden="true" size={27} /><strong>다음 학기 수강 계획까지<br />맞춤 추천</strong></div>
              <div><ShieldCheck aria-hidden="true" size={27} /><strong>공식 교육과정 기준으로<br />정확하게 진단</strong></div>
            </div>
            <a className="landing-scroll-cue" href="#landing-track-system">
              <span>아래에서 트랙별 커리큘럼과 진로를 더 알아보세요</span>
              <ArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </section>

        <section className="landing-section" id="landing-track-system" aria-labelledby="landing-relation-title">
          <div className="landing-container landing-copy-layout">
            <div className="landing-section-copy">
              <p className="landing-section-index">트랙제 이해</p>
              <h2 id="landing-relation-title">과목 하나는 모듈에, 모듈은 트랙에 연결됩니다.</h2>
              <p>관심 진로에 맞는 과목을 모듈 단위로 이수하며 나만의 전공 방향을 설계하는 방식입니다.</p>
            </div>
            <div className="landing-relation-board" aria-label="푸드마케팅 과목과 모듈 관계 예시">
              <div className="landing-relation-head" aria-hidden="true">
                <span>과목</span><ArrowRight size={16} /><span>모듈</span><ArrowRight size={16} /><span>트랙</span>
              </div>
              <div className="landing-relation-body">
                <div className="landing-relation-rows">
                  {relationRows.map(([courseName, moduleName]) => (
                    <div className="landing-relation-row" key={courseName}>
                      <span>{courseName}</span>
                      <ArrowRight aria-hidden="true" size={16} />
                      <strong>{moduleName}</strong>
                    </div>
                  ))}
                </div>
                <ArrowRight className="landing-relation-final-arrow" aria-hidden="true" size={22} />
                <div className="landing-relation-track">
                  <Compass aria-hidden="true" size={30} />
                  <strong>푸드마케팅</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-benefit-section" aria-labelledby="landing-benefit-title">
          <div className="landing-container">
            <div className="landing-section-copy landing-benefit-heading">
              <p className="landing-section-index">공식 안내로 확인한 이유</p>
              <h2 id="landing-benefit-title">트랙제를 선택하면 전공 공부가 더 선명해져요.</h2>
              <p>
                식품자원경제학과 트랙은 졸업 후 진로를 고려해 구성된 선택형 교육과정입니다. 관심 분야에 맞춰 과목과
                모듈을 이수하며 전공 방향을 설계할 수 있습니다.
              </p>
            </div>
            <div className="landing-benefit-list">
              {benefitItems.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title}>
                    <Icon aria-hidden="true" size={25} />
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                );
              })}
            </div>
            <div className="landing-benefit-source">
              <p>트랙은 선택 사항이며, 복수 트랙·변경·중복 모듈 인정의 세부 기준은 학과의 최신 안내를 따릅니다.</p>
              <div>
                <a href={OFFICIAL_CURRICULUM_URL} target="_blank" rel="noreferrer">
                  2026 공식 교육과정 <ExternalLink aria-hidden="true" size={14} />
                </a>
                <a href={OFFICIAL_TRACK_VIDEO_URL} target="_blank" rel="noreferrer">
                  학과 공식 트랙제 영상 <ExternalLink aria-hidden="true" size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="landing-track-title">
          <div className="landing-container landing-track-layout">
            <div className="landing-section-copy">
              <p className="landing-section-index">학과전공 4개 · 융합전공 1개</p>
              <h2 id="landing-track-title">다섯 개 트랙은 이렇게 달라요.</h2>
              <p>진로 방향에 맞는 트랙을 선택하고, 필요한 모듈을 비교해보세요.</p>
            </div>
            <div className="landing-track-explorer">
              <div className="landing-track-tabs" role="tablist" aria-label="트랙 선택">
                {tracks.map((track) => (
                  <button
                    role="tab"
                    aria-selected={track.id === activeTrack.id}
                    className={track.id === activeTrack.id ? "active" : ""}
                    type="button"
                    key={track.id}
                    onClick={() => setActiveTrackId(track.id)}
                  >
                    {track.id === "regional-development-consulting" ? "지역개발·컨설팅" : track.name}
                  </button>
                ))}
              </div>
              <div className="landing-track-panel" role="tabpanel">
                <div className="landing-track-summary">
                  <Compass aria-hidden="true" size={30} />
                  <span>{activeTrack.kind}</span>
                  <h3>{activeTrack.name}</h3>
                </div>
                <div>
                  <strong>관련 모듈</strong>
                  <ul className="landing-module-list">
                    {activeModuleIds.map((moduleId) => (
                      <li key={moduleId}>
                        <span>{moduleId}</span>
                        <small>{getModuleLabel(moduleId).replace(`${moduleId}. `, "")}</small>
                      </li>
                    ))}
                  </ul>
                  <strong>진로 방향</strong>
                  <p>{activeTrack.description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-how-section" id="landing-how" aria-labelledby="landing-how-title">
          <div className="landing-container landing-copy-layout">
            <div className="landing-section-copy">
              <p className="landing-section-index">이용 방법</p>
              <h2 id="landing-how-title">그래서 이 서비스는 계산보다 선택에 집중하게 도와줍니다.</h2>
            </div>
            <ol className="landing-process">
              <li>
                <ListChecks aria-hidden="true" size={24} />
                <span>1</span>
                <strong>관심 트랙 선택</strong>
                <p>복수 트랙도 선택해 함께 비교할 수 있습니다.</p>
              </li>
              <li>
                <ClipboardCheck aria-hidden="true" size={24} />
                <span>2</span>
                <strong>이수·예정 과목 체크</strong>
                <p>학년과 학기별 전공 과목을 한눈에 확인합니다.</p>
              </li>
              <li>
                <BookOpenCheck aria-hidden="true" size={24} />
                <span>3</span>
                <strong>부족 과목과 우선순위 확인</strong>
                <p>부족 모듈과 다음 학기 수강 후보를 정리합니다.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="landing-section" id="landing-preview" aria-labelledby="landing-preview-title">
          <div className="landing-container landing-preview-layout">
            <div className="landing-section-copy">
              <p className="landing-section-index">예시 화면</p>
              <h2 id="landing-preview-title">설명만 읽지 말고, 실제 결과 화면을 먼저 확인하세요.</h2>
              <a href="#landing-how">진단 흐름 다시 보기 <ArrowRight aria-hidden="true" size={15} /></a>
            </div>
            <div className="landing-result-preview" aria-label="푸드마케팅 진단 결과 예시">
              <div className="landing-preview-tabs" role="tablist" aria-label="결과 예시 메뉴">
                {previewTabs.map((tab) => (
                  <button
                    className={activePreviewTab === tab.id ? "active" : ""}
                    id={`landing-preview-tab-${tab.id}`}
                    key={tab.id}
                    role="tab"
                    aria-controls={`landing-preview-panel-${tab.id}`}
                    aria-selected={activePreviewTab === tab.id}
                    type="button"
                    onClick={() => setActivePreviewTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="landing-preview-body">
                <aside>
                  <strong>푸드마케팅</strong>
                  {previewTabs.map((tab) => (
                    <button
                      className={activePreviewTab === tab.id ? "active" : ""}
                      key={tab.id}
                      type="button"
                      onClick={() => setActivePreviewTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </aside>
                <div
                  className="landing-preview-main"
                  id={`landing-preview-panel-${activePreviewTab}`}
                  role="tabpanel"
                  aria-labelledby={`landing-preview-tab-${activePreviewTab}`}
                >
                  {activePreviewTab === "summary" && (
                    <>
                      <div className="landing-preview-metrics">
                        <div><span>진행률</span><strong>60%</strong></div>
                        <div><span>남은 과목</span><strong>4개</strong></div>
                        <div><span>필수 모듈 충족</span><strong>3 / 5</strong></div>
                        <div><span>다음 학기 우선순위</span><strong>식품유통경제학</strong></div>
                      </div>
                      <PreviewModuleProgress items={previewModules} />
                    </>
                  )}
                  {activePreviewTab === "modules" && (
                    <div className="landing-preview-detail">
                      <div>
                        <span>모듈 현황</span>
                        <strong>충족한 모듈과 더 채워야 할 모듈을 구분해요.</strong>
                      </div>
                      <PreviewModuleProgress items={previewModules} />
                    </div>
                  )}
                  {activePreviewTab === "courses" && (
                    <div className="landing-preview-detail">
                      <div>
                        <span>과목 현황</span>
                        <strong>과목별 이수 상태를 한 줄씩 확인해요.</strong>
                      </div>
                      <ul className="landing-preview-course-list">
                        <li><span>식품유통경제학</span><small>이수 예정</small></li>
                        <li><span>마케팅조사분석</span><small className="complete">이수</small></li>
                        <li><span>농식품정책론</span><small>미이수</small></li>
                        <li><span>식품가격분석</span><small className="complete">이수</small></li>
                      </ul>
                    </div>
                  )}
                  {activePreviewTab === "recommendations" && (
                    <div className="landing-preview-detail">
                      <div>
                        <span>다음 수강 추천</span>
                        <strong>부족한 모듈을 채우는 과목부터 보여줘요.</strong>
                      </div>
                      <div className="landing-preview-recommendation">
                        <span>1순위</span>
                        <strong>식품유통경제학</strong>
                        <p>F. 유통무역 모듈을 보완하고 푸드마케팅 트랙 진행률을 높일 수 있는 과목입니다.</p>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="landing-next-action">
                  <strong>다음 행동 제안</strong>
                  <ul>
                    <li>부족한 모듈 과목 우선 수강</li>
                    <li>추천 과목을 다음 학기에 배치</li>
                    <li>복수 트랙 비교도 함께 확인</li>
                  </ul>
                  <button type="button" onClick={onStart}>트랙 비교하기</button>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-usecase-band" aria-labelledby="landing-usecase-title">
          <div className="landing-container">
            <h2 id="landing-usecase-title" className="sr-only">추천 이용 상황</h2>
            <div className="landing-usecase-list">
              <div><CalendarDays aria-hidden="true" size={24} /><span>수강신청 전<br />이수 현황을 점검할 때</span></div>
              <div><Scale aria-hidden="true" size={24} /><span>복수 트랙을<br />비교하고 싶을 때</span></div>
              <div><RotateCcw aria-hidden="true" size={24} /><span>복학·편입 후<br />남은 과목을 다시 정리할 때</span></div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-final-section" aria-labelledby="landing-final-title">
          <div className="landing-container landing-final-card">
            <div className="landing-final-copy">
              <h2 id="landing-final-title">정답을 대신하는 서비스가 아니라, 학과 상담 전 내 상태를 정리하는 도구입니다.</h2>
              <div className="landing-final-actions">
                <button className="landing-primary-button" type="button" onClick={onStart}>
                  3분 자가진단 시작하기 <ArrowRight aria-hidden="true" size={18} />
                </button>
                <a className="landing-secondary-button" href={DEPARTMENT_URL} target="_blank" rel="noreferrer">
                  학과 공식 자료 보기 <ExternalLink aria-hidden="true" size={16} />
                </a>
              </div>
            </div>
            <div className="landing-trust-grid">
              <article><CalendarDays aria-hidden="true" size={24} /><strong>2026학년도 교육과정 기준</strong><p>공식 교육과정표를 기준으로 진단합니다.</p></article>
              <article><ShieldCheck aria-hidden="true" size={24} /><strong>자가진단 결과는 참고용</strong><p>학업 계획을 돕기 위한 확인 자료입니다.</p></article>
              <article><GraduationCap aria-hidden="true" size={24} /><strong>최종 인정 여부는 학과 확인</strong><p>트랙 인정과 변경은 최신 공식 안내를 따릅니다.</p></article>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <span>단국대학교 식품자원경제학과 트랙제 자가진단</span>
          <small>학생이 만든 비공식 보조 도구입니다.</small>
        </div>
      </footer>
    </div>
  );
}

function PreviewModuleProgress({
  items,
}: {
  items: Array<{ label: string; value: number; status: string }>;
}) {
  return (
    <div className="landing-module-progress">
      <strong>모듈별 진행 현황</strong>
      {items.map((item) => (
        <div className="landing-progress-row" key={item.label}>
          <span>{item.label}</span>
          <progress max="100" value={item.value} aria-label={`${item.label} ${item.value}퍼센트`} />
          <strong className={item.status === "충족" ? "complete" : "short"}>{item.status}</strong>
        </div>
      ))}
    </div>
  );
}

function PlanningModeTabs({
  activeMode,
  onChange,
}: {
  activeMode: "recommendation" | "semester";
  onChange: (mode: "recommendation" | "semester") => void;
}) {
  const items = [
    { id: "recommendation" as const, label: "트랙 추천", description: "현재 이수 이력으로 비교" },
    { id: "semester" as const, label: "학기별 계획", description: "다음 수강 우선순위 정리" },
  ];

  return (
    <div className="planning-mode-tabs" role="tablist" aria-label="학기 계획 보기 방식">
      {items.map((item) => (
        <button
          className={activeMode === item.id ? "active" : ""}
          id={`planning-tab-${item.id}`}
          key={item.id}
          role="tab"
          aria-controls={`planning-panel-${item.id}`}
          aria-selected={activeMode === item.id}
          type="button"
          onClick={() => onChange(item.id)}
        >
          <strong>{item.label}</strong>
          <span>{item.description}</span>
        </button>
      ))}
    </div>
  );
}

function GuideDialog({
  activeStepIndex,
  onClose,
  onMoveStep,
  onGoToView,
}: {
  activeStepIndex: number;
  onClose: () => void;
  onMoveStep: (nextIndex: number) => void;
  onGoToView: (viewId: ViewId) => void;
}) {
  const activeStep = guideSteps[activeStepIndex];
  const isFirst = activeStepIndex === 0;
  const isLast = activeStepIndex === guideSteps.length - 1;

  return (
    <div className="guide-dialog-backdrop" role="presentation">
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-dialog-title">
        <div className="guide-dialog-top">
          <div>
            <span>처음 사용하는 학생을 위한 안내</span>
            <h2 id="guide-dialog-title">사이트 사용방법</h2>
          </div>
          <button className="guide-close-button" type="button" aria-label="사용법 닫기" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="guide-stepper" aria-label="사용 단계">
          {guideSteps.map((step, index) => (
            <button
              className={index === activeStepIndex ? "guide-step active" : "guide-step"}
              type="button"
              key={step.title}
              onClick={() => onMoveStep(index)}
            >
              <span>{index + 1}</span>
              <strong>{step.title.replace(`${index + 1}. `, "")}</strong>
            </button>
          ))}
        </div>

        <article className="guide-step-card">
          <small>{activeStepIndex + 1} / {guideSteps.length}</small>
          <h3>{activeStep.title}</h3>
          <p>{activeStep.body}</p>
          {activeStep.items && (
            <ul>
              {activeStep.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          <button className="primary-button guide-action-button" type="button" onClick={() => onGoToView(activeStep.viewId)}>
            <span>{activeStep.action}</span>
          </button>
        </article>

        <div className="guide-dialog-actions">
          <button className="icon-button" type="button" disabled={isFirst} onClick={() => onMoveStep(activeStepIndex - 1)}>
            이전
          </button>
          {isLast ? (
            <button className="primary-button" type="button" onClick={onClose}>
              시작하기
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={() => onMoveStep(activeStepIndex + 1)}>
              다음 단계
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function OverviewView() {
  return (
    <div className="view-stack">
      <header className="topbar dku-hero">
        <div className="hero-text">
          <p className="source-line">DANKOOK UNIVERSITY · FOOD & RESOURCE ECONOMICS</p>
          <h1>
            <span>단국대학교 식품자원경제학과</span>
            <span>트랙제 자가진단</span>
          </h1>
          <p className="hero-copy">
            <span>2026학년도 모듈형 교육과정 기준으로,</span>
            <span>내가 선택한 트랙에서 남은 과목과 부족 학점을 바로 확인합니다.</span>
          </p>
          <div className="hero-feature-strip" aria-label="서비스 핵심 정보">
            <span>
              <strong>5</strong>
              트랙
            </span>
            <span>
              <strong>15</strong>
              모듈
            </span>
            <span>
              <strong>2026</strong>
              교육과정 기준
            </span>
          </div>
        </div>
        <div className="hero-side">
          <div className="department-mark-card">
            <img src="/department-mark.jpg" alt="식품자원경제학과 마크" />
            <div>
              <strong>식품자원경제학과</strong>
              <span>Food & Resource Economics</span>
            </div>
          </div>
        </div>
      </header>

      <SectionHeader
        eyebrow="트랙제 설명"
        title="트랙제는 진로 방향에 맞춰 전공 과목을 모듈 단위로 설계하는 제도입니다."
        body="식품자원경제학과의 2026 개편 교육과정은 전공 과목을 환경경영, 지역개발, 유통무역, 농업경제, 머천다이징, 농식품정책, 프라이싱, 농식품산업및경영, 경제성평가와 융합 모듈로 나누고, 학생이 선택한 트랙에 맞춰 필요한 모듈 학점을 채우는 방식으로 운영됩니다."
      />

      <div className="info-grid">
        <article className="info-card">
          <h3>트랙제가 무엇인가요?</h3>
          <p>
            전공 과목을 진로별 묶음으로 듣는 학습 경로입니다.
            내 관심 트랙과 부족 모듈을 확인합니다.
          </p>
        </article>
        <article className="info-card">
          <h3>어떤 혜택이 있나요?</h3>
          <p>
            다음 학기에 들을 과목을 고르기 쉽고,
            내 이수 이력을 진로와 연결해 설명할 수 있습니다.
          </p>
        </article>
        <article className="info-card">
          <h3>어떻게 구성되어 있나요?</h3>
          <p>
            학과전공은 5개 모듈별 6학점,
            푸드바이오경제는 학과·융합 모듈을 함께 봅니다.
          </p>
        </article>
      </div>

      <div className="guide-panel">
        <div className="guide-panel-head">
          <span>학생용 가이드</span>
          <h3>트랙제를 왜 활용해야 할까요?</h3>
          <p>
            트랙제는 단순히 신청서를 제출하기 위한 제도가 아니라, 내 전공 선택을 진로 언어로 정리하고
            다음 학기 수강신청 우선순위를 세우는 기준이 됩니다.
          </p>
        </div>
        <div className="guide-grid">
          <article className="guide-card">
            <h4>장점</h4>
            <ul>
              <li>수강한 과목이 어떤 트랙에 도움이 되는지 바로 확인할 수 있습니다.</li>
              <li>다음 학기에 먼저 채워야 할 모듈과 부족 학점을 정리할 수 있습니다.</li>
              <li>복수 트랙을 비교하면서 겹치는 과목을 효율적으로 선택할 수 있습니다.</li>
            </ul>
          </article>
          <article className="guide-card">
            <h4>의의</h4>
            <ul>
              <li>전공 과목을 단순 목록이 아니라 진로별 학습 로드맵으로 보게 해줍니다.</li>
              <li>학과 상담 전 내 현재 상태를 스스로 점검할 수 있는 기준이 됩니다.</li>
              <li>졸업 전 누락 과목을 줄이고, 전공 선택의 이유를 더 명확하게 설명할 수 있습니다.</li>
            </ul>
          </article>
          <article className="guide-card">
            <h4>이런 학생에게 추천</h4>
            <ul>
              <li>어떤 전공 방향이 나에게 맞는지 아직 고민 중인 학생</li>
              <li>푸드마케팅, 유통, 경제학 등 여러 분야를 함께 비교하고 싶은 학생</li>
              <li>복학, 편입, 교환학생 이후 이수 계획을 다시 정리해야 하는 학생</li>
            </ul>
          </article>
        </div>
      </div>

      <div className="track-kind-guide">
        {trackKindGuides.map((guide) => (
          <article className={guide.kind === "융합전공" ? "kind-guide-card convergence" : "kind-guide-card"} key={guide.kind}>
            <span className={guide.kind === "융합전공" ? "kind-badge kind-convergence" : "kind-badge kind-major"}>
              {guide.kind}
            </span>
            <h3>{guide.title}</h3>
            <p>{guide.description}</p>
          </article>
        ))}
      </div>

      <div className="policy-panel">
        <div>
          <span>핵심 요약</span>
          <h3>트랙제 이수로 얻는 것</h3>
        </div>
        <div className="policy-grid">
          <article>
            <strong>진로 중심 전공 설계</strong>
            <p>
              관심 진로에 맞는 과목 묶음으로
              전공 학습 방향을 정리합니다.
            </p>
          </article>
          <article>
            <strong>이수 이력 표시</strong>
            <p>
              트랙 이수 사실이 증명서에 표시되는 방향으로 안내됩니다.
              내 전공 방향을 설명할 때 도움이 됩니다.
            </p>
          </article>
          <article>
            <strong>복수전공·부전공 지원</strong>
            <p>
              복수전공·부전공은 1학년 필수 과목을
              필수 누락에서 제외할 수 있습니다.
            </p>
          </article>
        </div>
      </div>

      <div className="explain-grid">
        {tracks.map((track) => (
          <article className="track-card" key={track.id}>
            <span className={track.kind === "융합전공" ? "kind-badge kind-convergence" : "kind-badge kind-major"}>
              {track.kind}
            </span>
            <h3>{track.name}</h3>
            <p>{track.description}</p>
            <div className="keyword-list">
              {track.careerKeywords.map((keyword) => (
                <small key={keyword}>{keyword}</small>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ResourcesView() {
  return (
    <div className="view-stack">
      <SectionHeader
        eyebrow="도구 & 정보"
        title="트랙 확인 자료와 교육과정표를 한 곳에서 확인하세요."
        body="자가진단 전에 참고할 수 있는 공식 링크, 트랙제 안내 영상, 트랙별 모듈/과목표, 2026 교육과정표를 모았습니다."
      />
      <DepartmentLinkSection />
      <ToolsInfoSection />
      <details className="service-disclosure resource-disclosure">
        <summary>
          <span><small>트랙 구성</small><strong>트랙별 모듈·과목표 보기</strong></span>
          <small>5개 트랙 비교</small>
        </summary>
        <TrackModuleReference />
      </details>
      <details className="service-disclosure resource-disclosure">
        <summary>
          <span><small>2026 교육과정</small><strong>전체 학년·학기 과목표 보기</strong></span>
          <small>학년별 개설 흐름</small>
        </summary>
        <CurriculumBoard />
      </details>
    </div>
  );
}

function DepartmentLinkSection() {
  return (
    <section className="resource-section link-section">
      <div className="resource-head">
        <span>공식 링크</span>
        <h3>학과 채널과 홈페이지</h3>
        <p>최신 학과 소식과 공식 안내는 아래 링크에서 함께 확인하세요.</p>
      </div>
      <div className="official-link-grid">
        {departmentLinks.map((link) => (
          <a className="official-link-card" href={link.href} key={link.href} target="_blank" rel="noreferrer">
            <div>
              <strong>{link.title}</strong>
              <p>{link.description}</p>
            </div>
            <span>
              {link.label}
              <ExternalLink aria-hidden="true" size={16} />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function ToolsInfoSection() {
  return (
    <section className="resource-section">
      <div className="resource-head">
        <span>도구 & 정보</span>
        <h3>트랙제 안내영상</h3>
        <p>트랙제를 처음 접하는 학생이 모듈형 교육과정과 트랙 신청 흐름을 빠르게 이해할 수 있도록 영상 자료를 모았습니다.</p>
      </div>
      <div className="video-grid">
        {videoResources.slice(0, 2).map((video) => <VideoResourceCard video={video} key={video.id} />)}
      </div>
      {videoResources.length > 2 && (
        <details className="service-disclosure video-disclosure">
          <summary>
            <span><small>추가 영상</small><strong>안내영상 {videoResources.length - 2}개 더 보기</strong></span>
            <small>필요할 때 펼쳐보세요</small>
          </summary>
          <div className="video-grid">
            {videoResources.slice(2).map((video) => <VideoResourceCard video={video} key={video.id} />)}
          </div>
        </details>
      )}
    </section>
  );
}

function VideoResourceCard({ video }: { video: (typeof videoResources)[number] }) {
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}${video.start ? `?start=${video.start}` : ""}`;
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}s` : ""}`;

  return (
    <article className="video-card">
      <div className="video-frame">
        <iframe
          title={video.title}
          src={embedUrl}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      <div className="video-copy">
        <span><PlayCircle aria-hidden="true" size={16} />YouTube</span>
        <h4>{video.title}</h4>
        <p>{video.description}</p>
        <a href={watchUrl} target="_blank" rel="noreferrer">
          YouTube에서 보기 <ExternalLink aria-hidden="true" size={15} />
        </a>
      </div>
    </article>
  );
}

function CurriculumBoard() {
  const unassignedCourses = courses.filter((course) => !course.recommendedSemester);

  return (
    <section className="curriculum-section">
      <div className="resource-head">
        <span>2026 교육과정표</span>
        <h3>학년·학기별 전공 과목 흐름</h3>
        <p>수강 계획을 세우기 쉽도록 PDF 과목표를 학년과 학기 기준으로 다시 정리했습니다.</p>
      </div>
      <div className="curriculum-grid">
        {curriculumSlots.map((slot) => {
          const slotCourses = courses.filter((course) => course.recommendedSemester === slot.key);
          return (
            <article className="semester-card" key={slot.key}>
              <div className="semester-head">
                <strong>{slot.label}</strong>
                <span>{slotCourses.length}과목</span>
              </div>
              <div className="semester-course-list">
                {slotCourses.map((course) => (
                  <CoursePill course={course} key={course.id} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <div className="floating-course-panel">
        <div>
          <strong>학기 미정·융합 과목</strong>
          <span>바이오헬스·식품영양·식품공학 계열 과목은 학기 정보가 별도 확인이 필요합니다.</span>
        </div>
        <div className="floating-course-list">
          {unassignedCourses.map((course) => (
            <CoursePill course={course} key={course.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrackModuleReference() {
  return (
    <section className="resource-section track-reference-section">
      <div className="resource-head">
        <span>트랙별 모듈/과목표</span>
        <h3>5개 트랙에서 요구하는 모듈과 과목</h3>
        <p>자가진단에서 트랙을 선택하기 전에, 각 트랙이 어떤 모듈과 과목으로 구성되는지 먼저 비교할 수 있습니다.</p>
      </div>
      <div className="track-reference-grid">
        {tracks.map((track) => (
          <article className={`track-reference-card ${track.kind === "융합전공" ? "convergence" : ""}`} key={track.id}>
            <div className="track-reference-head">
              <div>
                <span className={getTrackBadgeClass(track.id)}>{track.kind}</span>
                <h4>{track.name}</h4>
                <p>{getTrackQuickMeta(track)}</p>
              </div>
              <strong>{track.rule.totalTrackCredits}학점</strong>
            </div>
            <div className="track-reference-modules">
              {getTrackModuleIds(track).map((moduleId) => {
                const moduleInfo = modules.find((module) => module.id === moduleId);
                const moduleCourses = getCoursesByModule(moduleId);
                return (
                  <div className="track-reference-module" key={`${track.id}-${moduleId}`}>
                    <div className="track-reference-module-head">
                      <strong>
                        {moduleId}. {moduleInfo?.name ?? "모듈"}
                      </strong>
                      <span>{moduleCourses.length}과목</span>
                    </div>
                    <ul>
                      {moduleCourses.map((course) => (
                        <li key={course.id}>
                          <span>
                            {course.code} {course.name}
                          </span>
                          <small>
                            {formatSemester(course.recommendedSemester)} · {course.credits}학점
                          </small>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CoursePill({ course }: { course: Course }) {
  return (
    <div className={course.required ? "course-pill required" : "course-pill"}>
      <span>{course.code}</span>
      <strong>{course.name}</strong>
      <small>
        {getModuleLabel(course.moduleId)} · {course.credits}학점
      </small>
      {course.required && <em>필수</em>}
    </div>
  );
}

export function EnrollmentProfileSummary({
  enrollmentType,
  onEditProfile,
}: {
  enrollmentType: EnrollmentType;
  onEditProfile: () => void;
}) {
  const selected = enrollmentOptions.find((option) => option.id === enrollmentType) ?? enrollmentOptions[0];
  return (
    <div className="study-mode-panel enrollment-profile-summary" aria-label="현재 이수 경로">
      <div className="study-mode-head">
        <strong>{selected.title}</strong>
        <span>{selected.description}</span>
      </div>
      <button className="icon-button" type="button" onClick={onEditProfile}>
        이수 경로 변경
      </button>
    </div>
  );
}

function TrackPicker({
  selectedTrackIds,
  enrollmentType,
  onToggleTrack,
  onEditProfile,
  onReset,
  onContinue,
}: {
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  onToggleTrack: (trackId: TrackId) => void;
  onEditProfile: () => void;
  onReset: () => void;
  onContinue?: () => void;
}) {
  return (
    <section className="track-picker" aria-label="트랙 복수 선택">
      <div className="track-picker-copy">
        <strong>관심 트랙을 선택하세요</strong>
        <span>여러 트랙을 선택하면 겹치는 과목까지 함께 계산합니다.</span>
      </div>
      <button className="icon-button reset-track-button" type="button" onClick={() => onReset()} title="입력 초기화">
        <RotateCcw aria-hidden="true" size={18} />
        <span>입력 초기화</span>
      </button>
      <EnrollmentProfileSummary enrollmentType={enrollmentType} onEditProfile={onEditProfile} />
      <div className="track-kind-groups">
        {trackKindGuides.map((guide) => {
          const groupedTracks = tracks.filter((track) => track.kind === guide.kind);
          return (
            <div className={`track-kind-group ${guide.kind === "융합전공" ? "convergence" : "major"}`} key={guide.kind}>
              <div className="track-kind-group-head">
                <span className={`kind-badge ${guide.kind === "융합전공" ? "kind-convergence" : "kind-major"}`}>
                  {guide.kind}
                </span>
                <div>
                  <strong>{guide.title}</strong>
                  <small>{guide.description}</small>
                </div>
              </div>
              <div className="track-toggle-grid">
                {groupedTracks.map((track) => (
                  <label className="track-toggle" key={track.id}>
                    <input
                      type="checkbox"
                      checked={selectedTrackIds.includes(track.id)}
                      onChange={() => onToggleTrack(track.id)}
                    />
                    <span>
                      <strong>{track.name}</strong>
                      <small>{getTrackQuickMeta(track)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {onContinue && (
        <button
          className="primary-button track-picker-continue"
          type="button"
          disabled={selectedTrackIds.length === 0}
          onClick={onContinue}
        >
          과목 선택으로 이동 <ArrowRight aria-hidden="true" size={17} />
        </button>
      )}
    </section>
  );
}

function TrackSetupSummary({
  selectedTrackNames,
  enrollmentType,
  onEdit,
}: {
  selectedTrackNames: string[];
  enrollmentType: EnrollmentType;
  onEdit: () => void;
}) {
  return (
    <section className="track-setup-summary" aria-label="선택한 이수 유형과 트랙">
      <div>
        <span>1단계 입력 완료</span>
        <strong>{getEnrollmentLabel(enrollmentType)} · {selectedTrackNames.length}개 트랙</strong>
        <p>{selectedTrackNames.join(" · ") || "선택한 트랙 없음"}</p>
      </div>
      <button className="icon-button" type="button" onClick={onEdit}>선택 수정</button>
    </section>
  );
}

function ModulesView({ selectedTrackIds }: { selectedTrackIds: TrackId[] }) {
  const selectedTracks = getTracks(selectedTrackIds);
  const selectedTrackNames = selectedTracks.map((track) => track.name).join(", ");
  const visibleModuleIds = new Set(selectedTracks.flatMap((track) => getTrackModuleIds(track)));

  return (
    <div className="view-stack">
      <SectionHeader
        eyebrow="트랙별 모듈/과목표"
        title="선택한 트랙에 필요한 모듈을 깔끔하게 비교하세요."
        body={
          selectedTracks.length > 0
            ? `${selectedTrackNames} 기준으로 필요한 모듈을 비교했습니다. 같은 모듈을 여러 트랙이 공유하는지도 함께 확인할 수 있습니다.`
            : "위의 트랙 선택 영역에서 비교할 트랙을 먼저 선택하세요."
        }
      />
      <SelectedTrackSummary selectedTracks={selectedTracks} />
      <ModuleComparison selectedTracks={selectedTracks} />
      <div className="module-map tidy">
        {modules
          .filter((module) => module.category !== "liberal")
          .filter((module) => selectedTracks.length === 0 || visibleModuleIds.has(module.id))
          .map((module) => {
            const moduleCourses = getCoursesByModule(module.id);
            const matchingTracks = selectedTracks.filter((track) => trackUsesModule(track, module.id));
            const highlighted = matchingTracks.length > 0;
            return (
              <article className={highlighted ? "module-box highlighted" : "module-box"} key={module.id}>
                <div className="module-box-head">
                  <strong>
                    {module.id}. {module.name}
                  </strong>
                  <span>{highlighted ? `${matchingTracks.length}개 트랙 포함` : `${module.courseCount}과목`}</span>
                </div>
                {matchingTracks.length > 0 && (
                  <div className="module-memberships">
                    {matchingTracks.map((track) => (
                      <small className={getTrackBadgeClass(track.id)} key={track.id}>
                        {track.name}
                      </small>
                    ))}
                  </div>
                )}
                <ul>
                  {moduleCourses.map((course) => (
                    <li key={course.id}>
                      <span>
                        {course.code} {course.name}
                      </span>
                      <small>
                        {formatSemester(course.recommendedSemester)} · {course.credits}학점
                      </small>
                    </li>
                  ))}
                </ul>
              </article>
            );
        })}
      </div>
    </div>
  );
}

function SelectedTrackSummary({ selectedTracks }: { selectedTracks: Track[] }) {
  if (selectedTracks.length === 0) {
    return (
      <div className="empty-state">
        <strong>선택된 트랙이 없습니다.</strong>
        <span>트랙을 선택하면 이 영역에 필요한 모듈 코드와 트랙 성격이 정리됩니다.</span>
      </div>
    );
  }

  return (
    <div className="selected-track-strip">
      {selectedTracks.map((track) => (
        <article className={`selected-track-card ${track.kind === "융합전공" ? "convergence" : ""}`} key={track.id}>
          <div className="track-card-meta">
            <span className={getTrackBadgeClass(track.id)}>{track.name}</span>
            <span>{track.kind}</span>
          </div>
          <h3>{track.name}</h3>
          <div className="module-code-list">
            {getTrackModuleIds(track).map((moduleId) => (
              <small key={moduleId}>{moduleId}</small>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ModuleComparison({ selectedTracks }: { selectedTracks: Track[] }) {
  if (selectedTracks.length === 0) return null;

  const comparedModules = modules.filter(
    (module) =>
      module.category !== "liberal" && selectedTracks.some((track) => trackUsesModule(track, module.id)),
  );

  return (
    <div className="comparison-panel">
      <div>
        <h3>선택 트랙별 모듈 매트릭스</h3>
        <p>체크 표시가 있는 모듈은 해당 트랙 인정 조건에 포함됩니다.</p>
      </div>
      <div className="comparison-scroll">
        <div
          className="comparison-grid"
          style={{
            gridTemplateColumns: `minmax(150px, 1.2fr) repeat(${selectedTracks.length}, minmax(120px, 1fr))`,
            minWidth: `${170 + selectedTracks.length * 132}px`,
          }}
        >
          <div className="comparison-cell comparison-head">모듈</div>
          {selectedTracks.map((track) => (
            <div className="comparison-cell comparison-head selected-track-head" key={track.id}>
              <strong>{track.name}</strong>
            </div>
          ))}
          {comparedModules.map((module) => (
            <Fragment key={module.id}>
              <div className="comparison-cell module-name" key={`${module.id}-name`}>
                <strong>{module.id}</strong>
                <span>{module.name}</span>
              </div>
              {selectedTracks.map((track) => {
                const included = trackUsesModule(track, module.id);
                return (
                  <div
                    className={included ? "comparison-cell included" : "comparison-cell muted-cell"}
                    key={`${module.id}-${track.id}`}
                  >
                    {included ? <strong>필요</strong> : "-"}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function DiagnosisView({
  completedCourseIds,
  selectedTrackIds,
  enrollmentType,
  headingRef,
  gradeFilter,
  semesterFilter,
  onGradeFilterChange,
  onSemesterFilterChange,
  onToggleCourse,
  onSaveCourses,
  onPdfAnalyzed,
  lastManualSaveAt,
}: {
  completedCourseIds: string[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  headingRef: RefObject<HTMLHeadingElement | null>;
  gradeFilter: GradeFilter;
  semesterFilter: SemesterFilter;
  onGradeFilterChange: (grade: GradeFilter) => void;
  onSemesterFilterChange: (semester: SemesterFilter) => void;
  onToggleCourse: (courseId: string) => void;
  onSaveCourses: () => void;
  onPdfAnalyzed: (draft: PdfImportDraft) => void;
  lastManualSaveAt: string;
}) {
  const completedSet = useMemo(() => new Set(completedCourseIds), [completedCourseIds]);
  const [selectionMode, setSelectionMode] = useState<"semester" | "module">("semester");
  const [courseQuery, setCourseQuery] = useState("");

  return (
    <div className="view-stack diagnosis-v2">
      <SectionHeader
        eyebrow="2. 수강 과목 체크"
        title="지금까지 이수한 과목을 선택하세요."
        body="과목을 찾기 편한 방식으로 전환할 수 있습니다. 체크한 과목만 실제 이수 내역으로 계산하고, 앞으로 들을 과목은 학기 계획에서 따로 관리합니다."
        headingRef={headingRef}
      />
      <div className="course-save-panel diagnosis-save-bar">
        <div>
          <strong>{completedCourseIds.length}개 과목 선택됨</strong>
          <span>자동 저장되어 같은 브라우저에서 이어서 볼 수 있어요.</span>
          <small>{lastManualSaveAt ? `직접 저장: ${lastManualSaveAt}` : "입력 즉시 자동 저장 중"}</small>
        </div>
        <button className="primary-button save-course-button" type="button" onClick={onSaveCourses}>
          <Save aria-hidden="true" size={18} />
          <span>지금 저장</span>
        </button>
      </div>
      <PdfCourseImportPanel onAnalyzed={onPdfAnalyzed} />
      <EnrollmentPolicyNotice enrollmentType={enrollmentType} />
      <div className="course-view-toolbar">
        <div className="course-view-tabs" role="tablist" aria-label="과목 보기 방식">
          <button className={selectionMode === "semester" ? "active" : ""} type="button" role="tab" aria-selected={selectionMode === "semester"} onClick={() => setSelectionMode("semester")}>학년·학기별</button>
          <button className={selectionMode === "module" ? "active" : ""} type="button" role="tab" aria-selected={selectionMode === "module"} onClick={() => setSelectionMode("module")}>모듈별</button>
        </div>
        <label className="course-search-field">
          <Search aria-hidden="true" size={18} />
          <span className="sr-only">과목 검색</span>
          <input value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder="과목명 또는 과목코드 검색" />
        </label>
      </div>
      <CourseSelectionList
        mode={selectionMode}
        query={courseQuery}
        completedSet={completedSet}
        selectedTrackIds={selectedTrackIds}
        enrollmentType={enrollmentType}
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        onGradeFilterChange={onGradeFilterChange}
        onSemesterFilterChange={onSemesterFilterChange}
        onToggleCourse={onToggleCourse}
      />
    </div>
  );
}

function CourseSelectionList({
  mode,
  query,
  completedSet,
  selectedTrackIds,
  enrollmentType,
  gradeFilter,
  semesterFilter,
  onGradeFilterChange,
  onSemesterFilterChange,
  onToggleCourse,
}: {
  mode: "semester" | "module";
  query: string;
  completedSet: Set<string>;
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  gradeFilter: GradeFilter;
  semesterFilter: SemesterFilter;
  onGradeFilterChange: (grade: GradeFilter) => void;
  onSemesterFilterChange: (semester: SemesterFilter) => void;
  onToggleCourse: (courseId: string) => void;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const visibleCourses = useMemo(
    () =>
      courses
        .filter((course) => course.moduleId !== "A")
        .filter((course) => matchesSemesterFilter(course, gradeFilter, semesterFilter))
        .filter((course) => !normalizedQuery || `${course.code} ${course.name} ${getModuleLabel(course.moduleId)}`.toLocaleLowerCase("ko").includes(normalizedQuery))
        .sort((a, b) => semesterRankForView(a.recommendedSemester) - semesterRankForView(b.recommendedSemester) || a.code.localeCompare(b.code)),
    [gradeFilter, normalizedQuery, semesterFilter],
  );
  const semesterGroups = curriculumSlots
    .map((slot) => ({ ...slot, courses: visibleCourses.filter((course) => course.recommendedSemester === slot.key) }))
    .filter((group) => group.courses.length > 0);
  const unknownCourses = visibleCourses.filter((course) => !course.recommendedSemester);
  const moduleIds = [...new Set(visibleCourses.map((course) => course.moduleId))];
  const orderedModuleIds = moduleIds.sort((a, b) => a.localeCompare(b));
  const relatedCount = visibleCourses.filter((course) => isModuleInAnyTrack(selectedTrackIds, course.moduleId)).length;

  return (
    <section className="course-selection-list" aria-label="이수 과목 선택">
      {mode === "semester" && (
        <SemesterCourseQuickFilters
          gradeFilter={gradeFilter}
          semesterFilter={semesterFilter}
          onGradeFilterChange={onGradeFilterChange}
          onSemesterFilterChange={onSemesterFilterChange}
        />
      )}
      <div className="course-selection-summary">
        <span><strong>{visibleCourses.length}</strong>개 과목</span>
        <span><strong>{visibleCourses.filter((course) => completedSet.has(course.id)).length}</strong>개 체크</span>
        <span><strong>{relatedCount}</strong>개 선택 트랙 관련</span>
      </div>
      {visibleCourses.length === 0 ? (
        <div className="empty-state"><strong>찾는 과목이 없습니다.</strong><span>검색어나 학년·학기 필터를 바꿔보세요.</span></div>
      ) : (
        <div className="course-group-scroll">
          {mode === "semester" && semesterGroups.map((group) => (
            <CourseRowGroup title={group.label} subtitle={`${group.courses.filter((course) => completedSet.has(course.id)).length}/${group.courses.length}개 이수`} key={group.key}>
              {group.courses.map((course) => <CourseCheckRow course={course} completed={completedSet.has(course.id)} trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)} enrollmentType={enrollmentType} onToggleCourse={onToggleCourse} key={course.id} />)}
            </CourseRowGroup>
          ))}
          {mode === "semester" && unknownCourses.length > 0 && (
            <CourseRowGroup title="학기 미정" subtitle={`${unknownCourses.length}개 과목`}>
              {unknownCourses.map((course) => <CourseCheckRow course={course} completed={completedSet.has(course.id)} trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)} enrollmentType={enrollmentType} onToggleCourse={onToggleCourse} key={course.id} />)}
            </CourseRowGroup>
          )}
          {mode === "module" && orderedModuleIds.map((moduleId) => {
            const moduleCourses = visibleCourses.filter((course) => course.moduleId === moduleId);
            const related = isModuleInAnyTrack(selectedTrackIds, moduleId);
            return (
              <CourseRowGroup title={getModuleLabel(moduleId)} subtitle={related ? "선택 트랙 관련 모듈" : `${moduleCourses.length}개 과목`} highlight={related} key={moduleId}>
                {moduleCourses.map((course) => <CourseCheckRow course={course} completed={completedSet.has(course.id)} trackModule={related} enrollmentType={enrollmentType} onToggleCourse={onToggleCourse} key={course.id} />)}
              </CourseRowGroup>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CourseRowGroup({ title, subtitle, highlight = false, children }: { title: string; subtitle: string; highlight?: boolean; children: ReactNode }) {
  return <section className={highlight ? "course-row-group highlight" : "course-row-group"}><header><h3>{title}</h3><span>{subtitle}</span></header><div>{children}</div></section>;
}

function CourseCheckRow({ course, completed, trackModule, enrollmentType, onToggleCourse }: { course: Course; completed: boolean; trackModule: boolean; enrollmentType: EnrollmentType; onToggleCourse: (courseId: string) => void }) {
  const required = isRequiredCourseApplicable(course, enrollmentType);
  return (
    <label className={["course-check-row", completed ? "checked" : "", trackModule ? "related" : ""].filter(Boolean).join(" ")}>
      <input type="checkbox" checked={completed} onChange={() => onToggleCourse(course.id)} />
      <span className="course-row-check" aria-hidden="true">{completed && <CheckCircle2 size={17} />}</span>
      <span className="course-row-main"><strong>{course.name}</strong><small>{course.code} · {getModuleLabel(course.moduleId)}</small></span>
      <span className="course-row-term">{formatSemester(course.recommendedSemester)}</span>
      <span className="course-row-credit">{course.credits}학점</span>
      <span className="course-row-badges">{required && <em>필수</em>}{trackModule && <em className="related">트랙 관련</em>}</span>
    </label>
  );
}

function LabView({
  recommendations,
  completedCourseIds,
  enrollmentType,
  planningSemester,
  onEditProfile,
  onPlanningSemesterChange,
  onReset,
}: {
  recommendations: TrackRecommendation[];
  completedCourseIds: string[];
  enrollmentType: EnrollmentType;
  planningSemester: LabPlanningSemester;
  onEditProfile: () => void;
  onPlanningSemesterChange: (semester: LabPlanningSemester) => void;
  onReset: () => void;
}) {
  const bestRecommendation = recommendations[0];
  const sharedSuggestions = useMemo(() => getSharedLabSuggestions(recommendations), [recommendations]);

  return (
    <div className="view-stack lab-view">
      <SectionHeader
        eyebrow="학기 계획 · 트랙 추천"
        title="수강 이력 기준으로 달성 가능한 트랙을 추천합니다."
        body="트랙을 아직 정하지 않았거나 나중에 신청하려는 학생을 위해, 현재 체크한 과목으로 5개 트랙 전체의 달성 가능성을 비교합니다."
      />

      <div className="lab-top-grid">
        <article className="lab-best-card">
          <div className="lab-card-head">
            <div>
              <span>가장 가까운 트랙</span>
              <h3>{bestRecommendation.trackName}</h3>
            </div>
            <small className={getTrackBadgeClass(bestRecommendation.trackId)}>{bestRecommendation.trackKind}</small>
          </div>
          <div className="lab-score">
            <strong>{bestRecommendation.completionRate}%</strong>
            <span>{getRecommendationStatusLabel(bestRecommendation.status)}</span>
          </div>
          <div className={getFeasibilityClassName(bestRecommendation.feasibility.status)}>
            <strong>{bestRecommendation.feasibility.label}</strong>
            <span>{bestRecommendation.feasibility.detail}</span>
          </div>
          <div className="track-progress-line lab-progress-line">
            <span style={{ width: `${bestRecommendation.completionRate}%` }} />
          </div>
          <p>{getRecommendationReason(bestRecommendation, completedCourseIds.length)}</p>
          <div className="lab-metric-grid">
            <ResultMetric label="남은 학점" value={`${bestRecommendation.missingTotalCredits}학점`} compact />
            <ResultMetric label="부족 모듈" value={`${bestRecommendation.missingModuleCount}개`} compact />
            <ResultMetric label="필수 누락" value={`${bestRecommendation.missingRequiredCount}개`} compact />
            <ResultMetric
              label="남은 정규학기"
              value={
                bestRecommendation.feasibility.remainingRegularSemesters === null
                  ? "입력 필요"
                  : `${bestRecommendation.feasibility.remainingRegularSemesters}학기`
              }
              compact
            />
          </div>
          <div className="lab-next-courses">
            <strong>먼저 볼 과목</strong>
            {bestRecommendation.recommendedCourses.slice(0, 4).map((course) => (
              <span key={course.id}>
                {course.code} {course.name}
              </span>
            ))}
            {bestRecommendation.recommendedCourses.length === 0 && <span>추천할 남은 과목 없음</span>}
          </div>
        </article>

        <aside className="lab-control-panel">
          <div className="lab-control-head">
            <strong>입력 기준</strong>
            <span>{completedCourseIds.length}개 과목 체크됨</span>
          </div>
          <EnrollmentProfileSummary enrollmentType={enrollmentType} onEditProfile={onEditProfile} />
          <label className="lab-semester-select">
            현재 학년/학기
            <select
              value={planningSemester}
              onChange={(event) => onPlanningSemesterChange(event.target.value as LabPlanningSemester)}
            >
              <option value="unselected">선택 안 함</option>
              {curriculumSlots.map((slot) => (
                <option value={slot.key} key={slot.key}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>
          <div className="lab-help-box">
            <strong>활용법</strong>
            <span>
              체크 과목과 현재 학기로 정규학기 안 가능성을 가늠합니다.
            </span>
          </div>
          <button className="icon-button reset-track-button lab-reset-button" type="button" onClick={onReset}>
            <RotateCcw aria-hidden="true" size={18} />
            <span>입력 초기화</span>
          </button>
        </aside>
      </div>

      <div className="lab-overlap-panel">
        <div className="lab-section-head">
          <div>
            <span>공통 보완 추천</span>
            <h3>여러 트랙에 동시에 도움 되는 모듈과 과목</h3>
          </div>
          <p>추천 트랙들이 공유하는 부족 모듈과 과목을 먼저 보면, 나중에 트랙을 바꿔도 활용도가 높습니다.</p>
        </div>
        <div className="lab-overlap-grid">
          <article className="lab-overlap-card">
            <h4>겹치는 부족 모듈</h4>
            <div className="lab-overlap-list">
              {sharedSuggestions.modules.map((module) => (
                <div className="lab-overlap-item" key={module.label}>
                  <strong>{module.label}</strong>
                  <span>{formatTrackNamesShort(module.trackNames)} 공통</span>
                </div>
              ))}
              {sharedSuggestions.modules.length === 0 && (
                <p className="empty-text">현재 추천 결과에서는 2개 이상 트랙이 동시에 부족한 모듈이 없습니다.</p>
              )}
            </div>
          </article>
          <article className="lab-overlap-card">
            <h4>공통 수강 추천 과목</h4>
            <div className="lab-overlap-list course-overlap-list">
              {sharedSuggestions.courses.slice(0, 4).map((suggestion) => (
                <div className="lab-overlap-item" key={suggestion.course.id}>
                  <strong>
                    {suggestion.course.code} {suggestion.course.name}
                  </strong>
                  <span>
                    {getModuleLabel(suggestion.course.moduleId)} · {formatSemester(suggestion.course.recommendedSemester)}
                  </span>
                  <em>{formatTrackNamesShort(suggestion.trackNames)} 공통</em>
                </div>
              ))}
              {sharedSuggestions.courses.length === 0 && (
                <p className="empty-text">겹치는 추천 과목이 없으면, 부족 모듈이 많이 겹치는 쪽부터 확인하세요.</p>
              )}
            </div>
          </article>
        </div>
      </div>

      <details className="service-disclosure lab-ranking-section">
        <summary>
          <span>
            <small>추천 순위</small>
            <strong>5개 트랙 상세 비교 보기</strong>
          </span>
          <small>진행률·남은 학점·부족 모듈</small>
        </summary>
        <div className="lab-ranking-grid">
          {recommendations.map((recommendation) => (
            <LabRecommendationCard recommendation={recommendation} key={recommendation.trackId} />
          ))}
        </div>
      </details>
    </div>
  );
}

function LabRecommendationCard({ recommendation }: { recommendation: TrackRecommendation }) {
  return (
    <article className={recommendation.rank === 1 ? "lab-rank-card best" : "lab-rank-card"}>
      <div className="lab-rank-title">
        <span>{recommendation.rank}순위</span>
        <small className={getTrackBadgeClass(recommendation.trackId)}>{recommendation.trackKind}</small>
      </div>
      <h4>{recommendation.trackName}</h4>
      <div className="lab-rank-score">
        <strong>{recommendation.completionRate}%</strong>
        <span>{getRecommendationStatusLabel(recommendation.status)}</span>
      </div>
      <div className="track-progress-line">
        <span style={{ width: `${recommendation.completionRate}%` }} />
      </div>
      <span className={getFeasibilityClassName(recommendation.feasibility.status)}>
        <strong>{recommendation.feasibility.label}</strong>
      </span>
      <div className="lab-rank-meta">
        <small>남은 {recommendation.missingTotalCredits}학점</small>
        <small>부족 모듈 {recommendation.missingModuleCount}개</small>
        <small>필수 {recommendation.missingRequiredCount}개</small>
        <small>
          정규{" "}
          {recommendation.feasibility.remainingRegularSemesters === null
            ? "입력필요"
            : `${recommendation.feasibility.remainingRegularSemesters}학기`}
        </small>
      </div>
      <p>{getRecommendationReason(recommendation)}</p>
    </article>
  );
}

function ExperimentView({
  recommendations,
  completedCourseIds,
  plannedCourseTerms,
  planningSemester,
  onPlanningSemesterChange,
  onPlannedCourseTermChange,
  onGoToDiagnosis,
}: {
  recommendations: TrackRecommendation[];
  completedCourseIds: string[];
  plannedCourseTerms: Record<string, PlanTerm>;
  planningSemester: LabPlanningSemester;
  onPlanningSemesterChange: (semester: LabPlanningSemester) => void;
  onPlannedCourseTermChange: (courseId: string, term: PlanTerm | null) => void;
  onGoToDiagnosis: () => void;
}) {
  const bestRecommendation = recommendations[0];
  const sharedSuggestions = useMemo(() => getSharedLabSuggestions(recommendations), [recommendations]);
  const plan = useMemo(
    () => getExperimentPlan(bestRecommendation, sharedSuggestions.courses, planningSemester, completedCourseIds.length),
    [bestRecommendation, sharedSuggestions.courses, planningSemester, completedCourseIds.length],
  );
  const priorityCourseGroups = groupCoursesByTerm(plan.priorityCourses);
  const planTermOptions: Array<{ id: PlanTerm; label: string; description: string }> = [
    { id: "next", label: "다음 학기", description: "가장 먼저 확인" },
    { id: "following", label: "다다음 학기", description: "연계 과목 이어가기" },
    { id: "later", label: "나중에", description: "졸업 전 후보" },
  ];
  const plannedColumns = planTermOptions.map((term) => ({
    ...term,
    courses: Object.entries(plannedCourseTerms)
      .filter(([, plannedTerm]) => plannedTerm === term.id)
      .map(([courseId]) => courses.find((course) => course.id === courseId))
      .filter((course): course is Course => Boolean(course)),
  }));

  return (
    <div className="view-stack experiment-view">
      <SectionHeader
        eyebrow="학기 계획 · 수강 전략"
        title="현재 학년 기준 수강신청 전략을 확인하세요."
        body="트랙 추천 결과에 본인의 현재 학년·학기를 더해, 남은 정규학기 안에서 어떤 과목을 먼저 챙기면 좋은지 정리합니다."
      />

      <div className="experiment-top-grid">
        <article className="experiment-strategy-card">
          <div className="lab-card-head">
            <div>
              <span>전략 기준 트랙</span>
              <h3>{bestRecommendation.trackName}</h3>
            </div>
            <small className={getTrackBadgeClass(bestRecommendation.trackId)}>{bestRecommendation.trackKind}</small>
          </div>
          <div className="experiment-status-line">
            <strong>{plan.loadLabel}</strong>
            <span>{bestRecommendation.feasibility.label}</span>
          </div>
          <p>{plan.loadDetail}</p>
          <div className="track-progress-line lab-progress-line">
            <span style={{ width: `${bestRecommendation.completionRate}%` }} />
          </div>
          <div className="lab-metric-grid experiment-metric-grid">
            <ResultMetric label="체크 과목" value={`${completedCourseIds.length}개`} compact />
            <ResultMetric label="남은 정규학기" value={plan.remainingSemesterText} compact />
            <ResultMetric label="필요 과목" value={`${bestRecommendation.feasibility.neededCourseCount}개`} compact />
            <ResultMetric label="학기당 목표" value={plan.perSemesterText} compact />
          </div>
        </article>

        <aside className="experiment-control-card">
          <div className="lab-control-head">
            <strong>현재 위치 입력</strong>
            <span>전략 계산 기준</span>
          </div>
          <label className="lab-semester-select">
            현재 학년/학기
            <select
              value={planningSemester}
              onChange={(event) => onPlanningSemesterChange(event.target.value as LabPlanningSemester)}
            >
              <option value="unselected">선택 안 함</option>
              {curriculumSlots.map((slot) => (
                <option value={slot.key} key={slot.key}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>
          <div className="lab-help-box">
            <strong>계산 방식</strong>
            <span>
              학기당 보완 과목 2개, 초과학기 2학기까지 가정한 참고 계산입니다.
            </span>
          </div>
          <button className="secondary-button experiment-diagnosis-button" type="button" onClick={onGoToDiagnosis}>
            수강 과목 다시 체크
          </button>
        </aside>
      </div>

      <div className="experiment-insight-grid">
        {plan.insights.map((insight) => (
          <article className={`experiment-insight-card ${insight.tone}`} key={insight.title}>
            <span>{insight.label}</span>
            <h3>{insight.title}</h3>
            <p>{insight.detail}</p>
          </article>
        ))}
      </div>

      <div className="experiment-plan-panel">
        <div className="lab-section-head">
          <div>
            <span>수강신청 우선순위</span>
            <h3>남은 과목을 학기별로 나눠 먼저 확인하세요.</h3>
          </div>
          <p>1학기 과목을 먼저 배치하고, 2학기 과목은 다음 묶음으로 분리했습니다.</p>
        </div>
        <div className="experiment-plan-grid">
          <div className="experiment-course-groups">
            {priorityCourseGroups.map((group) => (
              <section className={`experiment-term-card term-${group.key}`} key={group.key}>
                <div className="experiment-term-head">
                  <strong>{group.label}</strong>
                  <span>{group.courses.length}개</span>
                </div>
                <div className="experiment-course-list">
                  {group.courses.map((course) => (
                    <div className="experiment-course-item" key={course.id}>
                      <div><strong>{course.code} {course.name}</strong><span>{getModuleLabel(course.moduleId)} · {formatSemester(course.recommendedSemester)} · {course.credits}학점</span></div>
                      <select aria-label={`${course.name} 계획 학기`} value={plannedCourseTerms[course.id] ?? ""} onChange={(event) => onPlannedCourseTermChange(course.id, event.target.value ? event.target.value as PlanTerm : null)}>
                        <option value="">계획에 담기</option>
                        {planTermOptions.map((term) => <option value={term.id} key={term.id}>{term.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {priorityCourseGroups.length === 0 && (
              <div className="empty-state">
                <strong>현재 기준으로 우선 보완 과목이 없습니다</strong>
                <span>이미 조건을 충족했거나, 자가진단에서 수강 과목을 더 체크하면 추천이 세분화됩니다.</span>
              </div>
            )}
          </div>

          <aside className="experiment-action-card">
            <h3>다음 행동</h3>
            <ol>
              {plan.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      <section className="semester-plan-board" aria-labelledby="semester-plan-title">
        <div className="lab-section-head semester-plan-head">
          <div><span>내 학기 계획</span><h3 id="semester-plan-title">추천 과목을 시기별로 나눠보세요.</h3></div>
          <p>계획에 담은 과목은 실제 이수와 분리해 저장되며, 결과의 ‘계획 포함’ 추천에서만 반영됩니다.</p>
        </div>
        <div className="semester-plan-columns">
          {plannedColumns.map((column) => (
            <section className={`semester-plan-column plan-${column.id}`} key={column.id}>
              <header><div><strong>{column.label}</strong><small>{column.description}</small></div><span>{column.courses.length}개</span></header>
              <div>
                {column.courses.map((course) => (
                  <article key={course.id}>
                    <div><strong>{course.name}</strong><small>{getModuleLabel(course.moduleId)} · {course.credits}학점</small></div>
                    <select aria-label={`${course.name} 계획 변경`} value={column.id} onChange={(event) => onPlannedCourseTermChange(course.id, event.target.value ? event.target.value as PlanTerm : null)}>
                      {planTermOptions.map((term) => <option value={term.id} key={term.id}>{term.label}</option>)}
                      <option value="">계획에서 빼기</option>
                    </select>
                  </article>
                ))}
                {column.courses.length === 0 && <p>추천 과목 위의 선택 메뉴에서 이 칸에 담아보세요.</p>}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

function SemesterCourseTable({
  completedSet,
  selectedTrackIds,
  enrollmentType,
  gradeFilter,
  semesterFilter,
  onGradeFilterChange,
  onSemesterFilterChange,
  onToggleCourse,
  tableTitle = "학년·학기별 전공 이수 표",
  tableDescription = "학년과 학기 흐름대로 과목을 보면서 이미 들었거나 수강 예정인 과목을 체크하세요.",
}: {
  completedSet: Set<string>;
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  gradeFilter: GradeFilter;
  semesterFilter: SemesterFilter;
  onGradeFilterChange: (grade: GradeFilter) => void;
  onSemesterFilterChange: (semester: SemesterFilter) => void;
  onToggleCourse: (courseId: string) => void;
  tableTitle?: string;
  tableDescription?: string;
}) {
  const visibleCourses = useMemo(
    () =>
      courses
        .filter((course) => course.moduleId !== "A")
        .filter((course) => matchesSemesterFilter(course, gradeFilter, semesterFilter))
        .sort(
          (a, b) =>
            semesterRankForView(a.recommendedSemester) - semesterRankForView(b.recommendedSemester) ||
            a.moduleId.localeCompare(b.moduleId) ||
            a.code.localeCompare(b.code),
        ),
    [gradeFilter, semesterFilter],
  );
  const selectedVisibleCount = visibleCourses.filter((course) => completedSet.has(course.id)).length;
  const selectedTrackCourseCount = visibleCourses.filter((course) => isModuleInAnyTrack(selectedTrackIds, course.moduleId)).length;
  const gradeRows = ["1", "2", "3", "4"].filter((grade) => gradeFilter === "all" || gradeFilter === grade);
  const semesterRows = ["1", "2"].filter((semester) => semesterFilter === "all" || semesterFilter === semester);
  const unknownCourses = visibleCourses.filter((course) => !course.recommendedSemester);
  const semesterCourseCount = visibleCourses.length - unknownCourses.length;

  return (
    <section className="semester-course-panel">
      <div className="semester-course-head">
        <div>
          <span>전공 이수 선택표</span>
          <h3>{tableTitle}</h3>
          <p>{tableDescription}</p>
        </div>
        <div className="semester-course-stats" aria-label="과목 선택 요약">
          <strong>{selectedVisibleCount}/{visibleCourses.length}</strong>
          <span>현재 표에서 체크</span>
          <strong>{selectedTrackCourseCount}개</strong>
          <span>선택 트랙 관련 과목</span>
        </div>
      </div>

      <SemesterCourseQuickFilters
        gradeFilter={gradeFilter}
        semesterFilter={semesterFilter}
        onGradeFilterChange={onGradeFilterChange}
        onSemesterFilterChange={onSemesterFilterChange}
      />

      <div className="semester-legend" aria-label="표시 기준">
        <span className="legend-selected">체크 완료</span>
        <span className="legend-track">선택 트랙 모듈</span>
        <span className="legend-required">필수 과목</span>
      </div>

      {visibleCourses.length === 0 ? (
        <div className="empty-state">
          <strong>조건에 맞는 과목이 없습니다</strong>
          <span>학년 또는 학기 필터를 전체로 바꾸면 다시 전체 표를 볼 수 있습니다.</span>
        </div>
      ) : (
        <>
          {semesterCourseCount > 0 && (
            <div
              className={`semester-table transposed grade-count-${Math.max(1, gradeRows.length)}`}
              role="table"
              aria-label="학년·학기별 전공 이수 선택 표"
            >
              <div className="semester-table-header grade-heading" role="columnheader">
                학기
              </div>
              {gradeRows.map((grade) => (
                <div className="semester-table-header" role="columnheader" key={grade}>
                  {grade}학년
                </div>
              ))}
              {semesterRows.map((semester) => {
                const semesterCourses = gradeRows.flatMap((grade) =>
                  visibleCourses.filter((course) => course.recommendedSemester === `${grade}-${semester}`),
                );
                const semesterSelectedCount = semesterCourses.filter((course) => completedSet.has(course.id)).length;

                if (semesterFilter !== "all" && semesterCourses.length === 0) return null;

                return (
                  <Fragment key={semester}>
                    <div className="semester-grade-cell" role="rowheader">
                      <strong>{semester}학기</strong>
                      <span>
                        {semesterSelectedCount}/{semesterCourses.length}개 체크
                      </span>
                    </div>
                    {gradeRows.map((grade) => {
                      const termCourses = visibleCourses.filter((course) => course.recommendedSemester === `${grade}-${semester}`);

                      return (
                        <SemesterCourseCell
                          label={`${grade}학년 ${semester}학기`}
                          courses={termCourses}
                          completedSet={completedSet}
                          selectedTrackIds={selectedTrackIds}
                          enrollmentType={enrollmentType}
                          onToggleCourse={onToggleCourse}
                          key={`${grade}-${semester}`}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          )}

          {unknownCourses.length > 0 && (
            <details className="service-disclosure semester-unknown-panel semester-unknown-disclosure">
              <summary>
                <span><small>학기 미정</small><strong>융합 모듈 과목 보기</strong></span>
                <small>{unknownCourses.length}개</small>
              </summary>
              <div className="semester-unknown-grid">
                {unknownCourses.map((course) => (
                  <CourseCheckTile
                    course={course}
                    key={course.id}
                    completed={completedSet.has(course.id)}
                    trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)}
                    enrollmentType={enrollmentType}
                    onToggleCourse={onToggleCourse}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function SemesterCourseQuickFilters({
  gradeFilter,
  semesterFilter,
  onGradeFilterChange,
  onSemesterFilterChange,
}: {
  gradeFilter: GradeFilter;
  semesterFilter: SemesterFilter;
  onGradeFilterChange: (grade: GradeFilter) => void;
  onSemesterFilterChange: (semester: SemesterFilter) => void;
}) {
  const gradeOptions: Array<{ value: GradeFilter; label: string }> = [
    { value: "all", label: "전체 학년" },
    { value: "1", label: "1학년" },
    { value: "2", label: "2학년" },
    { value: "3", label: "3학년" },
    { value: "4", label: "4학년" },
    { value: "unknown", label: "학기 미정" },
  ];
  const semesterOptions: Array<{ value: SemesterFilter; label: string }> = [
    { value: "all", label: "전체 학기" },
    { value: "1", label: "1학기" },
    { value: "2", label: "2학기" },
    { value: "unknown", label: "학기 미정" },
  ];

  return (
    <div className="semester-filter-toolbar" aria-label="학년과 학기 빠른 선택">
      <div className="filter-chip-group" aria-label="학년 선택">
        <strong>학년</strong>
        {gradeOptions.map((option) => (
          <button
            className={gradeFilter === option.value ? "filter-chip active" : "filter-chip"}
            type="button"
            key={option.value}
            onClick={() => onGradeFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="filter-chip-group" aria-label="학기 선택">
        <strong>학기</strong>
        {semesterOptions.map((option) => (
          <button
            className={semesterFilter === option.value ? "filter-chip active" : "filter-chip"}
            type="button"
            key={option.value}
            onClick={() => onSemesterFilterChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SemesterCourseCell({
  label,
  courses: termCourses,
  completedSet,
  selectedTrackIds,
  enrollmentType,
  onToggleCourse,
}: {
  label: string;
  courses: Course[];
  completedSet: Set<string>;
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  onToggleCourse: (courseId: string) => void;
}) {
  return (
    <div className="semester-course-cell" role="cell">
      <strong className="semester-cell-label">{label}</strong>
      {termCourses.length === 0 ? (
        <span className="semester-empty">해당 과목 없음</span>
      ) : (
        termCourses.map((course) => (
          <CourseCheckTile
            course={course}
            key={course.id}
            completed={completedSet.has(course.id)}
            trackModule={isModuleInAnyTrack(selectedTrackIds, course.moduleId)}
            enrollmentType={enrollmentType}
            onToggleCourse={onToggleCourse}
          />
        ))
      )}
    </div>
  );
}

function CourseCheckTile({
  course,
  completed,
  trackModule,
  enrollmentType,
  onToggleCourse,
}: {
  course: Course;
  completed: boolean;
  trackModule: boolean;
  enrollmentType: EnrollmentType;
  onToggleCourse: (courseId: string) => void;
}) {
  const requiredForEnrollment = isRequiredCourseApplicable(course, enrollmentType);
  const excludedRequired = course.required && !requiredForEnrollment;
  const className = [
    "semester-course-tile",
    completed ? "checked" : "",
    trackModule ? "track-module" : "",
    requiredForEnrollment ? "required" : "",
    excludedRequired ? "optionalized" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={className}>
      <input type="checkbox" checked={completed} onChange={() => onToggleCourse(course.id)} />
      <span className="tile-main">
        <strong>{course.code}</strong>
        <span>{course.name}</span>
      </span>
      <span className="tile-meta">
        <small title={getModuleLabel(course.moduleId)}>{getModuleLabel(course.moduleId)}</small>
        <small>{course.credits}학점</small>
      </span>
      <span className="tile-badges">
        {requiredForEnrollment && <em>필수</em>}
        {excludedRequired && <em className="optionalized-badge">필수 제외</em>}
        {trackModule && <em className="track-module-badge">트랙 관련</em>}
      </span>
    </label>
  );
}

function EnrollmentPolicyNotice({ enrollmentType }: { enrollmentType: EnrollmentType }) {
  const selected = enrollmentOptions.find((option) => option.id === enrollmentType) ?? enrollmentOptions[0];
  const isPrimary = enrollmentType === "primary";

  return (
    <div className={isPrimary ? "policy-note" : "policy-note adjusted"}>
      <div>
        <strong>{selected.title}</strong>
        <p>{selected.description}</p>
      </div>
      <span>{isPrimary ? "PDF 필수 전체 반영" : "1학년 필수 제외 적용"}</span>
    </div>
  );
}

function ResultDetailView({
  result,
  profile,
  pathProgress,
  headingRef,
  onOpenRecommendations,
  onGoToPlan,
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onOpenRecommendations: () => void;
  onGoToPlan: () => void;
}) {
  const neededCoursePlans = getTrackNeededCoursePlans(result.trackResults);
  const hasTrackProgress = pathProgress.trackProgress !== "not-applicable";
  const requiredProgress = pathProgress.requiredProgress === "not-applicable"
    ? undefined
    : pathProgress.requiredProgress;
  const hasRequiredProgress = requiredProgress !== undefined;
  const missingRequiredCourses = requiredProgress
    ? requiredProgress.missingCourseIds
        .map((courseId) => courses.find((course) => course.id === courseId))
        .filter((course): course is Course => course !== undefined)
    : [];
  const [activeResultTab, setActiveResultTab] = useState<"summary" | "recommendation" | "modules" | "required">("summary");
  const visibleResultTab = (
    (!hasTrackProgress && (activeResultTab === "summary" || activeResultTab === "modules")) ||
    (!hasRequiredProgress && activeResultTab === "required")
  ) ? "recommendation" : activeResultTab;
  const statusTitle = {
    "current-input-satisfied": "현재 입력 기준 충족",
    "reference-calculation-satisfied": "참고 계산상 충족",
    incomplete: "보완할 조건이 있어요",
    "official-review-required": "공식 확인 필요",
  }[pathProgress.status];

  return (
    <div className="view-stack result-view">
      <SectionHeader
        eyebrow="진단 결과"
        title={statusTitle}
        body={hasTrackProgress
          ? "선택한 이수 경로의 학점과 트랙 모듈 진행도를 함께 확인하세요."
          : hasRequiredProgress
            ? "선택한 이수 경로의 학점과 필수과목 진행도를 확인하세요."
            : "선택한 이수 경로의 전체 전공학점 진행도를 확인하세요."}
        headingRef={headingRef}
      />
      <div className="result-top-grid">
        <div className="result-top-summary">
          {hasTrackProgress && (
            <div className="result-grid">
              <ResultMetric label="전체 진행률" value={`${result.completionRate}%`} />
              <ResultMetric label="남은 과목" value={formatNeededCourseRange(neededCoursePlans)} />
              <ResultMetric label="트랙 인정 학점" value={`${result.trackCredits}학점`} />
              {requiredProgress && (
                <ResultMetric
                  label="필수 과목"
                  value={`${requiredProgress.completedCredits}/${requiredProgress.requiredCredits}학점`}
                />
              )}
            </div>
          )}
        </div>
        <div className="result-action-bar no-print">
          <div>
            <strong>결과 리포트 저장</strong>
            <span>브라우저 인쇄 창에서 PDF 저장 또는 프린터 출력을 선택할 수 있습니다.</span>
          </div>
          <button className="print-button" type="button" onClick={printResultReport}>
            <Printer aria-hidden="true" size={18} />
            <span>PDF 저장/인쇄</span>
          </button>
        </div>
      </div>
      <PathProgressSummary profile={profile} result={pathProgress} />
      <div className="result-detail-tabs" role="tablist" aria-label="진단 결과 상세 보기">
        {hasTrackProgress && (
          <button
            className={visibleResultTab === "summary" ? "active" : ""}
            id="result-tab-summary"
            role="tab"
            aria-controls="result-panel-summary"
            aria-selected={visibleResultTab === "summary"}
            type="button"
            onClick={() => setActiveResultTab("summary")}
          >
            한눈에 보기
          </button>
        )}
        <button
          className={visibleResultTab === "recommendation" ? "active" : ""}
          id="result-tab-recommendation"
          role="tab"
          aria-controls="result-panel-recommendation"
          aria-selected={visibleResultTab === "recommendation"}
          type="button"
          onClick={() => setActiveResultTab("recommendation")}
        >
          맞춤 트랙 추천
        </button>
        {hasTrackProgress && (
          <button
            className={visibleResultTab === "modules" ? "active" : ""}
            id="result-tab-modules"
            role="tab"
            aria-controls="result-panel-modules"
            aria-selected={visibleResultTab === "modules"}
            type="button"
            onClick={() => setActiveResultTab("modules")}
          >
            부족 모듈
          </button>
        )}
        {hasRequiredProgress && (
          <button
            className={visibleResultTab === "required" ? "active" : ""}
            id="result-tab-required"
            role="tab"
            aria-controls="result-panel-required"
            aria-selected={visibleResultTab === "required"}
            type="button"
            onClick={() => setActiveResultTab("required")}
          >
            필수 과목
          </button>
        )}
      </div>
      <div className="result-detail-panel">
        {hasTrackProgress && (
          <div className="result-tab-panel" id="result-panel-summary" role="tabpanel" aria-labelledby="result-tab-summary" hidden={visibleResultTab !== "summary"}>
            <TrackNeededCourseSummary plans={neededCoursePlans} />
          </div>
        )}
        <div className="result-tab-panel" id="result-panel-recommendation" role="tabpanel" aria-labelledby="result-tab-recommendation" hidden={visibleResultTab !== "recommendation"}>
          <IndependentRecommendationPrompt
            onOpenRecommendations={onOpenRecommendations}
            onGoToPlan={onGoToPlan}
          />
        </div>
        {hasTrackProgress && (
          <div className="result-tab-panel" id="result-panel-modules" role="tabpanel" aria-labelledby="result-tab-modules" hidden={visibleResultTab !== "modules"}>
            <ModuleProgressBoard trackResults={result.trackResults} />
          </div>
        )}
        {hasRequiredProgress && (
          <div className="result-tab-panel" id="result-panel-required" role="tabpanel" aria-labelledby="result-tab-required" hidden={visibleResultTab !== "required"}>
            <div className="result-support-grid">
              <CourseSummaryList
                title="필수 과목 누락"
                courses={missingRequiredCourses}
                emptyText="필수 과목 누락 없음"
                compact
                tone="danger"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function IndependentRecommendationPrompt({
  onOpenRecommendations,
  onGoToPlan,
}: {
  onOpenRecommendations: () => void;
  onGoToPlan: () => void;
}) {
  return (
    <section className="independent-recommendation-prompt" aria-labelledby="independent-recommendation-title">
      <span>기준별 추천으로 변경됐어요</span>
      <h3 id="independent-recommendation-title">관심·이수 과목·졸업 계획을 따로 비교해요</h3>
      <p>서로 다른 기준을 한 점수로 합치지 않습니다. 각 기준의 순서와 이유를 확인하고 중요하게 볼 기준을 직접 선택해 주세요.</p>
      <div>
        <button className="primary-button" type="button" onClick={onOpenRecommendations}>
          세 기준별 트랙 비교 보기
          <ArrowRight aria-hidden="true" size={18} />
        </button>
        <button className="icon-button" type="button" onClick={onGoToPlan}>
          추천 과목을 학기 계획에 담기
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </div>
    </section>
  );
}

function PersonalizedTrackRecommendation({ recommendations, plannedRecommendations, plannedCourseCount, onGoToPlan }: { recommendations: TrackRecommendation[]; plannedRecommendations: TrackRecommendation[]; plannedCourseCount: number; onGoToPlan: () => void }) {
  const [includePlan, setIncludePlan] = useState(false);
  const visibleRecommendations = includePlan ? plannedRecommendations : recommendations;
  const best = visibleRecommendations[0];
  const alternatives = visibleRecommendations.slice(1, 3);
  const shared = getSharedLabSuggestions(visibleRecommendations.slice(0, 3));

  return (
    <div className="personal-recommendation">
      <div className="personal-recommendation-head">
        <div>
          <span>현재 입력을 기준으로 비교했어요</span>
          <h3>{best.trackName} 트랙이 가장 가까워요.</h3>
          <p>{getRecommendationReason(best)}</p>
        </div>
        <div className="plan-include-switch" role="group" aria-label="추천 계산 기준">
          <button className={!includePlan ? "active" : ""} type="button" onClick={() => setIncludePlan(false)}>이수 과목 기준</button>
          <button className={includePlan ? "active" : ""} type="button" disabled={plannedCourseCount === 0} onClick={() => setIncludePlan(true)}>계획 포함 {plannedCourseCount > 0 && `(${plannedCourseCount})`}</button>
        </div>
      </div>

      <article className={`personal-primary track-tone-${best.trackId}`}>
        <div className="personal-primary-title">
          <div><small>{best.trackKind} · 1순위</small><h4>{best.trackName}</h4></div>
          <strong>{best.completionRate}%</strong>
        </div>
        <div className="track-progress-line"><span style={{ width: `${best.completionRate}%` }} /></div>
        <div className="personal-match-row">
          <span>이미 연결된 모듈</span>
          <div>{best.matchedModuleLabels.slice(0, 5).map((label) => <em key={label}>{label}</em>)}{best.matchedModuleLabels.length === 0 && <em>아직 없음</em>}</div>
        </div>
        <div className="personal-metrics">
          <div><span>남은 학점</span><strong>{best.missingTotalCredits}학점</strong></div>
          <div><span>부족 모듈</span><strong>{best.missingModuleCount}개</strong></div>
          <div><span>필수 누락</span><strong>{best.missingRequiredCount}개</strong></div>
        </div>
        <div className="personal-next-courses">
          <strong>먼저 확인할 과목</strong>
          <div>{best.recommendedCourses.slice(0, 4).map((course) => <span key={course.id}>{course.name}<small>{formatSemester(course.recommendedSemester)} · {course.credits}학점</small></span>)}</div>
        </div>
        <button type="button" className="primary-button personal-plan-button" onClick={onGoToPlan}>추천 과목을 학기 계획에 담기 <ArrowRight aria-hidden="true" size={18} /></button>
      </article>

      <section className="personal-alternatives" aria-labelledby="personal-alternative-title">
        <div className="personal-section-title"><span>함께 고려할 수 있어요</span><h4 id="personal-alternative-title">추가 트랙 후보</h4></div>
        <div>
          {alternatives.map((recommendation) => (
            <article key={recommendation.trackId}>
              <div><small>{recommendation.rank}순위 · {recommendation.trackKind}</small><strong>{recommendation.trackName}</strong></div>
              <span>{recommendation.completionRate}%</span>
              <p>{recommendation.matchedModuleLabels.length > 0 ? `${recommendation.matchedModuleLabels.slice(0, 2).join(", ")} 모듈 이력이 연결돼요.` : "공통 기초 과목부터 연결할 수 있어요."}</p>
              <small>남은 {recommendation.missingTotalCredits}학점 · 부족 모듈 {recommendation.missingModuleCount}개</small>
            </article>
          ))}
        </div>
      </section>

      <section className="personal-shared-courses">
        <div className="personal-section-title"><span>선택지를 넓히는 과목</span><h4>여러 트랙에 함께 도움 되는 과목</h4></div>
        <div>{shared.courses.slice(0, 4).map((suggestion) => <span key={suggestion.course.id}><strong>{suggestion.course.name}</strong><small>{formatTrackNamesShort(suggestion.trackNames)} 공통 · {formatSemester(suggestion.course.recommendedSemester)}</small></span>)}</div>
        {shared.courses.length === 0 && <p className="empty-text">현재 입력에서는 공통 추천 과목보다 1순위 트랙의 부족 모듈을 먼저 확인해보세요.</p>}
      </section>
      <p className="personal-disclaimer"><ShieldCheck aria-hidden="true" size={16} /> 이 추천은 입력한 이수 이력을 기준으로 한 자가진단입니다. 실제 트랙 신청과 인정 여부는 학과 공식 안내로 확인하세요.</p>
    </div>
  );
}

function TrackNeededCourseSummary({ plans }: { plans: TrackNeededCoursePlan[] }) {
  return (
    <div className="needed-course-panel">
      <div className="needed-course-head">
        <div>
          <span>3학점 기준 남은 과목 계산</span>
          <h3>트랙별로 어디에서 몇 과목을 더 들어야 하는지 확인하세요.</h3>
        </div>
        <p>부족 학점을 3학점 과목 단위로 환산했습니다. 실제 과목 학점이 다른 융합 모듈은 공식 과목표와 함께 확인하세요.</p>
      </div>
      <div className="needed-course-grid">
        {plans.map((plan) => (
          <article className={`needed-course-card track-tone-${plan.trackId}`} key={plan.trackId}>
            <div className="needed-course-title">
              <div>
                <span className={getTrackBadgeClass(plan.trackId)}>{plan.trackName}</span>
                <small>{plan.trackKind}</small>
              </div>
              <strong>{plan.passed ? "충족" : `${plan.neededCourses}과목`}</strong>
            </div>
            <div className="track-progress-line">
              <span style={{ width: `${plan.completionRate}%` }} />
            </div>
            {plan.rows.length === 0 ? (
              <p className="empty-text compact-status">현재 체크 기준으로 더 채워야 할 모듈이 없습니다.</p>
            ) : (
              <div className="needed-course-row-list">
                {plan.rows.map((row) => (
                  <div className="needed-course-row" key={`${plan.trackId}-${row.label}`}>
                    <div>
                      <strong>{row.label}</strong>
                      <small>{row.note}</small>
                      {row.candidates.length > 0 && (
                        <em>
                          후보:{" "}
                          {row.candidates
                            .slice(0, 3)
                            .map((course) => `${course.code} ${course.name}`)
                            .join(", ")}
                        </em>
                      )}
                    </div>
                    <span>{row.neededCourses}과목</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function ModuleProgressBoard({ trackResults }: { trackResults: TrackDiagnosisResult[] }) {
  return (
    <div className="table-panel compact-result-panel module-progress-panel">
      <div className="module-progress-head">
        <div>
          <span>모듈별 충족 현황</span>
          <h3>트랙별 모듈 상태를 구분해서 확인하세요.</h3>
        </div>
        <p>색이 있는 막대가 채운 학점입니다. `부족` 표시는 해당 모듈에서 더 채워야 하는 학점입니다.</p>
      </div>
      <div className="module-progress-groups">
        {trackResults.map((trackResult) => {
          const missingCount = trackResult.moduleProgress.filter((progress) => progress.missingCredits > 0).length;
          const remainingCourseIds = new Set(trackResult.remainingCourses.map((course) => course.id));
          const missingProgress = trackResult.moduleProgress.filter((progress) => progress.missingCredits > 0);
          const completeProgress = trackResult.moduleProgress.filter((progress) => progress.missingCredits === 0);
          return (
            <section className={`module-progress-group track-tone-${trackResult.trackId}`} key={trackResult.trackId}>
              <div className="module-progress-title">
                <span className={getTrackBadgeClass(trackResult.trackId)}>{trackResult.trackName}</span>
                <strong>{missingCount === 0 ? "전체 충족" : `${missingCount}개 모듈 부족`}</strong>
              </div>
              <div className="module-status-columns">
                <div className="module-status-column missing-column">
                  <div className="module-column-head">
                    <strong>부족</strong>
                    <span>{missingProgress.length}개</span>
                  </div>
                  <div className="module-status-list">
                    {missingProgress.length === 0 ? (
                      <p className="empty-text">부족한 모듈이 없습니다.</p>
                    ) : (
                      missingProgress.map((progress) => (
                        <ModuleStatusCard
                          key={`${trackResult.trackId}-${progress.label}`}
                          progress={progress}
                          remainingCourseIds={remainingCourseIds}
                          trackName={trackResult.trackName}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="module-status-column complete-column">
                  <div className="module-column-head">
                    <strong>충족</strong>
                    <span>{completeProgress.length}개</span>
                  </div>
                  <div className="module-status-list">
                    {completeProgress.length === 0 ? (
                      <p className="empty-text">아직 충족한 모듈이 없습니다.</p>
                    ) : (
                      completeProgress.map((progress) => (
                        <ModuleStatusCard
                          key={`${trackResult.trackId}-${progress.label}`}
                          progress={progress}
                          remainingCourseIds={remainingCourseIds}
                          trackName={trackResult.trackName}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ModuleStatusCard({
  progress,
  remainingCourseIds,
  trackName,
}: {
  progress: ModuleProgress;
  remainingCourseIds: Set<string>;
  trackName: string;
}) {
  const completedRatio =
    progress.requiredCredits === 0
      ? 0
      : Math.min(100, Math.round((progress.completedCredits / progress.requiredCredits) * 100));
  const isComplete = progress.missingCredits === 0;
  const moduleCandidateCourses = progress.courseIds
    .map((courseId) => courses.find((course) => course.id === courseId))
    .filter((course): course is Course => course !== undefined)
    .filter((course) => remainingCourseIds.has(course.id));
  const candidateCourseGroups = groupCoursesByTerm(moduleCandidateCourses);

  return (
    <article className={isComplete ? "module-status-card complete" : "module-status-card missing"}>
      <div className="module-status-top">
        <strong>{formatModuleProgressLabel(progress.label, trackName)}</strong>
        <span>{isComplete ? "충족" : `${progress.missingCredits}학점 부족`}</span>
      </div>
      <div className="module-status-bar" aria-label={`${completedRatio}% 충족`}>
        <i style={{ width: `${completedRatio}%` }} />
      </div>
      <div className="module-status-foot">
        <small>
          {progress.completedCredits}/{progress.requiredCredits}학점
        </small>
        <em>{completedRatio}%</em>
      </div>
      {!isComplete && (
        <div className="module-candidate-courses">
          <strong>보완 후보 과목</strong>
          {candidateCourseGroups.length === 0 ? (
            <p className="empty-text">이 모듈의 남은 과목을 확인하세요.</p>
          ) : (
            <div className="candidate-term-groups">
              {candidateCourseGroups.map((group) => (
                <section className={`candidate-term-group term-${group.key}`} key={group.key}>
                  <strong>{group.label}</strong>
                  <div className="candidate-course-chip-list">
                    {group.courses.map((course) => (
                      <span key={course.id}>
                        {course.code} {course.name}
                        <small>{formatSemester(course.recommendedSemester)}</small>
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function TrackShortageList({ result }: { result: DiagnosisResult }) {
  return (
    <div className="track-detail-panel">
      <div className="track-detail-head">
        <h3>트랙별 부족 현황</h3>
        <p>복수 선택 시 각 트랙의 부족 모듈과 추천 과목을 분리해서 확인하세요.</p>
      </div>
      <div className="track-detail-grid">
        {result.trackResults.map((trackResult) => {
          const missingModules = trackResult.moduleProgress.filter((progress) => progress.missingCredits > 0);
          const missingSummary =
            missingModules.length === 0
              ? "모듈 학점 조건은 충족했습니다."
              : missingModules.map((progress) => `${progress.label} ${progress.missingCredits}학점`).join(" · ");
          const recommendationSummary =
            trackResult.recommendedCourses.length === 0
              ? "추천할 남은 과목 없음"
              : trackResult.recommendedCourses
                  .slice(0, 3)
                  .map((course) => `${course.code} ${course.name}`)
                  .join(", ");
          const cardClassName = [
            "track-detail-card",
            `track-tone-${trackResult.trackId}`,
            trackResult.passed ? "passed" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <article className={cardClassName} key={trackResult.trackId}>
              <div className="track-detail-title">
                <div>
                  <span>{trackResult.trackKind}</span>
                  <h4>{trackResult.trackName}</h4>
                </div>
                <strong>{trackResult.passed ? "충족" : "부족"}</strong>
              </div>
              <div className="track-progress-stack">
                <div className="track-progress-line">
                  <span style={{ width: `${trackResult.completionRate}%` }} />
                </div>
                <div className="shortage-summary">
                  <small>진행률 {trackResult.completionRate}%</small>
                  <small>{missingModules.length}개 조건 보완</small>
                  <small>필수 {trackResult.missingRequiredCourses.length}개</small>
                </div>
              </div>
              {trackResult.passed ? (
                <p className="empty-text compact-status">현재 체크 기준으로 충족 상태입니다.</p>
              ) : (
                <div className="compact-shortage-block">
                  <span>{missingSummary}</span>
                  <small>추천: {recommendationSummary}</small>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TrackCourseShortageBoard({ trackResults }: { trackResults: TrackDiagnosisResult[] }) {
  return (
    <div className="track-course-board">
      <div className="track-course-board-head">
        <div>
          <span>트랙별 부족 과목 현황</span>
          <h3>어느 트랙에서 어떤 과목이 필요한지 색상으로 구분했습니다.</h3>
        </div>
        <p>복수 선택 시 같은 과목이 여러 트랙에 도움될 수 있으니, 색상별 카드를 비교해서 수강 우선순위를 잡으세요.</p>
      </div>
      <div className="track-course-grid">
        {trackResults.map((trackResult) => {
          const missingModules = trackResult.moduleProgress.filter((progress) => progress.missingCredits > 0);
          const recommendedCourses = trackResult.recommendedCourses.slice(0, 6);
          return (
            <article className={`track-course-card track-tone-${trackResult.trackId}`} key={trackResult.trackId}>
              <div className="track-course-card-head">
                <div>
                  <span className={getTrackBadgeClass(trackResult.trackId)}>{trackResult.trackName}</span>
                  <h4>{trackResult.passed ? "현재 충족" : `${recommendedCourses.length}개 우선 과목`}</h4>
                </div>
                <strong>{trackResult.completionRate}%</strong>
              </div>
              <div className="track-progress-line">
                <span style={{ width: `${trackResult.completionRate}%` }} />
              </div>
              <div className="missing-module-chips">
                {missingModules.slice(0, 5).map((progress) => (
                  <span key={progress.label}>
                    {progress.label.replace(`${trackResult.trackName} · `, "")} {progress.missingCredits}학점
                  </span>
                ))}
                {missingModules.length === 0 && <span>부족 모듈 없음</span>}
              </div>
              <div className="track-course-list">
                {recommendedCourses.map((course) => (
                  <div className="track-course-item" key={course.id}>
                    <span>
                      {course.code} {course.name}
                    </span>
                    <small>
                      {getModuleLabel(course.moduleId)} · {formatSemester(course.recommendedSemester)} · {course.credits}학점
                    </small>
                    {course.required && <em>필수</em>}
                  </div>
                ))}
                {recommendedCourses.length === 0 && <p className="empty-text">현재 기준으로 우선 보완 과목이 없습니다.</p>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ContactView() {
  return (
    <div className="view-stack">
      <SectionHeader
        eyebrow="문의사항"
        title="개인 프로젝트 운영자에게 문의하기"
        body="오류 제보, 데이터 검수 의견, 기능 제안은 아래 연락처로 보내주세요. 학과 공식 행정 문의는 반드시 학과 사무실 또는 공식 안내를 이용해야 합니다."
      />
      <div className="contact-card">
        <div className="contact-avatar logo-avatar">
          <img src="/dku-logo.png" alt="단국대학교 DKU 로고" />
        </div>
        <div className="contact-details">
          <h3>단국대학교 수학과 이연수</h3>
          <a href="mailto:shuai020504@naver.com">
            <Mail aria-hidden="true" size={18} />
            shuai020504@naver.com
          </a>
          <a href="https://www.instagram.com/yourdiary_02" target="_blank" rel="noreferrer">
            <Instagram aria-hidden="true" size={18} />
            @yourdiary_02
          </a>
        </div>
      </div>
      <p className="contact-disclaimer">
        이 도구는 자가진단 보조용으로 제작했습니다.
        <br />
        자세한 최종 졸업·트랙 인정 여부는 학과 공식 안내로 확인하세요.
      </p>
      <section className="update-history-panel" aria-label="날짜별 업데이트 내역">
        <div className="update-history-head">
          <span>업데이트 기록</span>
          <h3>날짜별 개선 내역</h3>
          <p>사이트가 어떤 방향으로 보강됐는지 한눈에 확인할 수 있도록 주요 변경 사항만 정리했습니다.</p>
        </div>
        <div className="update-history-list">
          {updateHistory.map((entry) => (
            <article className="update-history-item" key={entry.date}>
              <time>{entry.date}</time>
              <div>
                <h4>{entry.title}</h4>
                <ul>
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DiagnosisPanel({
  result,
  selectedTrackNames,
  enrollmentType,
  completedCount,
  allowResult,
  onShowResult,
}: {
  result: DiagnosisResult;
  selectedTrackNames: string[];
  enrollmentType: EnrollmentType;
  completedCount: number;
  allowResult: boolean;
  onShowResult: () => void;
}) {
  const enrollmentLabel = getEnrollmentLabel(enrollmentType);

  if (result.trackResults.length === 0) {
    return (
      <aside className="diagnosis-panel" aria-label="진단 결과 요약">
        <div className="status-head">
          <span>단국대학교 식품자원경제학과 · {enrollmentLabel}</span>
          <h2>{allowResult ? "입력한 과목을 확인하세요" : "트랙을 선택하세요"}</h2>
          <p>{allowResult
            ? "현재 이수 경로는 목표 트랙 없이 과목 입력 결과를 저장할 수 있습니다."
            : "관심 있는 트랙을 하나 이상 선택하면 부족 모듈과 추천 과목이 계산됩니다."}</p>
        </div>
        <div className="empty-state compact">
          <strong>{completedCount}개 과목 체크됨</strong>
          <span>{allowResult ? "트랙 선택은 선택 사항입니다." : "선택된 트랙이 없습니다."}</span>
        </div>
        {allowResult && (
          <button className="primary-button" type="button" onClick={onShowResult}>
            <Save aria-hidden="true" size={18} />
            <span>진단 결과 자세히 보기</span>
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside className="diagnosis-panel" aria-label="진단 결과 요약">
      <div className="status-head">
        <span>단국대학교 식품자원경제학과 · {enrollmentLabel}</span>
        <h2>{selectedTrackNames.join(" + ")}</h2>
        <p>선택한 {selectedTrackNames.length}개 트랙 기준으로 남은 과목과 부족 학점을 통합 계산합니다.</p>
      </div>
      <div className="progress-ring" aria-label={`전체 진행률 ${result.completionRate}%`}>
        <strong>{result.completionRate}%</strong>
        <span>전체 진행률</span>
        <div className="progress-bar">
          <i style={{ width: `${result.completionRate}%` }} />
        </div>
      </div>
      <div className="panel-metrics">
        <ResultMetric label="체크 과목" value={`${completedCount}개`} compact />
        <ResultMetric label="총 체크 학점" value={`${result.totalCredits}학점`} compact />
      </div>
      <div className="mini-section">
        <h3>트랙별 충족 현황</h3>
        {result.trackResults.map((trackResult) => (
          <div className="mini-row" key={trackResult.trackId}>
            {trackResult.passed ? (
              <CheckCircle2 className="ok" aria-hidden="true" size={16} />
            ) : (
              <AlertTriangle className="warn" aria-hidden="true" size={16} />
            )}
            <span>{trackResult.trackName}</span>
            <strong>{trackResult.completionRate}%</strong>
          </div>
        ))}
      </div>
      <div className="mini-section">
        <h3>추천 수강 과목</h3>
        {result.recommendedCourses.slice(0, 3).map((course) => (
          <div className="recommend-row" key={course.id}>
            <span>{course.name}</span>
            <small>
              {course.code} · {formatSemester(course.recommendedSemester)} · {course.credits}학점
            </small>
          </div>
        ))}
        {result.recommendedCourses.length === 0 && <p className="empty-text">추천할 남은 과목 없음</p>}
      </div>
      {result.excludedRequiredCourses.length > 0 && (
        <div className="mini-section">
          <h3>필수 제외 적용</h3>
          {result.excludedRequiredCourses.map((course) => (
            <div className="recommend-row" key={course.id}>
              <span>{course.name}</span>
              <small>{formatSemester(course.recommendedSemester)} · 복수전공/부전공 모드</small>
            </div>
          ))}
        </div>
      )}
      <button className="primary-button" type="button" onClick={onShowResult}>
        <Save aria-hidden="true" size={18} />
        <span>진단 결과 자세히 보기</span>
      </button>
    </aside>
  );
}

function CourseSummaryList({
  title,
  courses: summaryCourses,
  emptyText,
  compact = false,
  tone = "default",
}: {
  title: string;
  courses: Course[];
  emptyText: string;
  compact?: boolean;
  tone?: "default" | "danger";
}) {
  const className = [
    compact ? "table-panel compact-summary-panel" : "table-panel",
    tone === "danger" ? "danger-summary-panel" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="summary-panel-head">
        <h3>{title}</h3>
        <span>{summaryCourses.length}개</span>
      </div>
      {summaryCourses.length === 0 ? (
        <p className="empty-text">{emptyText}</p>
      ) : (
        <div className={compact ? "summary-list compact" : "summary-list"}>
          {summaryCourses.map((course) => (
            <div className="summary-row" key={course.id}>
              <span>
                {course.code} {course.name}
              </span>
              <small>
                {getModuleLabel(course.moduleId)} · {formatSemester(course.recommendedSemester)} · {course.credits}학점
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SemesterCourseSummary({ title, courses: summaryCourses }: { title: string; courses: Course[] }) {
  const groupedCourses = groupCoursesBySemester(summaryCourses);

  return (
    <div className="table-panel compact-summary-panel semester-summary-panel">
      <div className="summary-panel-head">
        <h3>{title}</h3>
        <span>{summaryCourses.length}개</span>
      </div>
      {summaryCourses.length === 0 ? (
        <p className="empty-text">선택 트랙 기준 남은 과목 없음</p>
      ) : (
        <div className="semester-summary-list">
          {groupedCourses.map((group) => (
            <div className="semester-summary-group" key={group.key}>
              <strong>{group.label}</strong>
              <div>
                {group.courses.map((course) => (
                  <span key={course.id}>
                    {course.code} {course.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  body: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2
        className={headingRef ? "step-focus-heading" : undefined}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
      >
        {title}
      </h2>
      <p>{body}</p>
    </div>
  );
}

function ResultMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "metric compact" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatSemester(semester?: string): string {
  if (!semester) return "학기 미정";
  const [grade, term] = semester.split("-");
  return `${grade}학년 ${term}학기`;
}

function formatSaveTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

function matchesSemesterFilter(course: Course, gradeFilter: GradeFilter, semesterFilter: SemesterFilter): boolean {
  if (!course.recommendedSemester) {
    return gradeFilter === "all" || gradeFilter === "unknown" || semesterFilter === "unknown";
  }

  const [grade, semester] = course.recommendedSemester.split("-");
  const gradeMatches = gradeFilter === "all" || gradeFilter === grade;
  const semesterMatches = semesterFilter === "all" || semesterFilter === semester;

  if (gradeFilter === "unknown" || semesterFilter === "unknown") {
    return false;
  }

  return gradeMatches && semesterMatches;
}

function getTrackModuleIds(track: Track): ModuleId[] {
  if (track.rule.type === "major") {
    return track.rule.moduleIds;
  }

  return [
    ...track.rule.baseModuleIds,
    ...track.rule.convergenceRequirements.flatMap((requirement) => requirement.moduleIds),
  ];
}

function trackUsesModule(track: Track, moduleId: ModuleId): boolean {
  return getTrackModuleIds(track).includes(moduleId);
}

function getTrackBadgeClass(trackId: TrackId): string {
  return `track-badge track-badge-${trackId}`;
}

function getTrackQuickMeta(track: Track): string {
  if (track.rule.type === "major") {
    return "5개 모듈 · 각 모듈 6학점";
  }

  return "학과+융합 모듈 · 총 30학점";
}

function getRecommendationStatusLabel(status: TrackRecommendationStatus): string {
  if (status === "ready") return "현재 충족 가능";
  if (status === "close") return "조금만 보완";
  if (status === "possible") return "계획하면 가능";
  return "장기 계획 필요";
}

function getFeasibilityClassName(status: TrackRecommendation["feasibility"]["status"]): string {
  return `lab-feasibility lab-feasibility-${status}`;
}

function getSharedLabSuggestions(recommendations: TrackRecommendation[]): {
  modules: SharedModuleSuggestion[];
  courses: SharedCourseSuggestion[];
} {
  const moduleMap = new Map<string, Set<string>>();
  const courseMap = new Map<string, { course: Course; trackNames: Set<string> }>();

  recommendations.forEach((recommendation) => {
    recommendation.missingModuleLabels.forEach((label) => {
      const trackNames = moduleMap.get(label) ?? new Set<string>();
      trackNames.add(recommendation.trackName);
      moduleMap.set(label, trackNames);
    });

    recommendation.recommendedCourses.forEach((course) => {
      const entry = courseMap.get(course.id) ?? { course, trackNames: new Set<string>() };
      entry.trackNames.add(recommendation.trackName);
      courseMap.set(course.id, entry);
    });
  });

  const modules = [...moduleMap.entries()]
    .map(([label, trackNames]) => ({ label, trackNames: [...trackNames] }))
    .filter((suggestion) => suggestion.trackNames.length >= 2)
    .sort((a, b) => b.trackNames.length - a.trackNames.length || a.label.localeCompare(b.label))
    .slice(0, 6);

  const courses = [...courseMap.values()]
    .map((entry) => ({ course: entry.course, trackNames: [...entry.trackNames] }))
    .filter((suggestion) => suggestion.trackNames.length >= 2)
    .sort(
      (a, b) =>
        b.trackNames.length - a.trackNames.length ||
        semesterRankForView(a.course.recommendedSemester) - semesterRankForView(b.course.recommendedSemester) ||
        a.course.code.localeCompare(b.course.code),
    )
    .slice(0, 8);

  return { modules, courses };
}

function formatTrackNamesShort(trackNames: string[]): string {
  if (trackNames.length <= 2) return trackNames.join(" · ");
  return `${trackNames.slice(0, 2).join(" · ")} 외 ${trackNames.length - 2}개`;
}

function getRecommendationReason(recommendation: TrackRecommendation, completedCount?: number): string {
  if (completedCount === 0) {
    return "아직 체크한 과목이 없어 기본 조건 기준으로 가까운 트랙을 보여줍니다.";
  }

  if (recommendation.passed) {
    return "현재 체크 기준으로 이 트랙의 주요 조건을 충족했습니다.";
  }

  if (recommendation.matchedModuleLabels.length > 0) {
    return `${recommendation.matchedModuleLabels.slice(0, 2).join(", ")}에서 이미 이수한 과목이 있어 출발점이 좋습니다.`;
  }

  return "아직 겹치는 모듈이 적어 추천 과목부터 단계적으로 채우는 편이 좋습니다.";
}

function getExperimentPlan(
  recommendation: TrackRecommendation,
  sharedCourses: SharedCourseSuggestion[],
  planningSemester: LabPlanningSemester,
  completedCourseCount: number,
): ExperimentPlan {
  const feasibility = recommendation.feasibility;
  const remainingSemesterText =
    feasibility.remainingRegularSemesters === null ? "입력 필요" : `${feasibility.remainingRegularSemesters}학기`;
  const perSemesterCourseCount =
    feasibility.remainingRegularSemesters === null || feasibility.neededCourseCount === 0
      ? 0
      : Math.ceil(feasibility.neededCourseCount / Math.max(1, feasibility.remainingRegularSemesters));
  const perSemesterText =
    feasibility.remainingRegularSemesters === null
      ? "입력 필요"
      : feasibility.neededCourseCount === 0
        ? "추가 없음"
        : `약 ${perSemesterCourseCount}과목`;
  const priorityCourses = uniqueCourseList([
    ...recommendation.recommendedCourses,
    ...sharedCourses.map((suggestion) => suggestion.course),
  ]).slice(0, 10);
  const hasCurrentSemester = planningSemester !== "unselected";

  let loadLabel = "현재 학기 입력 필요";
  let loadDetail = "현재 학년·학기를 선택하면 남은 정규학기 기준으로 수강신청 부담을 계산합니다.";

  if (feasibility.status === "complete") {
    loadLabel = "현재 충족 상태";
    loadDetail = "체크한 과목 기준으로 가장 가까운 트랙의 주요 조건을 충족했습니다. 다른 트랙 확장 가능성을 비교해도 좋습니다.";
  } else if (feasibility.status === "regular") {
    loadLabel = perSemesterCourseCount <= 2 ? "정규학기 안 안정권" : "정규학기 안 가능";
    loadDetail =
      perSemesterCourseCount <= 2
        ? "남은 학기마다 트랙 관련 과목을 무리 없이 섞어 넣으면 정규학기 안에 달성 가능성이 높습니다."
        : "정규학기 안에 가능하지만 학기당 보완 과목 수가 많아 수강신청 우선순위를 분명히 잡아야 합니다.";
  } else if (feasibility.status === "extra-semester") {
    loadLabel = "초과학기 또는 계절학기 고려";
    loadDetail = "정규학기만으로는 여유가 적습니다. 필수 과목과 공통 활용 과목을 먼저 배치하고, 초과학기 가능성도 함께 열어두세요.";
  } else if (feasibility.status === "long-term") {
    loadLabel = "학과 상담 권장";
    loadDetail = "남은 학기 대비 필요한 과목 수가 많습니다. 트랙 우선순위, 복수전공·부전공 기준, 대체 가능 과목을 학과 안내와 함께 확인하세요.";
  } else if (hasCurrentSemester) {
    loadLabel = "수강 계획 계산 중";
    loadDetail = feasibility.detail;
  }

  const insights: ExperimentInsight[] = [
    {
      label: "우선순위 1",
      title:
        recommendation.missingRequiredCount > 0
          ? "필수 과목을 먼저 확보하세요"
          : recommendation.missingModuleCount > 0
            ? "부족 모듈부터 채우세요"
            : "확장 트랙을 비교하세요",
      detail:
        recommendation.missingRequiredCount > 0
          ? `필수 누락 ${recommendation.missingRequiredCount}개가 남아 있어 트랙 과목보다 먼저 시간표에 넣는 편이 안전합니다.`
          : recommendation.missingModuleCount > 0
            ? `부족 모듈 ${recommendation.missingModuleCount}개가 남아 있습니다. 같은 모듈 안에서 개설 학기를 보고 순서대로 채우세요.`
            : "가장 가까운 트랙은 충족권입니다. 공통 추천 과목을 활용해 다른 트랙까지 확장할 수 있는지 비교하세요.",
      tone: recommendation.missingRequiredCount > 0 ? "warning" : "notice",
    },
    {
      label: "학기 부담",
      title:
        !hasCurrentSemester
          ? "현재 학년·학기 입력 필요"
          : perSemesterCourseCount <= 2
            ? "학기당 부담이 낮습니다"
            : perSemesterCourseCount <= 3
              ? "수강신청 우선순위가 필요합니다"
              : "한 학기 부담이 큽니다",
      detail:
        !hasCurrentSemester
          ? "현재 위치를 넣어야 정규학기 안 가능 여부와 학기당 목표 과목 수가 계산됩니다."
          : perSemesterCourseCount <= 2
            ? `남은 ${remainingSemesterText} 동안 학기당 ${perSemesterText} 정도를 보완하면 됩니다.`
            : perSemesterCourseCount <= 3
              ? `학기당 ${perSemesterText} 수준입니다. 전공필수와 트랙 공통 과목을 먼저 잡아야 합니다.`
              : `학기당 ${perSemesterText} 이상이 필요합니다. 초과학기나 트랙 목표 조정을 같이 검토하세요.`,
      tone: !hasCurrentSemester || perSemesterCourseCount > 3 ? "warning" : "good",
    },
    {
      label: "공통 활용",
      title: sharedCourses.length > 0 ? "겹치는 과목을 먼저 보세요" : "트랙별 후보를 따로 보세요",
      detail:
        sharedCourses.length > 0
          ? `${sharedCourses[0].course.code} ${sharedCourses[0].course.name}처럼 여러 트랙에 동시에 도움 되는 과목이 있습니다.`
          : "현재 추천 결과에서는 공통 후보가 적습니다. 가장 가까운 트랙의 부족 모듈부터 좁혀 보는 편이 좋습니다.",
      tone: sharedCourses.length > 0 ? "good" : "notice",
    },
  ];

  const actions = [
    completedCourseCount === 0
      ? "자가진단 탭에서 이미 들었거나 이수 예정인 과목을 먼저 체크합니다."
      : `${completedCourseCount}개 체크 과목을 기준으로 가장 가까운 트랙은 ${recommendation.trackName}입니다.`,
    recommendation.missingRequiredCount > 0
      ? "필수 누락 과목을 다음 수강신청 1순위로 둡니다."
      : "부족 모듈 과목을 학기별로 나눠 시간표 후보에 넣습니다.",
    sharedCourses.length > 0
      ? "여러 트랙에 겹치는 공통 추천 과목을 먼저 확인합니다."
      : "트랙별 추천 순위를 보고 목표 트랙을 1개로 좁힙니다.",
    "최종 인정 여부와 실제 개설 학기는 학과 공식 안내와 수강신청 시스템에서 확인합니다.",
  ];

  return {
    loadLabel,
    loadDetail,
    remainingSemesterText,
    perSemesterText,
    priorityCourses,
    insights,
    actions,
  };
}

function getTrackNeededCoursePlans(trackResults: TrackDiagnosisResult[]): TrackNeededCoursePlan[] {
  return trackResults.map((trackResult) => {
    const remainingCourseIds = new Set(trackResult.remainingCourses.map((course) => course.id));
    const missingModuleProgress = trackResult.moduleProgress.filter((progress) => progress.missingCredits > 0);
    const missingModuleCourseIds = new Set(missingModuleProgress.flatMap((progress) => progress.courseIds));
    const rows: TrackNeededCourseRow[] = missingModuleProgress.map((progress) => {
      const neededCourses = creditsToCourseCount(progress.missingCredits);
      const candidates = progress.courseIds
        .map((courseId) => courses.find((course) => course.id === courseId))
        .filter((course): course is Course => course !== undefined && remainingCourseIds.has(course.id))
        .sort(compareCoursesForView);

      return {
        label: formatModuleProgressLabel(progress.label, trackResult.trackName),
        neededCourses,
        missingCredits: progress.missingCredits,
        note: `${progress.missingCredits}학점 부족 · 3학점 기준 ${neededCourses}과목`,
        candidates,
      };
    });

    const requiredOnlyCourses = trackResult.missingRequiredCourses.filter(
      (course) => !missingModuleCourseIds.has(course.id),
    );
    const requiredOnlyCredits = requiredOnlyCourses.reduce((sum, course) => sum + course.credits, 0);

    if (requiredOnlyCredits > 0) {
      const neededCourses = creditsToCourseCount(requiredOnlyCredits);
      rows.push({
        label: "공통 필수 과목",
        neededCourses,
        missingCredits: requiredOnlyCredits,
        note: `${requiredOnlyCredits}학점 부족 · 모듈 부족과 중복되지 않는 필수 과목`,
        candidates: requiredOnlyCourses.sort(compareCoursesForView),
      });
    }

    return {
      trackId: trackResult.trackId,
      trackName: trackResult.trackName,
      trackKind: trackResult.trackKind,
      passed: trackResult.passed,
      completionRate: trackResult.completionRate,
      neededCourses: rows.reduce((sum, row) => sum + row.neededCourses, 0),
      rows,
    };
  });
}

function uniqueCourseList(courseList: Course[]): Course[] {
  return [...new Map(courseList.map((course) => [course.id, course])).values()].sort(compareCoursesForView);
}

function formatNeededCourseRange(plans: TrackNeededCoursePlan[]): string {
  if (plans.length === 0) return "0개";
  if (plans.length === 1) return `${plans[0].neededCourses}개`;

  const counts = plans.map((plan) => plan.neededCourses);
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  return min === max ? `${max}개` : `${min}~${max}개`;
}

function creditsToCourseCount(credits: number): number {
  return Math.ceil(Math.max(0, credits) / 3);
}

function compareCoursesForView(a: Course, b: Course): number {
  return semesterRankForView(a.recommendedSemester) - semesterRankForView(b.recommendedSemester) || a.code.localeCompare(b.code);
}

function groupCoursesBySemester(courseList: Course[]): Array<{ key: string; label: string; courses: Course[] }> {
  const grouped = new Map<string, Course[]>();
  courseList.forEach((course) => {
    const key = course.recommendedSemester ?? "unknown";
    grouped.set(key, [...(grouped.get(key) ?? []), course]);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => semesterRankForView(a) - semesterRankForView(b))
    .map(([key, groupedCourses]) => ({
      key,
      label: key === "unknown" ? "학기 미정" : formatSemester(key),
      courses: groupedCourses.sort(
        (a, b) => semesterRankForView(a.recommendedSemester) - semesterRankForView(b.recommendedSemester) || a.code.localeCompare(b.code),
      ),
    }));
}

function groupCoursesByTerm(courseList: Course[]): Array<{ key: string; label: string; courses: Course[] }> {
  const grouped = new Map<string, Course[]>();
  courseList.forEach((course) => {
    const key = getSemesterTermKey(course.recommendedSemester);
    grouped.set(key, [...(grouped.get(key) ?? []), course]);
  });

  return [...grouped.entries()]
    .sort(([a], [b]) => semesterTermRank(a) - semesterTermRank(b))
    .map(([key, groupedCourses]) => ({
      key,
      label: getSemesterTermLabel(key),
      courses: groupedCourses.sort(
        (a, b) => semesterRankForView(a.recommendedSemester) - semesterRankForView(b.recommendedSemester) || a.code.localeCompare(b.code),
      ),
    }));
}

function getSemesterTermKey(semester?: string): string {
  if (!semester) return "unknown";
  const [, term] = semester.split("-");
  return term === "1" || term === "2" ? term : "unknown";
}

function getSemesterTermLabel(term: string): string {
  if (term === "1") return "1학기 과목";
  if (term === "2") return "2학기 과목";
  return "학기 미정";
}

function semesterTermRank(term: string): number {
  if (term === "1") return 1;
  if (term === "2") return 2;
  return 99;
}

function semesterRankForView(semester?: string): number {
  if (!semester || semester === "unknown") return 99;
  const [grade, term] = semester.split("-").map(Number);
  return grade * 10 + term;
}

function formatModuleProgressLabel(label: string, trackName: string): string {
  return label.replace(`${trackName} · `, "");
}

function printResultReport() {
  window.print();
}

function getEnrollmentLabel(enrollmentType: EnrollmentType): string {
  return enrollmentOptions.find((option) => option.id === enrollmentType)?.label ?? "주전공";
}

function loadGuideDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(GUIDE_STORAGE_KEY) === "dismissed";
}

function saveGuideDismissed(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(GUIDE_STORAGE_KEY, "dismissed");
}

export default App;
