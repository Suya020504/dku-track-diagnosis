# Track Diagnosis Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 소속·이수 경로·적용 규칙을 분리하고, 필수·트랙·전체 전공학점을 안전하게 계산하며, 기존 저장값을 보존하는 v2 기반을 실제 서비스에 연결한다.

**Architecture:** 최신 GitHub `main` `544f21c`의 사용자 화면과 학기 계획 저장을 기준으로 사용한다. 현재 로컬의 공식 교육과정 데이터, 최소 고유 과목 계산, 관심 설문, 주소 복원, 저장 오류 처리는 파일 단위로 선별 이식한다. 새 규칙·진행도 엔진은 순수 함수로 분리하고 기존 `App.tsx`는 새 엔진의 소비자로만 사용한다.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Vitest 4, localStorage

**Spec:** `docs/superpowers/specs/2026-08-30-track-diagnosis-service-expansion-design.md`

## Global Constraints

- 실행은 `superpowers:using-git-worktrees`로 만든 최신 `origin/main` 기반 `codex/track-service-expansion` 작업공간에서 시작한다.
- 현재 로컬 `138ce95` 기반 미커밋 작업은 수정·이동·삭제·stash하지 않는다.
- PDF 세부 규칙은 `provided-final-plan`이며 적용 학번이 확인되지 않으면 공식 완료 판정을 금지한다.
- B-1 경제원론은 `starred-six-2026` 참고 필수 변형에서 제외한다.
- A 학문기초 교양은 63·42·21 전공학점에 포함하지 않는다.
- 부전공에는 필수·트랙 진행도를 적용하지 않는다.
- 같은 과목은 조건 기여에 재사용할 수 있지만 실제 취득학점에는 한 번만 합산한다.
- `completed`만 현재 충족에 사용하고 `in-progress`·`planned`는 계획에만 사용한다.
- 미래 개설과 최종 졸업·트랙 인정을 보장하는 문구를 사용하지 않는다.
- 새 의존성은 이 계획에서 추가하지 않는다.
- 각 작업은 관련 테스트 → 전체 테스트 → 빌드 순으로 검증한 뒤 별도 커밋한다.

## Plan Series

1. 이 계획: 학생 프로필·규칙·진행도·저장 v2·기본 사용자 흐름
2. 후속 계획: 관심·현재 진행·졸업 계획 추천과 학기 배치 엔진
3. 후속 계획: 텍스트 PDF 자동 채우기, 진단 이력, 이미지 생성·통합, 전체 QA

## File Responsibility Map

| 파일 | 책임 |
|---|---|
| `src/types.ts` | 공유 도메인 타입과 저장 v2 타입 |
| `src/data/requirementRules2026.ts` | 학생 소속·경로별 2026 참고 규칙과 근거 상태 |
| `src/data/requirementRules2026.test.ts` | 규칙표·허용 조합·필수 변형 불변조건 |
| `src/lib/progressEngine.ts` | 필수·트랙·전체학점 독립 계산 |
| `src/lib/progressEngine.test.ts` | 정상·경계·모순 계산 오라클 |
| `src/lib/storage.ts` | v1·원격 계획값을 v2로 보존하는 저장·복구 |
| `src/lib/storage.test.ts` | 마이그레이션·손상·쓰기 실패·스냅샷 제한 |
| `src/features/profile/StudyPathSetup.tsx` | 목적·소속·입학연도·이수 경로 입력 |
| `src/features/profile/StudyPathSetup.test.tsx` | 허용 경로와 접근성 계약 |
| `src/features/results/PathProgressSummary.tsx` | 경로별 필수·트랙·전체학점·확인 필요 요약 |
| `src/features/results/PathProgressSummary.test.tsx` | 결과 상태·문구 계약 |
| `src/lib/viewRouting.ts` | 화면 주소 복원 |
| `src/App.tsx` | 기존 화면과 새 도메인 모듈 연결 |

---

### Task 1: Lock Student Profile And Requirement Rules

**Files:**
- Create: `docs/data/requirement-scenarios-2026.md`
- Modify: `src/types.ts`
- Create: `src/data/requirementRules2026.ts`
- Test: `src/data/requirementRules2026.test.ts`

**Interfaces:**
- Produces: `StudentAffiliation`, `StudyPath`, `ServiceGoal`, `StudentProfile`
- Produces: `CourseSelectionStatus`, `CourseSelectionRecord`, `AdditionalMajorCredit`
- Produces: `RequirementEvidenceStatus`, `RequirementRule`, `getRequirementRule(profile)`
- Consumes: existing `TrackId`, `Course`, `ModuleId`

- [ ] **Step 1: Write the scenario oracle before implementation**

Create `docs/data/requirement-scenarios-2026.md` with a source table and at least these 16 named scenarios:

```markdown
| ID | Profile | Input summary | Expected result | Evidence |
|---|---|---|---|---|
| ADV-60 | 학과·심화·reference-only | 필수 18, 전공 60 | incomplete | PDF p.4 |
| ADV-63 | 학과·심화·reference-only | 필수 18, 전공 63 | reference-calculation-satisfied + review | PDF p.4 |
| MIN-21 | 타학과·부전공 | 전공 21 | current-input-satisfied | PDF p.5 |
| EXT-ECO | 타학과·트랙·경제학 | 트랙 30, 밖 필수 18 | 48 + official-review-required | PDF p.5 contradiction |
```

Record these remaining rows explicitly:

```markdown
| DMO-42 | 학과·다전공·reference-only | 필수 18, 고유 전공 42 | reference-calculation-satisfied + review | PDF p.4 |
| DBL-42 | 타학과·복수·reference-only | 필수 18, 고유 전공 42 | reference-calculation-satisfied + review | PDF p.5 |
| MAJ-29 | 학과·푸드마케팅 | 한 모듈 3, 총 트랙 30 | track incomplete | PDF p.4 |
| MAJ-63 | 학과·푸드마케팅 | 모듈 조건 30, 전체 63 | reference-calculation-satisfied + review | PDF p.4 |
| BIO-BASE | 학과·푸드바이오 | F/H/I 합계 15, H 0 | track incomplete | PDF p.4 |
| BIO-M | 학과·푸드바이오 | M 6 | track incomplete | PDF p.4 |
| BIO-NO | 학과·푸드바이오 | N+O 5 | track incomplete | PDF p.4 |
| BIO-30 | 학과·푸드바이오 | F/H/I 개별·합계, M8, N+O7 | track satisfied | PDF p.4 |
| EXT-FM | 타학과·푸드마케팅 트랙 | 트랙30 + 밖 필수12 | 42 + review | PDF p.5 |
| EXT-REG | 타학과·지역개발 트랙 | 트랙30 + 밖 필수15 | 45 + review | PDF p.5 |
| DUP-ID | 임의 | 같은 완료 과목 ID 2회 | 한 번만 합산 | 계산 계약 |
| A-EXCLUDE | 임의 | A모듈 12 + 전공 9 | 전공 9만 합산 | 교육과정 영역 |
| PLAN-EXCLUDE | 임의 | 완료3 + 수강중3 + 예정3 | 현재 완료 3 | 상태 계약 |
| UNKNOWN | 임의 | unknown-101 완료 입력 | review item + 0학점 | 신뢰 계약 |
```

- [ ] **Step 2: Write failing rule-table tests**

```ts
import { describe, expect, it } from "vitest";
import {
  REQUIRED_COURSE_VARIANTS,
  getAllowedStudyPaths,
  getRequirementRule,
} from "./requirementRules2026";

describe("2026 requirement rule contract", () => {
  it("keeps affiliation and study path as separate axes", () => {
    expect(getAllowedStudyPaths("department-student")).toEqual([
      "advanced-major",
      "track-major",
      "department-with-other-major",
    ]);
    expect(getAllowedStudyPaths("external-student")).toEqual([
      "double-major",
      "minor",
      "track-major",
    ]);
  });

  it("keeps the provided starred-six variant non-official", () => {
    expect(REQUIRED_COURSE_VARIANTS["starred-six-2026"]).toMatchObject({
      courseIds: ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"],
      requiredCredits: 18,
      evidence: "provided-final-plan",
      allowsOfficialCompletion: false,
    });
  });

  it("does not apply required or track rules to a minor", () => {
    const rule = getRequirementRule({
      goal: "check-progress",
      affiliation: "external-student",
      studyPath: "minor",
      entryYear: 2026,
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: "reference-only",
    });
    expect(rule.requiredCourseVariantId).toBeNull();
    expect(rule.trackRule).toBeNull();
    expect(rule.totalMajorCredits).toBe(21);
  });
});
```

- [ ] **Step 3: Run the rule test and verify failure**

Run: `pnpm.cmd vitest run src/data/requirementRules2026.test.ts`

Expected: FAIL because `requirementRules2026.ts` and exported types do not exist.

- [ ] **Step 4: Add the domain types**

Add to `src/types.ts`:

```ts
export type ServiceGoal =
  | "learn-track-system"
  | "find-track"
  | "check-progress"
  | "plan-graduation";

export type StudentAffiliation = "department-student" | "external-student";

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

export type RequirementEvidenceStatus =
  | "official-public"
  | "provided-final-plan"
  | "project-derived"
  | "official-review-required";
```

- [ ] **Step 5: Implement the rule table**

Create `src/data/requirementRules2026.ts` with explicit constants rather than conditional magic numbers:

```ts
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

const MAJOR_TRACK_MODULES: Record<
  Exclude<TrackId, "food-bio-economy">,
  ModuleId[]
> = {
  "food-marketing": ["F", "H", "I", "J", "L"],
  "regional-development-consulting": ["D", "E", "H", "I", "K"],
  "agri-food-distribution": ["F", "G", "J", "K", "L"],
  economics: ["D", "E", "G", "J", "L"],
};

function getTrackRequirement(trackId: TrackId | undefined): TrackRequirement {
  if (!trackId) {
    throw new Error("A target track is required for the track-major path");
  }
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
  return {
    type: "major",
    moduleIds: MAJOR_TRACK_MODULES[trackId],
    creditsPerModule: 6,
    totalCredits: 30,
  };
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
      return {
        ...base,
        totalMajorCredits: 63,
        requiredCourseVariantId: "starred-six-2026",
        trackRule: null,
        forcesOfficialReview: true,
      };
    case "department-student:track-major":
      return {
        ...base,
        totalMajorCredits: 63,
        requiredCourseVariantId: "starred-six-2026",
        trackRule: getTrackRequirement(trackId),
        forcesOfficialReview: true,
      };
    case "department-student:department-with-other-major":
      return {
        ...base,
        totalMajorCredits: 42,
        requiredCourseVariantId: "starred-six-2026",
        trackRule: null,
        forcesOfficialReview: true,
      };
    case "external-student:double-major":
      return {
        ...base,
        totalMajorCredits: 42,
        requiredCourseVariantId: "starred-six-2026",
        trackRule: null,
        forcesOfficialReview: true,
      };
    case "external-student:minor":
      return {
        ...base,
        totalMajorCredits: 21,
        requiredCourseVariantId: null,
        trackRule: null,
        forcesOfficialReview: referenceOnly,
      };
    case "external-student:track-major": {
      const totals: Record<TrackId, 48 | 45 | 42> = {
        "food-marketing": 42,
        "regional-development-consulting": 45,
        "agri-food-distribution": 45,
        economics: 48,
        "food-bio-economy": 42,
      };
      if (!trackId) {
        throw new Error("A target track is required for the track-major path");
      }
      return {
        ...base,
        totalMajorCredits: totals[trackId],
        requiredCourseVariantId: "starred-six-2026",
        trackRule: getTrackRequirement(trackId),
        evidence:
          trackId === "economics" ? "official-review-required" : "provided-final-plan",
        forcesOfficialReview: true,
      };
    }
    default:
      throw new Error(`Unsupported affiliation and study path: ${key}`);
  }
}
```

Do not silently default to `primary`. The runtime error is caught by the caller and shown as a recoverable profile configuration error.

- [ ] **Step 6: Run focused and full tests**

Run: `pnpm.cmd vitest run src/data/requirementRules2026.test.ts`

Expected: PASS.

Run: `pnpm.cmd run test`

Expected: existing suite and new rule tests PASS.

- [ ] **Step 7: Commit Task 1**

```powershell
git add docs/data/requirement-scenarios-2026.md src/types.ts src/data/requirementRules2026.ts src/data/requirementRules2026.test.ts
git commit -m "feat: define student path requirement rules"
```

---

### Task 2: Build The Independent Progress Engine

**Files:**
- Create: `src/lib/progressEngine.ts`
- Test: `src/lib/progressEngine.test.ts`
- Read/Reuse: `src/lib/diagnosis.ts`
- Read/Reuse: `src/data/curriculumData.ts`

**Interfaces:**
- Consumes: `StudentProfile`, `CourseSelectionRecord[]`, `AdditionalMajorCredit[]`, `TrackId[]`
- Consumes: `getRequirementRule(profile, trackId)`
- Produces: `calculatePathProgress(input): PathProgressResult`
- Produces: `RequirementProgress`, `TrackProgress`, `CreditProgress`, `ReviewItem`

- [ ] **Step 1: Write failing progress tests from the oracle**

```ts
import { describe, expect, it } from "vitest";
import { calculatePathProgress } from "./progressEngine";

const externalMinor = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
} as const;

describe("calculatePathProgress", () => {
  it("passes a minor with 21 completed major credits without track or required rules", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: ["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "d-2"].map(
        (courseId) => ({ courseId, status: "completed" as const }),
      ),
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });

    expect(result.requiredProgress).toBe("not-applicable");
    expect(result.trackProgress).toBe("not-applicable");
    expect(result.totalMajorProgress).toMatchObject({ completedCredits: 21, requiredCredits: 21 });
    expect(result.status).toBe("current-input-satisfied");
  });

  it("excludes A-module liberal courses from major credits", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: ["a-1", "a-2", "a-3", "a-4", "b-1", "b-2", "c-1"].map(
        (courseId) => ({ courseId, status: "completed" as const }),
      ),
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });
    expect(result.totalMajorProgress.completedCredits).toBe(9);
  });

  it("does not count in-progress or planned courses as completed", () => {
    const result = calculatePathProgress({
      profile: externalMinor,
      courseSelections: [
        { courseId: "b-1", status: "completed" },
        { courseId: "b-2", status: "in-progress" },
        { courseId: "c-1", status: "planned", plannedTerm: "next" },
      ],
      additionalMajorCredits: [],
      targetTrackId: undefined,
    });
    expect(result.totalMajorProgress.completedCredits).toBe(3);
  });
});
```

Add explicit tests for ADV-60, ADV-63 reference-only, department track 30-but-63-missing, module boundary, FoodBio boundaries, external economics contradiction, duplicate IDs, unknown courses, and student-entered additional credits.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm.cmd vitest run src/lib/progressEngine.test.ts`

Expected: FAIL because `progressEngine.ts` does not exist.

- [ ] **Step 3: Add progress result types**

Add to `src/types.ts`:

```ts
export type ReviewItem = {
  code: "rule-source" | "unknown-course" | "additional-credit" | "document-conflict";
  message: string;
  evidence: RequirementEvidenceStatus;
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
```

- [ ] **Step 4: Implement the minimal engine**

Create `src/lib/progressEngine.ts`:

```ts
import { courses } from "../data/curriculumData";
import { getRequirementRule, REQUIRED_COURSE_VARIANTS } from "../data/requirementRules2026";
import { calculateDiagnosis } from "./diagnosis";
import type {
  AdditionalMajorCredit,
  CourseSelectionRecord,
  PathProgressResult,
  StudentProfile,
  TrackId,
} from "../types";

export type PathProgressInput = {
  profile: StudentProfile;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  courseInputReviewedAt?: string;
  targetTrackId?: TrackId;
};

export function calculatePathProgress(input: PathProgressInput): PathProgressResult {
  const completedIds = [...new Set(
    input.courseSelections
      .filter((item) => item.status === "completed")
      .map((item) => item.courseId),
  )];
  const knownCompletedCourses = completedIds
    .map((id) => courses.find((course) => course.id === id))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));
  const unknownIds = completedIds.filter((id) => !knownCompletedCourses.some((course) => course.id === id));
  const majorCredits = knownCompletedCourses
    .filter((course) => course.moduleId !== "A")
    .reduce((sum, course) => sum + course.credits, 0);
  const additionalCredits = input.additionalMajorCredits.reduce((sum, item) => sum + item.credits, 0);
  const rule = getRequirementRule(input.profile, input.targetTrackId);

  const completedIdSet = new Set(knownCompletedCourses.map((course) => course.id));
  const totalCompletedCredits = majorCredits + additionalCredits;
  const totalMajorProgress = {
    completedCredits: totalCompletedCredits,
    requiredCredits: rule.totalMajorCredits,
    missingCredits: Math.max(0, rule.totalMajorCredits - totalCompletedCredits),
  };

  const variant = rule.requiredCourseVariantId
    ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId]
    : undefined;
  const completedRequiredIds = variant
    ? variant.courseIds.filter((id) => completedIdSet.has(id))
    : [];
  const missingRequiredIds = variant
    ? variant.courseIds.filter((id) => !completedIdSet.has(id))
    : [];
  const requiredCompletedCredits = knownCompletedCourses
    .filter((course) => completedRequiredIds.includes(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  const requiredProgress = variant
    ? {
        completedCredits: requiredCompletedCredits,
        requiredCredits: variant.requiredCredits,
        missingCredits: Math.max(0, variant.requiredCredits - requiredCompletedCredits),
        completedCourseIds: completedRequiredIds,
        missingCourseIds: missingRequiredIds,
      }
    : "not-applicable";

  const trackProgress = rule.trackRule
    ? calculateDiagnosis({
        trackIds: [input.targetTrackId!],
        completedCourseIds: [...completedIdSet],
        enrollmentType: "primary",
      }).trackResults[0]
    : "not-applicable";

  const reviewItems = [] as PathProgressResult["reviewItems"];
  if (unknownIds.length > 0) {
    reviewItems.push({
      code: "unknown-course",
      message: `교육과정에서 찾지 못한 과목 ${unknownIds.length}개를 확인해 주세요.`,
      evidence: "official-review-required",
    });
  }
  if (input.additionalMajorCredits.some((item) => item.status === "student-entered")) {
    reviewItems.push({
      code: "additional-credit",
      message: "직접 입력한 기타 인정 전공학점은 학과 확인이 필요합니다.",
      evidence: "official-review-required",
    });
  }
  if (rule.forcesOfficialReview) {
    reviewItems.push({
      code: rule.evidence === "official-review-required" ? "document-conflict" : "rule-source",
      message:
        rule.evidence === "official-review-required"
          ? "제공 문서의 최소학점 범위와 계산 결과가 달라 공식 확인이 필요합니다."
          : "제공된 2026 최종안 기준의 참고 계산입니다.",
      evidence: rule.evidence,
    });
  }

  const requiredSatisfied =
    requiredProgress === "not-applicable" || requiredProgress.missingCredits === 0;
  const trackSatisfied =
    trackProgress === "not-applicable" ||
    trackProgress.moduleProgress.every((module) => module.missingCredits === 0);
  const numericSatisfied =
    requiredSatisfied && trackSatisfied && totalMajorProgress.missingCredits === 0;
  const status = !numericSatisfied
    ? "incomplete"
    : rule.evidence === "official-review-required"
      ? "official-review-required"
      : reviewItems.length > 0
        ? "reference-calculation-satisfied"
        : "current-input-satisfied";

  return {
    requiredProgress,
    trackProgress,
    totalMajorProgress,
    reviewItems,
    status,
  };
}
```

Keep `calculateDiagnosis` as a temporary track-module adapter only. Task 5 must not expose its legacy aggregate `passed` value.

- [ ] **Step 5: Run focused tests and fix only engine defects**

Run: `pnpm.cmd vitest run src/lib/progressEngine.test.ts src/lib/diagnosis.test.ts`

Expected: PASS.

- [ ] **Step 6: Run full tests and build**

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: both PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add src/types.ts src/lib/progressEngine.ts src/lib/progressEngine.test.ts
git commit -m "feat: add path-aware progress engine"
```

---

### Task 3: Add Versioned Storage V2 Without Losing Existing Plans

**Files:**
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Produces: `SavedAppStateV2`, `DiagnosisSnapshot`, `createEmptyAppState()`
- Produces: `loadAppState(storage?)`, `saveAppState(state, storage?)`
- Produces: `migrateV1State(value): SavedAppStateV2`
- Consumes: existing `loadSavedState`, `saveState`, remote `plannedCourseTerms`

- [ ] **Step 1: Write failing migration and recovery tests**

```ts
function makeStorage(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

it("migrates v1 completed courses and remote planned terms without loss", () => {
  const migrated = migrateV1State({
    curriculumYear: 2026,
    trackIds: ["food-marketing"],
    completedCourseIds: ["b-2", "f-1"],
    enrollmentType: "primary",
    plannedCourseTerms: { "h-1": "next" },
  });

  expect(migrated.courseSelections).toEqual([
    { courseId: "b-2", status: "completed" },
    { courseId: "f-1", status: "completed" },
    { courseId: "h-1", status: "planned", plannedTerm: "next" },
  ]);
  expect(migrated.profile.affiliation).toBe("department-student");
  expect(migrated.profile.ruleApplicability).toBe("reference-only");
});

it("keeps only the newest twelve diagnosis snapshots", () => {
  const snapshots = Array.from({ length: 13 }, (_, index) => ({
    id: `snapshot-${index + 1}`,
  })) as DiagnosisSnapshot[];
  expect(normalizeSnapshotHistory(snapshots)).toHaveLength(12);
  expect(normalizeSnapshotHistory(snapshots)[0].id).toBe("snapshot-2");
});

it("returns the last valid state when the active payload is corrupt", () => {
  const validState = createEmptyAppState();
  const storage = makeStorage({
    "track-sim:v2": "{broken",
    "track-sim:v2:last-valid": JSON.stringify(validState),
  });
  expect(loadAppState(storage)).toEqual(validState);
});
```

Retain existing throwing-storage and unknown-data tests.

- [ ] **Step 2: Run storage tests and verify failure**

Run: `pnpm.cmd vitest run src/lib/storage.test.ts`

Expected: FAIL because v2 interfaces and migration functions do not exist.

- [ ] **Step 3: Define v2 state and snapshots**

```ts
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
};

export type SavedAppStateV2 = {
  version: 2;
  profile?: StudentProfile;
  profileDraft?: Partial<StudentProfile>;
  courseSelections: CourseSelectionRecord[];
  additionalMajorCredits: AdditionalMajorCredit[];
  targetTrackId?: TrackId;
  comparisonTrackIds: TrackId[];
  interestSurvey?: unknown;
  currentSemester?: PlanningSemester;
  targetGraduationSemester?: PlanningSemester;
  snapshots: DiagnosisSnapshot[];
};
```

Use a serializable future semester representation in the planning phase; this foundation retains current `PlanningSemester` compatibility.

- [ ] **Step 4: Implement migration and last-valid recovery**

In `storage.ts`:

```ts
export const STORAGE_KEY_V2 = "track-sim:v2";
export const STORAGE_LAST_VALID_KEY_V2 = "track-sim:v2:last-valid";

export function createEmptyAppState(): SavedAppStateV2 {
  return {
    version: 2,
    profile: undefined,
    profileDraft: undefined,
    courseSelections: [],
    additionalMajorCredits: [],
    courseInputReviewedAt: undefined,
    targetTrackId: undefined,
    comparisonTrackIds: [],
    snapshots: [],
  };
}

export function normalizeSnapshotHistory(items: DiagnosisSnapshot[]): DiagnosisSnapshot[] {
  return items.slice(-12);
}

export function migrateV1State(value: unknown): SavedAppStateV2 {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const completed = Array.isArray(source.completedCourseIds)
    ? [...new Set(source.completedCourseIds.filter((item): item is string => typeof item === "string"))]
    : [];
  const legacyTracks = Array.isArray(source.trackIds)
    ? source.trackIds.filter((item): item is TrackId =>
        typeof item === "string" && tracks.some((track) => track.id === item),
      )
    : [];
  const planned = source.plannedCourseTerms && typeof source.plannedCourseTerms === "object"
    ? Object.entries(source.plannedCourseTerms as Record<string, unknown>)
        .filter((entry): entry is [string, PlanTerm] =>
          ["next", "following", "later"].includes(String(entry[1])) && !completed.includes(entry[0]),
        )
    : [];
  const enrollmentType = source.enrollmentType;
  const profile = enrollmentType === "primary"
    ? {
        goal: "check-progress" as const,
        affiliation: "department-student" as const,
        studyPath: "track-major" as const,
        curriculumRuleVersion: "2026-provided-final-plan" as const,
        ruleApplicability: "reference-only" as const,
      }
    : enrollmentType === "double-major"
      ? {
          goal: "check-progress" as const,
          affiliation: "external-student" as const,
          studyPath: "double-major" as const,
          curriculumRuleVersion: "2026-provided-final-plan" as const,
          ruleApplicability: "reference-only" as const,
        }
      : enrollmentType === "minor"
        ? {
            goal: "check-progress" as const,
            affiliation: "external-student" as const,
            studyPath: "minor" as const,
            curriculumRuleVersion: "2026-provided-final-plan" as const,
            ruleApplicability: "reference-only" as const,
          }
        : undefined;

  return {
    version: 2,
    profile,
    profileDraft: undefined,
    courseSelections: [
      ...completed.map((courseId) => ({ courseId, status: "completed" as const })),
      ...planned.map(([courseId, plannedTerm]) => ({
        courseId,
        status: "planned" as const,
        plannedTerm,
      })),
    ],
    additionalMajorCredits: [],
    courseInputReviewedAt: undefined,
    targetTrackId: legacyTracks[0],
    comparisonTrackIds: legacyTracks.slice(1),
    snapshots: [],
  };
}

function isSavedAppStateV2(value: unknown): value is SavedAppStateV2 {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<SavedAppStateV2>;
  if (state.version !== 2) return false;
  if (!Array.isArray(state.courseSelections) || !Array.isArray(state.additionalMajorCredits)) {
    return false;
  }
  if (!Array.isArray(state.comparisonTrackIds) || !Array.isArray(state.snapshots)) return false;
  const validStatuses = new Set(["completed", "in-progress", "planned"]);
  const courseSelectionsValid = state.courseSelections.every(
    (item) =>
      item &&
      typeof item.courseId === "string" &&
      validStatuses.has(item.status) &&
      (item.plannedTerm === undefined || ["next", "following", "later"].includes(item.plannedTerm)),
  );
  const additionalCreditsValid = state.additionalMajorCredits.every(
    (item) =>
      item &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      Number.isFinite(item.credits) &&
      item.credits >= 0 &&
      ["student-entered", "officially-verified"].includes(item.status),
  );
  const knownTracks = new Set(tracks.map((track) => track.id));
  const tracksValid =
    (state.targetTrackId === undefined || knownTracks.has(state.targetTrackId)) &&
    state.comparisonTrackIds.every((id) => knownTracks.has(id));
  const profileValid = state.profile === undefined || (
    ["department-student", "external-student"].includes(state.profile.affiliation) &&
    getAllowedStudyPaths(state.profile.affiliation).includes(state.profile.studyPath) &&
    ["learn-track-system", "find-track", "check-progress", "plan-graduation"].includes(
      state.profile.goal,
    ) &&
    ["student-confirmed", "officially-verified", "reference-only"].includes(
      state.profile.ruleApplicability,
    )
  );
  const reviewDateValid =
    state.courseInputReviewedAt === undefined || typeof state.courseInputReviewedAt === "string";
  const profileDraftValid =
    state.profileDraft === undefined ||
    (state.profileDraft !== null && typeof state.profileDraft === "object");
  return courseSelectionsValid && additionalCreditsValid && tracksValid &&
    profileValid && profileDraftValid && reviewDateValid;
}

export function loadAppState(storage: Storage = window.localStorage): SavedAppStateV2 {
  for (const key of [STORAGE_KEY_V2, STORAGE_LAST_VALID_KEY_V2]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (isSavedAppStateV2(parsed)) {
        return { ...parsed, snapshots: normalizeSnapshotHistory(parsed.snapshots ?? []) };
      }
    } catch {
      continue;
    }
  }
  try {
    const legacyRaw = storage.getItem(STORAGE_KEY);
    return legacyRaw ? migrateV1State(JSON.parse(legacyRaw)) : createEmptyAppState();
  } catch {
    return createEmptyAppState();
  }
}

export function saveAppState(
  state: SavedAppStateV2,
  storage: Storage = window.localStorage,
): boolean {
  try {
    const normalized = {
      ...state,
      snapshots: normalizeSnapshotHistory(state.snapshots),
    };
    const serialized = JSON.stringify(normalized);
    storage.setItem(STORAGE_KEY_V2, serialized);
    storage.setItem(STORAGE_LAST_VALID_KEY_V2, serialized);
    return true;
  } catch {
    return false;
  }
}
```

Import `tracks`, `TrackId`, `PlanTerm`, `getAllowedStudyPaths`, and the legacy `STORAGE_KEY`.

- [ ] **Step 5: Run storage and full validation**

Run: `pnpm.cmd vitest run src/lib/storage.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: all PASS.

- [ ] **Step 6: Commit Task 3**

```powershell
git add src/types.ts src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: migrate diagnosis storage to v2"
```

---

### Task 4: Add Purpose, Affiliation, And Study Path Setup

**Files:**
- Create: `src/features/profile/StudyPathSetup.tsx`
- Test: `src/features/profile/StudyPathSetup.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `StudentProfile`, `getAllowedStudyPaths`
- Produces: `<StudyPathSetup profile onChange onComplete />`
- Produces: a valid profile before direct course selection

- [ ] **Step 1: Write a failing component contract test**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPathSetup } from "./StudyPathSetup";

it("shows student affiliation before allowed study paths", () => {
  const markup = renderToStaticMarkup(
    <StudyPathSetup profile={undefined} onChange={vi.fn()} onComplete={vi.fn()} />,
  );
  expect(markup).toContain("식품자원경제학과 입학생");
  expect(markup).toContain("타 학과 학생");
  expect(markup).not.toContain("부전공 진행도");
});

it("does not show minor to department students", () => {
  const markup = renderToStaticMarkup(
    <StudyPathSetup
      profile={{
        goal: "check-progress",
        affiliation: "department-student",
        studyPath: "advanced-major",
        entryYear: 2026,
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      }}
      onChange={vi.fn()}
      onComplete={vi.fn()}
    />,
  );
  expect(markup).toContain("심화전공");
  expect(markup).toContain("트랙형전공");
  expect(markup).not.toContain("부전공");
});
```

- [ ] **Step 2: Run the component test and verify failure**

Run: `pnpm.cmd vitest run src/features/profile/StudyPathSetup.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the accessible setup component**

Create `StudyPathSetup.tsx` with this public contract and visible radio labels:

```tsx
import { useState } from "react";
import { getAllowedStudyPaths } from "../../data/requirementRules2026";
import type {
  ServiceGoal,
  StudentAffiliation,
  StudentProfile,
} from "../../types";

const AFFILIATION_LABELS = {
  "department-student": "식품자원경제학과 입학생",
  "external-student": "타 학과 학생",
} as const;

const STUDY_PATH_LABELS = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
} as const;

const GOAL_LABELS: Record<ServiceGoal, string> = {
  "learn-track-system": "트랙제 이해하기",
  "find-track": "관심 트랙 찾기",
  "check-progress": "현재 진행도 확인하기",
  "plan-graduation": "졸업 전 계획 확인하기",
};

type DraftProfile = Partial<StudentProfile> & Pick<StudentProfile, "goal" | "curriculumRuleVersion" | "ruleApplicability">;

type StudyPathSetupProps = {
  profile?: StudentProfile;
  initialDraft?: Partial<StudentProfile>;
  onChange: (draft: DraftProfile) => void;
  onComplete: (profile: StudentProfile) => void;
};

export function StudyPathSetup({ profile, initialDraft, onChange, onComplete }: StudyPathSetupProps) {
  const [draft, setDraft] = useState<DraftProfile>({
    goal: "check-progress",
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
    ...initialDraft,
    ...profile,
  });
  const allowedPaths = draft.affiliation ? getAllowedStudyPaths(draft.affiliation) : [];
  const valid = Boolean(draft.affiliation && draft.studyPath);

  function update(patch: Partial<DraftProfile>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  }

  function changeAffiliation(affiliation: StudentAffiliation) {
    update({ affiliation, studyPath: undefined });
  }

  return (
    <section aria-labelledby="study-path-title">
      <h1 id="study-path-title">내 상황에 맞는 이수 기준을 먼저 확인해요.</h1>
      <fieldset>
        <legend>지금 확인하고 싶은 것</legend>
        {(Object.keys(GOAL_LABELS) as ServiceGoal[]).map((goal) => (
          <label key={goal}><input type="radio" name="goal" checked={draft.goal === goal}
            onChange={() => update({ goal })} />{GOAL_LABELS[goal]}</label>
        ))}
      </fieldset>
      <fieldset>
        <legend>학생 소속</legend>
        {(Object.keys(AFFILIATION_LABELS) as StudentAffiliation[]).map((affiliation) => (
          <label key={affiliation}><input type="radio" name="affiliation"
            checked={draft.affiliation === affiliation}
            onChange={() => changeAffiliation(affiliation)} />{AFFILIATION_LABELS[affiliation]}</label>
        ))}
      </fieldset>
      {draft.affiliation && <fieldset>
        <legend>이수 경로</legend>
        {allowedPaths.map((studyPath) => (
          <label key={studyPath}><input type="radio" name="studyPath"
            checked={draft.studyPath === studyPath}
            onChange={() => update({ studyPath })} />{STUDY_PATH_LABELS[studyPath]}</label>
        ))}
      </fieldset>}
      <label>입학연도 <input type="number" min="2000" max="2026" value={draft.entryYear ?? ""}
        onChange={(event) => update({ entryYear: event.target.value ? Number(event.target.value) : undefined })} /></label>
      <p role="status">{draft.affiliation && draft.studyPath
        ? `${AFFILIATION_LABELS[draft.affiliation]} · ${STUDY_PATH_LABELS[draft.studyPath]} 기준을 사용합니다.`
        : "학생 소속과 이수 경로를 선택해 주세요."}</p>
      <button type="button" disabled={!valid} onClick={() => valid && onComplete(draft as StudentProfile)}>
        이수 과목 선택으로 이동
      </button>
    </section>
  );
}
```

Changing affiliation clears the path instead of silently selecting the first option. The primary action remains disabled until affiliation and path are set. `entryYear` may remain empty; the component keeps `ruleApplicability: "reference-only"` until a later officially verified rule version is loaded. Add CSS only for readable field grouping, 44px controls, focus-visible outlines, and the existing color tokens.

- [ ] **Step 4: Integrate setup before course selection**

Replace the legacy `EnrollmentType` source of truth in `App.tsx` with v2 state and these handlers:

```tsx
const [savedState, setSavedState] = useState<SavedAppStateV2>(() => loadAppState());
const [storageError, setStorageError] = useState(false);

function persist(updater: (current: SavedAppStateV2) => SavedAppStateV2) {
  setSavedState((current) => {
    const next = updater(current);
    setStorageError(!saveAppState(next));
    return next;
  });
}

function updateProfileDraft(profileDraft: Partial<StudentProfile>) {
  persist((current) => ({ ...current, profileDraft }));
}

function completeProfile(profile: StudentProfile) {
  persist((current) => {
    const targetTrackId = profile.studyPath === "track-major"
      ? current.targetTrackId
      : undefined;
    return { ...current, profile, profileDraft: undefined, targetTrackId };
  });
  navigateDiagnosisStep("courses");
}

const requiresTrack = savedState.profile?.studyPath === "track-major";

if (diagnosisStep === "profile" || !savedState.profile) {
  return <StudyPathSetup
    profile={savedState.profile}
    initialDraft={savedState.profileDraft}
    onChange={updateProfileDraft}
    onComplete={completeProfile}
  />;
}
```

Use `savedState.profileDraft` as the initial draft when no complete profile exists by extending the component prop to accept `initialDraft`. Require a track only when `requiresTrack` is true. Preserve the current course-search and filter markup after setup completion and show `role="alert"` when `storageError` is true.

Do not redesign the remaining page in this task.

- [ ] **Step 5: Run component, full tests, and build**

Run: `pnpm.cmd vitest run src/features/profile/StudyPathSetup.test.tsx`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: all PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add src/features/profile/StudyPathSetup.tsx src/features/profile/StudyPathSetup.test.tsx src/App.tsx src/styles.css
git commit -m "feat: add student path setup"
```

---

### Task 5: Connect Path-Aware Results Without Removing Existing Track Detail

**Files:**
- Create: `src/features/results/PathProgressSummary.tsx`
- Test: `src/features/results/PathProgressSummary.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PathProgressResult`, `StudentProfile`
- Produces: `<PathProgressSummary profile result />`
- Preserves: existing track recommendation and semester-plan panels

- [ ] **Step 1: Write failing result contract tests**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { PathProgressResult, StudentProfile } from "../../types";
import { PathProgressSummary } from "./PathProgressSummary";

const externalMinor: StudentProfile = {
  goal: "check-progress",
  affiliation: "external-student",
  studyPath: "minor",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "officially-verified",
};

const referenceAdvancedMajor: StudentProfile = {
  goal: "check-progress",
  affiliation: "department-student",
  studyPath: "advanced-major",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

const referenceSatisfiedResult: PathProgressResult = {
  requiredProgress: {
    completedCredits: 18,
    requiredCredits: 18,
    missingCredits: 0,
    completedCourseIds: ["b-2", "c-1", "c-2", "c-3", "f-1", "h-1"],
    missingCourseIds: [],
  },
  trackProgress: "not-applicable",
  totalMajorProgress: { completedCredits: 63, requiredCredits: 63, missingCredits: 0 },
  reviewItems: [{
    code: "rule-source",
    message: "제공된 2026 최종안 기준의 참고 계산입니다.",
    evidence: "provided-final-plan",
  }],
  status: "reference-calculation-satisfied",
};

it("shows 21-credit progress without track progress for a minor", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={externalMinor}
      result={{
        requiredProgress: "not-applicable",
        trackProgress: "not-applicable",
        totalMajorProgress: { completedCredits: 15, requiredCredits: 21, missingCredits: 6 },
        reviewItems: [],
        status: "incomplete",
      }}
    />,
  );
  expect(markup).toContain("부전공 전공학점");
  expect(markup).toContain("15 / 21학점");
  expect(markup).not.toContain("트랙 모듈 진행도");
});

it("labels reference-only satisfaction as needing official review", () => {
  const markup = renderToStaticMarkup(
    <PathProgressSummary
      profile={referenceAdvancedMajor}
      result={referenceSatisfiedResult}
    />,
  );
  expect(markup).toContain("참고 계산상 충족");
  expect(markup).toContain("공식 확인 필요");
  expect(markup).not.toContain("이수 확정");
});
```

- [ ] **Step 2: Run the result test and verify failure**

Run: `pnpm.cmd vitest run src/features/results/PathProgressSummary.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the summary component**

Create `PathProgressSummary.tsx`:

```tsx
import type { CreditProgress, PathProgressResult, StudentProfile } from "../../types";

const PATH_LABELS = {
  "advanced-major": "심화전공",
  "track-major": "트랙형전공",
  "department-with-other-major": "다전공 이수",
  "double-major": "복수전공",
  minor: "부전공",
} as const;

function ProgressLine({ label, progress }: { label: string; progress: CreditProgress }) {
  return <section aria-label={`${label} ${progress.completedCredits} / ${progress.requiredCredits}학점`}>
    <strong>{label}</strong>
    <span>{progress.completedCredits} / {progress.requiredCredits}학점</span>
    <progress value={progress.completedCredits} max={progress.requiredCredits} />
    {progress.missingCredits > 0 && <small>{progress.missingCredits}학점 부족</small>}
  </section>;
}

export function PathProgressSummary({
  profile,
  result,
}: {
  profile: StudentProfile;
  result: PathProgressResult;
}) {
  const statusLabel = {
    "current-input-satisfied": "현재 입력 기준 충족",
    "reference-calculation-satisfied": "참고 계산상 충족",
    incomplete: "보완할 조건이 있어요",
    "official-review-required": "공식 확인 필요",
  }[result.status];
  return <section aria-labelledby="path-progress-title">
    <p>{PATH_LABELS[profile.studyPath]} 기준</p>
    <h2 id="path-progress-title">{statusLabel}</h2>
    {result.requiredProgress !== "not-applicable" &&
      <ProgressLine label="필수과목 진행도" progress={result.requiredProgress} />}
    {result.trackProgress !== "not-applicable" && <section aria-label="트랙 모듈 진행도">
      <strong>트랙 모듈 진행도</strong>
      {result.trackProgress.moduleProgress.map((module) =>
        <ProgressLine key={module.label} label={module.label} progress={module} />)}
    </section>}
    <ProgressLine
      label={profile.studyPath === "minor" ? "부전공 전공학점" : "전체 전공학점"}
      progress={result.totalMajorProgress}
    />
    {result.reviewItems.length > 0 && <aside aria-labelledby="review-title">
      <h3 id="review-title">공식 확인 필요</h3>
      <ul>{result.reviewItems.map((item, index) =>
        <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul>
    </aside>}
  </section>;
}
```

Use the existing icon library only when wiring the component; the textual status remains present and does not rely on color alone.

- [ ] **Step 4: Replace the old aggregate result header**

In `App.tsx`, derive and render the new result without deleting existing detail panels:

```tsx
const pathProgress = useMemo(() => savedState.profile
  ? calculatePathProgress({
      profile: savedState.profile,
      courseSelections: savedState.courseSelections,
      additionalMajorCredits: savedState.additionalMajorCredits,
      targetTrackId: savedState.targetTrackId,
    })
  : undefined,
  [savedState],
);

{activeView === "result" && savedState.profile && pathProgress && (
  <PathProgressSummary profile={savedState.profile} result={pathProgress} />
)}
```

Insert this summary immediately before the current result-detail tablist at remote `App.tsx` around lines 2915–3125. Wrap the current track-only summary, 부족 모듈, and 트랙 충족 blocks in `pathProgress.trackProgress !== "not-applicable"`; leave recommendation, planning, and print blocks after the summary. Replace all legacy aggregate `passed` copy with the four status labels defined in `PathProgressSummary`.

- [ ] **Step 5: Run focused and full validation**

Run: `pnpm.cmd vitest run src/features/results/PathProgressSummary.test.tsx src/lib/progressEngine.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: all PASS.

- [ ] **Step 6: Commit Task 5**

```powershell
git add src/features/results/PathProgressSummary.tsx src/features/results/PathProgressSummary.test.tsx src/App.tsx
git commit -m "feat: show path-aware progress results"
```

---

### Task 6: Restore The Current Step Through URL And Browser Navigation

**Files:**
- Create or Modify: `src/lib/viewRouting.ts`
- Test: `src/lib/viewRouting.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `readViewFromSearch`, `buildViewHref`, `writeViewToHistory`
- Produces: canonical diagnosis step `profile | courses | result`
- Consumes: current v2 profile and conditional track requirement

- [ ] **Step 1: Write failing route tests**

```ts
import { expect, it } from "vitest";
import type { SavedAppStateV2 } from "../types";
import { createEmptyAppState } from "./storage";
import { resolveDiagnosisStep } from "./viewRouting";

const emptyV2State = createEmptyAppState();
const minorV2State: SavedAppStateV2 = {
  ...createEmptyAppState(),
  profile: {
    goal: "check-progress",
    affiliation: "external-student",
    studyPath: "minor",
    entryYear: 2026,
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
  },
};
const trackMajorWithoutTrackState: SavedAppStateV2 = {
  ...createEmptyAppState(),
  profile: {
    goal: "check-progress",
    affiliation: "department-student",
    studyPath: "track-major",
    entryYear: 2026,
    curriculumRuleVersion: "2026-provided-final-plan",
    ruleApplicability: "reference-only",
  },
};

it("keeps the profile step when no valid profile is saved", () => {
  expect(resolveDiagnosisStep("?view=diagnosis&step=courses", emptyV2State)).toBe("profile");
});

it("allows a minor to reach courses without a track", () => {
  expect(resolveDiagnosisStep("?view=diagnosis&step=courses", minorV2State)).toBe("courses");
});

it("redirects a track-major without a selected track before results", () => {
  expect(resolveDiagnosisStep("?view=result", trackMajorWithoutTrackState)).toBe("profile");
});
```

- [ ] **Step 2: Run route tests and verify failure**

Run: `pnpm.cmd vitest run src/lib/viewRouting.test.ts`

Expected: FAIL because conditional v2 state routing is not implemented.

- [ ] **Step 3: Implement canonical route resolution**

Add these functions to `viewRouting.ts`:

```ts
import { getAllowedStudyPaths } from "../data/requirementRules2026";
import type { SavedAppStateV2 } from "../types";

export type DiagnosisStep = "profile" | "courses" | "result";
const DIAGNOSIS_STEPS = new Set<DiagnosisStep>(["profile", "courses", "result"]);

function hasValidProfile(state: SavedAppStateV2): boolean {
  const profile = state.profile;
  return Boolean(
    profile && getAllowedStudyPaths(profile.affiliation).includes(profile.studyPath),
  );
}

export function resolveDiagnosisStep(
  search: string,
  state: SavedAppStateV2,
): DiagnosisStep {
  if (!hasValidProfile(state)) return "profile";
  if (state.profile!.studyPath === "track-major" && !state.targetTrackId) return "profile";
  const params = new URLSearchParams(search);
  const rawStep = params.get("step");
  const requested = rawStep && DIAGNOSIS_STEPS.has(rawStep as DiagnosisStep)
    ? rawStep as DiagnosisStep
    : params.get("view") === "result" ? "result" : "courses";
  if (requested === "result" && !state.courseInputReviewedAt) return "courses";
  return requested;
}

export function buildDiagnosisHref(currentHref: string, step: DiagnosisStep): string {
  const url = new URL(currentHref, "https://local.invalid");
  url.searchParams.set("view", step === "result" ? "result" : "diagnosis");
  url.searchParams.set("step", step);
  url.searchParams.delete("section");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function writeDiagnosisStepToHistory(
  step: DiagnosisStep,
  mode: "push" | "replace",
): void {
  const href = buildDiagnosisHref(window.location.href, step);
  const state = {
    ...(window.history.state ?? {}),
    view: step === "result" ? "result" : "diagnosis",
    step,
  };
  window.history[mode === "push" ? "pushState" : "replaceState"](state, "", href);
}
```

Wire the functions in `App.tsx` with this effect and navigation helper:

```tsx
const [diagnosisStep, setDiagnosisStep] = useState(() =>
  resolveDiagnosisStep(window.location.search, savedState),
);
const stepHeadingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  function syncFromLocation() {
    const next = resolveDiagnosisStep(window.location.search, savedState);
    if (new URLSearchParams(window.location.search).get("step") !== next) {
      writeDiagnosisStepToHistory(next, "replace");
    }
    setDiagnosisStep(next);
  }
  window.addEventListener("popstate", syncFromLocation);
  return () => window.removeEventListener("popstate", syncFromLocation);
}, [savedState]);

useEffect(() => {
  stepHeadingRef.current?.focus();
}, [diagnosisStep]);

function navigateDiagnosisStep(step: DiagnosisStep) {
  writeDiagnosisStepToHistory(step, "push");
  setDiagnosisStep(step);
}
```

Give every step heading `ref={stepHeadingRef}`, `tabIndex={-1}`, and a visible focus style. When the user confirms direct course input, set `courseInputReviewedAt` to a new ISO timestamp before navigating to `result`.

- [ ] **Step 4: Run routing, full tests, and build**

Run: `pnpm.cmd vitest run src/lib/viewRouting.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: all PASS.

- [ ] **Step 5: Run browser verification**

Start: `pnpm.cmd run dev`

Verify on desktop `1440×900` and mobile `390×844`:

1. first visit → profile → direct course selection → result
2. minor reaches course selection without a track
3. track-major cannot reach result without selecting a track
4. browser back/forward restores the prior step
5. refresh preserves the current step and selected courses
6. no horizontal overflow
7. keyboard-only profile and course flow completes
8. console errors and warnings are zero

Capture accepted screenshots under `output/playwright/foundation-20260830/` and inspect each image before reporting.

- [ ] **Step 6: Commit Task 6**

```powershell
git add src/lib/viewRouting.ts src/lib/viewRouting.test.ts src/App.tsx
git commit -m "feat: restore path diagnosis navigation"
```

---

### Task 7: Foundation Release Gate And Documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `reports/validation/2026-08-30-track-foundation-validation.md`

**Interfaces:**
- Consumes: all Task 1–6 test and browser evidence
- Produces: collaboration-ready validation record and remaining-risk list

- [ ] **Step 1: Run final automated validation**

Run:

```powershell
pnpm.cmd run test
pnpm.cmd run build
git diff --check
```

Expected: all commands exit 0; `git diff --check` may show line-ending warnings but no whitespace errors.

- [ ] **Step 2: Record exact validation evidence**

Create the report with:

```markdown
# 2026-08-30 트랙진단 기반 검증

## 구현
- 학생 소속·이수 경로 분리
- 규칙 근거 상태
- 필수·트랙·전체학점 독립 진행도
- 저장 v2 마이그레이션
- 주소·새로고침 복원

## 자동 검증
- 테스트 파일 수와 통과 테스트 수
- TypeScript·Vite 빌드 결과
- diff-check 결과

## 브라우저 검증
- 데스크톱·모바일 크기
- 완주한 경로
- 뒤로가기·앞으로가기·새로고침
- 키보드 흐름
- 콘솔 오류·가로 넘침

## 남은 위험
- 적용 학번과 필수 변형 공식 확인
- 경제학 트랙형 복수전공 최소학점
- 현장실습 등 기타 인정학점
- 추천·졸업계획·PDF·이미지는 후속 계획 범위
```

Do not write test counts until the commands have actually run.

- [ ] **Step 3: Update collaboration docs**

README and CHANGELOG must distinguish:

- official-public data
- provided-final-plan reference calculation
- official-review-required results
- features implemented in this foundation
- features still in the next plans

- [ ] **Step 4: Run documentation and status checks**

Run:

```powershell
rg -n "이수 확정|졸업 가능$|공식 판정" README.md CHANGELOG.md src reports
git status --short
git diff --stat
```

Expected: no unsupported certainty copy; only Task 7 documentation and intentional Task 1–6 files changed.

- [ ] **Step 5: Commit Task 7**

```powershell
git add README.md CHANGELOG.md reports/validation/2026-08-30-track-foundation-validation.md
git commit -m "docs: record track foundation validation"
```

- [ ] **Step 6: Stop before later feature plans**

Report the completed foundation, verification results, remaining official-data risks, and exact next plan. Do not start the recommendation, graduation planner, PDF, or image-generation implementation in the same unchecked batch.
