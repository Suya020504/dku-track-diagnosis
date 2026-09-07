# Service Interactions and Responsive QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn state changes into clear service feedback and verify every core screen from Fold cover width through 1080p desktop without overflow, fixed-UI overlap, inaccessible motion, or false completion claims.

**Architecture:** Centralize motion and transient save feedback, keep route changes as the source of page transitions, and use container queries for nested data surfaces. Browser QA remains separate from unit tests and records each viewport, URL, state, and console result.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest 4, CSS media/container queries, Chromium browser QA

**Spec:** `docs/superpowers/specs/2026-09-02-full-service-interaction-responsive-expansion-design.md`

## Global Constraints

- Motion completes in 160-220ms and communicates state; no decorative infinite animation.
- `prefers-reduced-motion: reduce` removes transforms and nonessential transitions.
- Save success is transient but storage failure persists with a recovery action.
- No `가능/불가능` official-sounding graduation verdict.
- Touch targets are at least 44×44px.
- Test 344px through 1920px, including tablet portrait and landscape.
- Local success never claims Vercel production success.

---

### Task 1: Finish the Course-Ledger Container-Query Fix

**Files:**
- Modify: `src/styles/planner-courses.css`
- Create: `src/styles/planner-courses-responsive.test.ts`
- Test: `src/features/courses/CourseLedger.test.tsx`
- Test: `src/features/courses/CourseSelectionView.test.tsx`

**Interfaces:**
- CSS container name `course-ledger`
- Compact grid threshold `720px`; narrow grid threshold `410px`

- [ ] **Step 1: Preserve the existing RED evidence**

Document the observed 1136px failure in the QA report: ledger client width 455px, child bleed 225px, summary intrusion 182px.

- [ ] **Step 2: Keep the static CSS contract test**

```ts
expect(courseStyles).toMatch(/container-name:\s*course-ledger/);
expect(courseStyles).toMatch(/@container\s+course-ledger\s+\(max-width:\s*720px\)/);
```

- [ ] **Step 3: Run focused tests**

Run: `npm.cmd test -- --run src/styles/planner-courses-responsive.test.ts`

Run individually if worker startup times out:

`npm.cmd test -- --run src/features/courses/CourseLedger.test.tsx`

`npm.cmd test -- --run src/features/courses/CourseSelectionView.test.tsx`

Expected: 1 + 4 + 4 tests pass.

- [ ] **Step 4: Verify the same browser measurement after the final CSS merge**

At 1136px, require ledger `clientWidth === scrollWidth`, row `clientWidth === scrollWidth`, child bleed 0, and summary intrusion 0.

- [ ] **Step 5: Commit when explicitly authorized**

```bash
git add src/styles/planner-courses.css src/styles/planner-courses-responsive.test.ts
git commit -m "fix: contain course rows at intermediate widths"
```

---

### Task 2: Add Purposeful Motion and Reduced-Motion Coverage

**Files:**
- Create: `src/styles/planner-motion.css`
- Create: `src/styles/planner-motion.test.ts`
- Modify: `src/styles.css` import list
- Modify: relevant interactive component class names only when required

**Interfaces:**
- CSS variables: `--motion-fast: 160ms`, `--motion-base: 200ms`, `--motion-ease: cubic-bezier(.2,.8,.2,1)`

- [ ] **Step 1: Write a failing CSS contract test**

```ts
/// <reference types="node" />
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("./planner-motion.css", import.meta.url), "utf8");

expect(css).toContain("--motion-fast: 160ms");
expect(css).toContain("--motion-base: 200ms");
expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
expect(css).toMatch(/transition-duration:\s*0\.01ms/);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- --run src/styles/planner-motion.test.ts`

- [ ] **Step 3: Implement motion tokens and state transitions**

Apply only to button press/hover, accordion expansion, progress fill, save-state highlight, and page content fade. Do not animate layout height with long transitions; use opacity/transform only where it does not hide content.

- [ ] **Step 4: Implement reduced motion**

```css
@media (prefers-reduced-motion: reduce) {
  .planner-app *,
  .planner-app *::before,
  .planner-app *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Run and verify GREEN**

Run: `npm.cmd test -- --run src/styles/planner-motion.test.ts`

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/styles/planner-motion.css src/styles/planner-motion.test.ts src/styles.css
git commit -m "feat: add accessible service motion"
```

---

### Task 3: Unify Save Feedback without Duplicate Toasts

**Files:**
- Create: `src/features/shell/SaveFeedback.tsx`
- Create: `src/features/shell/SaveFeedback.test.tsx`
- Modify: `src/features/shell/GuidebookShell.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `SaveFeedback({ state: "idle" | "saved" | "error", message, onRetry? })`
- Error uses `role="alert"`; saved uses `role="status"`

- [ ] **Step 1: Write failing state and timer tests**

```tsx
vi.useFakeTimers();
render(<SaveFeedback state="saved" message="이 브라우저에 저장했어요." />);
expect(screen.getByRole("status")).toBeTruthy();
act(() => vi.advanceTimersByTime(1500));
expect(screen.queryByRole("status")).toBeNull();

render(<SaveFeedback state="error" message="저장하지 못했어요." onRetry={retry} />);
act(() => vi.advanceTimersByTime(5000));
expect(screen.getByRole("alert")).toBeTruthy();
```

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- --run src/features/shell/SaveFeedback.test.tsx`

- [ ] **Step 3: Implement one feedback surface**

Keep the persistent header save-state text, but use `SaveFeedback` only near the action that changed. Suppress a second success message when plan/result components already show the same event.

- [ ] **Step 4: Add retry to failed manual saves**

Pass the existing `onSaveCourses` or plan save callback as `onRetry`; never clear the unsaved in-memory value.

- [ ] **Step 5: Run and verify GREEN**

Run: `npm.cmd test -- --run src/features/shell/SaveFeedback.test.tsx src/App.graduation-plan-integration.test.tsx src/features/courses/CourseSelectionView.test.tsx`

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/features/shell src/App.tsx
git commit -m "feat: clarify local save feedback"
```

---

### Task 4: Clarify Result Add-Ons and Feasibility Language

**Files:**
- Modify: `src/features/results/CurrentProgressView.tsx`
- Modify: `src/features/results/NextCoursesView.tsx`
- Modify: `src/features/recommendations/TrackRecommendationAxes.tsx`
- Modify: `src/features/planning/GraduationPlanPrerequisite.tsx`
- Test: `src/App.result-integration.test.tsx`
- Test: `src/features/recommendations/TrackRecommendationAxes.test.tsx`
- Test: `src/features/planning/GraduationPlanResult.test.tsx`

**Interfaces:**
- Core result remains current status and next courses
- Optional actions: `관심 트랙 추천받기`, `목표 학기까지 계획 확인하기`

- [ ] **Step 1: Add failing copy and route tests**

Assert the result contains one primary next-course action and two visually secondary add-on actions. Assert no rendered text matches `/이수 가능$|이수 불가능|졸업 가능$|졸업 불가능/`.

- [ ] **Step 2: Run and verify RED**

Run: `npm.cmd test -- --run src/App.result-integration.test.tsx src/features/recommendations/TrackRecommendationAxes.test.tsx src/features/planning/GraduationPlanResult.test.tsx`

- [ ] **Step 3: Implement exact status language**

Use only:

- `현재 입력 기준 충족`
- `목표 학기 안의 계획상 가능`
- `학기당 수강량 조정 필요`
- `추가 학기 검토 필요`
- `미래 개설·인정 여부 공식 확인 필요`

- [ ] **Step 4: Connect optional actions to canonical URLs**

Recommendation: `?view=recommendation&step=survey`

Feasibility: `?view=plan&step=setup`

- [ ] **Step 5: Run related tests and verify GREEN**

Run the same command as Step 2.

- [ ] **Step 6: Commit when explicitly authorized**

```bash
git add src/features/results src/features/recommendations src/features/planning
git commit -m "feat: separate simulation from optional analysis"
```

---

### Task 5: Execute the Full Responsive Browser Matrix

**Files:**
- Create: `reports/validation/2026-09-02-full-service-responsive-qa.md`
- Update: `CHANGELOG.md`
- Update: `README.md`

**Interfaces:**
- QA report follows Findings → Summary → Verification → Remaining Risk
- Every stable QA ID from `suya-service-qa` appears exactly once

- [ ] **Step 1: Run automated release gates**

Run: `npm.cmd test -- --run`

Run: `npm.cmd run build`

Run: `git diff --check`

Expected: all tests, TypeScript, Vite build, and whitespace checks pass.

- [ ] **Step 2: Verify representative routes at every viewport**

Routes:

- `/`
- `?view=track-guide&section=overview`
- `?view=recommendation&step=survey`
- `?view=diagnosis&step=profile&profile=affiliation`
- `?view=diagnosis&step=courses`
- `?view=recommendation&step=axes&axis=progress`
- `?view=result&step=result&section=current`
- `?view=plan&step=setup`
- `?view=resources&section=modules`

Viewports: `344×882`, `360×800`, `384×854`, `393×852`, `430×932`, `744×1133`, `768×1080`, `800×1280`, `820×1180`, `834×1194`, `1024×1366`, `1133×744`, `1180×820`, `1194×834`, `1280×800`, `1366×768`, `1366×1024`, `1920×1080`.

For each, record `scrollWidth`, `clientWidth`, main count, h1 count, fixed UI rectangles, last actionable element, console errors, and screenshot path.

- [ ] **Step 3: Exercise interaction and recovery**

- Keyboard: H1 → primary CTA → next logical control.
- Orientation: same route and saved state after portrait/landscape resize.
- Storage: reload, Back, corrupted active JSON, last-valid recovery, quota failure tests.
- Motion: emulate reduced motion and confirm no visible transform animation.
- Resource navigation: no academic ribbon; four local tabs restore with Back.
- Survey: both audiences complete and changing audience preserves courses and plan.

- [ ] **Step 4: Write the evidence report**

Include before/after course-ledger measurements, all screenshots, test counts, build module count, console output, coverage matrix, and explicit production exclusion.

- [ ] **Step 5: Commit documentation when explicitly authorized**

```bash
git add reports/validation/2026-09-02-full-service-responsive-qa.md CHANGELOG.md README.md
git commit -m "docs: record full service responsive QA"
```

- [ ] **Step 6: Do not push or deploy without a separate explicit request**

Stop after local verification and report the branch, clean/dirty status, and remaining production risk.
