# Track Recommendation And Graduation Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관심 적합도·현재 이수 접근성·졸업 전 계획 가능성을 독립적으로 보여 주고, 2026 개설 이력의 한계를 밝힌 학기별 참고 계획을 학생이 저장할 수 있게 한다.

**Architecture:** 현재 `SavedAppStateV2`와 `calculatePathProgress`를 유지하면서, 공식 트랙 구조와 과거 개설 이력 스냅샷을 별도 데이터로 분리한다. 결정적 최소 과목 조합을 순수 함수로 만든 뒤 졸업 계획과 세 추천 축이 같은 함수를 소비하게 하고, 마지막에 기존 `App.tsx`의 숨은 종합순위·고정 6학점 가능성 화면을 새 컴포넌트로 교체한다.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Vitest 4, localStorage, lucide-react

**Spec:** `docs/superpowers/specs/2026-08-30-track-diagnosis-service-expansion-design.md`

## Global Constraints

- 기준 브랜치는 `codex/track-service-expansion`, 시작 커밋은 `a60f602c0b1dd965753ae85d294faba4d8412210`이다.
- 원본 작업 폴더 `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현`의 미커밋 파일은 읽기 전용 출처로만 사용하고 수정·이동·삭제·stash하지 않는다.
- `completed`만 현재 충족과 현재 이수 접근성에 사용한다. `in-progress`와 `planned`는 명시적인 계획 결과에만 사용한다.
- 관심 적합도, 현재 이수 접근성, 졸업 전 계획 가능성을 하나의 종합점수·통합 1위·숨은 가중치로 합치지 않는다.
- 2026 개설정보는 `2026 당시 종합강의시간표에서 확인한 개설 이력 스냅샷`이며 미래 반복 개설을 보장하지 않는다.
- 현재 공개 비로그인 상태에서 49개 교과목번호와 2026-1·2 개설을 완전히 재검증하지 못했음을 데이터와 UI에 표시한다.
- 자동 계획에는 정규학기만 사용한다. 계절학기는 용량에 합산하지 않고 확인 필요 항목으로만 반환한다.
- `starred-six-2026`, 타 학과 경제학 트랙 48학점, 학생 입력 추가 인정학점은 공식 이수 확정을 만들지 않는다.
- 같은 과목은 여러 조건에 기여할 수 있지만 고유 취득학점과 신규 과목 수에는 한 번만 합산한다.
- `PlanTerm`의 `next`·`following`·`later`는 삭제하지 않고, 현재 실제 학기가 입력된 뒤에만 새 학기 계획으로 해석한다.
- 서버 계정, 클라우드 동기화, 미래 개설 예측, OCR, 포털 자동 연동, 공식 졸업 판정은 범위 밖이다.
- 새 런타임 의존성은 이 계획에서 추가하지 않는다.
- 각 작업은 실패 테스트 → 최소 구현 → 집중 테스트 → 전체 테스트 → 빌드 → 별도 커밋 순서로 수행한다.

## Plan Boundary

이 계획은 승인된 2단계 `개인화와 실행 계획`만 구현한다. PDF 과목 불러오기, 진단 변화 비교 화면, 생성 이미지 3종과 랜딩 시각 개편은 다음 계획에서 구현한다. 다만 후속 기능이 사용할 타입·주소·삽입 위치는 이 계획에서 고정한다.

## File Responsibility Map

| 파일 | 책임 |
|---|---|
| `src/types.ts` | 학기·개설·관심·추천축·졸업계획 공유 타입 |
| `src/data/courseOfferings2026.ts` | 2026 당시 개설 이력 스냅샷과 현재 재검증 상태 |
| `src/data/curriculumData.ts` | 현재 공식 안내서 메타데이터와 트랙·과목 정적 데이터 |
| `src/lib/courseCombination.ts` | 결정적 최소 신규 과목 조합과 미배정 선택학점 |
| `src/lib/graduationPlanner.ts` | 정규학기 horizon, 수강량 배치, 미배치·추가학기 시나리오 |
| `src/lib/interestSurvey.ts` | 관심 설문 질문·점수·근접 후보 판정 |
| `src/lib/recommendationEngine.ts` | 관심·진행·계획 축 독립 결과와 공통방향 설명 |
| `src/lib/storage.ts` | 관심·계획 입력·결과·스냅샷 검증과 복구 |
| `src/lib/appRouting.ts` | 랜딩·설문·추천·계획 세부 주소와 별칭 복원 |
| `src/features/recommendations/*` | 설문과 3축 추천 화면 |
| `src/features/planning/*` | 계획 입력·요약·학기배치·확인질문 화면 |
| `src/App.tsx` | 기존 화면과 새 순수 모듈 연결, 이전 `lab`·`experiment` 주소 호환 |

---

### Task 1: Lock Current Official Metadata And Historical Offering Evidence

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/curriculumData.ts`
- Create: `src/data/courseOfferings2026.ts`
- Create: `src/data/courseOfferings2026.test.ts`
- Create: `docs/data/course-offerings-2026.md`

**Interfaces:**
- Produces: `AcademicTermId`, `CourseOfferingEvidence`, `CourseOfferingRecord`
- Produces: `courseOfferings2026`, `getObservedSemesterNumbers(courseId)`
- Preserves: existing `Course.recommendedSemester` as recommendation metadata, never opening evidence
- Read-only source: `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현\src\data\curriculumData.ts`

- [ ] **Step 1: Write the source-boundary document**

Create `docs/data/course-offerings-2026.md` with these exact claims and links:

```markdown
# 2026 개설 이력 데이터 경계

- 현재 확인일: 2026-08-30 KST
- 현재 학사종합안내: https://www.dankook.ac.kr/documents/d/kor/2026-1-_-260119-pdf?download=true#page=72
- 서버 최종 수정: 2026-08-27 11:19:56 KST
- 2026-1 고정본: https://lawbk21.dankook.ac.kr/documents/20118/12232463/2026%ED%95%99%EB%85%84%EB%8F%84%201%ED%95%99%EA%B8%B0%20%EC%A2%85%ED%95%A9%EA%B0%95%EC%9D%98%EC%8B%9C%EA%B0%84%ED%91%9C_%EC%97%85%EB%A1%9C%EB%93%9C%EC%9A%A9260119.pdf/0ecd0cf2-f64b-5986-a0c2-d01235678d4b?version=7.0#page=70
- 공식 확인 가능: 2024학년도 개설, 5개 트랙, 15개 모듈, 과목명과 학점
- 과거 프로젝트 확인: 2026 당시 종합강의시간표에서 49개 교과목번호와 개설 학기를 대조한 스냅샷
- 현재 재검증 한계: 공개 시간표 직접 주소는 HTTP 500, 안내 링크는 SSO로 이동해 49개 값을 비로그인 상태에서 완전 재검증하지 못함
- 사용 원칙: 2026 당시 개설 사실의 참고 이력으로만 사용하며 미래 반복 개설, 폐강 여부, 학점 인정은 보장하지 않음
```

Also record the fixed/current B-module wording difference (`필수` versus `전공`) and M/N/O normalization as official-document conflicts.

- [ ] **Step 2: Add failing evidence tests**

Create `src/data/courseOfferings2026.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { courses } from "./curriculumData";
import {
  COURSE_OFFERING_SNAPSHOT_META,
  courseOfferings2026,
  getObservedSemesterNumbers,
} from "./courseOfferings2026";

describe("2026 historical course offering snapshot", () => {
  it("covers every registered course exactly once", () => {
    expect(Object.keys(courseOfferings2026).sort()).toEqual(
      courses.map((course) => course.id).sort(),
    );
    expect(Object.keys(courseOfferings2026)).toHaveLength(49);
  });

  it("keeps recommendation semesters separate from observed openings", () => {
    expect(courseOfferings2026["m-1"]).toMatchObject({
      officialCourseCode: "541980",
      observedProgramSemesters: ["1-1", "1-2"],
      evidence: "historical-2026-snapshot",
    });
    expect(getObservedSemesterNumbers("m-1")).toEqual([1, 2]);
  });

  it("records the current public re-verification boundary", () => {
    expect(COURSE_OFFERING_SNAPSHOT_META).toMatchObject({
      observedAt: "2026-08-11",
      recheckedAt: "2026-08-30",
      currentPublicVerification: "blocked-by-public-access",
      allowsFutureOfferingGuarantee: false,
    });
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `pnpm.cmd vitest run src/data/courseOfferings2026.test.ts`

Expected: FAIL because the new data module and types do not exist.

- [ ] **Step 4: Add exact evidence types and metadata**

Add to `src/types.ts`:

```ts
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
```

Update `OFFICIAL_CURRICULUM_SOURCE` in `curriculumData.ts` so its live-document fields are:

```ts
currentVerifiedAt: "2026-08-30",
currentServerModifiedAt: "2026-08-27T11:19:56+09:00",
currentPage: 72,
stableSnapshotPage: 70,
```

Do not use the URL filename or the old `20260805` value as the current document version.

- [ ] **Step 5: Create the historical snapshot module**

Copy the exact 49 `courseOfferings2026` records and official course codes from the read-only source file into `src/data/courseOfferings2026.ts`. Wrap every row with `evidence: "historical-2026-snapshot"` and export:

```ts
export const COURSE_OFFERING_SNAPSHOT_META = {
  observedAt: "2026-08-11",
  recheckedAt: "2026-08-30",
  currentPublicVerification: "blocked-by-public-access",
  allowsFutureOfferingGuarantee: false,
  timetableSearchUrl:
    "https://webinfo.dankook.ac.kr/tiac/univ/lssn/lpci/views/lssnPopup/tmtbl2.do",
} as const;

export function getObservedSemesterNumbers(courseId: string): AcademicSemesterNumber[] {
  const record = courseOfferings2026[courseId];
  if (!record) return [];
  return [...new Set(
    record.observedProgramSemesters.map((value) => Number(value.split("-")[1]) as AcademicSemesterNumber),
  )].sort();
}
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm.cmd vitest run src/data/courseOfferings2026.test.ts src/data/requirementRules2026.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Expected: all PASS, and no current official claim is derived from `Course.recommendedSemester`.

Commit:

```powershell
git add docs/data/course-offerings-2026.md src/types.ts src/data/curriculumData.ts src/data/courseOfferings2026.ts src/data/courseOfferings2026.test.ts
git commit -m "data: separate historical course offerings"
```

---

### Task 2: Build The Deterministic Minimum Course Combination

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/courseCombination.ts`
- Create: `src/lib/courseCombination.test.ts`

**Interfaces:**
- Consumes: `calculatePathProgress`, `getRequirementRule`, `courses`, `TrackId`
- Produces: `findMinimumCourseCombination(input): MinimumCourseCombination`
- Produces: `calculateUnallocatedElectiveCredits(input): number`
- Ordering contract: hard conditions → new course count → new credits → schedulable count → recommended semester → course code

- [ ] **Step 1: Add failing deterministic-combination tests**

Create fixtures for a department track-major profile and an external minor. Add at least these tests:

```ts
import { describe, expect, it } from "vitest";
import { courses } from "../data/curriculumData";
import type { CourseCombinationInput, StudentProfile } from "../types";
import { findMinimumCourseCombination } from "./courseCombination";

const coursesById = Object.fromEntries(courses.map((course) => [course.id, course]));
const baseProfile = {
  goal: "plan-graduation",
  entryYear: 2026,
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
} as const;
const departmentTrackProfile: StudentProfile = {
  ...baseProfile,
  affiliation: "department-student",
  studyPath: "track-major",
};
const externalMinorProfile: StudentProfile = {
  ...baseProfile,
  affiliation: "external-student",
  studyPath: "minor",
};
const foodBioInput: CourseCombinationInput = {
  profile: departmentTrackProfile,
  targetTrackId: "food-bio-economy",
  assumedCourseIds: ["f-1", "h-1", "i-1"],
  additionalMajorCredits: [],
  schedulableCourseIds: new Set(courses.map((course) => course.id)),
};

it("counts a required course that also fills a module only once", () => {
  const result = findMinimumCourseCombination({
    profile: departmentTrackProfile,
    targetTrackId: "food-marketing",
    assumedCourseIds: ["c-1", "c-2", "c-3"],
    additionalMajorCredits: [],
    schedulableCourseIds: new Set(courses.map((course) => course.id)),
  });
  expect(new Set(result.courseIds).size).toBe(result.courseIds.length);
  expect(result.courseIds).toContain("f-1");
  expect(result.newCredits).toBe(
    result.courseIds.reduce((sum, id) => sum + coursesById[id].credits, 0),
  );
});

it("returns only unallocated elective credits for a minor without inventing courses", () => {
  const result = findMinimumCourseCombination({
    profile: externalMinorProfile,
    assumedCourseIds: ["b-1", "b-2", "c-1"],
    additionalMajorCredits: [],
    schedulableCourseIds: new Set(),
  });
  expect(result.courseIds).toEqual([]);
  expect(result.unallocatedElectiveCredits).toBe(12);
});

it("uses course code as the final stable tie breaker", () => {
  const first = findMinimumCourseCombination(foodBioInput);
  const second = findMinimumCourseCombination(foodBioInput);
  expect(second).toEqual(first);
  expect(first.comparisonKey.split("|")).toHaveLength(5);
});
```

Also cover B-1 exclusion from `starred-six-2026`, 2-credit M/N/O combinations, unknown input IDs, and a track whose total reaches 30 while one module remains short.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm.cmd vitest run src/lib/courseCombination.test.ts`

Expected: FAIL because the module and output types do not exist.

- [ ] **Step 3: Add exact combination types**

Add:

```ts
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
```

- [ ] **Step 4: Implement a bounded, deterministic search**

Implement these rules in `courseCombination.ts`:

```ts
const courseById = new Map(courses.map((course) => [course.id, course]));

function applicableCandidateIds(input: CourseCombinationInput): string[] {
  const rule = getRequirementRule(input.profile, input.targetTrackId);
  const required = rule.requiredCourseVariantId
    ? REQUIRED_COURSE_VARIANTS[rule.requiredCourseVariantId].courseIds
    : [];
  const trackIds = input.targetTrackId
    ? courses.filter((course) => isCourseInTrack(getTrack(input.targetTrackId!), course)).map((course) => course.id)
    : [];
  const assumed = new Set(input.assumedCourseIds);
  return [...new Set([...required, ...trackIds])]
    .filter((id) => courseById.has(id) && !assumed.has(id))
    .sort((left, right) => courseById.get(left)!.code.localeCompare(courseById.get(right)!.code));
}
```

Search subsets by increasing subset size. For each subset, create synthetic `completed` selections from `assumedCourseIds + subset`, call `calculatePathProgress`, and accept a subset only when required and track progress have zero missing credits; do not require total-major credits because the remainder is returned as `unallocatedElectiveCredits`.

Within the first subset size that satisfies hard conditions, sort accepted combinations by:

```ts
newCredits ascending;
unschedulable course count ascending;
sum of recommended-semester ranks ascending;
comma-joined course codes ascending;
```

Set `comparisonKey` to the exact stable diagnostic string
`<newCourseCount>|<newCredits>|<unschedulableCount>|<recommendedRankSum>|<commaJoinedCourseCodes>`.

Stop after the first satisfying subset size. The candidate universe is only required/track courses, so the search never enumerates unrelated electives.

Calculate:

```ts
unallocatedElectiveCredits = Math.max(
  0,
  rule.totalMajorCredits - uniqueKnownAssumedAndSelectedCredits - additionalMajorCreditsTotal,
);
```

A-module credits remain excluded because `uniqueKnownAssumedAndSelectedCredits` filters `moduleId !== "A"`.

- [ ] **Step 5: Verify determinism and performance**

Run the focused file twice. Add a test that evaluates all five tracks under an empty input and expects the whole call to finish within 500ms on the test host; record the measured duration but do not make browser timing a completion claim.

Run: `pnpm.cmd vitest run src/lib/courseCombination.test.ts src/lib/progressEngine.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

- [ ] **Step 6: Commit**

```powershell
git add src/types.ts src/lib/courseCombination.ts src/lib/courseCombination.test.ts
git commit -m "feat: calculate minimum track course sets"
```

---

### Task 3: Build The Semester-Aware Graduation Planner

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/graduationPlanner.ts`
- Create: `src/lib/graduationPlanner.test.ts`

**Interfaces:**
- Consumes: `findMinimumCourseCombination`, `courseOfferings2026`, `CourseSelectionRecord[]`
- Produces: `compareAcademicTerms`, `buildRegularTermHorizon`, `scheduleCoursesWithinLoad`, `calculateGraduationPlan`
- Produces: one primary planning status plus independent `reviewItems` and `unplacedCourses`

- [ ] **Step 1: Add exact planning types**

Add:

```ts
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

export type PlannedCourseOrigin = "in-progress" | "user-planned" | "generated";

export type PlannedCoursePlacement = {
  termId: AcademicTermId;
  courseId: string;
  origin: PlannedCourseOrigin;
  offeringEvidence: CourseOfferingEvidence;
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
  unallocatedElectiveCredits: number;
  unallocatedElectiveSlots: number;
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
```

Extend `ReviewItem.code` with `future-offering`, `seasonal-term`, `plan-input`, and `elective-placeholder`.

- [ ] **Step 2: Write failing planner tests**

Cover these exact contracts:

```ts
expect(buildRegularTermHorizon("2026-2", "2028-1")).toEqual([
  "2027-1", "2027-2", "2028-1",
]);
expect(() => buildRegularTermHorizon("2027-1", "2026-2")).toThrow(
  "Target graduation term must not be earlier than current term",
);
```

Then test:

1. no placement exceeds `maxMajorCoursesPerTerm`;
2. a course observed only in semester 2 is not put in a semester-1 term;
3. `in-progress` appears in the current term and does not count as current completion;
4. `plannedTerm: "next"` and `"following"` map to the first and second horizon terms;
5. `plannedTerm: "later"` remains flexible but keeps origin `user-planned`;
6. seasonal consideration changes no capacity and adds a review item;
7. exactly fitting regular capacity returns `regular-plan-possible`;
8. fitting only after raising the per-term maximum returns `load-adjustment-needed` and the smallest required maximum;
9. fitting within added regular terms returns `extra-term-possible`;
10. unknown offering evidence returns `official-review-required` with an unplaced reason;
11. external economics track keeps the 48-credit document conflict review item;
12. unallocated elective credits reserve `Math.ceil(credits / 3)` slots without inventing course IDs.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `pnpm.cmd vitest run src/lib/graduationPlanner.test.ts`

Expected: FAIL because the planner does not exist.

- [ ] **Step 4: Implement term parsing and horizon generation**

Use numeric parsing, not string ordering:

```ts
function termIndex(termId: AcademicTermId): number {
  const [year, semester] = termId.split("-").map(Number);
  return year * 2 + (semester - 1);
}

function termIdFromIndex(index: number): AcademicTermId {
  const year = Math.floor(index / 2);
  const semester = (index % 2) + 1;
  return `${year}-${semester}` as AcademicTermId;
}

export function compareAcademicTerms(left: AcademicTermId, right: AcademicTermId): number {
  return termIndex(left) - termIndex(right);
}

export function buildRegularTermHorizon(
  currentTerm: AcademicTermId,
  targetTerm: AcademicTermId,
): AcademicTermId[] {
  const current = termIndex(currentTerm);
  const target = termIndex(targetTerm);
  if (target < current) throw new Error("Target graduation term must not be earlier than current term");
  return Array.from({ length: target - current }, (_, index) => termIdFromIndex(current + index + 1));
}
```

- [ ] **Step 5: Implement scheduling and status selection**

Implement `scheduleCoursesWithinLoad` as a stable greedy scheduler over the already deterministic combination order:

1. place `next` and `following` user courses into their exact mapped term if evidence and capacity allow;
2. put flexible user-planned courses before generated courses;
3. among the same origin, sort required courses first, then recommended-semester rank, then code;
4. only use terms whose semester number appears in `getObservedSemesterNumbers(courseId)`;
5. if no offering record exists, return `offering-unknown` without placement;
6. never place more than `maxMajorCoursesPerTerm` course records in a term;
7. allocate anonymous elective slots after named courses and return only term/credit counts, never fake course IDs.

In `calculateGraduationPlan`, run these scenarios in order:

```text
completed-only hard and total conditions satisfied → currently-satisfied
target horizon at user maximum succeeds → regular-plan-possible
target horizon at smallest maximum from user maximum+1 through 6 succeeds → load-adjustment-needed
two additional regular terms at the user maximum succeed → extra-term-possible
unknown/conflicting/remaining unplaced requirements → official-review-required
```

Future placements using `historical-2026-snapshot` add this exact review message without overriding an otherwise useful capacity status:

```text
2026학년도 개설 이력을 참고한 계획입니다. 이후 학기의 반복 개설을 보장하지 않으며, 실제 개설·폐강·인정 여부는 해당 학기 수강신청 시스템과 학과 안내를 확인해야 합니다.
```

- [ ] **Step 6: Verify and commit**

Run: `pnpm.cmd vitest run src/lib/graduationPlanner.test.ts src/lib/courseCombination.test.ts src/lib/progressEngine.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Commit:

```powershell
git add src/types.ts src/lib/graduationPlanner.ts src/lib/graduationPlanner.test.ts
git commit -m "feat: build semester graduation plans"
```

---

### Task 4: Separate Interest, Progress, And Plan Recommendation Axes

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/interestSurvey.ts`
- Create: `src/lib/interestSurvey.test.ts`
- Create: `src/lib/recommendationEngine.ts`
- Create: `src/lib/recommendationEngine.test.ts`
- Read-only source: `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현\src\lib\interestSurvey.ts`

**Interfaces:**
- Produces: `scoreInterestSurvey`, `compareInterestSurveyResults`, `isInterestSurveyComplete`
- Produces: `rankTracksByProgressAccessibility`, `rankTracksByGraduationPlanability`, `buildRecommendationAxes`
- Consumes: completed-only selections for progress and all explicit statuses for planning

- [ ] **Step 1: Port and test the approved interest survey**

Copy the exact ten question statements, weights, `CLOSE_INTEREST_SCORE_GAP = 5`, five track summaries, and scoring functions from the read-only source. Put persisted types in `src/types.ts`:

```ts
export type InterestSurveyAnswer = 1 | 2 | 3 | 4 | 5;
export type InterestSurveyState = {
  answers: Record<string, InterestSurveyAnswer>;
  currentIndex: number;
  completedAt?: string;
  selectedTrackId?: TrackId;
};
```

Port the six existing interest tests and add invalid/missing answer tests. Do not keep the separate `track-sim:interest-survey:v1` storage module; Task 5 stores this state inside v2.

- [ ] **Step 2: Add recommendation-axis types**

```ts
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
```

Do not add `overallScore`, `overallRank`, `balancedScore`, or an aggregate winner field.

- [ ] **Step 3: Write failing independence tests**

Create cases where:

- food marketing leads interest;
- economics leads completed-only progress;
- regional development is the only regular-plan candidate;
- the three leaders differ and `alignedLeaderTrackIds` is empty;
- the same track leads two axes and appears once in `alignedLeaderTrackIds`;
- no survey means `interest` is `undefined`, not zero-filled;
- no plan preferences means `plan` is `undefined`;
- all completed inputs are empty, so progress ties resolve by the fixed `tracks` data order and explicitly state `track-major-hypothesis` for a non-track profile;
- adding only `in-progress` courses changes the plan axis but not the progress axis.

Assert that serialized candidates contain none of the prohibited aggregate keys.

- [ ] **Step 4: Implement independent ranking**

For each comparison track, derive a comparison profile:

```ts
function comparisonProfile(profile: StudentProfile): StudentProfile {
  if (profile.studyPath === "track-major") return profile;
  return { ...profile, studyPath: "track-major", ruleApplicability: "reference-only" };
}
```

Progress ordering:

```text
missingCourseCount ascending
missingCredits ascending
missingModuleLabels.length ascending
track data order ascending
```

Use only `status === "completed"` to build `assumedCourseIds`.

Plan ordering:

```text
currently-satisfied
regular-plan-possible
load-adjustment-needed
extra-term-possible
official-review-required
unplacedCourseCount ascending
neededExtraTerms ascending
track data order ascending
```

Call `calculateGraduationPlan` separately for every track. Do not derive the plan axis from the progress rank.

`alignedLeaderTrackIds` is the set of track IDs that belong to the leading tie group of at least two available axes. Do not force a single leader when an axis has ties.

- [ ] **Step 5: Verify and commit**

Run: `pnpm.cmd vitest run src/lib/interestSurvey.test.ts src/lib/recommendationEngine.test.ts src/lib/graduationPlanner.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Commit:

```powershell
git add src/types.ts src/lib/interestSurvey.ts src/lib/interestSurvey.test.ts src/lib/recommendationEngine.ts src/lib/recommendationEngine.test.ts
git commit -m "feat: separate track recommendation axes"
```

---

### Task 5: Extend V2 Persistence, Snapshots, And Page Routing

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/lib/storage.test.ts`
- Create: `src/lib/appRouting.ts`
- Create: `src/lib/appRouting.test.ts`

**Interfaces:**
- Extends: `SavedAppStateV2.interestSurvey`, `graduationPlanPreferences`, `graduationPlan`
- Produces: `appendDiagnosisSnapshot`, `resolveAppRoute`, `buildAppHref`, `writeAppRouteToHistory`
- Preserves: legacy v2 states, `currentSemester`, `targetGraduationSemester`, and `PlanTerm`

- [ ] **Step 1: Extend saved state additively**

Replace `interestSurvey?: unknown` and add:

```ts
interestSurvey?: InterestSurveyState;
graduationPlanPreferences?: GraduationPlanPreferences;
graduationPlan?: GraduationPlanResult;
```

Extend `DiagnosisSnapshot` with optional `recommendationAxes` and `graduationPlan`; do not make old snapshots invalid.

- [ ] **Step 2: Write failing storage tests**

Add tests that:

1. load an existing valid v2 state with none of the new fields;
2. reject invalid survey answers outside 1–5 and recover the last valid snapshot;
3. reject `targetGraduationTerm` earlier than `currentTerm`;
4. reject `maxMajorCoursesPerTerm` outside 1–6;
5. reject a stored plan whose preferences do not equal the saved preferences;
6. preserve legacy `currentSemester`, `targetGraduationSemester`, and all `PlanTerm` values;
7. append a diagnosis snapshot instead of overwriting the latest one;
8. keep only the newest 12 snapshots after appending.

- [ ] **Step 3: Implement runtime guards and snapshot append**

Add narrow guards for every new enum and nested array. Validate `AcademicTermId` with `/^\d{4}-(1|2)$/`, then compare numeric term indices. Ensure plan placements contain known course IDs; anonymous elective slots are represented only by numeric fields.

Export:

```ts
export function appendDiagnosisSnapshot(
  state: SavedAppStateV2,
  snapshot: DiagnosisSnapshot,
): SavedAppStateV2 {
  return {
    ...state,
    snapshots: normalizeSnapshotHistory([...state.snapshots, snapshot]),
  };
}
```

- [ ] **Step 4: Define canonical app routes**

Use:

```ts
export type AppRoute =
  | { view: "landing" }
  | { view: "diagnosis"; step: DiagnosisStep }
  | { view: "recommendation"; step: "survey" | "axes"; axis?: "interest" | "progress" | "plan" }
  | { view: "plan"; step: "setup" | "schedule" | "checks" }
  | { view: "overview" | "resources" | "modules" | "result" | "contact" };
```

Rules:

- `view=lab` resolves to `{ view: "recommendation", step: "axes" }`;
- `view=experiment` resolves to `{ view: "plan", step: "setup" }`;
- recommendation `axes` without a completed survey still allows progress results;
- plan `schedule` without saved preferences resolves to plan `setup`;
- diagnosis routes continue to call `resolveDiagnosisStep`;
- unrelated query parameters survive route writes;
- aliases are replaced with canonical URLs on mount, while user navigation uses push history.

- [ ] **Step 5: Verify and commit**

Run: `pnpm.cmd vitest run src/lib/storage.test.ts src/lib/appRouting.test.ts src/lib/viewRouting.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Commit:

```powershell
git add src/types.ts src/lib/storage.ts src/lib/storage.test.ts src/lib/appRouting.ts src/lib/appRouting.test.ts
git commit -m "feat: persist recommendation and plan state"
```

---

### Task 6: Add The Interest Flow And Three-Axis Recommendation Pages

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/profile/StudyPathSetup.tsx`
- Modify: `src/features/profile/StudyPathSetup.test.tsx`
- Create: `src/features/recommendations/InterestSurvey.tsx`
- Create: `src/features/recommendations/InterestSurvey.test.tsx`
- Create: `src/features/recommendations/TrackRecommendationAxes.tsx`
- Create: `src/features/recommendations/TrackRecommendationAxes.test.tsx`
- Create: `src/features/recommendations/AxisResultCard.tsx`
- Modify: `src/styles.css`
- Create: `src/App.recommendation-integration.test.tsx`

**Interfaces:**
- Consumes: `buildRecommendationAxes`, v2 persistence, canonical app routes
- Produces: two landing entry actions and independent recommendation pages
- Replaces in active UI: `LabView`, aggregate `1순위`, aggregate feasibility copy

- [ ] **Step 1: Write failing profile and landing-flow tests**

Add these contracts:

- an empty first visit at `/` renders the landing page, not the profile form;
- `자가진단 바로 시작` opens profile with goal `check-progress`;
- `내 관심 트랙 찾기` opens `?view=recommendation&step=survey` without requiring a profile;
- `find-track + track-major` may complete profile without a target track and routes to survey;
- `check-progress + track-major` still requires direct target-track selection;
- a selected survey track is persisted, preselected in profile, and reaches course selection after profile completion;
- refresh restores the current survey question and axes page;
- no button claims an overall `1순위`.

- [ ] **Step 2: Implement the controlled survey component**

Use the read-only `InterestSurveyView.tsx` as visual baseline but make v2 state controlled:

```ts
type InterestSurveyProps = {
  value: InterestSurveyState;
  storageError: boolean;
  onChange: (value: InterestSurveyState) => void;
  onChooseTrack: (trackId: TrackId) => void;
  onSkipToDiagnosis: () => void;
};
```

Keep ten one-question-at-a-time screens, visible `N / 10`, 1–5 labeled answers, previous/next, result focus, close-score explanation, direct track selection, and a skip action. Do not use a second localStorage key.

- [ ] **Step 3: Implement the axes page**

`TrackRecommendationAxes` renders three top-level cards with these exact headings:

```text
관심에 가까운 트랙
현재 이수 과목으로 가까운 트랙
졸업 전 계획을 만들기 쉬운 트랙
```

If an axis lacks inputs, render its input CTA instead of a zero score. If leaders align, show `여러 기준이 같은 방향을 가리켜요`; if they differ, show `기준에 따라 결과가 달라요. 중요하게 볼 기준을 선택해 비교하세요.`

Each axis has its own ordered list and explanation. Progress and plan cards for non-track students show `트랙형전공으로 전환한다고 가정한 비교`.

- [ ] **Step 4: Integrate without deleting existing diagnostic detail**

Reorder App's top-level rendering:

```text
landing → recommendation survey/axes → diagnosis profile/courses → result → plan
```

This prevents a missing profile from hiding the landing page. Add canonical history synchronization through `appRouting.ts`.

Replace active navigation to `lab` with the new recommendation route. Remove aggregate ranking language from the rendered UI. Keep old pure `calculateTrackRecommendations` only until no current render path consumes it; remove its App imports when unused.

- [ ] **Step 5: Add accessible pastel styling**

Use existing sky/mint tokens, one primary action per screen, 44px controls, `focus-visible`, text labels with every icon, and mobile single-column results. Do not add generated images in this task.

- [ ] **Step 6: Verify and commit**

Run: `pnpm.cmd vitest run src/features/recommendations/InterestSurvey.test.tsx src/features/recommendations/TrackRecommendationAxes.test.tsx src/features/profile/StudyPathSetup.test.tsx src/App.recommendation-integration.test.tsx`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Commit:

```powershell
git add src/App.tsx src/styles.css src/features/profile src/features/recommendations src/App.recommendation-integration.test.tsx
git commit -m "feat: add independent track recommendations"
```

---

### Task 7: Add Distributed Graduation Plan Pages And Next Actions

**Files:**
- Modify: `src/App.tsx`
- Create: `src/features/planning/GraduationPlanSetup.tsx`
- Create: `src/features/planning/GraduationPlanSetup.test.tsx`
- Create: `src/features/planning/GraduationPlanResult.tsx`
- Create: `src/features/planning/GraduationPlanResult.test.tsx`
- Create: `src/features/planning/TermPlanColumn.tsx`
- Create: `src/features/planning/UnplacedCourseList.tsx`
- Create: `src/features/planning/OfficialCheckQuestions.tsx`
- Create: `src/App.graduation-plan-integration.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `calculateGraduationPlan`, `GraduationPlanPreferences`, `AppRoute`
- Produces: setup → schedule → checks pages, persisted plan and explicit next actions
- Replaces in active UI: fixed 6-credit `ExperimentView` feasibility display

- [ ] **Step 1: Write failing setup tests**

Verify:

- current term defaults to `2026-2` only for a new empty form and remains editable;
- target term must be the same or later than current term;
- max major courses is an integer from 1 through 6;
- seasonal-term checkbox explicitly says it does not enter the automatic possibility calculation;
- submit is disabled until valid;
- existing valid preferences restore after refresh;
- plan generation never changes completed course selections.

- [ ] **Step 2: Implement the four-input setup page**

Inputs only:

```text
현재 학기
목표 졸업 학기
학기당 최대 전공과목 수
계절학기 고려 여부
```

The primary action is `학기별 참고 계획 만들기`. Show the current evidence notice before submission and link to `docs/data/course-offerings-2026.md` through the public official-source UI, not a local file URL.

Use this controlled contract and validation:

```tsx
export function GraduationPlanSetup({
  value,
  onChange,
  onSubmit,
}: {
  value: Partial<GraduationPlanPreferences>;
  onChange: (value: Partial<GraduationPlanPreferences>) => void;
  onSubmit: (value: GraduationPlanPreferences) => void;
}) {
  const academicTermPattern = /^\d{4}-(1|2)$/;
  const currentValid = academicTermPattern.test(value.currentTerm ?? "");
  const targetTermValid = academicTermPattern.test(value.targetGraduationTerm ?? "");
  const targetValid = Boolean(
    currentValid &&
    targetTermValid &&
    compareAcademicTerms(
      value.targetGraduationTerm as AcademicTermId,
      value.currentTerm as AcademicTermId,
    ) >= 0,
  );
  const loadValid = Number.isInteger(value.maxMajorCoursesPerTerm) &&
    Number(value.maxMajorCoursesPerTerm) >= 1 &&
    Number(value.maxMajorCoursesPerTerm) <= 6;
  const valid = targetValid && loadValid && value.considerSeasonalTerm !== undefined;

  return <form onSubmit={(event) => {
    event.preventDefault();
    if (valid) onSubmit(value as GraduationPlanPreferences);
  }}>
    <label>현재 학기<input aria-describedby="current-term-help" pattern="[0-9]{4}-[12]" value={value.currentTerm ?? ""} onChange={(event) => onChange({ ...value, currentTerm: event.target.value as AcademicTermId })} /></label>
    <small id="current-term-help">예: 2026-2</small>
    <label>목표 졸업 학기<input pattern="[0-9]{4}-[12]" value={value.targetGraduationTerm ?? ""} onChange={(event) => onChange({ ...value, targetGraduationTerm: event.target.value as AcademicTermId })} /></label>
    <label>학기당 최대 전공과목 수<input type="number" min="1" max="6" step="1" value={value.maxMajorCoursesPerTerm ?? ""} onChange={(event) => onChange({ ...value, maxMajorCoursesPerTerm: Number(event.target.value) })} /></label>
    <label><input type="checkbox" checked={value.considerSeasonalTerm ?? false} onChange={(event) => onChange({ ...value, considerSeasonalTerm: event.target.checked })} />계절학기 고려 여부</label>
    <p>계절학기는 자동 가능성 계산에 포함하지 않고 확인할 항목으로만 남겨요.</p>
    <button type="submit" disabled={!valid}>학기별 참고 계획 만들기</button>
  </form>;
}
```

The implementer may replace the two patterned text inputs with equivalent year/semester selects, but the stored value and validation remain `AcademicTermId`. Do not add profile, track, PDF, or account fields to this form.

- [ ] **Step 3: Write failing result-page tests**

For each status, assert the exact safe heading:

```text
currently-satisfied → 현재 입력 기준으로 충족했어요
regular-plan-possible → 목표 학기 안에 참고 계획을 만들었어요
load-adjustment-needed → 학기당 수강량 조정이 필요해요
extra-term-possible → 추가 학기가 필요할 가능성이 있어요
official-review-required → 계획 전에 공식 확인이 필요해요
```

Assert that no heading contains bare `졸업 가능`, `이수 확정`, or a guaranteed future opening claim.

- [ ] **Step 4: Implement three distributed result routes**

`step=schedule` shows only:

- status summary;
- per-term columns;
- named course placements;
- anonymous `전공 선택 과목 N학점 자리` reservations;
- `최근 개설 패턴 기준` evidence badge;
- edit-load and save-plan actions.

`step=checks` shows only:

- unplaced courses and reasons;
- official review items;
- generated questions for the department;
- next actions: edit inputs, return to course selection, open official resources.

Keep the setup page at `step=setup`. Browser back and refresh restore each page.

Use this route-level result contract:

```tsx
export function GraduationPlanResult({
  result,
  step,
  onEdit,
  onShowChecks,
  onSave,
}: {
  result: GraduationPlanResult;
  step: "schedule" | "checks";
  onEdit: () => void;
  onShowChecks: () => void;
  onSave: () => void;
}) {
  if (step === "checks") {
    return <><UnplacedCourseList items={result.unplacedCourses} /><OfficialCheckQuestions items={result.reviewItems} /></>;
  }
  return <><PlanStatusSummary result={result} /><TermPlanBoard placements={result.placements} /><button type="button" onClick={onSave}>계획 저장</button><button type="button" onClick={onShowChecks}>확인할 항목 보기</button><button type="button" onClick={onEdit}>조건 수정</button></>;
}
```

`PlanStatusSummary` and `TermPlanBoard` may be private functions in this file; `UnplacedCourseList` and `OfficialCheckQuestions` remain the separate files named in the task.

- [ ] **Step 5: Save plan and diagnosis snapshot explicitly**

On `계획 저장`, persist the exact `GraduationPlanResult` and append one `DiagnosisSnapshot` with the current rule version, input snapshot, path result, recommendation axes, and plan. Generate IDs and timestamps in App, pass them into pure helpers for tests, and rely on storage normalization for the 12-item cap.

Do not append snapshots during render or every keystroke.

- [ ] **Step 6: Replace the active legacy semester screen**

Map the old `experiment` URL to plan setup and stop rendering the fixed 6-credit capacity UI. Preserve existing `next/following/later` choices in saved state and translate them only when preferences exist.

- [ ] **Step 7: Verify and commit**

Run: `pnpm.cmd vitest run src/features/planning/GraduationPlanSetup.test.tsx src/features/planning/GraduationPlanResult.test.tsx src/App.graduation-plan-integration.test.tsx src/lib/graduationPlanner.test.ts`

Run: `pnpm.cmd run test`

Run: `pnpm.cmd run build`

Commit:

```powershell
git add src/App.tsx src/styles.css src/features/planning src/App.graduation-plan-integration.test.tsx
git commit -m "feat: connect semester graduation planning"
```

---

### Task 8: Personalization Release Gate, Browser QA, And Documentation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-08-30-track-diagnosis-service-expansion-design.md`
- Create: `reports/validation/2026-08-30-recommendation-planning-validation.md`
- Create: `docs/assets/2026-08-30-personalization/01-landing-desktop.png`
- Create: `docs/assets/2026-08-30-personalization/02-interest-survey-desktop.png`
- Create: `docs/assets/2026-08-30-personalization/03-recommendation-axes-desktop.png`
- Create: `docs/assets/2026-08-30-personalization/04-plan-schedule-desktop.png`
- Create: `docs/assets/2026-08-30-personalization/05-plan-checks-mobile.png`
- Create: `docs/assets/2026-08-30-personalization/06-direct-diagnosis-mobile.png`

**Interfaces:**
- Consumes: Tasks 1–7 implementation, tests, browser state, official evidence boundary
- Produces: final evidence for this plan and exact handoff to PDF/image plan

- [ ] **Step 1: Run final automated checks**

Run:

```powershell
pnpm.cmd run test
pnpm.cmd run build
git diff --check
rg -n "종합 1위|통합 1위|졸업 가능$|이수 확정|미래 개설 보장" src README.md CHANGELOG.md reports
```

Record exact test-file/test counts and build module count only from these commands.

- [ ] **Step 2: Run desktop and mobile browser flows**

At 1440×900 and 390×844, complete and capture:

1. empty visit → landing → direct diagnosis;
2. empty visit → interest survey → select track → profile → course input → result;
3. recommendation axes with different leaders;
4. recommendation axes with aligned leaders;
5. regular schedule plan;
6. load adjustment result;
7. extra-term possibility result;
8. official-review-required result;
9. plan schedule → checks using back/forward/refresh;
10. keyboard-only landing → survey → profile → course selection → result → plan setup.

For every flow inspect console errors, horizontal overflow, focus visibility, sticky/mobile controls, and storage restoration. Use only synthetic course selections; no real student name, number, transcript, or PDF.

- [ ] **Step 3: Preserve final-HEAD screenshots**

Save accepted originals under `output/playwright/personalization-20260830/`, copy the six listed files into `docs/assets/2026-08-30-personalization/`, compare SHA-256 values, and record hashes. Do not delete the ignored originals.

- [ ] **Step 4: Update honest release documentation**

Set the spec status to `사용자 승인·단계 구현 중`. README and CHANGELOG must state:

- three axes are independent;
- 2026 offering values are a historical snapshot with current public re-verification blocked;
- future repeat offerings and official graduation are not guaranteed;
- direct selection remains the base input;
- PDF import and generated explanatory images remain the next plan;
- browser print/PDF save is an existing output feature and is not transcript import.

The validation report must list automated counts, each browser scenario, screenshot hash, deferred minor, and official-data risk.

- [ ] **Step 5: Commit the release gate**

```powershell
git add README.md CHANGELOG.md docs/superpowers/specs/2026-08-30-track-diagnosis-service-expansion-design.md reports/validation/2026-08-30-recommendation-planning-validation.md docs/assets/2026-08-30-personalization
git commit -m "docs: validate recommendation and planning flow"
```

- [ ] **Step 6: Stop at the next-plan boundary**

Report the completed independent recommendation axes, graduation planning evidence, remaining official-data risks, and the exact next plan: browser-only PDF import beta, diagnostic change comparison, three explanatory image slots, official campus-photo licensing boundary, and full end-to-end QA. Do not install a PDF dependency or generate images inside this plan.
