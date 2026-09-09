import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ArrowRight,
  Archive,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Compass,
  GraduationCap,
  House,
  LibraryBig,
  MessagesSquare,
  RotateCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { courses, tracks } from "./data/curriculumData";
import { getAllowedStudyPaths } from "./data/requirementRules2026";
import { OFFICIAL_TRACK_VIDEOS, type OfficialTrackVideoId } from "./data/officialResources";
import { ProfileFlow } from "./features/profile/ProfileFlow";
import { TrackSelectionStep } from "./features/profile/TrackSelectionStep";
import { TrackCompletionResults } from "./features/results/TrackCompletionResults";
import { TrackHistoryComparison } from "./features/recommendations/TrackHistoryComparison";
import { TrackModulePlanner } from "./features/planning/TrackModulePlanner";
import { ExampleExperience } from "./features/journey/ExampleExperience";
import { getMajorContext } from "./lib/majorContext";
import { calculateTrackCompletion } from "./lib/trackCompletion";
import { buildTrackPlanInputSignature, isTrackSemesterPlan, type TrackSemesterPlan } from "./lib/trackSemesterPlanner";
import { ContactPage } from "./features/contact/ContactPage";
import { SavedRecordsView } from "./features/records/SavedRecordsView";
import { AdditionalCreditsInput } from "./features/courses/AdditionalCreditsInput";
import { updateCourseSelection } from "./lib/courseSelectionEditing";
import { getCourseInputPolicy } from "./lib/courseInputPolicy";
import { archiveCurrentDiagnosis } from "./lib/diagnosisArchive";
import { acquireBrowserStorage } from "./lib/browserStorage";
import { rememberFirstVisitGuide, shouldOfferFirstVisitGuide } from "./lib/firstVisitGuide";
import "./features/journey/first-visit-guide.css";
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
  buildAppHref,
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
  CourseSelectionStatus,
  EntryIntent,
} from "./types";

type ViewId = "landing" | "example" | "resources" | "track-guide" | "diagnosis" | "recommendation" | "plan" | "result" | "contact" | "records";
const navigationIcons: Record<string, LucideIcon> = { start: House, tracks: Compass, diagnosis: ClipboardCheck, result: ChartNoAxesCombined, plan: CalendarDays, resources: LibraryBig, records: Archive, contact: MessagesSquare };
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
    title: "1. 내 정보와 시작 방법을 확인해요",
    body: "소속과 전공 정보를 한 번 확인한 뒤 나에게 맞는 방법으로 시작해요.",
    items: ["알고 있는 트랙 직접 선택", "관심 질문으로 찾기", "들은 과목으로 비교하기"],
    action: "내 정보와 시작 방법 확인",
    viewId: "diagnosis",
  },
  {
    title: "2. 여러 트랙과 남은 수업을 확인해요",
    body: "하나 이상의 트랙을 고르고 들은 과목을 확인해요. 함께 필요한 수업은 중복 없이 보여드려요.",
    items: ["여러 트랙 함께 선택", "트랙별 모듈 이수 현황", "공통 과목을 뺀 남은 수업"],
    action: "트랙과 남은 수업 확인",
    viewId: "result",
  },
  {
    title: "3. 필요할 때 공동 학기 계획을 만들어요",
    body: "선택한 트랙의 남은 수업을 학기별로 나눠 보세요. 학기 계획은 선택 사항이에요.",
    items: ["현재·목표 학기와 수강량 입력", "공통 과목은 한 번만 배치", "실제 개설 여부는 학과 확인"],
    action: "공동 학기 계획 열기",
    viewId: "plan",
  },
  {
    title: "4. 신청 전 공식 자료를 확인해요",
    body: "트랙 신청과 학사 인정 기준은 공식 안내를 확인해 주세요. 자료실에서 필요한 문서와 학과 링크를 찾을 수 있어요.",
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
    description: "교육과정 PDF의 필수 과목을 모두 확인해 아직 이수하지 않은 과목을 계산합니다.",
  },
  {
    id: "double-major",
    label: "복수전공",
    title: "복수전공 기준",
    description: "필수 6과목 18학점을 포함해 전공 42학점을 확인합니다.",
  },
  {
    id: "minor",
    label: "부전공",
    title: "부전공 기준",
    description: "필수 과목 조건 없이 전공 21학점을 확인합니다. 개인별 적용은 학과에서 확인해 주세요.",
  },
];

const trackKindGuides = [
  {
    kind: "학과전공" as const,
    title: "학과전공 트랙",
    description: "식품자원경제학과 전공 모듈을 중심으로 5개 모듈을 깊이 배우는 방식입니다.",
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
    && (state.entryIntent === "completed-courses" || state.profile?.studyPath === "track-major")
    && !state.targetTrackId
    && state.courseInputReviewedAt
  ) {
    return { view: "recommendation", step: "axes", axis: "progress" };
  }
  return route;
}

export function routeAfterCourseReview(state: SavedAppStateV2): AppRoute {
  return state.entryIntent === "completed-courses" || state.profile?.studyPath === "track-major" && !state.targetTrackId
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
    route: { view: "diagnosis", step: "profile", ...(current.profile ? { profileStage: "direction" as const } : {}) },
  };
}

export function startIntentTransition(current: SavedAppStateV2, entryIntent: EntryIntent): { state: SavedAppStateV2; route: AppRoute } {
  const state = { ...current, entryIntent };
  if (!state.profile) return { state, route: { view: "diagnosis", step: "profile", profileStage: state.profileDraft?.affiliation ? "path" : "affiliation" } };
  return { state, route: entryIntent === "known-tracks"
    ? { view: "diagnosis", step: "tracks" }
    : entryIntent === "interest-survey"
      ? { view: "recommendation", step: "survey", audience: state.profile.affiliation }
      : { view: "diagnosis", step: "courses" } };
}

export function confirmSelectedTracksTransition(current: SavedAppStateV2, selectedTrackIds: TrackId[]): { state: SavedAppStateV2; route: AppRoute } {
  const validTrackIds = [...new Set(selectedTrackIds.filter(id => tracks.some(track => track.id === id)))];
  if (!validTrackIds.length) return { state: current, route: { view: "diagnosis", step: "tracks" } };
  const state: SavedAppStateV2 = { ...applyPlanningSourceChange(current, { targetTrackId: validTrackIds[0], comparisonTrackIds: validTrackIds.slice(1) }), pendingSelectedTrackIds: undefined, pendingTargetTrackId: undefined, profileDraft: undefined, entryIntent: "known-tracks" };
  return { state, route: !state.profile ? { view: "diagnosis", step: "profile", profileStage: "affiliation" } : state.courseInputReviewedAt ? current.profileDraft?.goal === "plan-graduation" ? { view: "plan", step: "setup", scope: "academic" } : { view: "result", section: "current" } : { view: "diagnosis", step: "courses" } };
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
      pendingSelectedTrackIds: [...new Set([...(current.pendingSelectedTrackIds ?? getSelectedTrackIds(current)), trackId])],
      entryIntent: "known-tracks",
      profileDraft: {
        ...context,
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
        goal: "check-progress",
      },
    },
    route: current.profile
      ? { view: "diagnosis", step: "tracks" }
      : context?.affiliation
      ? { view: "diagnosis", step: "profile", profileStage: "path" }
      : { view: "diagnosis", step: "profile", profileStage: "affiliation" },
  };
}

export function chooseInterestTrackTransition(
  current: SavedAppStateV2,
  trackId: TrackId,
): { state: SavedAppStateV2; route: AppRoute } {
  const next = chooseRecommendedTrackTransition(current, trackId);
  return { ...next, state: { ...next.state, interestSurvey: { ...(current.interestSurvey ?? emptyInterestSurveyState()), selectedTrackId: trackId } } };
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
      ...(current.interestSurvey?.audience !== audience && (current.pendingSelectedTrackIds !== undefined || current.pendingTargetTrackId !== undefined)
        ? { pendingSelectedTrackIds: [], pendingTargetTrackId: null } : {}),
      profileDraft: {
        affiliation: audience,
        goal: "find-track",
        ...(compatibleStudyPath ? { studyPath: compatibleStudyPath } : {}),
        ...(previousDraft?.entryYear ? { entryYear: previousDraft.entryYear } : {}),
        ...(previousDraft?.affiliation === audience && previousDraft.majorRole ? { majorRole: previousDraft.majorRole } : {}),
        ...(previousDraft?.affiliation === audience && previousDraft.otherMajor ? { otherMajor: previousDraft.otherMajor } : {}),
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
  "profile" | "targetTrackId" | "comparisonTrackIds" | "courseSelections" | "additionalMajorCredits"
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
  const comparisonChanged = hasPatchField(patch, "comparisonTrackIds") &&
    stablePlanningValue(current.comparisonTrackIds) !== stablePlanningValue(patch.comparisonTrackIds);
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
    ...(current.trackPlanning ? { trackPlanning: planSourceChanged || comparisonChanged
      ? { ...current.trackPlanning, draft: current.trackPlanning.draft ?? (current.trackPlanning.result?.preferences ? { version: 1, values: { ...current.trackPlanning.result.preferences } } : undefined), result: undefined } : current.trackPlanning } : {}),
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
  const hasPendingTarget = current.pendingTargetTrackId !== undefined && current.pendingSelectedTrackIds === undefined;
  if (hasPendingTarget) profile = { ...profile, ruleApplicability: "reference-only" };
  const targetTrackId = hasPendingTarget ? current.pendingTargetTrackId ?? undefined : current.targetTrackId ?? (
        profile.goal === "find-track" && current.pendingSelectedTrackIds === undefined ? current.interestSurvey?.selectedTrackId : undefined
      );
  const state: SavedAppStateV2 = {
    ...applyPlanningSourceChange(current, { profile, targetTrackId }),
    profileDraft: undefined,
    pendingTargetTrackId: current.pendingSelectedTrackIds === undefined ? undefined : current.pendingTargetTrackId,
    comparisonTrackIds: current.comparisonTrackIds.filter((id) => id !== targetTrackId),
  };
  const step = resolveDiagnosisStep("?view=diagnosis&step=courses", state);
  const route: AppRoute = current.entryIntent ? startIntentTransition(state, current.entryIntent).route : { view: "diagnosis", step: "profile", profileStage: "direction" };
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
      graduationPlanDraft: undefined,
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
  const [storageAccess] = useState(() => acquireBrowserStorage(storage));
  const appStorage = storageAccess.storage;
  const [savedState, setSavedState] = useState<SavedAppStateV2>(() => loadAppState(appStorage));
  const [storageError, setStorageError] = useState(storageAccess.unavailable);
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
  const [recordId, setRecordId] = useState<string | undefined>(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "records" ? route.recordId : undefined;
  });
  const [archiveNotice, setArchiveNotice] = useState("");
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
  const [planScope, setPlanScope] = useState<"tracks" | "academic">(() => {
    const route = resolveExperienceRoute(window.location.search, savedState);
    return route.view === "plan" && route.scope === "tracks" ? "tracks" : "academic";
  });
  const planDraft = savedState.graduationPlanDraft?.values ?? savedState.graduationPlanPreferences ?? {};
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
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [offerFirstGuide] = useState(() => !storageAccess.unavailable && shouldOfferFirstVisitGuide(savedState, appStorage));
  const firstGuideOfferedRef = useRef(false);
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
      || activeView === "example"
      || activeView === "diagnosis"
      || activeView === "result"
      || activeView === "recommendation"
      || activeView === "track-guide"
      || activeView === "contact"
      || activeView === "records";
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
    recordId,
    trackGuideSection,
  ]);

  useEffect(() => {
    if (guideOpen || !restoreGuideFocusRef.current) return;
    restoreGuideFocusRef.current = false;
    if (guideInvokerRef.current?.isConnected) guideInvokerRef.current.focus();
    else document.querySelector<HTMLButtonElement>('.journey-home-start')?.focus();
  }, [guideOpen]);

  useEffect(() => {
    if (!offerFirstGuide || firstGuideOfferedRef.current || activeView !== "landing" || !shouldOfferFirstVisitGuide(savedState, appStorage)) return;
    firstGuideOfferedRef.current = true;
    setQuickGuideOpen(true);
    setGuideOpen(true);
  }, [activeView, offerFirstGuide, savedState, appStorage]);

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
    setArchiveNotice("");
    if (route.view === "records") setRecordId(route.recordId);
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
    if (route.view === "plan") { setPlanStep(route.step); setPlanScope(route.scope ?? "academic"); }
  }

  function navigateAppRoute(route: AppRoute) {
    if (buildAppHref(window.location.href, route) === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
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
    persist((current) => applyPlanningSourceChange(current, {
      targetTrackId,
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
        ...applyPlanningSourceChange(current, { targetTrackId: nextTrackIds[0], comparisonTrackIds: nextTrackIds.slice(1) }),
        comparisonTrackIds: nextTrackIds.slice(1),
      };
    });
    setPlanSaveStatus("idle");
  }

  function toggleCourse(courseId: string) {
    persist((current) => {
      const exists = current.courseSelections.some(
        (selection) => selection.courseId === courseId,
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

  function changeCourseStatus(courseId: string, status: CourseSelectionStatus | null, plannedTerm?: PlanTerm) {
    persist(current => applyPlanningSourceChange(current, {
      courseSelections: updateCourseSelection(current.courseSelections, courseId, status, plannedTerm),
    }));
    setPlanSaveStatus("idle");
  }

  function resetState(): boolean {
    const next = { ...createEmptyAppState(), snapshots: savedState.snapshots };
    if (!saveAppState(next, appStorage)) {
      setStorageError(true);
      return false;
    }
    setStorageError(false);
    setSavedState(next);
    setGradeFilter("all");
    setSemesterFilter("all");
    setCourseGroupMode("semester");
    setCourseQuery("");
    setFocusCourseSearchOnReturn(false);
    setLastManualSaveAt("");
    setTrackSetupOpen(false);
    setPlanSaveStatus("idle");
    setPdfImportDraft(undefined);
    setPdfMergeConflicts([]);
    setPdfReviewSaveError(false);
    setPdfInputRoute(undefined);
    setPdfImportRecoveryNotice(false);
    navigateDiagnosisStep("profile");
    return true;
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
    firstGuideOfferedRef.current = true;
    setQuickGuideOpen(false);
    guideInvokerRef.current = invoker;
    restoreGuideFocusRef.current = false;
    setGuideStepIndex(0);
    setGuideOpen(true);
  }

  function dismissGuide(restoreFocus: boolean) {
    rememberFirstVisitGuide(appStorage);
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
      startEntryFlow("check-progress");
      return;
    }
    if (viewId === "result") {
      if (!savedState.profile) {
        startIntent("known-tracks");
      } else if (!selectedTrackIds.length) {
        editSelectedTracks();
      } else if (savedState.courseInputReviewedAt) {
        navigateAppRoute({ view: "result", section: "current" });
      } else {
        navigateDiagnosisStep(resolveDiagnosisStep("?view=result&step=result", savedState));
      }
      return;
    }
    if (viewId === "plan") {
      navigateAppRoute({ view: "plan", scope: "tracks", step: "setup" });
      return;
    }
    if (viewId === "resources") {
      navigateAppRoute({ view: "resources", section: "official" });
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

  function startIntent(entryIntent: EntryIntent) {
    const transition = startIntentTransition(savedState, entryIntent);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    navigateAppRoute(transition.route);
  }

  function confirmSelectedTracks(ids: TrackId[]) {
    const transition = confirmSelectedTracksTransition(savedState, ids);
    setStorageError(!saveAppState(transition.state, appStorage));
    setSavedState(transition.state);
    setArchiveNotice("");
    navigateAppRoute(transition.route);
  }

  function editSelectedTracks() {
    navigateAppRoute({ view: "diagnosis", step: savedState.profile ? "tracks" : "profile" });
  }

  function saveTrackPlanSnapshot(plan: TrackSemesterPlan) {
    if (!savedState.profile || !pathProgress || !savedState.courseInputReviewedAt || !isTrackSemesterPlan(plan)) return;
    const signature = buildTrackPlanInputSignature({ selectedTrackIds, courseSelections: savedState.courseSelections, preferences: plan.preferences, manualTerms: savedState.trackPlanning?.manualTerms, generatedAt: plan.generatedAt });
    if (signature !== plan.inputSignature) { setPlanSaveStatus("error"); return; }
    const alreadySaved = savedState.snapshots.some(snapshot => snapshot.trackPlan?.inputSignature === plan.inputSignature && snapshot.trackPlan?.generatedAt === plan.generatedAt);
    if (alreadySaved) { setPlanSaveStatus("saved"); return; }
    const next = appendDiagnosisSnapshot(savedState, structuredClone({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ruleVersion: savedState.profile.curriculumRuleVersion, profile: savedState.profile, courseSelections: savedState.courseSelections, additionalMajorCredits: savedState.additionalMajorCredits, targetTrackId: savedState.targetTrackId, comparisonTrackIds: savedState.comparisonTrackIds, result: pathProgress, trackPlan: plan, trackCompletion: calculateTrackCompletion({ selectedTrackIds, courseSelections: savedState.courseSelections }).completed }));
    const saved = saveAppState(next, appStorage);
    setStorageError(!saved);
    setPlanSaveStatus(saved ? "saved" : "error");
    if (saved) setSavedState(next);
  }

  function saveCurrentDiagnosis() {
    if (!pathProgress || !savedState.courseInputReviewedAt) return;
    const next = archiveCurrentDiagnosis(savedState, pathProgress, crypto.randomUUID(), new Date().toISOString(), calculateTrackCompletion({ selectedTrackIds, courseSelections: savedState.courseSelections }).completed);
    const saved = saveAppState(next, appStorage);
    setStorageError(!saved);
    if (saved) setSavedState(next);
    setArchiveNotice(saved ? next === savedState ? "같은 입력과 결과가 이미 보관되어 있어요." : "현재 진단을 저장 기록에 보관했어요." : "기록을 보관하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
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

  function reviewInterestTracks(trackIds: TrackId[]) {
    const ids = [...new Set(trackIds.filter(id => tracks.some(track => track.id === id)))];
    if (!ids.length) return;
    const transition = chooseRecommendedTrackTransition(savedState, ids[0]);
    const next: SavedAppStateV2 = { ...transition.state, pendingSelectedTrackIds: ids, pendingTargetTrackId: ids[0], interestSurvey: { ...(savedState.interestSurvey ?? emptyInterestSurveyState()), selectedTrackId: ids[0] } };
    setStorageError(!saveAppState(next, appStorage));
    setSavedState(next);
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
    navigateAppRoute({ view: "diagnosis", step: "tracks" });
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
    setPlanSaveStatus("idle");
    savingPlanGeneratedAtRef.current = undefined;
    navigateAppRoute(transition.route);
  }

  function editGraduationPlanInputs() {
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
        ? { view: "plan", step: planStep, scope: planScope }
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
              : activeView === "records" ? { view: "records", recordId } : { view: activeView };
  const courseResultReady = Boolean(savedState.profile && savedState.courseInputReviewedAt);
  const exactPathReady = Boolean(courseResultReady && pathProgress);
  const targetTrackReady = selectedTrackIds.length > 0;
  const planReady = exactPathReady && targetTrackReady;
  const planNavAvailable = courseResultReady || activeView === "plan";
  const guideActiveId = activeView === "landing" || activeView === "example"
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
              : activeView === "contact" || activeView === "records"
                ? ""
                : "resources";
  const utilityActiveId = activeView === "contact" || activeView === "records" ? activeView : undefined;
  const mobileActiveId = utilityActiveId ?? guideActiveId;
  const currentLabel = activeView === "example" ? "예시 결과 체험" : activeView === "recommendation"
    ? recommendationStep === "survey" ? "관심 트랙 추천" : "트랙 비교"
    : activeView === "track-guide"
      ? "트랙 가이드"
    : activeView === "records" ? "저장한 진단과 계획"
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
      onSelect: () => navigateAppRoute({ view: "plan", step: "setup", scope: "tracks" }),
    },
    { id: "resources", index: "06", label: "도구 & 정보", available: true, onSelect: () => navigateAppRoute({ view: "resources", section: "official" }) },
  ].map(item => ({ ...item, icon: navigationIcons[item.id] }));
  const mobilePrimaryItems: MobileJourneyItem[] = [
    { id: "start", label: "홈", available: true, onSelect: () => navigateAppRoute({ view: "landing" }) },
    { id: "diagnosis", label: "진단", available: true, onSelect: goToDiagnosis },
    { id: "result", label: "결과", available: courseResultReady, unavailableReason: "진단 후 열려요.", onSelect: goToResult },
    { id: "plan", label: "계획", available: planNavAvailable, unavailableReason: "결과 확인 후 열려요.", onSelect: () => navigateAppRoute({ view: "plan", step: "setup", scope: "tracks" }) },
  ].map(item => ({ ...item, icon: navigationIcons[item.id] }));
  const mobileMoreItems: MobileJourneyItem[] = [
    { id: "records", label: `저장 기록 ${savedState.snapshots.length}`, available: true, onSelect: () => navigateAppRoute({ view: "records" }) },
    { id: "tracks", label: "트랙 가이드", available: true, onSelect: () => navigateAppRoute({ view: "track-guide", section: "overview" }) },
    { id: "resources", label: "자료", available: true, onSelect: () => navigateAppRoute({ view: "resources", section: "tracks" }) },
    { id: "contact", label: "문의", available: true, onSelect: () => navigateAppRoute({ view: "contact" }) },
  ].map(item => ({ ...item, icon: navigationIcons[item.id] }));
  const utilityItems: MobileJourneyItem[] = [
    { id: "records", label: `저장 기록 ${savedState.snapshots.length}`, available: true, onSelect: () => navigateAppRoute({ view: "records" }) },
    { id: "contact", label: "문의사항", available: true, onSelect: () => navigateAppRoute({ view: "contact" }) },
  ].map(item => ({ ...item, icon: navigationIcons[item.id] }));
  const isProgressComparison = activeView === "recommendation"
    && recommendationStep === "axes" && recommendationAxis === "progress" && courseResultReady;
  const inTrackJourney = activeView === "diagnosis" || activeView === "result"
    || activeView === "recommendation" || activeView === "plan" && planScope === "tracks";
  const currentJourneyStage = activeView === "plan" ? "plan"
    : activeView === "recommendation" || activeView === "diagnosis" && (
      diagnosisStep === "tracks" || diagnosisStep === "profile" && profileStage === "direction" && Boolean(savedState.profile)
    ) ? "tracks"
    : activeView === "result" || activeView === "diagnosis" && diagnosisStep === "courses" ? "courses"
    : "profile";
  const hasJourneyProfile = Boolean(savedState.profile);
  const hasJourneyTracks = selectedTrackIds.length > 0;
  const trackPlanAvailable = currentJourneyStage === "plan" || hasJourneyProfile && hasJourneyTracks && courseResultReady;
  const journeyItems: CompassPathItem[] = inTrackJourney ? [
    {
      id: "profile", label: "내 정보", available: true,
      completed: hasJourneyProfile,
      state: currentJourneyStage === "profile" ? "current" : hasJourneyProfile ? "complete" : "pending",
      onSelect: () => navigateProfileStage(savedState.profileDraft?.affiliation || savedState.profile?.affiliation ? "path" : "affiliation"),
    },
    {
      id: "tracks", label: "트랙 선택", available: hasJourneyProfile || currentJourneyStage === "tracks",
      completed: hasJourneyTracks,
      state: currentJourneyStage === "tracks" ? "current" : hasJourneyTracks ? "complete" : hasJourneyProfile ? "next" : "pending",
      unavailableReason: "내 정보를 먼저 확인해 주세요.",
      onSelect: editSelectedTracks,
    },
    {
      id: "courses", label: "이수 현황", available: hasJourneyProfile,
      completed: courseResultReady,
      state: currentJourneyStage === "courses" ? "current" : courseResultReady ? "complete" : hasJourneyProfile ? "next" : "pending",
      unavailableReason: "내 정보를 확인하면 들은 과목을 입력할 수 있어요.",
      onSelect: () => courseResultReady && hasJourneyTracks
        ? navigateAppRoute({ view: "result", section: "current" }) : navigateDiagnosisStep("courses"),
    },
    {
      id: "plan", label: "학기 계획 · 선택", available: trackPlanAvailable,
      completed: Boolean(savedState.trackPlanning?.result && !savedState.trackPlanning.draft),
      state: currentJourneyStage === "plan" ? "current" : savedState.trackPlanning?.result && !savedState.trackPlanning.draft ? "complete" : trackPlanAvailable ? "next" : "pending",
      unavailableReason: !hasJourneyProfile ? "내 정보와 트랙, 들은 과목을 먼저 확인해 주세요."
        : !hasJourneyTracks && !courseResultReady ? "트랙을 선택하고 들은 과목을 확인하면 계획할 수 있어요."
        : !hasJourneyTracks ? "계획할 트랙을 하나 이상 선택해 주세요." : "들은 과목을 확인한 뒤 계획할 수 있어요.",
      onSelect: () => navigateAppRoute({ view: "plan", scope: "tracks", step: savedState.trackPlanning?.result ? "schedule" : "setup" }),
    },
  ] : [];

  const hasSavedPlan = Boolean(savedState.trackPlanning?.result || savedState.graduationPlan);
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
    ? () => navigateAppRoute(savedState.trackPlanning?.result ? { view: "plan", step: "schedule", scope: "tracks" } : { view: "plan", step: "schedule" })
    : landingPlannerStatus === "ready"
      ? () => navigateAppRoute({ view: "plan", step: "setup", scope: "tracks" })
      : landingPlannerStatus === "needs-track"
        ? () => navigateAppRoute({ view: "recommendation", step: "axes", axis: "progress" })
        : landingPlannerStatus === "needs-profile" || landingPlannerStatus === "needs-courses"
          ? () => {
            if (!savedState.profile) {
              navigateAppRoute({ view: "diagnosis", step: "profile", profileStage: savedState.profileDraft?.affiliation ? "path" : "affiliation" });
            } else if (savedState.entryIntent === "interest-survey" && !savedState.interestSurvey?.selectedTrackId) {
              navigateAppRoute({ view: "recommendation", step: "survey", audience: savedState.profile.affiliation });
            } else if (savedState.entryIntent === "known-tracks" && (savedState.pendingSelectedTrackIds !== undefined || !selectedTrackIds.length)) {
              navigateDiagnosisStep("tracks");
            } else goToDiagnosis();
          }
          : undefined;
  function renderGuidebook(
    content: ReactNode,
    renderedJourneyItems: readonly CompassPathItem[] = journeyItems,
  ) {
    return (
      <GuidebookShell
        serviceView={activeView === "example" ? "landing" : isProgressComparison ? "result" : shellRoute.view}
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
            quickGuide={quickGuideOpen}
            onOpenQuickGuide={() => setQuickGuideOpen(true)}
            onClose={closeGuide}
            onMoveStep={moveGuideStep}
            onGoToView={goToGuideStepView}
            onResetCurrent={() => { const succeeded = resetState(); if (succeeded) dismissGuide(false); return succeeded; }}
          />
        ) : undefined}
      >
        {content}
      </GuidebookShell>
    );
  }

  if (activeView === "records") {
    return renderGuidebook(<SavedRecordsView
      snapshots={savedState.snapshots}
      saveUnavailable={storageError}
      recordId={recordId}
      headingRef={stepHeadingRef}
      onOpenRecord={id => navigateAppRoute({ view: "records", recordId: id })}
      onBackToList={() => navigateAppRoute({ view: "records" })}
      onOpenCurrent={goToDiagnosis}
      onPrint={() => window.print()}
    />, []);
  }

  if (activeView === "example") return renderGuidebook(<ExampleExperience headingRef={stepHeadingRef} onHome={() => navigateAppRoute({view:"landing"})} onStart={() => navigateAppRoute({view:"landing"})}/>, []);

  if (activeView === "landing") {
    return renderGuidebook(
      <TrackServiceLanding
        headingRef={stepHeadingRef}
        saveUnavailable={storageError}
        tracks={tracks}
        plannerStatus={landingPlannerStatus}
        resultReady={courseResultReady}
        onStartSimulation={() => startEntryFlow("check-progress")}
        onOpenGuide={() => navigateAppRoute({ view: "track-guide", section: "overview" })}
        onOpenRecommendation={() => startEntryFlow("find-track")}
        onPlannerAction={landingPlannerAction}
        entryIntent={savedState.entryIntent}
        onEntryIntentChange={entryIntent => persist(current => ({ ...current, entryIntent }))}
        onStartIntent={startIntent}
        onOpenExample={() => navigateAppRoute({ view: "example" })}
        onResumeResult={() => navigateAppRoute(selectedTrackIds.length ? { view: "result", section: "current" } : { view: "recommendation", step: "axes", axis: "progress" })}
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
          onStartInterestSurvey={() => startIntent("interest-survey")}
          onStartDiagnosis={() => startEntryFlow("check-progress")}
          videoId={trackGuideVideoId}
          onVideoChange={navigateTrackGuideVideo}
        />
      </main>,
      [],
    );
  }

  if (activeView === "recommendation") {
    if (recommendationStep === "axes" && recommendationAxis === "progress") return renderGuidebook(<TrackHistoryComparison
      courseSelections={savedState.courseSelections}
      initialPlanPreferences={savedState.trackPlanning?.result?.preferences ?? savedState.graduationPlanPreferences}
      selectedTrackIds={selectedTrackIds}
      pendingSelectedTrackIds={savedState.pendingSelectedTrackIds}
      onPendingChange={pendingSelectedTrackIds => persist(current => ({ ...current, pendingSelectedTrackIds }))}
      onConfirmTracks={confirmSelectedTracks}
      onOpenCourses={openCourseInputFromAxes}
      onOpenInterest={() => startIntent("interest-survey")}
      headingRef={stepHeadingRef}
      storageError={storageError}
    />, journeyItems);
    return renderGuidebook(
      <div className="recommendation-page-shell">
        <nav className="recommendation-page-nav no-print" aria-label="트랙 추천 화면">
          <button
            className="planner-focusable"
            type="button"
            aria-current={recommendationStep === "survey" ? "page" : undefined}
            onClick={() => startIntent("interest-survey")}
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
            pendingSelectedTrackIds={savedState.pendingSelectedTrackIds}
            onPendingTrackIdsChange={pendingSelectedTrackIds => persist(current => ({ ...current, pendingSelectedTrackIds, pendingTargetTrackId: pendingSelectedTrackIds[0] ?? null }))}
            onChooseTracks={reviewInterestTracks}
            onSkipToDiagnosis={() => startIntent("completed-courses")}
          />
        ) : (
          <TrackRecommendationAxes
            axes={recommendationAxes}
            courseInputReady={Boolean(savedState.profile && savedState.courseInputReviewedAt)}
            storageError={storageError}
            activeAxis={recommendationAxis ?? "interest"}
            headingRef={stepHeadingRef}
            onAxisChange={(axis) => navigateAppRoute({ view: "recommendation", step: "axes", axis })}
            onOpenInterestSurvey={() => startIntent("interest-survey")}
            onOpenCourseInput={openCourseInputFromAxes}
            onChooseTrack={chooseRecommendedTrack}
            pendingSelectedTrackIds={savedState.pendingSelectedTrackIds ?? selectedTrackIds}
            onPendingTrackIdsChange={pendingSelectedTrackIds => persist(current => ({ ...current, pendingSelectedTrackIds }))}
            onChooseTracks={confirmSelectedTracks}
            onOpenGraduationPlan={() => navigateAppRoute({ view: "plan", step: "setup", scope: "academic" })}
          />
        )}
      </div>,
      journeyItems,
    );
  }

  if (activeView === "plan") {
    if (planScope === "tracks") {
      if (!savedState.profile || !savedState.courseInputReviewedAt || !selectedTrackIds.length) return renderGuidebook(<main className="dku-plan-page"><header className="dku-plan-heading"><h1 ref={planHeadingRef} tabIndex={-1}>트랙 계획을 준비해요</h1><p>{!savedState.profile ? "내 정보부터 한 번 확인해 주세요." : !selectedTrackIds.length ? "완성할 트랙을 하나 이상 선택해 주세요." : "들은 과목을 확인하면 남은 수업을 계획할 수 있어요."}</p></header><button className="primary-button" type="button" onClick={() => !savedState.profile ? startIntent("known-tracks") : !selectedTrackIds.length ? editSelectedTracks() : navigateDiagnosisStep("courses")}>{!savedState.profile ? "내 정보 확인" : !selectedTrackIds.length ? "트랙 선택" : "들은 과목 확인"}</button></main>, journeyItems);
      return renderGuidebook(<TrackModulePlanner
        selectedTrackIds={selectedTrackIds}
        courseSelections={savedState.courseSelections}
        state={savedState.trackPlanning ?? {}}
        onChangeState={trackPlanning => { persist(current => ({ ...current, trackPlanning })); setPlanSaveStatus("idle"); if (trackPlanning.result) navigateAppRoute({ view: "plan", scope: "tracks", step: "schedule" }); }}
        onSavePlan={saveTrackPlanSnapshot}
        onBackToResult={() => navigateAppRoute({ view: "result", section: "current" })}
        onEditTracks={editSelectedTracks}
        onOpenApplication={() => navigateAppRoute({ view: "track-guide", section: "application" })}
        headingRef={planHeadingRef}
        storageError={storageError}
        saveStatus={planSaveStatus}
      />, journeyItems);
    }
    if (savedState.profile && !getMajorContext(savedState.profile).academicRequirementsConfirmed) return renderGuidebook(<main className="dku-plan-page" aria-labelledby="academic-plan-context-title">
      <header className="dku-plan-heading"><span className="dku-plan-eyebrow">전체 전공학점 참고 계획</span><h1 id="academic-plan-context-title" ref={planHeadingRef} tabIndex={-1}>전체 전공학점 기준을 먼저 확인해 주세요</h1><p>전공 이수 형태가 아직 미정이에요. 학사 기준을 확정한 뒤 전체 전공 계획을 만들 수 있어요. 기존에 저장한 입력과 계획 기록은 그대로 남아 있어요.</p></header>
      <div className="dku-profile-actions"><button type="button" className="primary-button" onClick={() => navigateProfileStage("path")}>내 정보 확인하기</button>{selectedTrackIds.length > 0 && <button type="button" className="secondary-button" data-switch-track-planning onClick={() => navigateAppRoute({ view: "plan", step: "setup", scope: "tracks" })}>선택한 트랙의 모듈 계획으로 가기</button>}</div>
    </main>, journeyItems);
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
      <div className="dku-plan-shell" data-plan-scope="academic">
        <div className="academic-plan-scope-bar">
          <div><GraduationCap size={20} strokeWidth={1.8} aria-hidden="true" /><span>{planStep !== "setup" && <strong>전공 전체 계획</strong>}전공필수와 전체 전공학점 기준을 함께 살펴보는 별도 참고 도구예요.</span></div>
          <button type="button" className="secondary-button" data-open-selected-track-plan onClick={() => navigateAppRoute({ view: "plan", step: "setup", scope: "tracks" })}><BookOpenCheck size={19} strokeWidth={1.8} aria-hidden="true" />선택 트랙 계획으로 이동<ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" /></button>
        </div>
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

        {storageError && planSaveStatus !== "error" && !(planStep === "setup" && savedState.graduationPlanDraft) && (
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
              <h1 id="graduation-plan-setup-title" ref={planHeadingRef} tabIndex={-1}>
                <GraduationCap size={22} strokeWidth={1.8} aria-hidden="true" />전공 전체 계획
              </h1>
              <p>검토한 이수 과목은 그대로 두고 앞으로 배치할 학기와 한 학기 수강량만 입력합니다.</p>
            </header>
            <GraduationPlanSetup
              value={planDraft}
              onChange={(value) => {
                persist(current => ({ ...current, graduationPlanDraft: { version: 1, values: value } }));
                setPlanSaveStatus("idle");
              }}
              onSubmit={submitGraduationPlan}
            />
            {savedState.graduationPlanDraft && (storageError ? (
              <div className="storage-error" role="alert">
                <p>초안을 저장하지 못했어요. 현재 입력은 화면에 남아 있지만 새로고침하면 사라질 수 있어요.</p>
                <button className="secondary-button" type="button" onClick={() => setStorageError(!saveAppState(savedState, appStorage))}>
                  초안 저장 다시 시도
                </button>
              </div>
            ) : <p role="status">작성 중인 조건을 이 브라우저에 저장했어요. 계획 만들기를 누르면 확정 조건에 반영됩니다.</p>)}
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
          entryIntent={savedState.entryIntent}
          onEntryIntentChange={entryIntent => persist(current => ({ ...current, entryIntent }))}
          onStartDirection={startIntent}
        />
      </main>,
      journeyItems,
    );
  }

  if (activeView === "diagnosis" && diagnosisStep === "tracks") return renderGuidebook(<main className="profile-step-shell">
    {storageError && <p role="alert" className="storage-error">선택을 저장하지 못했어요. 새로고침 전에 확인해 주세요.</p>}
    <TrackSelectionStep selectedTrackIds={savedState.pendingSelectedTrackIds ?? (savedState.pendingTargetTrackId !== undefined ? savedState.pendingTargetTrackId ? [savedState.pendingTargetTrackId, ...savedState.comparisonTrackIds.filter(id => id !== savedState.pendingTargetTrackId)] : [] : selectedTrackIds)} onChange={pendingSelectedTrackIds => persist(current => ({ ...current, pendingSelectedTrackIds, pendingTargetTrackId: pendingSelectedTrackIds[0] ?? null }))} onContinue={confirmSelectedTracks} onBack={() => navigateProfileStage("direction")} headingRef={stepHeadingRef} />
  </main>, journeyItems);

  if (activeView === "result" && resultSection === "current" && savedState.profile && selectedTrackIds.length) return renderGuidebook(<TrackCompletionResults
    selectedTrackIds={selectedTrackIds}
    courseSelections={savedState.courseSelections}
    profile={savedState.profile}
    pathProgress={pathProgress}
    headingRef={stepHeadingRef}
    onEditTracks={editSelectedTracks}
    onAddTrack={chooseRecommendedTrack}
    onPlanCourse={courseId => { persist(current => changePlannedCourseTerm(current, courseId, "later")); navigateAppRoute({ view: "plan", scope: "tracks", step: "setup" }); }}
    onOpenPlan={() => navigateAppRoute({ view: "plan", scope: "tracks", step: "setup" })}
    onSaveDiagnosis={saveCurrentDiagnosis}
    onOpenApplication={() => navigateAppRoute({ view: "track-guide", section: "application" })}
    onEditProfile={() => navigateProfileStage("path")}
    onEditCourses={() => navigateDiagnosisStep("courses")}
    onPrint={printResultReport}
    saveStatus={archiveNotice}
  />, journeyItems);

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
                profile={savedState.profile}
                enrollmentType={enrollmentType}
                onToggleTrack={toggleTrack}
                onEditProfile={editProfile}
                onReset={resetState}
                onContinue={() => setTrackSetupOpen(false)}
              />
            ) : (
              <TrackSetupSummary
                selectedTrackNames={selectedTracks.map((track) => track.name)}
                profile={savedState.profile}
                enrollmentType={enrollmentType}
                onEdit={() => setTrackSetupOpen(true)}
              />
            ))}
            <div className="dku-courses-content">
              <section className="dku-courses-surface">
                {pdfImportRecoveryNotice && (
                  <p className="pdf-import-recovery-notice" role="status">
                    개인정보 보호를 위해 PDF에서 확인하던 내용은 새로고침 후 남기지 않아요. 직접 선택한 과목은 그대로 유지됩니다.
                  </p>
                )}
                <CourseSelectionView
                  courses={directSelectionCourses}
                  courseSelections={savedState.courseSelections}
                  selectedTrackIds={selectedTrackIds}
                  enrollmentType={enrollmentType}
                  profile={savedState.profile}
                  targetTrackId={savedState.targetTrackId}
                  additionalCreditsContent={<AdditionalCreditsInput credits={savedState.additionalMajorCredits} onChange={additionalMajorCredits => {
                    persist(current => applyPlanningSourceChange(current, { additionalMajorCredits }));
                    setPlanSaveStatus("idle");
                  }} />}
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
                  onCourseStatusChange={changeCourseStatus}
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
              courseSelections={savedState.courseSelections}
              planStartTerm={savedState.graduationPlanPreferences?.currentTerm}
              onPlannedCourseChange={(courseId, plannedTerm) => {
                persist(current => changePlannedCourseTerm(current, courseId, plannedTerm));
                setPlanSaveStatus("idle");
                setArchiveNotice("");
              }}
              profile={savedState.profile}
              pathProgress={pathProgress}
              section={resultSection}
              headingRef={stepHeadingRef}
              onSectionChange={(section) => navigateAppRoute({ view: "result", section })}
              onOpenRecommendations={() => navigateAppRoute({ view: "recommendation", step: "axes", axis: "progress" })}
              onGoToPlan={() => navigateAppRoute({ view: "plan", step: "setup" })}
              onPrint={printResultReport}
            />
            <div className="diagnosis-archive-actions no-print" aria-label="진단 기록 보관">
              <p>이 결과를 남겨 두고 나중에 다시 확인할 수 있어요. 최근 12개 기록을 이 브라우저에 보관합니다.</p>
              <div>
                <button type="button" className="icon-button" onClick={() => {
                  const next = archiveCurrentDiagnosis(savedState, pathProgress, crypto.randomUUID(), new Date().toISOString());
                  if (!saveAppState(next, appStorage)) {
                    setStorageError(true);
                    setArchiveNotice("기록을 보관하지 못했어요. 브라우저 저장 공간을 확인하거나 결과를 인쇄해 주세요.");
                    return;
                  }
                  setStorageError(false);
                  setSavedState(next);
                  setArchiveNotice(next === savedState ? "같은 입력과 결과가 이미 보관되어 있어요." : "현재 진단을 저장 기록에 보관했어요.");
                }}>이 진단 보관하기</button>
                <button type="button" className="icon-button" onClick={() => navigateAppRoute({ view: "records" })}>저장 기록 보기</button>
              </div>
              {archiveNotice ? <p role="status">{archiveNotice}</p> : null}
            </div>
          </section>
        )}

      </main>
    </div>,
    journeyItems,
  );
}

function GuideDialog({
  activeStepIndex,
  quickGuide,
  onOpenQuickGuide,
  onClose,
  onMoveStep,
  onGoToView,
  onResetCurrent,
}: {
  activeStepIndex: number;
  quickGuide: boolean;
  onOpenQuickGuide: () => void;
  onClose: () => void;
  onMoveStep: (nextIndex: number) => void;
  onGoToView: (viewId: ViewId) => void;
  onResetCurrent: () => boolean;
}) {
  const activeStep = guideSteps[activeStepIndex];
  const isFirst = activeStepIndex === 0;
  const isLast = activeStepIndex === guideSteps.length - 1;
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  const [resetPending, setResetPending] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  onCloseRef.current = onClose;

  useEffect(() => { headingRef.current?.focus(); }, [quickGuide]);

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
        className={quickGuide ? "guide-dialog first-visit-guide" : "guide-dialog"}
        data-first-visit-guide={quickGuide ? true : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-dialog-title"
      >
        <div className="guide-dialog-top">
          <div>
            <span>처음 사용하는 학생을 위한 안내</span>
            <h2 id="guide-dialog-title" ref={headingRef} tabIndex={-1}>{quickGuide ? "들은 과목으로 남은 수업을 찾아요" : "사이트 사용 방법"}</h2>
          </div>
          <button className="guide-close-button" type="button" aria-label="사용법 닫기" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {quickGuide ? <>
          <p className="first-visit-guide__intro">원하는 트랙을 고르고 수강 이력을 입력하면, 앞으로 어떤 과목을 더 들어야 할지 확인할 수 있어요.</p>
          <ol className="first-visit-guide__steps">
            <li><span aria-hidden="true">1</span><div><h3>나에게 맞는 방법으로 시작해요</h3><p>정한 트랙을 선택하세요. 아직 고민 중이라면 관심 설문이나 들은 과목으로 찾아볼 수 있어요.</p></div></li>
            <li><span aria-hidden="true">2</span><div><h3>내 정보와 들은 과목을 알려주세요</h3><p>소속·전공 정보를 확인하고 과목을 체크해요. 수강 중인 과목과 앞으로 들을 과목은 따로 구분해요.</p></div></li>
            <li><span aria-hidden="true">3</span><div><h3>남은 수업을 보고 계획까지 이어가요</h3><p>여러 트랙에 겹치는 과목은 한 번만 세어요. 필요하면 남은 수업을 학기별로 나눠 보관할 수 있어요.</p></div></li>
          </ol>
          <p className="first-visit-guide__note">입력은 이 브라우저에 저장돼요. 사이트에서 트랙을 고르거나 계획을 보관해도 학교에 신청되지는 않아요.</p>
          <div className="first-visit-guide__actions"><button className="icon-button" type="button" data-welcome-skip onClick={onClose}>건너뛰기</button><button className="primary-button" type="button" onClick={onClose}>확인했어요</button></div>
          <p className="first-visit-guide__again">이 안내는 ‘도움말’에서 다시 볼 수 있어요.</p>
        </> : <>
        <button className="icon-button" type="button" data-open-quick-guide onClick={onOpenQuickGuide}>처음 사용 안내 다시 보기</button>
        <nav className="guide-stepper" aria-label="사용 단계">
          {guideSteps.map((step, index) => (
            <button
              className={index === activeStepIndex ? "guide-step active" : "guide-step"}
              type="button"
              key={step.title}
              onClick={() => onMoveStep(index)}
              aria-current={index === activeStepIndex ? "step" : undefined}
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
        <section className="guide-step-card" aria-label="현재 입력 관리">
          <h3>현재 입력 관리</h3>
          <p>처음부터 다시 시작하고 싶다면 현재 입력만 초기화할 수 있어요.</p>
          <button className="icon-button" type="button" data-open-current-reset aria-expanded={resetPending} onClick={() => { setResetPending(true); setResetFailed(false); }}>현재 입력 초기화 안내</button>
          {resetPending && <div className="current-input-reset-confirmation" data-current-reset-confirmation role="group" aria-labelledby="help-reset-title">
            <strong id="help-reset-title">현재 입력을 초기화할까요?</strong>
            <p>내 정보, 선택 트랙, 설문 답변, 입력한 과목과 작성 중인 계획을 지웁니다. 보관한 진단과 계획은 삭제하지 않아요.</p>
            <div className="current-input-reset-actions"><button className="icon-button" type="button" data-cancel-current-reset onClick={() => { setResetPending(false); setResetFailed(false); }}>취소</button><button className="icon-button" type="button" data-confirm-current-reset onClick={() => setResetFailed(!onResetCurrent())}>확인하고 현재 입력 초기화</button></div>
            {resetFailed && <p role="alert">초기화하지 못했어요. 현재 입력과 보관 기록은 그대로 유지했어요. 저장 상태를 확인한 뒤 다시 시도해 주세요.</p>}
          </div>}
        </section>
        </>}
      </section>
    </div>
  );
}

export function EnrollmentProfileSummary({
  enrollmentType,
  profile,
  onEditProfile,
}: {
  enrollmentType: EnrollmentType;
  profile?: StudentProfile;
  onEditProfile: () => void;
}) {
  const context = profile ? getMajorContext(profile) : undefined;
  const selected = profile && context && !context.academicRequirementsConfirmed
    ? { title: context.label, description: "전공 이수 기준은 아직 확정하지 않았어요. 선택한 트랙의 모듈 이수 현황은 확인할 수 있어요." }
    : profile ? getCourseInputPolicy(profile) : enrollmentOptions.find((option) => option.id === enrollmentType) ?? enrollmentOptions[0];
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
  profile,
  onToggleTrack,
  onEditProfile,
  onReset,
  onContinue,
}: {
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  profile?: StudentProfile;
  onToggleTrack: (trackId: TrackId) => void;
  onEditProfile: () => void;
  onReset: () => boolean;
  onContinue?: () => void;
}) {
  const [resetPending, setResetPending] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <section className="track-picker" aria-label="트랙 복수 선택">
      <div className="track-picker-copy">
        <strong>관심 트랙을 선택하세요</strong>
        <span>여러 트랙을 선택하면 겹치는 과목까지 함께 계산합니다.</span>
      </div>
      <button ref={resetButtonRef} className="icon-button reset-track-button" type="button" onClick={() => setResetPending(true)} title="입력 초기화" aria-expanded={resetPending} aria-controls="current-input-reset-confirmation">
        <RotateCcw aria-hidden="true" size={18} />
        <span>입력 초기화</span>
      </button>
      {resetPending && (
        <div id="current-input-reset-confirmation" className="current-input-reset-confirmation" role="group" aria-labelledby="current-input-reset-title">
          <strong id="current-input-reset-title">현재 입력을 초기화할까요?</strong>
          <p>학생 유형, 과목 선택, 관심 답변과 작성 중인 계획이 지워집니다. 보관한 진단과 계획 기록은 유지됩니다.</p>
          <div className="current-input-reset-actions">
            <button className="icon-button" type="button" onClick={() => { setResetPending(false); setResetFailed(false); resetButtonRef.current?.focus(); }}>취소</button>
            <button className="icon-button" type="button" onClick={() => setResetFailed(!onReset())}>현재 입력 초기화</button>
          </div>
          {resetFailed && <p role="alert">초기화하지 못했어요. 현재 입력과 보관 기록은 그대로 두었어요. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.</p>}
        </div>
      )}
      <EnrollmentProfileSummary enrollmentType={enrollmentType} profile={profile} onEditProfile={onEditProfile} />
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
          {selectedTrackIds.length > 0 ? "선택한 트랙으로 과목 보기" : "목표 없이 5개 트랙 비교"}
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      )}
    </section>
  );
}

function TrackSetupSummary({
  selectedTrackNames,
  enrollmentType,
  profile,
  onEdit,
}: {
  selectedTrackNames: string[];
  enrollmentType: EnrollmentType;
  profile?: StudentProfile;
  onEdit: () => void;
}) {
  return (
    <section className="dku-courses-profile-summary" aria-label="선택한 이수 유형과 트랙">
      <div>
        <span>1단계 입력 완료</span>
        <strong>
          {profile ? getCourseInputPolicy(profile).title : getEnrollmentLabel(enrollmentType)} · {selectedTrackNames.length > 0
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
