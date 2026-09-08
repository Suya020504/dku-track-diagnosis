// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagnosisSnapshot } from "../../types";
import { SavedRecordsView } from "./SavedRecordsView";
import { calculateTrackCompletion } from "../../lib/trackCompletion";
import { buildTrackSemesterPlan } from "../../lib/trackSemesterPlanner";

function snapshot(overrides: Partial<DiagnosisSnapshot> = {}): DiagnosisSnapshot {
  return {
    id: "record-1", createdAt: "2026-09-08T01:10:00.000Z", ruleVersion: "2026-provided-final-plan",
    profile: { goal: "check-progress", affiliation: "external-student", studyPath: "minor", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
    courseSelections: [{ courseId: "b-1", status: "completed" }, { courseId: "b-2", status: "in-progress" }, { courseId: "c-1", status: "planned", plannedTerm: "following" }],
    additionalMajorCredits: [], comparisonTrackIds: [],
    result: { requiredProgress: "not-applicable", trackProgress: "not-applicable", totalMajorProgress: { completedCredits: 17, requiredCredits: 21, missingCredits: 4 }, status: "incomplete", reviewItems: [] },
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

let root: Root | undefined;
let props: ComponentProps<typeof SavedRecordsView>;
async function mount(overrides: Partial<ComponentProps<typeof SavedRecordsView>> = {}) {
  props = { snapshots: [], onOpenRecord: vi.fn(), onBackToList: vi.fn(), onOpenCurrent: vi.fn(), onPrint: vi.fn(), ...overrides };
  root = createRoot(document.querySelector("#root")!);
  await act(async () => root!.render(<SavedRecordsView {...props} />));
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.restoreAllMocks(); });

describe("SavedRecordsView", () => {
  it("keeps a multi-track plan and frozen module results readable without changing current data", async () => {
    const selectedTrackIds=["food-marketing","agri-food-distribution"] as const;
    const plan=buildTrackSemesterPlan({selectedTrackIds,courseSelections:[],preferences:{currentTerm:"2026-2",targetGraduationTerm:"2029-2",maxMajorCoursesPerTerm:4,considerSeasonalTerm:false},generatedAt:"2026-09-09T01:00:00Z"});
    const record=deepFreeze(snapshot({targetTrackId:selectedTrackIds[0],comparisonTrackIds:[selectedTrackIds[1]],trackPlan:plan,trackCompletion:calculateTrackCompletion({selectedTrackIds,courseSelections:[]}).completed}));
    const before=JSON.stringify(record); await mount({snapshots:[record],recordId:record.id});
    expect(document.body.textContent).toContain("푸드마케팅 · 농식품유통");
    expect(document.body.textContent).toContain("함께 저장한 트랙 공동 계획");
    expect(document.body.textContent).toContain("저장 당시 트랙 모듈 현황");
    expect(JSON.stringify(record)).toBe(before);
  });
  it("does not show a hypothetical academic target for an unconfirmed legacy track profile", async () => {
    const record=snapshot({profile:{goal:"check-progress",affiliation:"external-student",studyPath:"track-major",curriculumRuleVersion:"2026-provided-final-plan",ruleApplicability:"reference-only"},result:{requiredProgress:"not-applicable",trackProgress:"not-applicable",totalMajorProgress:{completedCredits:3,requiredCredits:63,missingCredits:60},status:"incomplete",reviewItems:[]}});
    await mount({snapshots:[record],recordId:record.id});
    expect(document.body.textContent).not.toContain("3 / 63학점");
    expect(document.body.textContent).toContain("전체 전공학점 기준은 표시하지 않아요");
  });
  it("explains an empty archive without claiming automatic input has been lost", async () => {
    await mount();
    expect(document.body.textContent).toContain("아직 따로 보관한 기록이 없어요");
    expect(document.body.textContent).toContain("과목 입력은 자동으로 저장");
    expect(document.body.textContent).toContain("최근 12개 기록을 이 브라우저에 보관합니다");
    expect(document.body.textContent).toContain("다른 기기와 동기화되지 않으며");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector('[data-record-print]')).toBeNull();
    await act(async () => document.querySelector<HTMLButtonElement>('[data-record-current]')!.click());
    expect(props.onOpenCurrent).toHaveBeenCalledOnce();
  });

  it("lists a single archive without silently opening it or replacing current input", async () => {
    await mount({ snapshots: [snapshot()] });
    expect(document.querySelectorAll("[data-record-item]")).toHaveLength(1);
    expect(document.body.textContent).toContain("기록을 선택해 주세요");
    expect(document.querySelector("[data-record-detail]")).toBeNull();
    expect(props.onOpenRecord).not.toHaveBeenCalled();
  });

  it("does not describe unreadable storage as an empty or missing archive", async () => {
    await mount({ saveUnavailable: true, recordId: "unreadable-record" });
    expect(document.body.textContent).toContain("저장 기록을 불러올 수 없어요");
    expect(document.body.textContent).toContain("브라우저 저장이 차단되어 있을 수 있습니다");
    expect(document.body.textContent).not.toContain("아직 따로 보관한 기록이 없어요");
    expect(document.body.textContent).not.toContain("이 기록을 찾을 수 없어요");
    await act(async () => document.querySelector<HTMLButtonElement>('[data-record-current]')!.click());
    expect(props.onOpenCurrent).toHaveBeenCalledOnce();
  });

  it("sorts all 12 real records newest first without mutating the source array", async () => {
    const snapshots = deepFreeze(Array.from({ length: 12 }, (_, index) => snapshot({ id: `r-${index}`, createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T01:00:00Z` })));
    const before = JSON.stringify(snapshots);
    await mount({ snapshots });
    expect([...document.querySelectorAll("[data-record-item]")].map((node) => node.getAttribute("data-record-item"))).toEqual(Array.from({ length: 12 }, (_, index) => `r-${11 - index}`));
    expect(document.body.textContent).toContain("12개");
    expect(JSON.stringify(snapshots)).toBe(before);
  });

  it("opens the exact clicked record via the route callback", async () => {
    await mount({ snapshots: [snapshot({ id: "archive-id" })] });
    await act(async () => document.querySelector<HTMLButtonElement>('[data-record-item="archive-id"]')!.click());
    expect(props.onOpenRecord).toHaveBeenCalledWith("archive-id");
    expect(props.onOpenCurrent).not.toHaveBeenCalled();
  });

  it("distinguishes records saved in the same minute with stored credits, status counts and exact seconds", async () => {
    const first = snapshot({ id: "same-minute-1", createdAt: "2026-09-08T01:10:12Z" });
    const second = snapshot({ id: "same-minute-2", createdAt: "2026-09-08T01:10:48Z", courseSelections: [{ courseId: "b-1", status: "completed" }, { courseId: "b-2", status: "completed" }], result: { ...first.result, totalMajorProgress: { completedCredits: 19, requiredCredits: 21, missingCredits: 2 } } });
    const records = deepFreeze([first, second]);
    await mount({ snapshots: records });
    const firstRow = document.querySelector('[data-record-item="same-minute-1"]')!;
    const secondRow = document.querySelector('[data-record-item="same-minute-2"]')!;
    expect(firstRow.textContent).toContain("완료 1과목 · 전공 17학점");
    expect(firstRow.textContent).toContain("수강 중 1과목 · 계획 1과목");
    expect(secondRow.textContent).toContain("완료 2과목 · 전공 19학점");
    expect(secondRow.textContent).not.toContain("수강 중 0");
    expect(firstRow.querySelector("time")?.textContent).toContain("10:10:12");
    expect(secondRow.querySelector("time")?.textContent).toContain("10:10:48");
  });

  it("restores the selected record ID, stored credit result and each course status", async () => {
    await mount({ snapshots: [snapshot()], recordId: "record-1" });
    expect(document.querySelector('[data-record-item="record-1"]')?.getAttribute("aria-current")).toBe("page");
    expect(document.querySelector('[data-record-status="completed"]')?.textContent).toContain("1과목");
    expect(document.querySelector('[data-record-status="in-progress"]')?.textContent).toContain("1과목");
    expect(document.querySelector('[data-record-status="planned"]')?.textContent).toContain("1과목");
    expect(document.querySelector("[data-record-total]")?.textContent).toContain("17 / 21학점");
    expect(document.querySelector("[data-record-detail]")?.textContent).toContain("타 학과 학생");
    expect(document.querySelector("[data-record-detail]")?.textContent).toContain("목표 트랙미선택");
  });

  it("renders non-applicable requirements as not applicable, never zero percent", async () => {
    await mount({ snapshots: [snapshot()], recordId: "record-1" });
    expect(document.querySelector('[data-record-required]')?.textContent).toContain("별도 필수 조건 없음");
    expect(document.querySelector('[data-record-track]')?.textContent).toContain("트랙 조건 적용 없음");
    expect(document.querySelector('[data-record-detail]')?.textContent).not.toContain("0%");
  });

  it("uses a stored track name and module values rather than recalculating current rules", async () => {
    const result = snapshot().result;
    result.requiredProgress = { completedCredits: 7, requiredCredits: 18, missingCredits: 11, completedCourseIds: ["b-2"], missingCourseIds: ["historic-id"] };
    result.trackProgress = { trackId: "food-marketing", trackName: "저장 당시 트랙 이름", trackKind: "학과전공", enrollmentType: "primary", passed: false, trackCredits: 13, missingRequiredCourses: [], excludedRequiredCourses: [], moduleProgress: [{ moduleId: "F", label: "저장 모듈", requiredCredits: 6, completedCredits: 2, missingCredits: 4, courseIds: ["f-1"] }], recommendedCourses: [], remainingCourses: [], completionRate: 43 };
    const record = deepFreeze(snapshot({ targetTrackId: "food-marketing", result }));
    await mount({ snapshots: [record], recordId: record.id });
    expect(document.querySelector("[data-record-detail]")?.textContent).toContain("저장 당시 트랙 이름");
    expect(document.querySelector('[data-record-required]')?.textContent).toContain("7 / 18학점");
    expect(document.querySelector('[data-record-track]')?.textContent).toContain("43%");
    expect(document.body.textContent).toContain("2 / 6학점");
    expect(document.body.textContent).toContain("historic-id");
  });

  it("retains unknown course identifiers visibly and distinguishes additional credit verification", async () => {
    await mount({ snapshots: [snapshot({ courseSelections: [{ courseId: "old-course", status: "completed" }], additionalMajorCredits: [{ id: "extra-1", label: "학과 세미나", credits: 2, status: "student-entered", note: "학과에 확인하기" }, { id: "extra-2", label: "인정 과목", credits: 3, status: "officially-verified" }] })], recordId: "record-1" });
    expect(document.body.textContent).toContain("old-course");
    expect(document.body.textContent).toContain("과목명 확인 필요");
    expect(document.body.textContent).toContain("학생 입력");
    expect(document.body.textContent).toContain("공식 확인으로 저장됨");
    expect(document.body.textContent).toContain("학과에 확인하기");
  });

  it("keeps all saved plan facts mounted, including extra terms and unnamed credit reservations", async () => {
    const record = snapshot({ graduationPlan: { status: "extra-term-possible", preferences: { currentTerm: "2026-2", targetGraduationTerm: "2027-2", maxMajorCoursesPerTerm: 4, considerSeasonalTerm: false }, placements: [{ termId: "2026-2", courseId: "b-2", origin: "user-planned", offeringEvidence: "historical-2026-snapshot" }], extraTermPlacements: [{ termId: "2028-1", courseId: "c-1", origin: "generated", offeringEvidence: "unknown" }], unplacedCourses: [{ courseId: "missing-id", reason: "offering-unknown", message: "개설 시기를 확인해 주세요." }], electiveAllocations: [{ termId: "2027-1", slots: 2, credits: 6 }], unallocatedElectiveCredits: 9, unallocatedElectiveSlots: 3, unplacedElectiveCredits: 3, unplacedElectiveSlots: 1, neededExtraTerms: 1, recommendedMaxMajorCoursesPerTerm: 5, reviewItems: [{ code: "future-offering", message: "저장 당시 개설 확인 사항", evidence: "official-review-required" }], generatedAt: "2026-09-08T01:00:00Z" } });
    await mount({ snapshots: [deepFreeze(record)], recordId: record.id });
    expect(document.querySelector('[data-record-term="2026-2"]')?.textContent).toContain("통계학기초");
    expect(document.querySelector('[data-record-extra-term="2028-1"]')?.textContent).toContain("추가 검토 학기");
    expect(document.querySelector('[data-record-term="2027-1"]')?.textContent).toContain("6학점 · 2자리");
    expect(document.body.textContent).toContain("과목을 정해야 할 학점9학점 · 3자리");
    expect(document.body.textContent).toContain("배치하지 못한 학점3학점 · 1자리");
    expect(document.body.textContent).toContain("missing-id");
    expect(document.body.textContent).toContain("저장 당시 개설 확인 사항");
    expect(document.querySelectorAll('[data-record-disclosure-content]')).not.toHaveLength(0);
  });

  it("recovers a missing ID without showing a different record as if it matched", async () => {
    await mount({ snapshots: [snapshot()], recordId: "missing" });
    expect(document.body.textContent).toContain("이 기록을 찾을 수 없어요");
    expect(document.querySelector("[data-record-detail]")).toBeNull();
    await act(async () => document.querySelector<HTMLButtonElement>('[data-record-back]')!.click());
    expect(props.onBackToList).toHaveBeenCalledOnce();
  });

  it("offers the exact print/current/list callbacks without deleting or restoring data", async () => {
    const snapshots = deepFreeze([snapshot()]);
    const before = JSON.stringify(snapshots);
    await mount({ snapshots, recordId: "record-1" });
    for (const selector of ["[data-record-print]", "[data-record-current]", "[data-record-back]"]) {
      await act(async () => document.querySelector<HTMLButtonElement>(selector)!.click());
    }
    expect(props.onPrint).toHaveBeenCalledOnce();
    expect(props.onOpenCurrent).toHaveBeenCalledOnce();
    expect(props.onBackToList).toHaveBeenCalledOnce();
    expect(JSON.stringify(snapshots)).toBe(before);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    await act(async () => document.querySelector<HTMLButtonElement>("[data-record-back-top]")!.click());
    expect(props.onBackToList).toHaveBeenCalledTimes(2);
  });

  it("keeps the saved rule identifier without assigning a later PDF to older records", async () => {
    await mount({ snapshots: [snapshot()], recordId: "record-1" });
    expect(document.body.textContent).toContain("2026-provided-final-plan");
    expect(document.body.textContent).toContain("원문 파일 정보가 포함되어 있지 않습니다");
    expect(document.querySelector('a[href*="2026-ere-module-track-curriculum.pdf"]')).toBeNull();
  });

  it("opens and closes supplementary facts without removing them from print markup", async () => {
    await mount({ snapshots: [snapshot()], recordId: "record-1" });
    const button = document.querySelector<HTMLButtonElement>('[data-record-disclosure]')!;
    const body = document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(body.textContent).toContain("경제원론");
    await act(async () => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    await act(async () => button.click());
    expect(body.textContent).toContain("경제원론");
  });

  it("defines print rules that reveal collapsed archive facts and omit navigation", () => {
    const css = readFileSync("src/features/records/saved-records.css", "utf8");
    expect(css).toContain("@media print");
    expect(css).toMatch(/\.saved-records__disclosure-content\[data-collapsed="true"\][\s\S]*?display:\s*block\s*!important/);
    expect(css).toMatch(/\.saved-records__list[\s\S]*?display:\s*none\s*!important/);
  });
});
