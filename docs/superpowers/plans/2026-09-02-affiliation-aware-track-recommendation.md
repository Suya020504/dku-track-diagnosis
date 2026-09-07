# Affiliation-Aware Track Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask affiliation before the optional interest survey, show separate department/external question banks, preserve unrelated diagnosis data, and skip the duplicate affiliation screen after track selection.

**Architecture:** Store the survey audience with the survey answers, keep question data separate from scoring logic, and encode audience in the canonical recommendation URL. The existing five-track score engine remains deterministic; only the selected question bank changes.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest 4, localStorage v2

**Spec:** `docs/superpowers/specs/2026-09-02-full-service-interaction-responsive-expansion-design.md`

## Global Constraints

- Keep `track-sim:v2` and last-valid rollback semantics.
- Changing survey audience resets survey-only data, never profile, courses, snapshots, or graduation plan.
- Department and external banks each contain exactly 10 unique IDs and give every track two primary-weight questions.
- The survey never auto-selects a track.
- Invalid audience URLs recover to the audience choice screen.
- All visible controls remain at least 44×44px and keyboard operable.

---

### Task 1: Add Survey Audience and Two Question Banks

**Files:**
- Create: `src/data/interestSurveyQuestions.ts`
- Modify: `src/types.ts:107-112`
- Modify: `src/lib/interestSurvey.ts`
- Test: `src/lib/interestSurvey.test.ts`

**Interfaces:**
- Produces: `InterestSurveyAudience`, `INTEREST_SURVEY_QUESTIONS`, `getInterestSurveyQuestions(audience)`
- Updates: `scoreInterestSurvey(answers, audience)`, `isInterestSurveyComplete(answers, audience)`

- [ ] **Step 1: Write failing audience-balance tests**

```ts
import { getInterestSurveyQuestions } from "../data/interestSurveyQuestions";

it.each(["department-student", "external-student"] as const)(
  "gives %s ten unique and balanced questions",
  (audience) => {
    const questions = getInterestSurveyQuestions(audience);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((item) => item.id)).size).toBe(10);
    expect(questions.every((item) => item.id.startsWith(audience === "department-student" ? "dept-" : "external-"))).toBe(true);
    for (const trackId of ["food-marketing", "regional-development-consulting", "agri-food-distribution", "economics", "food-bio-economy"] as const) {
      expect(questions.filter((item) => item.weights[trackId] === 1)).toHaveLength(2);
    }
  },
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- --run src/lib/interestSurvey.test.ts`

Expected: FAIL because `getInterestSurveyQuestions` and audience-aware signatures do not exist.

- [ ] **Step 3: Add the audience type and question data**

```ts
export type InterestSurveyAudience = StudentAffiliation;

export type InterestSurveyState = {
  audience?: InterestSurveyAudience;
  answers: Record<string, InterestSurveyAnswer>;
  currentIndex: number;
  completedAt?: string;
  selectedTrackId?: TrackId;
};

export const INTEREST_SURVEY_QUESTIONS: Record<InterestSurveyAudience, InterestSurveyQuestion[]> = {
  "department-student": departmentQuestions,
  "external-student": externalQuestions,
};

export function getInterestSurveyQuestions(audience: InterestSurveyAudience) {
  return INTEREST_SURVEY_QUESTIONS[audience];
}
```

Use the exact 20 IDs and statements from spec sections 4.2 and 4.3. Preserve the current secondary weights for the same neighboring track.

- [ ] **Step 4: Make scoring consume the selected bank**

```ts
export function scoreInterestSurvey(
  answers: Readonly<Record<string, unknown>>,
  audience: InterestSurveyAudience,
): InterestSurveyResult[] {
  const questions = getInterestSurveyQuestions(audience);
  const trackOrder = new Map(tracks.map((track, index) => [track.id, index]));
  return tracks.map((track) => {
    let weightedScore = 0;
    let totalWeight = 0;
    for (const question of questions) {
      const answer = answers[question.id];
      const weight = question.weights[track.id] ?? 0;
      if (!isInterestSurveyAnswer(answer) || weight === 0) continue;
      weightedScore += (answer - 1) * weight;
      totalWeight += 4 * weight;
    }
    const profile = interestTrackProfiles[track.id];
    return {
      trackId: track.id,
      trackName: track.name,
      score: totalWeight === 0 ? 0 : Math.round((weightedScore / totalWeight) * 100),
      summary: profile.summary,
      reasons: profile.reasons,
    };
  }).sort((left, right) => right.score - left.score ||
    (trackOrder.get(left.trackId) ?? 0) - (trackOrder.get(right.trackId) ?? 0));
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm.cmd test -- --run src/lib/interestSurvey.test.ts`

Expected: PASS, including the existing score-gap behavior for both audiences.

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/data/interestSurveyQuestions.ts src/types.ts src/lib/interestSurvey.ts src/lib/interestSurvey.test.ts
git commit -m "feat: split interest survey by affiliation"
```

---

### Task 2: Validate and Migrate Audience-Aware Survey Storage

**Files:**
- Modify: `src/lib/storage.ts:19,194-220,520-545`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `getInterestSurveyQuestions(audience)`
- Produces: safe loading of legacy audience-less surveys without deleting other v2 state

- [ ] **Step 1: Write failing storage tests**

```ts
it("loads a valid audience-specific survey", () => {
  const state = {
    ...createEmptyAppState(),
    interestSurvey: {
      audience: "external-student" as const,
      answers: Object.fromEntries(getInterestSurveyQuestions("external-student").map((q) => [q.id, 3 as const])),
      currentIndex: 9,
    },
  };
  expect(loadAppState(makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(state) }))).toEqual(state);
});

it("keeps legacy state but does not treat audience-less answers as a completed new survey", () => {
  const legacySurveyState = {
    ...createEmptyAppState(),
    courseSelections: [{ courseId: "b-1", status: "completed" as const }],
    interestSurvey: { answers: { "consumer-choice": 3 as const }, currentIndex: 0 },
  };
  const loaded = loadAppState(makeStorage({ [STORAGE_KEY_V2]: JSON.stringify(legacySurveyState) }));
  expect(loaded.courseSelections).toEqual(legacySurveyState.courseSelections);
  expect(loaded.interestSurvey?.audience).toBeUndefined();
});
```

- [ ] **Step 2: Run storage tests and verify RED**

Run: `npm.cmd test -- --run src/lib/storage.test.ts`

Expected: FAIL because storage validates only the legacy shared ID set.

- [ ] **Step 3: Validate IDs against the selected audience**

```ts
function isInterestSurvey(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.answers)) return false;
  if (value.audience === undefined) return isLegacyInterestSurvey(value);
  if (!studentAffiliations.has(value.audience as string)) return false;
  const ids = new Set(getInterestSurveyQuestions(value.audience as InterestSurveyAudience).map((q) => q.id));
  return Object.entries(value.answers).every(([id, answer]) => ids.has(id) && isInterestSurveyAnswer(answer));
}
```

- [ ] **Step 4: Run storage tests and verify GREEN**

Run: `npm.cmd test -- --run src/lib/storage.test.ts`

Expected: PASS, including malformed JSON, last-valid rollback, and quota failure tests.

- [ ] **Step 5: Commit when explicitly authorized**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: preserve audience-specific survey state"
```

---

### Task 3: Add Audience to the Canonical Survey Route

**Files:**
- Modify: `src/lib/appRouting.ts`
- Test: `src/lib/appRouting.test.ts`

**Interfaces:**
- Updates `AppRoute` recommendation-survey variant with `audience?: InterestSurveyAudience`
- Preserves `axis` only for recommendation axes routes

- [ ] **Step 1: Write failing route round-trip tests**

```ts
it("round-trips a valid survey audience", () => {
  const route = { view: "recommendation", step: "survey", audience: "department-student" } as const;
  const href = buildAppHref("https://local.invalid/", route);
  expect(href).toBe("/?view=recommendation&step=survey&audience=department-student");
  expect(resolveAppRoute(href.slice(1), createEmptyAppState())).toEqual(route);
});

it("drops an invalid survey audience", () => {
  expect(resolveAppRoute("?view=recommendation&step=survey&audience=unknown", createEmptyAppState()))
    .toEqual({ view: "recommendation", step: "survey" });
});
```

- [ ] **Step 2: Run route tests and verify RED**

Run: `npm.cmd test -- --run src/lib/appRouting.test.ts`

- [ ] **Step 3: Parse, build, and clear the audience parameter**

Add `audience` to `AppRoute`, `buildAppHref`, `routeHistoryState`, `clearRouteParams`, and the unrelated-state destructuring in `writeAppRouteToHistory`. Delete it whenever the active route is not the survey.

- [ ] **Step 4: Run route tests and verify GREEN**

Run: `npm.cmd test -- --run src/lib/appRouting.test.ts`

- [ ] **Step 5: Commit when explicitly authorized**

```bash
git add src/lib/appRouting.ts src/lib/appRouting.test.ts
git commit -m "feat: route interest survey by affiliation"
```

---

### Task 4: Build the Audience Step and Wire the Survey Flow

**Files:**
- Create: `src/features/recommendations/SurveyAudienceStep.tsx`
- Create: `src/features/recommendations/SurveyAudienceStep.test.tsx`
- Modify: `src/features/recommendations/InterestSurvey.tsx`
- Modify: `src/features/recommendations/InterestSurvey.test.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.recommendation-dom.test.tsx`
- Test: `src/App.recommendation-integration.test.tsx`

**Interfaces:**
- `SurveyAudienceStep({ value, onSelect })`
- `InterestSurvey` receives `audience?: InterestSurveyAudience` and `onAudienceChange(audience)`
- `chooseSurveyAudienceTransition(state, audience)` resets survey-only fields

- [ ] **Step 1: Write failing transition and DOM tests**

```ts
it("changes survey audience without deleting diagnosis or plan data", () => {
  const current = landingState("saved-plan");
  const next = chooseSurveyAudienceTransition(current, "external-student");
  expect(next.state.courseSelections).toEqual(current.courseSelections);
  expect(next.state.graduationPlan).toEqual(current.graduationPlan);
  expect(next.state.interestSurvey).toEqual({ audience: "external-student", answers: {}, currentIndex: 0 });
});

it("shows audience choice before questions", async () => {
  await mountAt("/?view=recommendation&step=survey");
  expect(document.querySelector("[data-survey-audience-step]")).not.toBeNull();
  expect(document.querySelector(".interest-question-card")).toBeNull();
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- --run src/App.recommendation-integration.test.tsx src/App.recommendation-dom.test.tsx src/features/recommendations/InterestSurvey.test.tsx`

- [ ] **Step 3: Implement the audience step**

Use two full-width radio rows with exact labels `식품자원경제학과 학생` and `타 학과 학생`. Explain that changing the choice restarts only the optional interest survey.

- [ ] **Step 4: Implement the transition and skip duplicate affiliation**

```ts
export function chooseSurveyAudienceTransition(current: SavedAppStateV2, audience: InterestSurveyAudience) {
  return {
    state: {
      ...current,
      profileDraft: { ...current.profileDraft, affiliation: audience, goal: "find-track", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" },
      interestSurvey: { audience, answers: {}, currentIndex: 0 },
    },
    route: { view: "recommendation", step: "survey", audience } as const,
  };
}
```

After `chooseInterestTrack`, route to `{ view: "diagnosis", step: "profile", profileStage: "path" }` when `profileDraft.affiliation` exists.

- [ ] **Step 5: Run related tests and verify GREEN**

Run: `npm.cmd test -- --run src/App.recommendation-integration.test.tsx src/App.recommendation-dom.test.tsx src/features/recommendations/InterestSurvey.test.tsx src/features/recommendations/SurveyAudienceStep.test.tsx`

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/features/recommendations src/App.tsx
git commit -m "feat: branch track recommendation by affiliation"
```

---

### Task 5: Differentiate Study-Path Copy and Close the Regression Gate

**Files:**
- Modify: `src/features/profile/StudyPathStep.tsx`
- Modify: `src/features/profile/ProfileFlow.test.tsx`
- Modify: `src/App.recommendation-dom.test.tsx`

**Interfaces:**
- Uses the existing `ServiceGoal` values; only visible labels differ by affiliation

- [ ] **Step 1: Add failing label tests**

Assert department copy includes `전공 안에서 관심 트랙 찾기` and external copy includes `내 전공과 연결할 트랙 찾기`.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- --run src/features/profile/ProfileFlow.test.tsx`

- [ ] **Step 3: Replace the global goal label map with affiliation-specific copy**

```ts
const GOAL_LABELS: Record<StudentAffiliation, Record<ServiceGoal, string>> = {
  "department-student": {
    "learn-track-system": "트랙제 구조 이해하기",
    "find-track": "전공 안에서 관심 트랙 찾기",
    "check-progress": "전공 이수 진행도 확인하기",
    "plan-graduation": "졸업 전 전공 계획 확인하기",
  },
  "external-student": {
    "learn-track-system": "식자경 이수 방식 이해하기",
    "find-track": "내 전공과 연결할 트랙 찾기",
    "check-progress": "인정 가능 과목과 진행도 확인하기",
    "plan-graduation": "다전공·부전공 이수 계획 확인하기",
  },
};
```

- [ ] **Step 4: Run related and full tests**

Run: `npm.cmd test -- --run src/features/profile/ProfileFlow.test.tsx src/App.recommendation-dom.test.tsx`

Run: `npm.cmd test -- --run`

Expected: all test files pass with no unhandled worker errors.

- [ ] **Step 5: Run type and build gates**

Run: `npm.cmd run build`

Expected: `tsc --noEmit` and Vite production build pass.

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/features/profile src/App.recommendation-dom.test.tsx
git commit -m "feat: tailor study paths to student affiliation"
```
