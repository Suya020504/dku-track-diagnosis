import { Fragment, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileText,
  FlaskConical,
  HelpCircle,
  Instagram,
  Mail,
  PlayCircle,
  Printer,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { courses, CURRICULUM_YEAR, modules, tracks } from "./data/curriculumData";
import {
  calculateDiagnosis,
  calculateTrackRecommendations,
  getCoursesByModule,
  getModuleLabel,
  getTracks,
  isRequiredCourseApplicable,
  isModuleInAnyTrack,
} from "./lib/diagnosis";
import { emptyState, loadSavedState, saveState } from "./lib/storage";
import type {
  Course,
  DiagnosisResult,
  EnrollmentType,
  ModuleId,
  ModuleProgress,
  PlanningSemester,
  SavedDiagnosisState,
  Track,
  TrackDiagnosisResult,
  TrackId,
  TrackRecommendation,
  TrackRecommendationStatus,
} from "./types";

type ViewId = "overview" | "resources" | "modules" | "diagnosis" | "lab" | "experiment" | "result" | "contact";
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

const viewItems: Array<{ id: ViewId; label: string; icon: typeof FileText }> = [
  { id: "overview", label: "설명", icon: FileText },
  { id: "diagnosis", label: "자가진단", icon: ClipboardCheck },
  { id: "result", label: "결과", icon: BookOpenCheck },
  { id: "lab", label: "트랙 추천", icon: Compass },
  { id: "resources", label: "도구&정보", icon: PlayCircle },
  { id: "experiment", label: "실험실", icon: FlaskConical },
  { id: "contact", label: "문의사항", icon: Mail },
];

const GUIDE_STORAGE_KEY = "track-sim:guide:v1";

const guideSteps: GuideStep[] = [
  {
    title: "1. 설명 탭에서 트랙제를 먼저 이해합니다",
    body: "설명 탭은 모듈형 트랙제가 무엇인지, 왜 운영되는지, 어떤 장점이 있는지 한눈에 확인하는 시작 화면입니다.",
    items: ["트랙제의 의미와 구성 방식", "학과전공과 융합전공의 차이", "이수 사실이 증명서에 표시되는 의미"],
    action: "설명 보기",
    viewId: "overview",
  },
  {
    title: "2. 자가진단 탭에서 내 정보를 입력합니다",
    body: "자가진단 탭은 이수유형, 관심 트랙, 이미 수강했거나 이수 예정인 과목을 입력하는 핵심 화면입니다.",
    items: ["주전공·복수전공·부전공 선택", "관심 트랙 복수 선택", "학년·학기별 전공 이수 표에서 과목 체크"],
    action: "자가진단 열기",
    viewId: "diagnosis",
  },
  {
    title: "3. 결과 탭에서 부족한 부분을 확인합니다",
    body: "결과 탭은 선택한 트랙별로 진행률, 부족 모듈, 필수 누락, 남은 과목을 구분해서 보여줍니다.",
    items: ["전체 진행률과 남은 과목 수", "트랙별 충족·부족 상태", "어느 모듈에서 몇 과목이 더 필요한지 확인"],
    action: "결과 보기",
    viewId: "result",
  },
  {
    title: "4. 트랙 추천 탭에서 가능한 트랙을 비교합니다",
    body: "트랙 추천 탭은 지금까지 체크한 과목을 기준으로 달성 가능성이 높은 트랙과 남은 학기 안에서 가능한 정도를 보여줍니다.",
    items: ["현재 수강 이력 기준 가까운 트랙", "정규학기 안에 가능한지 여부", "여러 트랙에 함께 도움 되는 공통 과목"],
    action: "트랙 추천 보기",
    viewId: "lab",
  },
  {
    title: "5. 도구&정보 탭에서 공식 자료를 확인합니다",
    body: "도구&정보 탭은 학과 홈페이지, 학과 유튜브, 트랙제 안내 영상, 트랙별 모듈·과목표를 모아둔 참고 화면입니다.",
    items: ["학과 홈페이지와 유튜브 바로가기", "트랙제 안내 영상", "트랙별 모듈 및 교육과정표"],
    action: "도구&정보 보기",
    viewId: "resources",
  },
  {
    title: "6. 실험실 탭에서 수강신청 전략을 확인합니다",
    body: "실험실 탭은 트랙 추천 결과와 현재 학년·학기를 묶어서, 앞으로 어떤 순서로 과목을 채우면 좋은지 보여주는 전략 화면입니다.",
    items: ["남은 정규학기와 필요 과목 수", "학기당 부담 정도", "다음 수강신청 우선순위와 공통 추천 과목"],
    action: "실험실 열기",
    viewId: "experiment",
  },
  {
    title: "7. 자가진단은 이 순서로 진행합니다",
    body: "정확한 결과를 보려면 아래 순서대로 입력하세요. 체크한 내용은 브라우저에 저장되어 새로고침 후에도 유지됩니다.",
    items: [
      "이수유형을 먼저 선택합니다.",
      "관심 트랙을 하나 이상 선택합니다.",
      "학년·학기별 표에서 수강 완료 또는 이수 예정 과목을 체크합니다.",
      "결과 탭에서 부족 모듈과 남은 과목을 확인합니다.",
      "트랙 추천 탭에서 다른 트랙도 달성 가능한지 비교합니다.",
      "실험실 탭에서 현재 학년 기준 수강신청 전략을 확인합니다.",
    ],
    action: "자가진단 시작하기",
    viewId: "diagnosis",
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

function App() {
  const [savedState, setSavedState] = useState<SavedDiagnosisState>(() => loadSavedState());
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>("all");
  const [lastManualSaveAt, setLastManualSaveAt] = useState("");
  const [labPlanningSemester, setLabPlanningSemester] = useState<LabPlanningSemester>("unselected");
  const [guideOpen, setGuideOpen] = useState(() => !loadGuideDismissed());
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const selectedTracks = useMemo(() => getTracks(savedState.trackIds), [savedState.trackIds]);
  const result = useMemo(
    () =>
      calculateDiagnosis({
        trackIds: savedState.trackIds,
        completedCourseIds: savedState.completedCourseIds,
        enrollmentType: savedState.enrollmentType,
      }),
    [savedState.completedCourseIds, savedState.enrollmentType, savedState.trackIds],
  );
  const labRecommendations = useMemo(
    () =>
      calculateTrackRecommendations({
        completedCourseIds: savedState.completedCourseIds,
        enrollmentType: savedState.enrollmentType,
        currentSemester: labPlanningSemester === "unselected" ? undefined : labPlanningSemester,
      }),
    [labPlanningSemester, savedState.completedCourseIds, savedState.enrollmentType],
  );

  useEffect(() => {
    saveState(savedState);
  }, [savedState]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView]);

  function toggleTrack(trackId: TrackId) {
    setSavedState((current) => {
      const exists = current.trackIds.includes(trackId);
      const nextTrackIds = exists
        ? current.trackIds.filter((id) => id !== trackId)
        : [...current.trackIds, trackId];

      return {
        ...current,
        trackIds: nextTrackIds,
      };
    });
  }

  function toggleCourse(courseId: string) {
    setSavedState((current) => {
      const exists = current.completedCourseIds.includes(courseId);
      return {
        ...current,
        completedCourseIds: exists
          ? current.completedCourseIds.filter((id) => id !== courseId)
          : [...current.completedCourseIds, courseId],
      };
    });
  }

  function changeEnrollmentType(enrollmentType: EnrollmentType) {
    setSavedState((current) => ({
      ...current,
      enrollmentType,
    }));
  }

  function resetState(nextView: ViewId = activeView) {
    setSavedState(emptyState());
    setGradeFilter("all");
    setSemesterFilter("all");
    setLabPlanningSemester("unselected");
    setLastManualSaveAt("");
    setActiveView(nextView);
  }

  function saveCompletedCoursesNow() {
    saveState(savedState);
    setLastManualSaveAt(formatSaveTime(new Date()));
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
    setActiveView(viewId);
  }

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="주요 화면">
        <div className="brand-mark">
          <img className="brand-seal" src="/dku-seal.svg" alt="" aria-hidden="true" />
          <div>
            <strong>단국대학교</strong>
            <span>식품자원경제학과 트랙제</span>
          </div>
        </div>

        <nav className="rail-nav">
          {viewItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? "nav-button active" : "nav-button"}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="guide-open-button" type="button" onClick={openGuide}>
          <HelpCircle aria-hidden="true" size={18} />
          <span>사이트 사용법</span>
        </button>

        <div className="rail-note">
          <span>학생용 비공식 도구</span>
          <strong>단국대 식자경 기준</strong>
        </div>
      </aside>

      <main className="workspace">
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
              selectedTrackIds={savedState.trackIds}
              enrollmentType={savedState.enrollmentType}
              onToggleTrack={toggleTrack}
              onEnrollmentTypeChange={changeEnrollmentType}
              onReset={resetState}
            />
            <section className="primary-panel">
              <ModulesView selectedTrackIds={savedState.trackIds} />
            </section>
          </div>
        )}

        {activeView === "diagnosis" && (
          <div className="view-layout">
            <TrackPicker
              selectedTrackIds={savedState.trackIds}
              enrollmentType={savedState.enrollmentType}
              onToggleTrack={toggleTrack}
              onEnrollmentTypeChange={changeEnrollmentType}
              onReset={resetState}
            />
            <div className="content-grid">
              <section className="primary-panel">
                <DiagnosisView
                  completedCourseIds={savedState.completedCourseIds}
                  selectedTrackIds={savedState.trackIds}
                  enrollmentType={savedState.enrollmentType}
                  gradeFilter={gradeFilter}
                  semesterFilter={semesterFilter}
                  onGradeFilterChange={setGradeFilter}
                  onSemesterFilterChange={setSemesterFilter}
                  onToggleCourse={toggleCourse}
                  onSaveCourses={saveCompletedCoursesNow}
                  lastManualSaveAt={lastManualSaveAt}
                />
              </section>

              <DiagnosisPanel
                result={result}
                selectedTrackNames={selectedTracks.map((track) => track.name)}
                enrollmentType={savedState.enrollmentType}
                completedCount={savedState.completedCourseIds.length}
                onShowResult={() => setActiveView("result")}
              />
            </div>
          </div>
        )}

        {activeView === "lab" && (
          <section className="primary-panel full-panel">
            <LabView
              recommendations={labRecommendations}
              completedCourseIds={savedState.completedCourseIds}
              enrollmentType={savedState.enrollmentType}
              planningSemester={labPlanningSemester}
              onEnrollmentTypeChange={changeEnrollmentType}
              onPlanningSemesterChange={setLabPlanningSemester}
              onReset={() => resetState("lab")}
            />
          </section>
        )}

        {activeView === "experiment" && (
          <section className="primary-panel full-panel">
            <ExperimentView
              recommendations={labRecommendations}
              completedCourseIds={savedState.completedCourseIds}
              planningSemester={labPlanningSemester}
              onPlanningSemesterChange={setLabPlanningSemester}
              onGoToDiagnosis={() => setActiveView("diagnosis")}
            />
          </section>
        )}

        {activeView === "result" && (
          <section className="primary-panel full-panel">
            <ResultDetailView result={result} />
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
      <TrackModuleReference />
      <CurriculumBoard />
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
        {videoResources.map((video) => {
          const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}${video.start ? `?start=${video.start}` : ""}`;
          const watchUrl = `https://www.youtube.com/watch?v=${video.id}${video.start ? `&t=${video.start}s` : ""}`;
          return (
            <article className="video-card" key={video.id}>
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
                <span>
                  <PlayCircle aria-hidden="true" size={16} />
                  YouTube
                </span>
                <h4>{video.title}</h4>
                <p>{video.description}</p>
                <a href={watchUrl} target="_blank" rel="noreferrer">
                  YouTube에서 보기
                  <ExternalLink aria-hidden="true" size={15} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
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

function TrackPicker({
  selectedTrackIds,
  enrollmentType,
  onToggleTrack,
  onEnrollmentTypeChange,
  onReset,
}: {
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  onToggleTrack: (trackId: TrackId) => void;
  onEnrollmentTypeChange: (enrollmentType: EnrollmentType) => void;
  onReset: () => void;
}) {
  return (
    <section className="track-picker" aria-label="트랙 복수 선택">
      <div className="track-picker-copy">
        <strong>트랙 복수 선택</strong>
        <span>
          관심 있는 트랙을 여러 개 선택하면 남은 과목을 통합해서 진단합니다. 모든 선택을 해제한 뒤 다시 고를 수도
          있습니다.
        </span>
      </div>
      <button className="icon-button reset-track-button" type="button" onClick={() => onReset()} title="입력 초기화">
        <RotateCcw aria-hidden="true" size={18} />
        <span>입력 초기화</span>
      </button>
      <div className="study-mode-panel" aria-label="이수 유형 필터">
        <div className="study-mode-head">
          <strong>이수 유형</strong>
          <span>복수전공·부전공은 1학년 필수 과목을 필수 누락에서 제외합니다.</span>
        </div>
        <div className="study-mode-options">
          {enrollmentOptions.map((option) => (
            <label className={enrollmentType === option.id ? "study-mode active" : "study-mode"} key={option.id}>
              <input
                type="radio"
                name="enrollment-type"
                checked={enrollmentType === option.id}
                onChange={() => onEnrollmentTypeChange(option.id)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
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
  gradeFilter,
  semesterFilter,
  onGradeFilterChange,
  onSemesterFilterChange,
  onToggleCourse,
  onSaveCourses,
  lastManualSaveAt,
}: {
  completedCourseIds: string[];
  selectedTrackIds: TrackId[];
  enrollmentType: EnrollmentType;
  gradeFilter: GradeFilter;
  semesterFilter: SemesterFilter;
  onGradeFilterChange: (grade: GradeFilter) => void;
  onSemesterFilterChange: (semester: SemesterFilter) => void;
  onToggleCourse: (courseId: string) => void;
  onSaveCourses: () => void;
  lastManualSaveAt: string;
}) {
  const completedSet = useMemo(() => new Set(completedCourseIds), [completedCourseIds]);

  return (
    <div className="view-stack">
      <SectionHeader
        eyebrow="수강 과목 체크"
        title="이미 수강했거나 이수 예정인 과목을 체크하세요."
        body="필수 과목과 선택한 트랙에 포함된 모듈은 강조됩니다. 학년·학기 필터를 이용해 다음 수강신청 후보를 좁힐 수 있습니다."
      />
      <div className="course-save-panel">
        <div>
          <strong>내 이수 과목 저장</strong>
          <span>
            체크한 과목은 이 브라우저에 저장됩니다. 새로고침 후에도 같은 기기에서는 이어서 확인할 수 있습니다.
          </span>
          <small>{lastManualSaveAt ? `마지막 직접 저장: ${lastManualSaveAt}` : "아직 직접 저장하지 않았습니다."}</small>
        </div>
        <button className="primary-button save-course-button" type="button" onClick={onSaveCourses}>
          <Save aria-hidden="true" size={18} />
          <span>이수 과목 저장</span>
        </button>
      </div>
      <EnrollmentPolicyNotice enrollmentType={enrollmentType} />
      <SemesterCourseTable
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

function LabView({
  recommendations,
  completedCourseIds,
  enrollmentType,
  planningSemester,
  onEnrollmentTypeChange,
  onPlanningSemesterChange,
  onReset,
}: {
  recommendations: TrackRecommendation[];
  completedCourseIds: string[];
  enrollmentType: EnrollmentType;
  planningSemester: LabPlanningSemester;
  onEnrollmentTypeChange: (enrollmentType: EnrollmentType) => void;
  onPlanningSemesterChange: (semester: LabPlanningSemester) => void;
  onReset: () => void;
}) {
  const bestRecommendation = recommendations[0];
  const sharedSuggestions = useMemo(() => getSharedLabSuggestions(recommendations), [recommendations]);

  return (
    <div className="view-stack lab-view">
      <SectionHeader
        eyebrow="트랙 추천"
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
          <div className="study-mode-options">
            {enrollmentOptions.map((option) => (
              <label className={enrollmentType === option.id ? "study-mode active" : "study-mode"} key={option.id}>
                <input
                  type="radio"
                  name="lab-enrollment-type"
                  checked={enrollmentType === option.id}
                  onChange={() => onEnrollmentTypeChange(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
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
              {sharedSuggestions.courses.map((suggestion) => (
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

      <div className="lab-ranking-section">
        <div className="lab-section-head">
          <div>
            <span>추천 순위</span>
            <h3>5개 트랙 달성 가능성 비교</h3>
          </div>
          <p>진행률이 높고, 남은 학점과 부족 모듈이 적은 트랙일수록 위에 배치됩니다.</p>
        </div>
        <div className="lab-ranking-grid">
          {recommendations.map((recommendation) => (
            <LabRecommendationCard recommendation={recommendation} key={recommendation.trackId} />
          ))}
        </div>
      </div>
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
  planningSemester,
  onPlanningSemesterChange,
  onGoToDiagnosis,
}: {
  recommendations: TrackRecommendation[];
  completedCourseIds: string[];
  planningSemester: LabPlanningSemester;
  onPlanningSemesterChange: (semester: LabPlanningSemester) => void;
  onGoToDiagnosis: () => void;
}) {
  const bestRecommendation = recommendations[0];
  const sharedSuggestions = useMemo(() => getSharedLabSuggestions(recommendations), [recommendations]);
  const plan = useMemo(
    () => getExperimentPlan(bestRecommendation, sharedSuggestions.courses, planningSemester, completedCourseIds.length),
    [bestRecommendation, sharedSuggestions.courses, planningSemester, completedCourseIds.length],
  );
  const priorityCourseGroups = groupCoursesByTerm(plan.priorityCourses);

  return (
    <div className="view-stack experiment-view">
      <SectionHeader
        eyebrow="실험실"
        title="현재 학년 기준 수강신청 전략을 확인하세요."
        body="트랙 추천 결과에 본인의 현재 학년·학기를 더해, 남은 정규학기 안에서 어떤 과목을 먼저 챙기면 좋은지 정리합니다."
      />

      <div className="experiment-intro-panel">
        <div className="experiment-intro-copy">
          <span>이 탭의 역할</span>
          <h3>자가진단 결과를 수강신청 계획으로 바꾸는 보조 화면입니다.</h3>
          <p>
            이미 체크한 과목과 트랙 추천 결과를 기준으로 현재 학년·학기에서 남은 정규학기, 필요한 과목 수,
            학기당 부담, 다음 수강신청 우선순위를 계산합니다.
          </p>
        </div>
        <div className="experiment-intro-steps">
          <span>1. 현재 학년 입력</span>
          <span>2. 남은 학기 계산</span>
          <span>3. 우선 과목 추천</span>
        </div>
      </div>

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
                      <strong>
                        {course.code} {course.name}
                      </strong>
                      <span>
                        {getModuleLabel(course.moduleId)} · {formatSemester(course.recommendedSemester)} · {course.credits}학점
                      </span>
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
            <div className="semester-unknown-panel">
              <div className="semester-unknown-head">
                <strong>학기 미정·융합 모듈 과목</strong>
                <span>{unknownCourses.length}개</span>
              </div>
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
            </div>
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

function ResultDetailView({ result }: { result: DiagnosisResult }) {
  const neededCoursePlans = getTrackNeededCoursePlans(result.trackResults);

  if (result.trackResults.length === 0) {
    return (
      <div className="view-stack">
        <SectionHeader
          eyebrow="진단 결과"
          title="진단할 트랙을 먼저 선택하세요."
          body="트랙을 모두 해제한 상태입니다. 자가진단 탭에서 관심 있는 트랙을 하나 이상 선택하면 트랙별 부족 모듈과 추천 과목을 확인할 수 있습니다."
        />
        <div className="empty-state">
          <strong>현재 선택된 트랙 없음</strong>
          <span>트랙/모듈 탭 또는 자가진단 탭에서 트랙을 다시 선택하세요.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="view-stack result-view">
      <SectionHeader
        eyebrow="진단 결과"
        title={result.passed ? "선택한 트랙 조건을 모두 충족했습니다." : "선택한 트랙 중 보완해야 할 조건이 있습니다."}
        body="복수 트랙을 선택한 경우 어느 트랙이 충족됐고 어느 트랙이 부족한지 먼저 구분해서 보여줍니다."
      />
      <div className="result-top-grid">
        <div className="result-top-summary">
          <div className="result-grid">
            <ResultMetric label="전체 진행률" value={`${result.completionRate}%`} />
            <ResultMetric label="남은 과목" value={formatNeededCourseRange(neededCoursePlans)} />
            <ResultMetric label="트랙 인정 학점" value={`${result.trackCredits}학점`} />
            <ResultMetric label="필수 과목" value={`${result.requiredCreditsCompleted}/${result.requiredCreditsTotal}학점`} />
          </div>
          <EnrollmentPolicyNotice enrollmentType={result.enrollmentType} />
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
      <TrackNeededCourseSummary plans={neededCoursePlans} />
      <ModuleProgressBoard trackResults={result.trackResults} />
      <div className="result-support-grid">
        {result.excludedRequiredCourses.length > 0 && (
          <CourseSummaryList
            title="이수유형 기준 필수 제외"
            courses={result.excludedRequiredCourses}
            emptyText="이수유형 때문에 제외된 필수 과목 없음"
            compact
          />
        )}
        <CourseSummaryList
          title="필수 과목 누락"
          courses={result.missingRequiredCourses}
          emptyText="필수 과목 누락 없음"
          compact
          tone="danger"
        />
      </div>
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
    </div>
  );
}

function DiagnosisPanel({
  result,
  selectedTrackNames,
  enrollmentType,
  completedCount,
  onShowResult,
}: {
  result: DiagnosisResult;
  selectedTrackNames: string[];
  enrollmentType: EnrollmentType;
  completedCount: number;
  onShowResult: () => void;
}) {
  const enrollmentLabel = getEnrollmentLabel(enrollmentType);

  if (result.trackResults.length === 0) {
    return (
      <aside className="diagnosis-panel" aria-label="진단 결과 요약">
        <div className="status-head">
          <span>단국대학교 식품자원경제학과 · {enrollmentLabel}</span>
          <h2>트랙을 선택하세요</h2>
          <p>관심 있는 트랙을 하나 이상 선택하면 부족 모듈과 추천 과목이 계산됩니다.</p>
        </div>
        <div className="empty-state compact">
          <strong>선택된 트랙 없음</strong>
          <span>모든 트랙을 해제한 상태입니다.</span>
        </div>
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
        {result.recommendedCourses.slice(0, 5).map((course) => (
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

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
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
