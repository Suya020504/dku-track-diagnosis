import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGraduationPlan } from "../../lib/graduationPlanner";
import type {
  CourseSelectionRecord,
  GraduationPlanResult as GraduationPlanResultValue,
  StudentProfile,
} from "../../types";
import { GraduationPlanResult } from "./GraduationPlanResult";

const baseResult: GraduationPlanResultValue = {
  status: "regular-plan-possible",
  preferences: {
    currentTerm: "2026-2",
    targetGraduationTerm: "2027-2",
    maxMajorCoursesPerTerm: 2,
    considerSeasonalTerm: false,
  },
  placements: [
    {
      termId: "2027-1",
      courseId: "c-2",
      origin: "generated",
      offeringEvidence: "historical-2026-snapshot",
    },
    {
      termId: "2027-2",
      courseId: "b-2",
      origin: "user-planned",
      offeringEvidence: "historical-2026-snapshot",
    },
  ],
  extraTermPlacements: [],
  unplacedCourses: [{
    courseId: "d-2",
    reason: "capacity-before-target",
    message: "목표 학기 안의 수강 한도를 초과합니다.",
  }],
  electiveAllocations: [
    { termId: "2027-1", slots: 1, credits: 3 },
    { termId: "2027-2", slots: 1, credits: 3 },
  ],
  unallocatedElectiveCredits: 6,
  unallocatedElectiveSlots: 2,
  unplacedElectiveCredits: 0,
  unplacedElectiveSlots: 0,
  neededExtraTerms: 0,
  reviewItems: [
    {
      code: "future-offering",
      message: "이후 학기의 반복 개설을 보장하지 않습니다.",
      evidence: "project-derived",
    },
    {
      code: "elective-placeholder",
      message: "선택 전공 6학점은 익명 슬롯으로 예약했습니다.",
      evidence: "project-derived",
    },
  ],
  generatedAt: "2026-08-30T09:00:00.000Z",
};

const minorProfile: StudentProfile = {
  goal: "plan-graduation",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const completed = (courseIds: string[]): CourseSelectionRecord[] =>
  courseIds.map((courseId) => ({ courseId, status: "completed" }));

function realMinorPlan(
  courseSelections: CourseSelectionRecord[],
  maxMajorCoursesPerTerm: number,
): GraduationPlanResultValue {
  return calculateGraduationPlan({
    profile: minorProfile,
    courseSelections,
    additionalMajorCredits: [],
    preferences: {
      currentTerm: "2026-2",
      targetGraduationTerm: "2027-1",
      maxMajorCoursesPerTerm,
      considerSeasonalTerm: false,
    },
    generatedAt: "2026-08-30T09:00:00.000Z",
  });
}

function displayedElectiveAllocations(markup: string): Array<{ termId: string; credits: number }> {
  return [...markup.matchAll(
    /data-elective-allocation-term="([^"]+)" data-elective-credits="(\d+)"/g,
  )].map((match) => ({ termId: match[1], credits: Number(match[2]) }));
}

function renderResult(
  result: GraduationPlanResultValue,
  step: "schedule" | "checks" = "schedule",
): string {
  return renderToStaticMarkup(
    <GraduationPlanResult
      result={result}
      step={step}
      onEdit={vi.fn()}
      onShowChecks={vi.fn()}
      onSave={vi.fn()}
    />,
  );
}

describe("GraduationPlanResult status language", () => {
  it.each([
    ["currently-satisfied", "현재 입력 기준으로 충족했어요"],
    ["regular-plan-possible", "목표 학기 안에 참고 계획을 만들었어요"],
    ["load-adjustment-needed", "학기당 수강량 조정이 필요해요"],
    ["extra-term-possible", "추가 학기가 필요할 가능성이 있어요"],
    ["official-review-required", "계획 전에 공식 확인이 필요해요"],
  ] as const)("uses the safe heading for %s", (status, heading) => {
    const markup = renderResult({ ...baseResult, status });

    expect(markup).toContain(`<h1>${heading}</h1>`);
    expect(markup).not.toMatch(/<h[1-6][^>]*>[^<]*(졸업 가능|이수 확정|개설 보장)[^<]*<\/h[1-6]>/);
  });
});

describe("GraduationPlanResult distributed pages", () => {
  it("shows per-term named placements and anonymous elective reservations on schedule only", () => {
    const markup = renderResult(baseResult, "schedule");

    expect(markup).toContain("2027학년도 1학기");
    expect(markup).toContain("C-2 소비자경제학");
    expect(markup).toContain("B-2 통계학기초");
    expect(markup).toContain("전공 선택 과목 3학점 자리");
    expect(markup).toContain("최근 개설 패턴 기준");
    expect(markup).toContain("반복 개설을 보장하지 않습니다");
    expect(markup).toContain("계획 저장");
    expect(markup).toContain("확인할 항목 보기");
    expect(markup).toContain("조건 수정");
    expect(markup).not.toContain("목표 학기 안의 수강 한도를 초과합니다");
  });

  it("shows unplaced reasons, official questions, and working actions on checks only", () => {
    const markup = renderResult(baseResult, "checks");

    expect(markup).toContain("배치하지 못한 과목");
    expect(markup).toContain("D-2 환경영향 및 전과정평가");
    expect(markup).toContain("수강 한도 초과");
    expect(markup).toContain("학과에 확인할 질문");
    expect(markup).toContain("실제 개설 학기와 폐강 여부");
    expect(markup).toContain("조건 수정");
    expect(markup).toContain("이수 과목 선택으로 돌아가기");
    expect(markup).toContain("공식 자료 열기");
    expect(markup).not.toContain("C-2 소비자경제학");
    expect(markup).not.toContain("계획 저장");
  });

  it.each([
    ["regular-plan-possible", completed(["b-1", "b-2", "c-1", "c-2", "c-3"]), 2],
    ["load-adjustment-needed", completed(["b-1", "b-2", "c-1", "c-2"]), 2],
    ["extra-term-possible", [], 3],
    ["official-review-required", [], 1],
  ] as const)(
    "renders only planner-owned elective allocation terms for %s",
    (expectedStatus, selections, load) => {
      const result = realMinorPlan([...selections], load);
      const markup = renderResult(result, "schedule");
      const displayed = displayedElectiveAllocations(markup);

      expect(result.status).toBe(expectedStatus);
      expect(displayed).toEqual(result.electiveAllocations.map((allocation) => ({
        termId: allocation.termId,
        credits: allocation.credits,
      })));
      expect(displayed.reduce((sum, allocation) => sum + allocation.credits, 0)
        + result.unplacedElectiveCredits).toBe(result.unallocatedElectiveCredits);
    },
  );

  it("shows every unallocated review-case credit as allocated or explicitly unplaced", () => {
    const result = realMinorPlan([], 1);
    const scheduleMarkup = renderResult(result, "schedule");
    const checksMarkup = renderResult(result, "checks");

    expect(displayedElectiveAllocations(scheduleMarkup)).toEqual([
      { termId: "2027-1", credits: 3 },
      { termId: "2027-2", credits: 3 },
      { termId: "2028-1", credits: 3 },
    ]);
    expect(checksMarkup).toContain("학기 미배정 선택전공 12학점");
    expect(scheduleMarkup).not.toContain("학기 미배정 선택전공");
  });

  it("preserves a planner-owned two-slot reservation even when it carries only three credits", () => {
    const result: GraduationPlanResultValue = {
      ...baseResult,
      placements: [],
      extraTermPlacements: [],
      unplacedCourses: [],
      electiveAllocations: [{ termId: "2027-1", slots: 2, credits: 3 }],
      unallocatedElectiveCredits: 3,
      unallocatedElectiveSlots: 2,
      unplacedElectiveCredits: 0,
      unplacedElectiveSlots: 0,
      reviewItems: [{
        code: "elective-placeholder",
        message: "선택 전공 3학점을 두 자리로 배정했습니다.",
        evidence: "project-derived",
      }],
    };

    const markup = renderResult(result, "schedule");

    expect(markup).toContain("<small>2자리</small>");
    expect(markup).toContain(
      'data-elective-allocation-term="2027-1" data-elective-credits="3" data-elective-slots="2"',
    );
    expect(markup).toContain("전공 선택 과목 3학점 자리");
    expect(markup).toContain("2자리 · 과목명은 공식 확인 뒤 정해 주세요.");
    expect(markup).not.toContain("<small>1자리</small>");
  });
});
