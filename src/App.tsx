import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowRight,
  RotateCcw,
  X,
} from "lucide-react";
import { courses, tracks } from "./data/curriculumData";
import { getAllowedStudyPaths } from "./data/requirementRules2026";
import { OFFICIAL_TRACK_VIDEOS, type OfficialTrackVideoId } from "./data/officialResources";
import { ProfileFlow } from "./features/profile/ProfileFlow";
import { ContactPage } from "./features/contact/ContactPage";
import { GraduationPlanResult } from "./features/planning/GraduationPlanResult";
import { GraduationPlanSetup } from "./features/planning/GraduationPlanSetup";
import { GraduationPlanPrerequisite } from "./features/planning/GraduationPlanPrerequisite";
import type { GraduationPlanPrerequisiteReadiness } from "./features/planning/GraduationPlanPrerequisite";
import { InterestSurvey } from "./features/recommendations/InterestSurvey";
import { TrackRecommendationAxes } from "./features/recommendations/TrackRecommendationAxes";
import { ResultDetailView } from "./features/results/ResultDetailView";
import { PdfMatchReview } from "./features/courses/PdfMatchReview";
import {
  CourseSelectionView,
  type CourseGroupMode,
} from "./features/courses/CourseSelectionView";
import { GuidebookShell, type GuidebookNavItem } from "./features/shell/GuidebookShell";
import {
  TrackServiceLanding,
  type LandingPlannerStatus,
} from "./features/landing/TrackServiceLanding";
import { RESOURCE_SECTION_TITLES, ResourceIndexView } from "./features/resources/ResourceIndexView";
import { TRACK_GUIDE_SECTION_TITLES, TrackGuideView } from "./features/track-guide/TrackGuideView";
import type { MobileJourneyItem } from "./features/shell/MobileJourneyNav";
import type { CompassPathItem } from "./features/journey/CompassPathRibbon";
import {
  calculateDiagnosis,
  getTracks,
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
  type ProfileStage,
  type ResourceSection,
  type ResultSection,
  type TrackGuideSection,
} from "./lib/appRouting";
import {
  resolveDiagnosisStep,
  type DiagnosisStep,
} from "./lib/viewRouting";
import type {
  GraduationPlanPreferences,
  GraduationPlanResult as GraduationPlanResultValue,
  EnrollmentType,
  InterestSurveyAudience,
  InterestSurveyState,
  PlanTerm,
  PathProgressResult,
  PdfImportApproval,
  PdfImportDraft,
  PdfMergeConflict,
  RecommendationAxes,
  SavedAppStateV2,
  StudentProfile,
  Track,
  TrackId,
} from "./types";

type ViewId = "landing" | "resources" | "track-guide" | "diagnosis" | "recommendation" | "plan" | "result" | "contact";
type GradeFilter = "all" | "1" | "2" | "3" | "4" | "unknown";
type SemesterFilter = "all" | "1" | "2" | "unknown";
type GuideStep = {
  title: string;
  body: string;
  items?: string[];
  action: string;
  viewId: ViewId;
};

const guideSteps: GuideStep[] = [
  {
    title: "1. 자가진단에서 학생 유형과 이수 과목을 확인합니다",
    body: "소속과 이수 경로를 정한 뒤 완료·수강 중·계획 과목을 구분합니다. 목표 트랙이 아직 없어도 5개 트랙을 비교할 수 있습니다.",
    items: ["소속과 이수 경로 선택", "목표 트랙은 선택 사항", "현재 진단에는 완료 과목만 반영"],
    action: "자가진단 열기",
    viewId: "diagnosis",
  },
  {
    title: "2. 결과에서 지금 상태를 확인합니다",
    body: "목표가 없으면 5개 트랙의 현재 접근성을 비교하고, 목표를 정했다면 해당 트랙의 남은 과목과 부족 모듈을 확인합니다.",
    items: ["목표 없는 5개 트랙 비교", "선택한 트랙의 충족·부족 상태", "어느 모듈에서 몇 과목이 더 필요한지 확인"],
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

const directSelectionCourses = courses.filter((course) => course.moduleId !== "A");

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

export function resolveExperienceRoute(
  search: string,
  state: SavedAppStateV2,
  context: { hasPdfImportDraft?: boolean } = {},
): AppRoute {
  const route = resolveAppRoute(search, state, context);
  if (
    route.view === "result"
    && state.profile?.studyPath === "track-major"
    && !state.targetTrackId
    && state.courseInputReviewedAt
  ) {
    return { view: "recommendation", step: "axes", axis: "progress" };
  }
  return route;
}

export function routeAfterCourseReview(state: SavedAppStateV2): AppRoute {
  return state.profile?.studyPath === "track-major" && !state.targetTrackId
    ? { view: "recommendation", step: "axes", axis: "progress" }
    : { view: "result", section: "current" };
}

function requestsPdfReview(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("view") === "diagnosis" &&
    params.get("step") === "courses" &&
    params.get("input") === "pdf-review";
}

function emptyInterestSurveyState(audience?: InterestSurveyAudience): InterestSurveyState {
  return { audience, answers: {}, currentIndex: 0 };
}

export function startEntryFlowTransition(
  current: SavedAppStateV2,
  goal: "check-progress" | "find-track",
): { state: SavedAppStateV2; route: AppRoute } {
  const state: SavedAppStateV2 = {
    ...current,
    profileDraft: {
      ...(current.profileDraft ?? current.profile ?? {}),
      goal,
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: "reference-only",
    },
  };
  return {
    state,
    route: goal === "find-track"
      ? {
        view: "recommendation",
        step: "survey",
        ...(current.interestSurvey?.audience ? { audience: current.interestSurvey.audience } : {}),
      }
      : { view: "diagnosis", step: "profile" },
  };
}

export function chooseRecommendedTrackTransition(
  current: SavedAppStateV2,
  trackId: TrackId,
): { state: SavedAppStateV2; route: AppRoute } {
  const context = { ...current.profile, ...current.profileDraft };
  return {
    state: {
      ...current,
      pendingTargetTrackId: trackId,
      profileDraft: {
        ...context,
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
        goal: "check-progress",
        studyPath: "track-major",
      },
    },
    route: context?.affiliation
      ? { view: "diagnosis", step: "profile", profileStage: "path" }
      : { view: "diagnosis", step: "profile", profileStage: "affiliation" },
  };
}

export function chooseInterestTrackTransition(
  current: SavedAppStateV2,
  trackId: TrackId,
): { state: SavedAppStateV2; route: AppRoute } {
  const interestSurvey = current.interestSurvey ?? emptyInterestSurveyState();
  return {
    state: {
      ...current,
      pendingTargetTrackId: trackId,
      profileDraft: {
        ...(current.profileDraft ?? current.profile ?? {}),
        goal: "find-track",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      interestSurvey: { ...interestSurvey, selectedTrackId: trackId },
    },
    route: current.profileDraft?.affiliation || current.profile?.affiliation
      ? { view: "diagnosis", step: "profile", profileStage: "path" }
      : { view: "diagnosis", step: "profile", profileStage: "affiliation" },
  };
}

export function chooseSurveyAudienceTransition(
  current: SavedAppStateV2,
  audience: InterestSurveyAudience,
): { state: SavedAppStateV2; route: AppRoute } {
  const previousDraft = current.profileDraft ?? current.profile;
  const compatibleStudyPath = previousDraft?.studyPath
    && getAllowedStudyPaths(audience).includes(previousDraft.studyPath)
      ? previousDraft.studyPath
      : undefined;
  return {
    state: {
      ...current,
      profileDraft: {
        affiliation: audience,
        goal: "find-track",
        ...(compatibleStudyPath ? { studyPath: compatibleStudyPath } : {}),
        ...(previousDraft?.entryYear ? { entryYear: previousDraft.entryYear } : {}),
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      interestSurvey: current.interestSurvey?.audience === audience
        ? current.interestSurvey
        : emptyInterestSurveyState(audience),
    },
    route: { view: "recommendation", step: "survey", audience },
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

function stableProfileSource(profile: StudentProfile | undefined): string {
  if (!profile) return "undefined";
  const { goal: _goal, ...source } = profile;
  return stablePlanningValue(source);
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
    stableProfileSource(current.profile) !== stableProfileSource(patch.profile);
  const targetChanged = hasPatchField(patch, "targetTrackId") &&
    current.targetTrackId !== patch.targetTrackId;
  const coursesChanged = hasPatchField(patch, "courseSelections") &&
    stablePlanningValue(current.courseSelections) !== stablePlanningValue(patch.courseSelections);
  const creditsChanged = hasPatchField(patch, "additionalMajorCredits") &&
    stablePlanningValue(current.additionalMajorCredits) !== stablePlanningValue(patch.additionalMajorCredits);
  const reviewedCoursesChanged = coursesChanged && reviewedCourseKey(current) !== reviewedCourseKey(next);
  const planSourceChanged = profileChanged || targetChanged || coursesChanged || creditsChanged;
  const reviewedSourceChanged = profileChanged || reviewedCoursesChanged || creditsChanged;

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
  const hasPendingTarget = current.pendingTargetTrackId !== undefined;
  if (hasPendingTarget) profile = { ...profile, ruleApplicability: "reference-only" };
  const trackMajor = profile.studyPath === "track-major";
  const targetTrackId = trackMajor
    ? hasPendingTarget ? current.pendingTargetTrackId ?? undefined : current.targetTrackId ?? (
        profile.goal === "find-track" ? current.interestSurvey?.selectedTrackId : undefined
      )
    : undefined;
  const state: SavedAppStateV2 = {
    ...applyPlanningSourceChange(current, { profile, targetTrackId }),
    profileDraft: undefined,
    pendingTargetTrackId: undefined,
    comparisonTrackIds: trackMajor ? current.comparisonTrackIds.filter((id) => id !== targetTrackId) : [],
  };
  const step = resolveDiagnosisStep("?view=diagnosis&step=courses", state);
  const hasChosenDirection = trackMajor
    ? Boolean(state.targetTrackId)
    : Boolean(state.interestSurvey?.selectedTrackId);
  const route: AppRoute = profile.goal === "find-track" && !hasChosenDirection
    ? { view: "recommendation", step: "survey", audience: profile.affiliation }
    : profile.goal === "plan-graduation"
      && Boolean(state.courseInputReviewedAt)
      && (!trackMajor || Boolean(state.targetTrackId))
      ? { view: "plan", step: "setup" }
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
    const route = resolveExperienceRoute(window.location.search, savedState);
    if (route.view === "diagnosis") return route.step;
    if (route.view === "result") return "result";
    return resolveDiagnosisStep("?view=diagnosis&step=profile", savedState);
  });
  const [activeView, setActiveView] = useState<ViewId>(() =>
    viewForRoute(resolveExperienceRoute(window.location.search, savedState)),
  );
  const [resultSection, setResultSection] = useState<ResultSection>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "result" ? route.section ?? "current" : "current";
  });
  const [resourceSection, setResourceSection] = useState<ResourceSection>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "resources" ? route.section ?? "tracks" : "tracks";
  });
  const [trackGuideSection, setTrackGuideSection] = useState<TrackGuideSection>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "track-guide" ? route.section ?? "overview" : "overview";
  });
  const [trackGuideVideoId, setTrackGuideVideoId] = useState<OfficialTrackVideoId>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "track-guide" && route.videoId
      ? route.videoId
      : OFFICIAL_TRACK_VIDEOS[0].id;
  });
  const [profileStage, setProfileStage] = useState<ProfileStage>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "diagnosis" && route.step === "profile"
      ? route.profileStage ?? "affiliation"
      : "affiliation";
  });
  const [recommendationStep, setRecommendationStep] = useState<"survey" | "axes">(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "recommendation" ? route.step : "survey";
  });
  const [recommendationAxis, setRecommendationAxis] = useState<"interest" | "progress" | "plan" | undefined>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "recommendation" ? route.axis : undefined;
  });
  const [recommendationAudience, setRecommendationAudience] = useState<InterestSurveyAudience | undefined>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "recommendation" && route.step === "survey"
      ? route.audience
      : undefined;
  });
  const [planStep, setPlanStep] = useState<"setup" | "schedule" | "checks">(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "plan" ? route.step : "setup";
  });
  const [planDraft, setPlanDraft] = useState<Partial<GraduationPlanPreferences>>(
    () => savedState.graduationPlanPreferences ?? {},
  );
  const [planSaveStatus, setPlanSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const selectedTrackIds = useMemo(() => getSelectedTrackIds(savedState), [savedState]);
  const [trackSetupOpen, setTrackSetupOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>("all");
  const [courseGroupMode, setCourseGroupMode] = useState<CourseGroupMode>("semester");
  const [courseQuery, setCourseQuery] = useState("");
  const [focusCourseSearchOnReturn, setFocusCourseSearchOnReturn] = useState(false);
  const [lastManualSaveAt, setLastManualSaveAt] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const guideInvokerRef = useRef<HTMLButtonElement | null>(null);
  const restoreGuideFocusRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const diagnosisResultActionRef = useRef<HTMLButtonElement>(null);
  const courseSearchInputRef = useRef<HTMLInputElement>(null);
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
  const interestCompletedAt = savedState.interestSurvey?.completedAt;
  useEffect(() => {
    function syncFromLocation() {
      const requestedPdfReview = requestsPdfReview(window.location.search);
      const next = resolveExperienceRoute(window.location.search, savedState, {
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
    const focusEntryHeading = activeView === "landing"
      || activeView === "diagnosis"
      || activeView === "result"
      || activeView === "recommendation"
      || activeView === "track-guide"
      || activeView === "contact";
    if (!focusEntryHeading) return;
    stepHeadingRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [
    activeView,
    diagnosisStep,
    profileStage,
    recommendationStep,
    recommendationAxis,
    recommendationAudience,
    interestCompletedAt,
    resultSection,
    trackGuideSection,
  ]);

  useEffect(() => {
    if (guideOpen || !restoreGuideFocusRef.current) return;
    restoreGuideFocusRef.current = false;
    guideInvokerRef.current?.focus();
  }, [guideOpen]);

  useEffect(() => {
    if (activeView === "diagnosis" && diagnosisStep === "courses" && !pdfInputRoute) {
      stepHeadingRef.current?.focus();
    }
  }, [activeView, diagnosisStep, pdfInputRoute]);

  useEffect(() => {
    if (
      activeView !== "diagnosis"
      || diagnosisStep !== "courses"
      || pdfInputRoute !== "pdf-review"
      || !pdfImportDraft
    ) return;
    stepHeadingRef.current?.focus();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView, diagnosisStep, pdfImportDraft, pdfInputRoute]);

  useEffect(() => {
    if (!focusCourseSearchOnReturn || activeView !== "diagnosis" || pdfInputRoute) return;
    courseSearchInputRef.current?.focus();
    courseSearchInputRef.current?.scrollIntoView?.({ behavior: "auto", block: "center" });
    setFocusCourseSearchOnReturn(false);
  }, [activeView, focusCourseSearchOnReturn, pdfInputRoute]);

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
    const nextView = viewForRoute(route);
    setActiveView(nextView);
    if (nextView === "landing") setGuideOpen(false);
    setPdfInputRoute(route.view === "diagnosis" ? route.input : undefined);
    if (route.view === "diagnosis") {
      setDiagnosisStep(route.step);
      if (route.step === "profile") setProfileStage(route.profileStage ?? "affiliation");
    }
    if (route.view === "result") {
      setDiagnosisStep("result");
      setResultSection(route.section ?? "current");
    }
    if (route.view === "resources") setResourceSection(route.section ?? "tracks");
    if (route.view === "track-guide") {
      setTrackGuideSection(route.section ?? "overview");
      setTrackGuideVideoId(route.videoId ?? OFFICIAL_TRACK_VIDEOS[0].id);
    }
    if (route.view === "recommendation") {
      setRecommendationStep(route.step);
      setRecommendationAxis(route.axis);
      setRecommendationAudience(route.step === "survey" ? route.audience : undefined);
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
      ? { view: "result", section: "current" }
      : step === "profile"
        ? { view: "diagnosis", step, profileStage: "affiliation" }
        : { view: "diagnosis", step });
  }

  function navigateProfileStage(stage: ProfileStage) {
    navigateAppRoute({ view: "diagnosis", step: "profile", profileStage: stage });
  }

  function navigateResourceSection(section: ResourceSection) {
    navigateAppRoute({ view: "resources", section });
  }

  function navigateTrackGuideSection(section: TrackGuideSection) {
    if (section === trackGuideSection) return;
    navigateAppRoute({ view: "track-guide", section });
  }

  function navigateTrackGuideVideo(videoId: OfficialTrackVideoId) {
    if (videoId === trackGuideVideoId) return;
    navigateAppRoute({ view: "track-guide", section: "videos", videoId });
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

  function returnToDirectCourseSearch() {
    setFocusCourseSearchOnReturn(true);
    returnToDirectCourseInput("push", false);
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
    setCourseGroupMode("semester");
    setCourseQuery("");
    setFocusCourseSearchOnReturn(false);
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
    const next = reviewCourseInputTransition(savedState, new Date().toISOString());
    setStorageError(!saveAppState(next, appStorage));
    setSavedState(next);
    navigateAppRoute(routeAfterCourseReview(next));
  }

  function editProfile() {
    navigateDiagnosisStep("profile");
  }

  function openGuide(invoker: HTMLButtonElement) {
    guideInvokerRef.current = invoker;
    restoreGuideFocusRef.current = false;
    setGuideStepIndex(0);
    setGuideOpen(true);
  }

  function dismissGuide(restoreFocus: boolean) {
    restoreGuideFocusRef.current = restoreFocus;
    setGuideOpen(false);
  }

  function closeGuide() {
    dismissGuide(true);
  }

  function moveGuideStep(nextIndex: number) {
    setGuideStepIndex(Math.min(Math.max(nextIndex, 0), guideSteps.length - 1));
  }

  function goToGuideStepView(viewId: ViewId) {
    dismissGuide(false);
    if (viewId === "diagnosis") {
      navigateDiagnosisStep(resolveDiagnosisStep("?view=diagnosis&step=courses", savedState));
      return;
    }
    if (viewId === "result") {
      if (savedState.profile && savedState.courseInputReviewedAt) {
        navigateAppRoute(routeAfterCourseReview(savedState));
      } else {
        navigateDiagnosisStep(resolveDiagnosisStep("?view=result&step=result", savedState));
      }
      return;
    }
    if (viewId === "recommendation") {
      navigateAppRoute({ view: "recommendation", step: "axes" });
      return;
    }
    navigateAppRoute({ view: viewId as "resources" | "contact" });
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

  function chooseSurveyAudience(audience: InterestSurveyAudience) {
    const transition = chooseSurveyAudienceTransition(savedState, audience);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    navigateAppRoute(transition.route);
  }

  function chooseInterestTrack(trackId: TrackId) {
    const transition = chooseInterestTrackTransition(savedState, trackId);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    navigateAppRoute(transition.route);
  }

  function chooseRecommendedTrack(trackId: TrackId) {
    const transition = chooseRecommendedTrackTransition(savedState, trackId);
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
      pendingTargetTrackId: undefined,
    };
    setStorageError(!saveAppState(nextState, appStorage));
    setSavedState(nextState);
    navigateAppRoute({
      view: "diagnosis",
      step: resolveDiagnosisStep("?view=diagnosis&step=courses", nextState),
    });
  }

  function openPlanningTargetSelection() {
    const profileDraft: Partial<StudentProfile> = {
      ...((savedState.pendingTargetTrackId !== undefined ? savedState.profileDraft : savedState.profile)
        ?? savedState.profileDraft ?? {}),
      goal: "plan-graduation",
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: savedState.pendingTargetTrackId !== undefined
        ? "reference-only" : savedState.profile?.ruleApplicability ?? "reference-only",
    };
    const nextState = { ...savedState, profileDraft };
    setStorageError(!saveAppState(nextState, appStorage));
    setSavedState(nextState);
    navigateAppRoute({ view: "diagnosis", step: "profile", profileStage: "path" });
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

  const shellRoute: AppRoute = activeView === "landing"
    ? { view: "landing" }
    : activeView === "recommendation"
      ? recommendationStep === "survey"
        ? { view: "recommendation", step: recommendationStep, audience: recommendationAudience }
        : { view: "recommendation", step: recommendationStep, axis: recommendationAxis }
      : activeView === "plan"
        ? { view: "plan", step: planStep }
        : activeView === "diagnosis"
          ? {
              view: "diagnosis",
              step: diagnosisStep,
              ...(diagnosisStep === "profile" ? { profileStage } : {}),
              ...(diagnosisStep === "courses" && pdfInputRoute ? { input: pdfInputRoute } : {}),
            }
          : activeView === "result"
            ? { view: "result", section: resultSection }
            : activeView === "resources"
              ? { view: "resources", section: resourceSection }
              : activeView === "track-guide"
                ? {
                    view: "track-guide",
                    section: trackGuideSection,
                    ...(trackGuideSection === "videos" ? { videoId: trackGuideVideoId } : {}),
                  }
              : { view: activeView };
  const courseResultReady = Boolean(savedState.profile && savedState.courseInputReviewedAt);
  const exactPathReady = Boolean(courseResultReady && pathProgress);
  const targetTrackReady = savedState.profile?.studyPath !== "track-major" || Boolean(savedState.targetTrackId);
  const planReady = exactPathReady && targetTrackReady;
  const planNavAvailable = courseResultReady || activeView === "plan";
  const guideActiveId = activeView === "landing"
    ? "start"
    : activeView === "recommendation"
      ? recommendationStep === "survey" ? "diagnosis" : "result"
      : activeView === "diagnosis"
        ? "diagnosis"
        : activeView === "result"
          ? "result"
          : activeView === "plan"
            ? "plan"
            : activeView === "track-guide"
              ? "tracks"
              : activeView === "contact"
                ? ""
                : "resources";
  const utilityActiveId = activeView === "contact" ? activeView : undefined;
  const mobileActiveId = utilityActiveId ?? guideActiveId;
  const currentLabel = activeView === "recommendation"
    ? recommendationStep === "survey" ? "관심 트랙 추천" : "트랙 비교"
    : activeView === "track-guide"
      ? "트랙 가이드"
    : activeView === "contact"
      ? "문의사항"
      : guideActiveId === "start"
        ? "홈"
        : guideActiveId === "tracks"
          ? "트랙 탐색"
          : guideActiveId === "diagnosis"
            ? "자가진단"
            : guideActiveId === "result"
              ? "결과"
              : guideActiveId === "plan"
                ? "학기 플래너 · 선택"
                : "도구 & 정보";
  useEffect(() => {
    const baseTitle = "단국대 식품자원경제학과 트랙제 자가진단";
    const pageTitle = activeView === "track-guide"
      ? TRACK_GUIDE_SECTION_TITLES[trackGuideSection]
      : activeView === "resources"
        ? RESOURCE_SECTION_TITLES[resourceSection]
      : activeView === "landing"
        ? undefined
        : currentLabel;
    document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle;
  }, [activeView, currentLabel, resourceSection, trackGuideSection]);
  const goToDiagnosis = () => navigateDiagnosisStep(
    resolveDiagnosisStep("?view=diagnosis&step=courses", savedState),
  );
  const goToResult = () => navigateAppRoute(
    courseResultReady
      ? routeAfterCourseReview(savedState)
      : { view: "diagnosis", step: resolveDiagnosisStep("?view=result&step=result", savedState) },
  );
  const guideItems: GuidebookNavItem[] = [
    { id: "start", index: "01", label: "홈", available: true, onSelect: () => navigateAppRoute({ view: "landing" }) },
    { id: "tracks", index: "02", label: "트랙 가이드", available: true, onSelect: () => navigateAppRoute({ view: "track-guide", section: "overview" }) },
    { id: "diagnosis", index: "03", label: "나의 진단", available: true, onSelect: goToDiagnosis },
    {
      id: "result",
      index: "04",
      label: "진단 결과",
      available: courseResultReady,
      unavailableReason: "프로필과 이수 과목을 먼저 확인해 주세요.",
      onSelect: goToResult,
    },
    {
      id: "plan",
      index: "05",
      label: "학기 플래너 · 선택",
      available: planNavAvailable,
      unavailableReason: "결과 확인과 목표 트랙 선택 후 열려요.",
      onSelect: () => navigateAppRoute({ view: "plan", step: "setup" }),
    },
    { id: "resources", index: "06", label: "도구 & 정보", available: true, onSelect: () => navigateAppRoute({ view: "resources", section: "official" }) },
  ];
  const mobilePrimaryItems: MobileJourneyItem[] = [
    { id: "start", label: "홈", available: true, onSelect: () => navigateAppRoute({ view: "landing" }) },
    { id: "diagnosis", label: "진단", available: true, onSelect: goToDiagnosis },
    { id: "result", label: "결과", available: courseResultReady, unavailableReason: "진단 후 열려요.", onSelect: goToResult },
    { id: "plan", label: "계획", available: planNavAvailable, unavailableReason: "결과 확인 후 열려요.", onSelect: () => navigateAppRoute({ view: "plan", step: "setup" }) },
  ];
  const mobileMoreItems: MobileJourneyItem[] = [
    { id: "tracks", label: "트랙 가이드", available: true, onSelect: () => navigateAppRoute({ view: "track-guide", section: "overview" }) },
    { id: "resources", label: "자료", available: true, onSelect: () => navigateAppRoute({ view: "resources", section: "tracks" }) },
    { id: "contact", label: "문의", available: true, onSelect: () => navigateAppRoute({ view: "contact" }) },
  ];
  const utilityItems: MobileJourneyItem[] = [
    { id: "contact", label: "문의사항", available: true, onSelect: () => navigateAppRoute({ view: "contact" }) },
  ];
  const isProgressComparison = activeView === "recommendation"
    && recommendationStep === "axes" && recommendationAxis === "progress" && courseResultReady;
  const inDiagnosisFlow = activeView === "diagnosis" || activeView === "result" || isProgressComparison;
  const viewingResult = activeView === "result" || isProgressComparison;
  const journeyItems: CompassPathItem[] = inDiagnosisFlow ? [
    {
      id: "profile", label: "이수 유형", available: true,
      completed: Boolean(savedState.profile),
      state: activeView === "diagnosis" && diagnosisStep === "profile"
        ? "current" : savedState.profile ? "complete" : "pending",
      onSelect: editProfile,
    },
    {
      id: "courses", label: "이수 과목", available: Boolean(savedState.profile),
      completed: courseResultReady,
      state: activeView === "diagnosis" && diagnosisStep === "courses"
        ? "current" : courseResultReady ? "complete" : "next",
      unavailableReason: "이수 유형을 먼저 선택해 주세요.",
      onSelect: goToDiagnosis,
    },
    {
      id: "result", label: "진단 결과", available: courseResultReady,
      completed: false,
      state: viewingResult ? "current" : "next",
      unavailableReason: "과목 선택 후 ‘진단 결과 확인’을 눌러 주세요.",
      onSelect: goToResult,
    },
  ] : [];

  const hasSavedPlan = Boolean(savedState.graduationPlan);
  const hasStartedLanding = Boolean(
    savedState.profile
    || savedState.profileDraft?.goal
    || savedState.interestSurvey
    || savedState.targetTrackId
    || savedState.courseInputReviewedAt,
  );
  const landingPlannerStatus: LandingPlannerStatus = hasSavedPlan
    ? "saved-plan"
    : planReady
      ? "ready"
      : savedState.courseInputReviewedAt && !targetTrackReady
        ? "needs-track"
        : hasStartedLanding
          ? savedState.profile ? "needs-courses" : "needs-profile"
          : "empty";
  const landingPlannerAction = landingPlannerStatus === "saved-plan"
    ? () => navigateAppRoute({ view: "plan", step: "schedule" })
    : landingPlannerStatus === "ready"
      ? () => navigateAppRoute({ view: "plan", step: "setup" })
      : landingPlannerStatus === "needs-track"
        ? openPlanningTargetSelection
        : landingPlannerStatus === "needs-profile" || landingPlannerStatus === "needs-courses"
          ? goToDiagnosis
          : undefined;
  function renderGuidebook(
    content: ReactNode,
    renderedJourneyItems: readonly CompassPathItem[] = journeyItems,
  ) {
    return (
      <GuidebookShell
        serviceView={isProgressComparison ? "result" : shellRoute.view}
        activeId={guideActiveId}
        mobileActiveId={mobileActiveId}
        currentLabel={currentLabel}
        guideItems={guideItems}
        mobilePrimaryItems={mobilePrimaryItems}
        mobileMoreItems={mobileMoreItems}
        utilityItems={utilityItems}
        utilityActiveId={utilityActiveId}
        journeyItems={renderedJourneyItems}
        saveState={storageError ? "error" : "saved"}
        onOpenHelp={openGuide}
        modalOpen={guideOpen}
        modal={guideOpen ? (
          <GuideDialog
            activeStepIndex={guideStepIndex}
            onClose={closeGuide}
            onMoveStep={moveGuideStep}
            onGoToView={goToGuideStepView}
          />
        ) : undefined}
      >
        {content}
      </GuidebookShell>
    );
  }

  if (activeView === "landing") {
    return renderGuidebook(
      <TrackServiceLanding
        headingRef={stepHeadingRef}
        tracks={tracks}
        plannerStatus={landingPlannerStatus}
        resultReady={courseResultReady}
        onStartSimulation={() => startEntryFlow("check-progress")}
        onOpenGuide={() => navigateAppRoute({ view: "track-guide", section: "overview" })}
        onOpenRecommendation={() => startEntryFlow("find-track")}
        onPlannerAction={landingPlannerAction}
      />,
      [],
    );
  }

  if (activeView === "track-guide") {
    return renderGuidebook(
      <main className="planner-track-guide-main">
        <TrackGuideView
          section={trackGuideSection}
          headingRef={stepHeadingRef}
          onSectionChange={navigateTrackGuideSection}
          onStartInterestSurvey={() => startEntryFlow("find-track")}
          onStartDiagnosis={() => startEntryFlow("check-progress")}
          videoId={trackGuideVideoId}
          onVideoChange={navigateTrackGuideVideo}
        />
      </main>,
      [],
    );
  }

  if (activeView === "recommendation") {
    return renderGuidebook(
      <div className="recommendation-page-shell">
        <nav className="recommendation-page-nav no-print" aria-label="트랙 추천 화면">
          <button
            className="planner-focusable"
            type="button"
            aria-current={recommendationStep === "survey" ? "page" : undefined}
            onClick={() => startEntryFlow("find-track")}
          >
            관심 설문
          </button>
          <button
            className="planner-focusable"
            type="button"
            aria-current={recommendationStep === "axes" ? "page" : undefined}
            onClick={() => navigateAppRoute({ view: "recommendation", step: "axes" })}
          >
            기준별 비교
          </button>
        </nav>
        {recommendationStep === "survey" ? (
          <InterestSurvey
            value={recommendationAudience && savedState.interestSurvey?.audience === recommendationAudience
              ? savedState.interestSurvey!
              : emptyInterestSurveyState(recommendationAudience)}
            storageError={storageError}
            headingRef={stepHeadingRef}
            onChange={changeInterestSurvey}
            onAudienceChange={chooseSurveyAudience}
            onChooseTrack={chooseInterestTrack}
            onSkipToDiagnosis={() => startEntryFlow("check-progress")}
          />
        ) : (
          <TrackRecommendationAxes
            axes={recommendationAxes}
            courseInputReady={Boolean(savedState.profile && savedState.courseInputReviewedAt)}
            storageError={storageError}
            activeAxis={recommendationAxis ?? "interest"}
            headingRef={stepHeadingRef}
            onAxisChange={(axis) => navigateAppRoute({ view: "recommendation", step: "axes", axis })}
            onOpenInterestSurvey={() => startEntryFlow("find-track")}
            onOpenCourseInput={openCourseInputFromAxes}
            onChooseTrack={chooseRecommendedTrack}
            onOpenGraduationPlan={() => navigateAppRoute({ view: "plan", step: "setup" })}
          />
        )}
      </div>,
      journeyItems,
    );
  }

  if (activeView === "plan") {
    const hasProfile = Boolean(savedState.profile);
    const courseInputReady = Boolean(savedState.profile && savedState.courseInputReviewedAt);
    const targetReadiness: GraduationPlanPrerequisiteReadiness["target"] = !savedState.profile
      ? "pending"
      : savedState.profile.studyPath !== "track-major"
        ? "not-applicable"
        : savedState.targetTrackId
          ? "ready"
          : "pending";
    const prerequisiteReadiness: GraduationPlanPrerequisiteReadiness = {
      profile: hasProfile ? "ready" : "pending",
      courses: courseInputReady ? "ready" : "pending",
      target: targetReadiness,
    };
    const prerequisitesReady = prerequisiteReadiness.profile === "ready"
      && prerequisiteReadiness.courses === "ready"
      && prerequisiteReadiness.target !== "pending";
    if (!prerequisitesReady) {
      return renderGuidebook(
        <GraduationPlanPrerequisite
          readiness={prerequisiteReadiness}
          headingRef={planHeadingRef}
          onRecover={prerequisiteReadiness.target === "pending" && courseInputReady
            ? openPlanningTargetSelection
            : openCourseInputFromAxes}
        />,
        journeyItems,
      );
    }

    const planAlreadySaved = Boolean(savedState.graduationPlan && savedState.snapshots.some(
      (snapshot) => snapshot.graduationPlan?.generatedAt === savedState.graduationPlan?.generatedAt,
    ));
    return renderGuidebook(
      <div className="dku-plan-shell">
        <div className="dku-plan-topbar">
          <button
            className="text-button"
            type="button"
            onClick={() => navigateAppRoute({ view: "recommendation", step: "axes", axis: "plan" })}
          >
            계획 기준 트랙 비교 열기
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
          <main className="dku-plan-page dku-plan-setup" aria-labelledby="graduation-plan-setup-title">
            <header className="dku-plan-heading">
              <span className="dku-plan-eyebrow">선택 도구 · 졸업 계획 조건</span>
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
            onShowSchedule={() => navigateAppRoute({ view: "plan", step: "schedule" })}
            onShowChecks={() => navigateAppRoute({ view: "plan", step: "checks" })}
            onSave={saveGraduationPlanSnapshot}
            saveDisabled={planAlreadySaved}
          />
        )}
      </div>,
      journeyItems,
    );
  }

  if (activeView === "diagnosis" && (diagnosisStep === "profile" || !savedState.profile)) {
    return renderGuidebook(
      <main className="profile-step-shell">
        {storageError && (
          <p className="storage-error" role="alert">
            이 브라우저에 변경 내용을 저장하지 못했습니다. 탭을 닫기 전에 입력 내용을 확인해 주세요.
          </p>
        )}
        <ProfileFlow
          profile={savedState.profile}
          initialDraft={savedState.profileDraft}
          targetTrackId={savedState.pendingTargetTrackId !== undefined
            ? savedState.pendingTargetTrackId ?? undefined : savedState.targetTrackId}
          profileStage={profileStage}
          headingRef={stepHeadingRef}
          onTargetTrackChange={(targetTrackId) => persist((current) => ({
            ...current,
            pendingTargetTrackId: targetTrackId ?? null,
          }))}
          onChange={updateProfileDraft}
          onComplete={completeProfile}
          onProfileStageChange={navigateProfileStage}
        />
      </main>,
      [],
    );
  }

  if (activeView === "contact") {
    return renderGuidebook(
      <main className="planner-contact-main">
        <ContactPage headingRef={stepHeadingRef} updates={updateHistory} />
      </main>,
      [],
    );
  }

  if (activeView === "resources") {
    return renderGuidebook(
      <main className="planner-resources-main">
        <ResourceIndexView
          section={resourceSection}
          onSectionChange={navigateResourceSection}
        />
      </main>,
      [],
    );
  }

  return renderGuidebook(
    <div className={pdfInputRoute === "pdf-review" ? "app-shell service-shell" : "dku-service-frame"}>
      {storageError && (
        <p className="storage-error service-storage-error" role="alert">
          이 브라우저에 변경 내용을 저장하지 못했습니다. 탭을 닫기 전에 입력 내용을 확인해 주세요.
        </p>
      )}

      <main className={pdfInputRoute === "pdf-review" ? "workspace service-workspace" : "dku-service-workspace"}>
        {activeView === "diagnosis" && pdfInputRoute === "pdf-review" && pdfImportDraft && (
          <section className="primary-panel full-panel pdf-review-panel-shell">
            <PdfMatchReview
              draft={pdfImportDraft}
              conflicts={pdfMergeConflicts}
              saveError={pdfReviewSaveError}
              existingSelectionCount={savedState.courseSelections.length}
              headingRef={stepHeadingRef}
              onApprove={approvePdfMatches}
              onBack={() => returnToDirectCourseInput("push", false)}
              onCancel={() => returnToDirectCourseInput("replace", true)}
              onSearchCourse={returnToDirectCourseSearch}
            />
          </section>
        )}

        {activeView === "diagnosis" && pdfInputRoute !== "pdf-review" && (
          <div className="dku-courses-layout">
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
            <div className="dku-courses-content">
              <section className="dku-courses-surface">
                {pdfImportRecoveryNotice && (
                  <p className="pdf-import-recovery-notice" role="status">
                    개인정보 보호를 위해 PDF 검수 내용은 새로고침 후 저장하지 않았어요. 직접 선택은 그대로 유지됩니다.
                  </p>
                )}
                <CourseSelectionView
                  courses={directSelectionCourses}
                  courseSelections={savedState.courseSelections}
                  selectedTrackIds={selectedTrackIds}
                  enrollmentType={enrollmentType}
                  headingRef={stepHeadingRef}
                  resultActionRef={diagnosisResultActionRef}
                  searchInputRef={courseSearchInputRef}
                  mode={courseGroupMode}
                  gradeFilter={gradeFilter}
                  semesterFilter={semesterFilter}
                  query={courseQuery}
                  onModeChange={setCourseGroupMode}
                  onGradeFilterChange={setGradeFilter}
                  onSemesterFilterChange={setSemesterFilter}
                  onQueryChange={setCourseQuery}
                  onToggleCourse={toggleCourse}
                  onSaveCourses={saveCompletedCoursesNow}
                  onShowResult={confirmCourseInput}
                  onPdfAnalyzed={openPdfMatchReview}
                  lastManualSaveAt={lastManualSaveAt}
                />
              </section>
            </div>
          </div>
        )}

        {activeView === "result" && savedState.profile && pathProgress && (
          <section className="dku-result-surface">
            <ResultDetailView
              result={result}
              profile={savedState.profile}
              pathProgress={pathProgress}
              section={resultSection}
              headingRef={stepHeadingRef}
              onSectionChange={(section) => navigateAppRoute({ view: "result", section })}
              onOpenRecommendations={() => navigateAppRoute({ view: "recommendation", step: "axes" })}
              onGoToPlan={() => navigateAppRoute({ view: "plan", step: "setup" })}
              onPrint={printResultReport}
            />
          </section>
        )}

      </main>
    </div>,
    journeyItems,
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
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    headingRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )];
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;

      if (
        event.shiftKey
        && (
          document.activeElement === headingRef.current
          || document.activeElement === first
          || !dialog.contains(document.activeElement)
        )
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="guide-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-dialog-title"
      >
        <div className="guide-dialog-top">
          <div>
            <span>처음 사용하는 학생을 위한 안내</span>
            <h2 id="guide-dialog-title" ref={headingRef} tabIndex={-1}>사이트 사용방법</h2>
          </div>
          <button className="guide-close-button" type="button" aria-label="사용법 닫기" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <nav className="guide-stepper" aria-label="사용 단계">
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
        </nav>

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
          onClick={onContinue}
        >
          {selectedTrackIds.length > 0 ? "선택한 트랙으로 과목 보기" : "트랙 없이 5개 비교"}
          <ArrowRight aria-hidden="true" size={17} />
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
    <section className="dku-courses-profile-summary" aria-label="선택한 이수 유형과 트랙">
      <div>
        <span>1단계 입력 완료</span>
        <strong>
          {getEnrollmentLabel(enrollmentType)} · {selectedTrackNames.length > 0
            ? `${selectedTrackNames.length}개 트랙`
            : "5개 트랙 비교 모드"}
        </strong>
        <p>{selectedTrackNames.join(" · ") || "선택한 트랙 없음 · 현재 이수 과목으로 비교"}</p>
      </div>
      <button className="icon-button" type="button" onClick={onEdit}>선택 수정</button>
    </section>
  );
}



function formatSaveTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

function getTrackQuickMeta(track: Track): string {
  if (track.rule.type === "major") {
    return "5개 모듈 · 각 모듈 6학점";
  }

  return "학과+융합 모듈 · 총 30학점";
}

function printResultReport() {
  window.print();
}

function getEnrollmentLabel(enrollmentType: EnrollmentType): string {
  return enrollmentOptions.find((option) => option.id === enrollmentType)?.label ?? "주전공";
}

export default App;
