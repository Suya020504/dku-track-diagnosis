# Track Service Planner Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 진단·추천·저장·주소·졸업 계획·PDF beta 기능을 보존하면서, 전체 서비스를 신입생 중심의 `캠퍼스 안내책자 × 학업 플래너` 경험으로 교체한다.

**Architecture:** `App.tsx`의 상태·계산·전환 handler는 당분간 controller로 유지한다. 새 route section 계약을 먼저 고정하고, `.planner-app`으로 namespace한 토큰·원자 컴포넌트와 순수 `GuidebookShell`을 옆에 만든 뒤 랜딩 → 입력 → 결과 → 추천 → 플래너 → 자료 화면 순서로 연결한다. 기존 `styles.css`는 전환 중 유지하고 새 CSS를 마지막에 불러와 cascade를 격리하며, 전체 화면이 통과한 뒤에만 도달 불가능 legacy를 제거한다.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Vitest 4, localStorage, lucide-react, pdfjs-dist 6.3.289, Chromium browser QA

**Spec:** `docs/superpowers/specs/2026-08-30-track-service-visual-redesign-design.md`

**North Star:** `design-proposals/visual-redesign-2026-08-30/planner-timeline-north-star.png`

## Baseline

- 브랜치: `codex/track-service-expansion`
- 시작 커밋: `343669d`
- 자동 검증: 29 test files, 416 tests PASS
- 생산 빌드: 1,732 modules transformed, PASS
- 원본 폴더는 사용자 소유 dirty checkout이며 읽기 전용 출처로만 사용한다.
- 기존 visual companion 65234는 종료됐다. 실브라우저 검증은 격리 포트 `4217`을 사용한다.

## Global Constraints

- 원본 폴더 `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현`의 파일을 수정·이동·삭제·stash하지 않는다.
- 계산 엔진, `SavedAppStateV2`, storage v2 migration, URL guard, PDF 메모리 전용 draft, snapshot 중복 방지를 의미 변경하지 않는다.
- 프로필·목표 트랙·과목 입력 변경은 기존 `applyPlanningSourceChange` 경계를 유지한다.
- 관심, 현재 진행, 졸업 전 계획 가능성을 하나의 종합 점수나 통합 1위로 합치지 않는다.
- `공식 공개 확인`, `2026 과거 스냅샷`, `제공된 최종안 기준`, `학과 확인 필요`를 서로 다른 근거 상태로 표시한다.
- `졸업 가능`, `이수 확정`처럼 공식 판정으로 오해되는 문구를 만들지 않는다.
- 공식 캠퍼스 사진과 학교 UI 자산은 외부 재사용 허락 전 공개 런타임 이미지로 복사하지 않는다. 공식 갤러리 링크형 출처 카드를 사용한다.
- `landing-student.jpg`는 출처 기록이 없어 새 화면에서 사용하지 않는다.
- 생성 이미지에는 공식 로고, 사용자명, 과목명, 학점, 퍼센트, 버튼, 긴 한글을 넣지 않는다.
- 새 런타임 의존성을 추가하지 않는다.
- 각 작업은 실패 테스트 → 최소 구현 → 집중 테스트 → 전체 테스트 → 빌드 → 영향 화면 브라우저 smoke → 별도 커밋 순서로 수행한다.
- 테스트는 현재 환경에서 동작하는 `pnpm.cmd` 직접 명령을 사용한다. 저장소의 wrapper script 실패는 이번 디자인 작업과 섞지 않는다.

## File Responsibility Map

| 경로 | 책임 |
|---|---|
| `src/lib/appRouting.ts` | 결과·자료·프로필 소단계의 canonical URL 및 legacy alias |
| `src/app/journeyView.ts` | route를 안내책자 색인·Ribbon 상태로 변환하는 순수 함수 |
| `src/features/shell/*` | 공통 Guidebook shell, index, 모바일 nav, 저장 상태 |
| `src/features/journey/*` | 실제 주소와 연결된 Compass Path Ribbon |
| `src/features/landing/*` | 주 행동이 관심 찾기인 학업 플래너형 랜딩 |
| `src/features/profile/*` | 소속 → 이수 경로의 두 소단계 |
| `src/features/courses/*` | 직접 선택 기본 course ledger, 필터, skip navigation, PDF beta 배치 |
| `src/features/results/*` | 현재 → 다음 → 확인의 결과 3면 |
| `src/features/recommendations/*` | 독립 3축 세로 색인과 공통 방향 표시 |
| `src/features/planning/*` | setup → schedule → checks planner 문법 |
| `src/features/resources/*` | 트랙·모듈·교육과정·공식 근거의 분산 화면 |
| `src/components/*` | TrackGlyph, CourseSticker, EvidenceBand |
| `src/data/evidenceSources.ts` | 공식 링크와 4단계 근거 상태; 계산 데이터와 분리 |
| `src/styles/planner-*.css` | `.planner-app` 전용 토큰·shell·화면·print 스타일 |
| `src/App.tsx` | 상태·계산·transition과 새 화면 연결, 기존 직접 export 유지 |

---

### Task 1: Lock The Expanded URL Contract

**Files:**
- Modify: `src/lib/appRouting.ts`
- Modify: `src/lib/appRouting.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.profile-transition.test.tsx`
- Modify: `src/App.result-integration.test.tsx`

**Interfaces:**
- Result sections: `current | next | confirm`
- Resource sections: `tracks | modules | curriculum | official`
- Profile stages: `affiliation | path`
- Legacy `?view=result`, `?view=resources`, `?view=modules` remain valid aliases.

- [ ] **Step 1: Add failing route tests**

Cover these exact contracts:

```ts
expect(resolveAppRoute("?view=result&section=next", readyState)).toEqual({
  view: "result",
  section: "next",
});
expect(resolveAppRoute("?view=resources&section=official", readyState)).toEqual({
  view: "resources",
  section: "official",
});
expect(resolveAppRoute("?view=modules", readyState)).toEqual({
  view: "resources",
  section: "modules",
});
expect(resolveAppRoute("?view=diagnosis&step=profile&profile=path", emptyState)).toEqual({
  view: "diagnosis",
  step: "profile",
  profileStage: "path",
});
```

Also test invalid sections falling back to `current`, `tracks`, and `affiliation`; result guards must still redirect to the correct prerequisite.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm.cmd vitest run src/lib/appRouting.test.ts src/App.profile-transition.test.tsx src/App.result-integration.test.tsx`

Expected: FAIL because the new route fields do not exist.

- [ ] **Step 3: Extend `AppRoute` without rewriting history handling**

Keep `resolveAppRoute`, `writeAppRouteToHistory`, `routeToSearchParams`, and `popstate` as the single URL authority. Default omitted sections to canonical values and preserve PDF `input=pdf-review` privacy recovery.

- [ ] **Step 4: Thread section/stage state through `App.tsx`**

Add state only where the current controller needs it. Do not move calculation or persistence logic. The address must update for result tabs, resource index tabs, and profile stages.

- [ ] **Step 5: Verify and commit**

Run: `pnpm.cmd vitest run src/lib/appRouting.test.ts src/lib/viewRouting.test.ts src/App.profile-transition.test.tsx src/App.result-integration.test.tsx src/App.pdf-import-integration.test.tsx`

Run: `pnpm.cmd test`

Run: `pnpm.cmd build`

Commit: `feat: preserve planner page sections in urls`

---

### Task 2: Build The Planner Design Foundation

**Files:**
- Create: `src/app/journeyView.ts`
- Create: `src/app/journeyView.test.ts`
- Create: `src/components/TrackGlyph.tsx`
- Create: `src/components/TrackGlyph.test.tsx`
- Create: `src/components/CourseSticker.tsx`
- Create: `src/components/CourseSticker.test.tsx`
- Create: `src/components/EvidenceBand.tsx`
- Create: `src/components/EvidenceBand.test.tsx`
- Create: `src/data/evidenceSources.ts`
- Create: `src/data/evidenceSources.test.ts`
- Create: `src/styles/planner-tokens.css`
- Create: `src/styles/planner-components.css`
- Modify: `src/main.tsx`
- Copy: read-only source `public/campus-compass-illustration.webp` → `public/campus-compass-illustration.webp`
- Create: `docs/assets/visual-redesign-2026-08-30/asset-sources.md`

**Source checks:**
- Compass WebP SHA256 must be `7B9F017DDC2CF9CB4BD7FB94D73EB2CEA348EF124DC75C08B85B01DA1FC93A25`.
- TrackGlyph maps the five current `TrackId` values to ShoppingCart, MapPinned, Truck, ChartNoAxesCombined, Dna.

- [ ] **Step 1: Add failing primitive and evidence tests**

Test all five glyph labels, no decorative glyph exposed to screen readers, CourseSticker evidence text, EvidenceBand’s four explicit states, and route-to-journey mapping.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm.cmd vitest run src/app/journeyView.test.ts src/components/TrackGlyph.test.tsx src/components/CourseSticker.test.tsx src/components/EvidenceBand.test.tsx src/data/evidenceSources.test.ts`

- [ ] **Step 3: Implement exact tokens and namespaced primitives**

Use only the approved palette and spacing in `DESIGN.md`. Load planner CSS after legacy `styles.css`, and require every rule to descend from `.planner-app` or a uniquely named planner root.

- [ ] **Step 4: Copy and verify the generated compass asset**

Copy only the WebP. Record source path, dimensions, hash, generated-image status, runtime purpose, and `alt` guidance. Do not copy official campus photo derivatives.

- [ ] **Step 5: Verify and commit**

Run focused tests, then `pnpm.cmd test` and `pnpm.cmd build`.

Commit: `feat: add planner visual primitives and evidence states`

---

### Task 3: Unify Every Screen Under The Guidebook Shell

**Files:**
- Create: `src/features/shell/GuidebookShell.tsx`
- Create: `src/features/shell/GuidebookShell.test.tsx`
- Create: `src/features/shell/GuideIndex.tsx`
- Create: `src/features/shell/GuideIndex.test.tsx`
- Create: `src/features/shell/MobileJourneyNav.tsx`
- Create: `src/features/shell/MobileJourneyNav.test.tsx`
- Create: `src/features/shell/LocalSaveStatus.tsx`
- Create: `src/features/journey/CompassPathRibbon.tsx`
- Create: `src/features/journey/CompassPathRibbon.test.tsx`
- Create: `src/styles/planner-shell.css`
- Create: `src/styles/planner-journey.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.recommendation-dom.test.tsx`
- Modify: `src/App.graduation-plan-integration.test.tsx`

**Structural rule:** `GuidebookShell` renders no `main`; each screen owns exactly one visible `main` landmark.

- [ ] **Step 1: Add failing shell tests**

Cover active `aria-current`, disabled-step explanation, local-save status, mobile’s four primary destinations plus more menu, Ribbon current/complete/next text, and no nested main landmark.

- [ ] **Step 2: Implement shell as a pure controlled component**

It receives route-derived items, availability, storage state, and navigation callbacks. It must not read `window`, localStorage, or calculation modules.

- [ ] **Step 3: Wrap existing early-return screens without changing their contents**

Bring landing, recommendation, plan, profile, PDF review, and legacy service views under the same shell. Preserve route handlers, focus refs, guide behavior, and PDF draft lifecycle.

- [ ] **Step 4: Add responsive shell behavior**

Desktop: header + left index + content. Mobile: current-step header + bottom `시작/진단/결과/계획`, with `트랙/자료/문의` under more. Reserve safe-area bottom space.

- [ ] **Step 5: Verify and commit**

Run shell tests, App integration tests, full tests, build, then browser smoke at 1440×900 and 390×844.

Commit: `feat: unify service screens in guidebook shell`

---

### Task 4: Replace The Landing With The Planner First Surface

**Files:**
- Create: `src/features/landing/PlannerLanding.tsx`
- Create: `src/features/landing/PlannerLanding.test.tsx`
- Create: `src/features/landing/TrackPreviewStrip.tsx`
- Create: `src/features/education/CourseModuleTrackFigure.tsx`
- Create: `src/features/education/CourseModuleTrackFigure.test.tsx`
- Create: `src/styles/planner-landing.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.recommendation-integration.test.tsx`

**First-view contract:**
- H1: `내 관심을 따라, 전공 로드맵을 완성해요`
- Primary: `내 관심 트랙 찾기`
- Secondary: `이수 과목 바로 진단`
- Compass image, three-step Ribbon, partially locked planner preview
- No fake percentage, course count, student name, login UI, or sample completion claim

- [ ] **Step 1: Add failing landing tests**

Assert the primary CTA precedes and has stronger semantics than the secondary CTA, both callbacks route correctly, the five real track names/glyphs render, and fake metric text is absent.

- [ ] **Step 2: Implement the C composition**

Use the compass as a bounded illustration plane rather than a generic image card. Build the planner preview in semantic HTML/CSS; it is locked with an explanatory sentence until the student starts.

- [ ] **Step 3: Add course → module → track teaching figure**

Use real current data and TrackGlyph. Mark it as an explanation, not a rule or official completion result.

- [ ] **Step 4: Remove the old landing from canonical rendering**

Keep legacy code temporarily unreachable for regression isolation. Do not copy generated north-star text, logo, user data, or figures.

- [ ] **Step 5: Verify and commit**

Run landing/App route tests, full tests, build, 1440×900 and 390×844 first-viewport screenshots.

Commit: `feat: launch planner first landing experience`

---

### Task 5: Redesign Interest And Profile Entry As One-Decision Steps

**Files:**
- Modify: `src/features/recommendations/InterestSurvey.tsx`
- Modify: `src/features/recommendations/InterestSurvey.test.tsx`
- Create: `src/features/profile/ProfileFlow.tsx`
- Create: `src/features/profile/ProfileFlow.test.tsx`
- Create: `src/features/profile/AffiliationStep.tsx`
- Create: `src/features/profile/StudyPathStep.tsx`
- Modify: `src/features/profile/StudyPathSetup.tsx`
- Modify: `src/features/profile/StudyPathSetup.test.tsx`
- Create: `src/styles/planner-entry.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.profile-transition.test.tsx`

- [ ] **Step 1: Add failing entry-flow tests**

Interest: one question, `N / 10`, 1–5 planner scale, saved selection, previous/next, skip. Profile: affiliation first, path second, direct URL restoration, back/forward, and one final call to the existing profile transition.

- [ ] **Step 2: Restyle the survey without changing scoring**

Retain `InterestSurveyState` and scoring. Replace five mini cards with one accessible radio-like scale, track glyph result rows, tie handling, and direct student choice.

- [ ] **Step 3: Implement `ProfileFlow` over the existing draft**

Use `profileDraft` for incomplete values. A stage change updates the URL; only final completion invokes `completeProfileTransition`. Preserve department/external and main/track/double/minor eligibility logic.

- [ ] **Step 4: Verify and commit**

Run entry/recommendation/storage/routing tests, full tests, build, keyboard smoke, and reload on an in-progress survey/profile stage.

Commit: `feat: guide students through interest and profile steps`

---

### Task 6: Make Direct Course Selection The Planner Ledger Default

**Files:**
- Create: `src/features/courses/CourseSelectionView.tsx`
- Create: `src/features/courses/CourseSelectionView.test.tsx`
- Create: `src/features/courses/CourseLedger.tsx`
- Create: `src/features/courses/CourseLedger.test.tsx`
- Create: `src/features/courses/CourseLedgerRow.tsx`
- Create: `src/features/courses/CourseLedgerFilters.tsx`
- Modify: `src/features/courses/PdfCourseImportPanel.tsx`
- Modify: `src/features/courses/PdfCourseImportPanel.test.tsx`
- Modify: `src/features/courses/PdfMatchReview.tsx`
- Create: `src/styles/planner-courses.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.pdf-import-integration.test.tsx`

**Input priority:** 직접 선택 is visible and ready by default; PDF beta is a secondary optional disclosure.

- [ ] **Step 1: Add failing ledger and skip-navigation tests**

Test semester/module filters, completed/in-progress/planned labels, 44px checkbox target hook, and `결과로 건너뛰기` moving focus past the 45-course list to the result action.

- [ ] **Step 2: Extract course list markup from `App.tsx`**

Keep all calculations and toggle handlers in App. The view receives courses, selections, filters, enrollment type, save feedback, and PDF callback.

- [ ] **Step 3: Rehouse PDF beta without changing privacy semantics**

Retain local-only processing, file limits, no original text/filename persistence, refresh recovery notice, collision review, cancellation, and memory-only draft.

- [ ] **Step 4: Verify and commit**

Run course/App/PDF focused tests, full tests, build, keyboard skip smoke, mobile fixed-nav overlap check, and synthetic PDF browser smoke. Do not mark PDF beta release-ready unless matching/approval succeeds.

Commit: `feat: turn course input into a direct selection ledger`

---

### Task 7: Split Results Into Current, Next, And Confirm

**Files:**
- Create: `src/features/results/ResultDetailView.tsx`
- Create: `src/features/results/ResultDetailView.test.tsx`
- Create: `src/features/results/CurrentProgressView.tsx`
- Create: `src/features/results/NextCoursesView.tsx`
- Create: `src/features/results/OfficialChecksView.tsx`
- Modify: `src/features/results/PathProgressSummary.tsx`
- Modify: `src/features/results/PathProgressSummary.test.tsx`
- Create: `src/styles/planner-results.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.result-integration.test.tsx`

- [ ] **Step 1: Add failing three-section tests**

Each URL section renders one H1 and its matching content. `current` shows safe status and path evidence; `next` shows course stickers/reasons/evidence; `confirm` shows conflicts, official questions, official links, print/save. Verify prohibited certainty text is absent.

- [ ] **Step 2: Move result markup without moving calculations**

Pass existing diagnosis/path result values as props. Preserve course shortage, module progress, track comparison, print, recommendation, and planner handlers.

- [ ] **Step 3: Replace metric-card hierarchy**

Use one vertical progress path and evidence/status text. Percentages remain secondary labels.

- [ ] **Step 4: Verify and commit**

Run result/progress/storage/routing tests, full tests, build, section back/forward/reload smoke, desktop/mobile, and print preview.

Commit: `feat: separate result decisions into three pages`

---

### Task 8: Recompose Independent Recommendations As A Vertical Index

**Files:**
- Modify: `src/features/recommendations/TrackRecommendationAxes.tsx`
- Modify: `src/features/recommendations/TrackRecommendationAxes.test.tsx`
- Modify: `src/features/recommendations/AxisResultCard.tsx`
- Create: `src/styles/planner-recommendations.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.recommendation-dom.test.tsx`
- Modify: `src/App.recommendation-integration.test.tsx`

- [ ] **Step 1: Add failing URL-controlled axis tests**

The component receives `activeAxis` and `onAxisChange`. Test `interest`, `progress`, `plan`, unavailable states, independent leaders, ties, and an aligned path only when at least two available axes share the same leader.

- [ ] **Step 2: Replace three equal cards with one active axis and two secondary candidates**

Use the left/edge index grammar, TrackGlyph, reasons, and evidence. Keep the wheat hypothesis band for plan assumptions. Never render a combined winner.

- [ ] **Step 3: Verify and commit**

Run recommendation engine/component/App tests, full tests, build, and browser smoke for different leaders plus aligned leaders.

Commit: `feat: turn recommendation axes into planner index views`

---

### Task 9: Apply The Planner Grammar To Graduation Planning

**Files:**
- Modify: `src/features/planning/GraduationPlanSetup.tsx`
- Modify: `src/features/planning/GraduationPlanSetup.test.tsx`
- Modify: `src/features/planning/GraduationPlanResult.tsx`
- Modify: `src/features/planning/GraduationPlanResult.test.tsx`
- Modify: `src/features/planning/TermPlanColumn.tsx`
- Modify: `src/features/planning/OfficialCheckQuestions.tsx`
- Modify: `src/features/planning/UnplacedCourseList.tsx`
- Create: `src/features/planning/GraduationPlanPrerequisite.tsx`
- Create: `src/styles/planner-planning.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.graduation-plan-integration.test.tsx`

- [ ] **Step 1: Add failing planner-view tests**

Test one H1 for setup/schedule/checks, desktop term columns, mobile timeline hooks, named courses versus elective reservations, evidence badges, stale-plan invalidation, save snapshot once, condition-edit route, and official checks.

- [ ] **Step 2: Move prerequisite markup and restyle existing plan components**

Keep `calculateGraduationPlan` and all planning types unchanged. Separate `일정`, `확인`, `조건 수정` actions and keep the future-offering non-guarantee visible.

- [ ] **Step 3: Implement responsive semester behavior**

Desktop uses horizontal planner columns; mobile uses a vertical timeline without horizontal scrolling or hidden actions.

- [ ] **Step 4: Verify and commit**

Run planner/storage/App tests, full tests, build, schedule/checks back-forward-reload, H1 focus, scrollY 0, snapshot restore, and 390px overlap smoke.

Commit: `feat: present graduation planning as a semester planner`

---

### Task 10: Distribute Track Education And Official Evidence

**Files:**
- Create: `src/features/resources/ResourceIndexView.tsx`
- Create: `src/features/resources/ResourceIndexView.test.tsx`
- Create: `src/features/resources/TrackSystemOverview.tsx`
- Create: `src/features/resources/ModuleReferenceView.tsx`
- Create: `src/features/resources/CurriculumReferenceView.tsx`
- Create: `src/features/resources/OfficialResourcesView.tsx`
- Create: `src/styles/planner-resources.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/lib/appRouting.test.ts`
- Modify: `docs/assets/visual-redesign-2026-08-30/asset-sources.md`

- [ ] **Step 1: Add failing resource-section tests**

Test the four URLs, active index, current real track/module names, evidence bands, external link labels/rel, student-tool disclaimer, and no embedded official campus photo.

- [ ] **Step 2: Extract overview/resources/modules from App**

Canonicalize `?view=modules` to `?view=resources&section=modules`. Keep the legacy address working. Split dense tables into focused pages.

- [ ] **Step 3: Add the campus source card safely**

Use an icon/text card linking to the official `천안캠퍼스 항공사진(2022)` page, with source office/date and a note that the public runtime does not reproduce the photo until reuse permission is confirmed.

- [ ] **Step 4: Generate and integrate supporting design imagery**

Use the image generation tool for two text-free, logo-free concept illustrations only after the final slots are known:

1. 과목 → 모듈 → 트랙 연결
2. 진행도 → 다음 과목 → 학기 계획 연결

Create 960px WebP runtime versions under `public/illustrations/`, keep each near 200KB, record prompt/hash/purpose/alt text, and ensure the page still communicates fully when images fail to load.

- [ ] **Step 5: Verify and commit**

Run resource/routing tests, full tests, build, external-link/image-fallback browser smoke, and desktop/mobile captures.

Commit: `feat: distribute curriculum and evidence resources`

---

### Task 11: Finish Responsive, Accessibility, Print, And Legacy Cleanup

**Files:**
- Create: `src/styles/planner-responsive.css`
- Create: `src/styles/planner-print.css`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/App.*.test.tsx`
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-08-30-track-service-visual-redesign-design.md`

- [ ] **Step 1: Add accessibility regression hooks/tests**

Cover one visible H1/main, 44px control hooks, custom focus-visible, reduced-motion, skip navigation, bottom-nav safe area, explicit status text, and image alt behavior.

- [ ] **Step 2: Consolidate planner CSS imports and remove only unreachable legacy UI**

After all canonical screens pass, remove `LegacyLandingPage`, `LabView`, `ExperimentView`, duplicated unreachable landing/demo data, and CSS that no remaining markup references. Preserve direct exports used by tests or re-export them from `App.tsx`.

- [ ] **Step 3: Apply responsive and print contracts**

Test 1440, 1024, 768, 390, and 320 widths. Print hides shell navigation and retains result/plan content without clipping. `prefers-reduced-motion` removes compass/ribbon motion.

- [ ] **Step 4: Run the one-time design detector and fix changed targets**

Run the selected design-quality detector once against changed frontend targets. Resolve generic card-grid, duplicate title, rogue color, default outline, and component-language findings without bypassing it.

- [ ] **Step 5: Verify and commit**

Run: `pnpm.cmd test`

Run: `pnpm.cmd build`

Expected: all existing 416 tests plus new tests PASS; build PASS.

Commit: `refactor: remove superseded dashboard presentation`

---

### Task 12: Run The Full Browser Release Gate And Document The Result

**Files:**
- Create: `reports/validation/2026-08-30-planner-visual-redesign-validation.md`
- Create: `docs/assets/2026-08-30-planner-redesign/*.png`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Start an isolated production preview**

Run: `pnpm.cmd exec vite preview --host 127.0.0.1 --port 4217 --strictPort`

- [ ] **Step 2: Complete the five core flows**

1. 랜딩 → 관심 설문 → 트랙 선택 → 프로필 → 직접 과목 선택 → 결과 → 추천 → 계획
2. 랜딩 → 이수 과목 바로 진단 → 프로필 → 과목 → 결과
3. 과목 → PDF beta → 검수 → 승인/취소 → 직접 선택
4. 계획 schedule → checks → back → forward → reload
5. 트랙·모듈·교육과정·공식 근거 → 외부 링크와 이미지 fallback

- [ ] **Step 3: Run the viewport and accessibility matrix**

At 1440×900, 1024×768, 768×1024, 390×844, 320×800 verify:

- console error/warning 0
- visible H1 1, main landmark 1
- horizontal overflow and clipped controls 0
- controls at least 44px
- keyboard-only completion and focus-visible
- mobile bottom nav overlaps 0
- reduced motion
- back/forward/reload route equality
- localStorage recovery and failure alert
- print result and plan
- PDF original text/filename/PII not persisted or uploaded

- [ ] **Step 4: Capture and compare at least 12 screens**

Desktop: landing, survey, profile, course ledger, PDF review, result current, result next, recommendation, planner, official resources. Mobile: landing, course skip navigation, plan checks. Compare the landing and planner to the approved north star by layout/material intent, not literal generated text or fake values.

- [ ] **Step 5: Record the PDF beta boundary honestly**

If synthetic PDF matching remains `0 matched`, document it as an open beta defect and do not describe PDF import as release-ready. Direct course selection remains the complete default path.

- [ ] **Step 6: Final automated verification and commit**

Run: `pnpm.cmd test`

Run: `pnpm.cmd build`

Run: `git diff --check`

Commit: `docs: validate planner visual redesign`

## Completion Report Contract

The final handoff must state:

- changed visual world and page structure
- test/build/browser matrices passed
- exact screenshot/report paths
- URL/localStorage/PDF privacy behavior preserved
- image source and permission boundaries
- remaining PDF beta or official-confirmation risks
- no push/merge/deploy performed unless separately approved
