# DKU Page-by-page Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute and review each page group in order.

**Goal:** 각 페이지를 학생의 목적에 맞는 새 화면으로 구현하고, 공식 교육과정·시간표를 반영해 배포한다.

**Architecture:** 기존 React props와 계산·저장 엔진을 경계로 보존하면서 각 기능 폴더의 페이지 JSX와 소유 CSS를 다시 작성한다. 공통 shell은 브랜드/최상위 이동만 맡는다. 검증된 시간표는 별도 데이터셋으로 추가하고 과거 개설 이력과 구분한다.

**Tech Stack:** React 19, TypeScript, Vite, existing CSS/Lucide, Vitest, Playwright. New dependencies 없음.

**Spec:** docs/superpowers/specs/2026-09-08-page-by-page-rebuild.md

## Global Constraints

- 공식 DKU 로고 public/dku-logo.png와 학과 홈페이지·YouTube 링크를 유지한다.
- 홈 크림, 가이드 민트, 진단 하늘, 결과 네이비, 추천 청록, 플래너 밀색, 자료 아이스블루.
- 필수 진단은 이수 유형→이수 과목→진단 결과. 모듈 자료·관심 추천·학기 플래너는 필수 단계가 아니다.
- 직접 과목 선택이 기본, PDF 선택 입력 유지. 계산/필수 적용·저장 schema v2·URL/back/refresh/접근성 보존.
- 새 의존성, 로그인, 학생 개인정보 입력, 파괴적 삭제를 수행하지 않는다.
- 작업자는 자신에게 배정된 파일만 편집하고 다른 작업자의 변경을 되돌리지 않는다. 하위 에이전트를 만들지 않는다.
- 기존 계산·검증 함수와 작은 입력/아이콘 부품을 재사용할 수 있지만, 페이지 수준의 JSX·배치·위계는 각 목적에 맞게 새로 구성한다.
- 실제 데이터·공식 트랙명이 이미지 시안의 예시 텍스트보다 우선한다. 생성 이미지는 학사 정보의 근거가 아니다.
- 344/360/390/430 모바일, 768/820/1024 태블릿·Fold, 1920×1080 PC에서 확인한다.

### Task 1: 가이드 다섯 페이지

**Files:** Own src/features/track-guide/** and src/styles/planner-track-guide.css; relevant src/App.track-guide-dom.test.tsx. Global shell/main.tsx and data are controller-owned.
**Interfaces:** Keep TrackGuideView's existing section/headingRef/onSectionChange/onStartInterestSurvey/onStartDiagnosis/videoId/onVideoChange props. Use data/curriculumData and officialResources, existing text-free WebP.
- [x] Read current component and existing tests, then new concept layout at C:/Users/HAPPY/.codex/generated_images/019fae1d-952c-7f52-a1b5-66d624e265e7/exec-82dadc3b-f259-4998-8d9a-d868dc7b5279.png. Treat its illustrative course/track strings as non-authoritative; use five official track names from data.
- [x] Rewrite the JSX composition: compact chapter header/local tabs; overview illustration with course/module/track captions and five-track/15-module facts; benefits as concise reasons; outcomes as formal degree vs track records; structure as real five-track comparison; videos as media viewer and the single source ledger. Each page must have one clear next action and a distinct content layout. Source ledger only videos.
- [x] Give the new root class dku-guide-page and scope all new CSS beneath it, eliminating reliance on the retired large-hero/card composition. Preserve all factual evidence and relevant per-claim links, but move supporting long explanation into details.
- [x] Run npm test -- src/App.track-guide-dom.test.tsx. Self-review spec and rendered desktop/mobile view. Commit only owned files and report path/commit/tests/risks.

### Task 2: 프로필과 과목 입력

**Files:** Own src/features/profile/**, src/features/courses/CourseSelectionView.tsx, CourseLedger*.tsx and tests; src/styles/planner-entry.css profile selectors only, src/styles/planner-courses.css. Existing App UI tests may be updated only for intentionally changed copy/structure; preserve their behavioral assertions. App.tsx course-page composition and TrackSetupSummary may be edited only to integrate the new page; routing/save/diagnosis-transition functions and PDF parser/import are out of scope.
**Interfaces:** Preserve ProfileFlowProps, CourseSelectionViewProps, CourseLedgerProps, CourseLedgerRowProps callbacks and status meanings. App owns saved state.
- [x] Inspect existing props/tests and data-ownership boundaries before changes. New course layout reference: C:/Users/HAPPY/.codex/generated_images/019fae1d-952c-7f52-a1b5-66d624e265e7/exec-3781ce41-6816-420f-8532-c4869157ab66.png. Ignore the generator's invented ECON/STAT codes, course counts, logged-in header; use real data and existing anonymous DKU header. Profile uses the companion 2026-09-02 mockup-profile.png as a layout reference under the new hierarchy contract.
- [x] Rebuild profile into one choice at a time with short summary and a single forward button; rebuild course input as a compact checklist workspace. First viewport contains title, selected count, search and the main result action. Use small details for code/evidence, explicit status text, 44px targets, grouped rows, meaningful empty state.
- [x] Use new page root classes dku-profile-page and dku-courses-page; CSS must be scoped to avoid cross-page style changes. PDF remains optional below the core workspace. No new full-screen summary sidebar.
- [x] Run profile and course component tests plus App.profile-transition.test.tsx and App.pdf-import-integration.test.tsx. Verify toggle/count/refresh, search, filters, group expansion, result action; commit/report owned files.

### Task 3: 결과 현재·다음·확인

**Files:** Own src/features/results/** and src/styles/planner-results.css.
**Interfaces:** Preserve ResultDetailView/PathProgressSummary and CurrentProgressView/NextCoursesView/OfficialChecksView input types and callbacks. All calculations remain in existing lib functions.
- [x] Read new result reference C:/Users/HAPPY/.codex/generated_images/019fae1d-952c-7f52-a1b5-66d624e265e7/exec-96900409-bbe8-4545-8ab2-bde964668792.png. Example input values must be calculated from actual props; no logged-in user menu. Treat source caveats as real but concise information.
- [x] Rebuild current result as a navy title/status and concise real-data progress overview, with expandable missing conditions. Show not-applicable/unknown honestly. Avoid duplicate large headings and the same missing-course list twice in the initial view.
- [x] Rebuild next as prioritized course candidates with reasons and optional module detail; rebuild confirm as a scannable check list with per-item source. Source warnings must remain visible enough to inform decisions, without repeated full-width boilerplate.
- [x] Use dku-results-page as a new root. Main action leads to next page; print/save remains quiet utility. Keep per-section URL and print structure readable, including missing conditions that are collapsed on screen. Provide/verify print expansion rather than losing those facts from exported results.
- [x] Run results component tests and App.result-integration.test.tsx; inspect 390/860/1920 and no double-counting/changed pass rules. Commit/report owned files.

### Task 4: 관심 질문·트랙 비교

**Files:** Own src/features/recommendations/**, src/styles/planner-recommendations.css and recommendation-only selectors in src/styles/planner-entry.css. App.tsx recommendation composition and a narrowly scoped recommended-target transition/callback plus its tests may be added for real track choice. Other App code is not owned.
**Interfaces:** Preserve InterestSurveyProps, SurveyAudienceStep callbacks and existing TrackRecommendationAxes props; add optional onChooseTrack(trackId: TrackId) only when backed by the real App handler. No changes to interest scoring/engine/storage schema.
- [x] Use the existing individual mockup-survey.png and mockup-recommendation.png under design-proposals/full-service-pages-2026-09-02/mockups as secondary layout references with the current page-specific palette and new hierarchy. Exclude any obsolete map/compass/auth/demo-number elements and use real engine results.
- [x] Rebuild the survey as a question-focused teal page with meaningful affiliation entry, question progress, all five answer choices and explicit next/restart states. Preserve current audience and answers on re-entry.
- [x] Rebuild axes as a comparison workspace: five real track candidates, selected axis/leader, concrete reasons and user track choice. Empty interest/progress/plan axes must offer the appropriate input action. Do not combine independent scores or invent percentages.
- [x] A chosen candidate must have a real next step: App's new handler prepares profileDraft(goal check-progress, studyPath track-major, current affiliation, curriculumRuleVersion 2026-provided-final-plan, ruleApplicability reference-only for this new trial) and targetTrackId via existing applyPlanningSourceChange, then opens profile/path for confirmation (affiliation if absent). Preserve the committed profile, course selections and interest survey; never store a progress-based choice as a survey answer or silently change a committed study path. Do not carry an old path's officially-verified flag into the new draft. Label the action as selecting this track for diagnosis/confirmation. Add failure-first transition tests for these preserved fields and route.
- [x] Use dku-survey-page and dku-comparison-page roots. Share page heading typography but give questions and comparison different compositions. Existing strong source strings can remain within details; no full-page old layout reuse.
- [x] Run recommendation components, App.recommendation-dom.test.tsx, App.survey-audience-transition.test.ts; check keyboard/state/track choice. Commit/report owned files.

### Task 5: 선택형 학기 플래너

**Files:** Own src/features/planning/**, src/styles/planner-planning.css. App.tsx planning branch wrappers/headings/navigation labels may be adjusted only for new composition, not handlers/routes/save logic. No planner engine edits.
**Interfaces:** Preserve GraduationPlanSetup, GraduationPlanResult, GraduationPlanPrerequisite callbacks and result types.
- [x] Use design-proposals/full-service-pages-2026-09-02/mockups/mockup-plan.png as a layout reference. Use real result slots and current approved warm planner palette; exclude map/compass/demo-value/auth content.
- [x] Rebuild prerequisite, conditions, schedule and checks as purpose-specific planner pages. Conditions are a compact form; schedule is a semester board; checks is unresolved items/actions. Separate actual course placements from anonymous elective reservations.
- [x] App's planner top link always opens the plan-comparison page, so its visible label must describe that destination rather than promise browser history. Keep that callback and the conditional single-main rendering unchanged.
- [x] Use dku-plan-page roots and warm notebook palette. Consolidate repeated offering boilerplate at board level without claiming future availability. Keep named course code/credit and row-accessibility names.
- [x] Preserve plan validation, save states, no auto-selection, empty/error recovery, desktop/mobile and print.
- [x] Run planning tests and App.graduation-plan-integration.test.tsx. Commit/report owned files.

### Task 6: 자료·공식 교육과정·시간표

**Files:** Own src/features/resources/**, src/styles/planner-resources.css, new src/data/officialTimetable2026.ts and its tests, relevant documentation, src/data/officialResources.ts and courseOfferings2026.ts metadata only where needed to replace stale public-access wording. Extend ResourceSection in src/lib/appRouting.ts and related route/resource tests to add the timetable destination. Preserve the historical records. Research handoff: .superpowers/sdd/2026-09-08-page-by-page-rebuild/official-data-handoff.md.
**Narrow cross-page integration:** CourseLedger search, CourseLedgerRow code detail, CourseSelectionView scope help and related tests may be edited to recognize/display the existing official course codes. No other input-page layout changes.
**Interfaces:** Preserve ResourceIndexViewProps and ResourceSection routes; add a typed timetable dataset whose fields include officialCourseCode/courseName/section/credits/instructor/dayPeriods/room and source query scope. Do not change rule credit attribution for new non-track courses.
- [x] Read verified research handoff. Keep 2026 curriculum, old offering patterns, and actual 2026-2 class sections as separate concepts; include source dates and exact public search conditions.
- [x] Rebuild tracks/modules/curriculum/timetable/official as five distinct pages with common local navigation. Add canonical ?view=resources&section=timetable so real classes are not crammed into the curriculum table. Modules display49 track composition courses by15modules. Curriculum displays the47 currently published department courses, marks the page's missing revision year and includes the10 additional rows faithfully. Timetable displays37 verified2026-2 sections, query/date/delivery and unknown fields. Clear empty/unknown conditions and searchable/filterable sections are required.
- [x] Keep official videos/links functional and do not duplicate a large source ledger on every informational page. Give contact information appropriate hierarchy.
- [x] Make copied official course codes useful in direct input: match officialCourseCode/timetableName from existing courseOfferings2026 alongside project code/name, normalize spaces consistently, and distinguish '학사 과목코드' from '트랙 자료 코드' in optional row info. Explain concisely that direct diagnosis shows its45 major track courses, while department curriculum/actual timetable have different scopes. Preserve all filtering/status/credit semantics; do not add non-module subjects to the engine.
- [x] Test source records, duplicate sections, valid mappings, filters/search, URLs, and responsive table/card presentation. Commit/report owned files.

### Task 7: 홈·공통 연결과 마감

**Files:** Own src/features/landing/**, src/features/shell/**, src/features/contact/**, src/styles/planner-home.css, planner-shell.css, planner-service-zones.css. Limited App/main global frame/style-import composition may be adjusted to stop legacy style leakage; never alter routing/calculation/storage logic. Controller handles final documentation.
**Interfaces:** Keep TrackServiceLandingProps, GuidebookShellProps and navigation/state callbacks; page-specific content remains in other feature roots.
- [x] Rebuild home around the established catchphrase and primary current-course diagnosis; use actual resume state as a quiet continuation and guide/recommendation as optional entry. Use the existing desk image in a deliberate layout and concise section rhythm, not the old repeated feature panels.
- [x] Unify brand/header/local page widths and typography without turning all pages into one template. Desktop and mobile main navigation must preserve the service hierarchy and availability labels.
- [x] Consolidate planner-service-zones.css to page background tokens and genuinely shared shell rules. Retired feature-class overrides must not restyle new dku-* page layouts. Check any remaining service-shell global styles and isolate or remove their influence from rebuilt pages while preserving PDF-review styling. Do not delete files or reset other changes.
- [x] Check each canonical page and route alias for a visible proper next step. Resolve style leaks found during page-by-page browser checks without undoing each page's identity.
- [x] Worker: run focused home/shell/contact tests, typecheck/diff and 390/860/1920 browser checks; commit owned implementation only. Controller: after all task reviews, run full tests/types/build/diff, browser core flows/storage/empty/error/contrast/9-viewports, source integrity, GitHub push and existing Vercel deployment verification. Record evidence/remaining limits and finish only after all tasks are integrated.
