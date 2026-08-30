# Task 3 Report — Guidebook Shell

## Outcome

Unified landing, recommendation, profile, diagnosis, PDF review, results, planning, resources, overview, and contact routes under a controlled guidebook shell. The shell supplies one text-only institutional wordmark, a desktop guide index, route-backed Compass Path Ribbon, local-save status, and a mobile fixed navigation with four primary destinations plus a native `details` more menu.

`GuidebookShell` owns no `main`. Existing screens retain their own landmark; the profile route received the missing single `main` wrapper. Existing route, calculation, local storage, PDF memory-only draft/recovery, guide dialog, focus, scroll, snapshot, print, and screen content handlers remain in `App`.

## TDD evidence

### RED — shell primitives

```text
pnpm.cmd vitest run src/features/shell/GuideIndex.test.tsx src/features/shell/MobileJourneyNav.test.tsx src/features/shell/GuidebookShell.test.tsx src/features/journey/CompassPathRibbon.test.tsx
Test Files  4 failed (4)
Tests  no tests
```

All four suites failed at the intended missing-module boundary before production components existed.

### GREEN — shell primitives and App integration

```text
pnpm.cmd vitest run src/features/shell/GuideIndex.test.tsx src/features/shell/MobileJourneyNav.test.tsx src/features/shell/GuidebookShell.test.tsx src/features/journey/CompassPathRibbon.test.tsx src/App.recommendation-dom.test.tsx src/App.graduation-plan-integration.test.tsx
Test Files  6 passed (6)
Tests  39 passed (39)
```

Coverage includes active `aria-current`, visible locked-step reasons, saved/error local status, four mobile primary destinations, a real more menu, readable complete/current/next Ribbon states, one main landmark, guidebook integration on recommendation/planning routes, actual guarded Ribbon navigation, canonical URL change, and destination H1 focus.

### Focus regression found during GREEN

The new real Ribbon navigation test initially failed because moving from recommendation to an already-initialized `profile` diagnosis step changed `activeView` without changing `diagnosisStep`; therefore the existing focus effect did not rerun. The effect now keys on both values and only focuses on diagnosis/result screens. The focused suite then passed.

## Files

- `src/features/shell/GuidebookShell.tsx`
- `src/features/shell/GuidebookShell.test.tsx`
- `src/features/shell/GuideIndex.tsx`
- `src/features/shell/GuideIndex.test.tsx`
- `src/features/shell/MobileJourneyNav.tsx`
- `src/features/shell/MobileJourneyNav.test.tsx`
- `src/features/shell/LocalSaveStatus.tsx`
- `src/features/journey/CompassPathRibbon.tsx`
- `src/features/journey/CompassPathRibbon.test.tsx`
- `src/styles/planner-shell.css`
- `src/styles/planner-journey.css`
- `src/main.tsx`
- `src/App.tsx`
- `src/App.recommendation-dom.test.tsx`
- `src/App.graduation-plan-integration.test.tsx`

## Verification

```text
pnpm.cmd test
Test Files  38 passed (38)
Tests  451 passed (451)

pnpm.cmd build
tsc --noEmit && vite build
built successfully

git diff --check
passed
```

## Browser smoke

In-app Browser against `http://127.0.0.1:5173/`:

- Desktop `1440×900`: correct page identity/title, meaningful landing content, one `main`, shell header visible, left index visible, mobile navigation hidden, no framework overlay, no console warnings/errors.
- Mobile `390×844`: one `main`, shell header visible, desktop index hidden, mobile navigation visible, exactly four primary destinations, `details` more menu visible when opened, no horizontal overflow (`scrollWidth === clientWidth`), 86px bottom reservation, fixed nav bottom aligned to viewport, no console warnings/errors.
- Interaction: mobile more → `트랙` changed the canonical URL to `?view=recommendation&step=survey`, preserved one `main`, and closed the more menu.
- Visual correction during smoke: desktop header actions initially auto-flowed into the center grid cell; explicit third-column placement moved them to the right edge and was rechecked (`actionsRight: 1369` in a 1440px viewport).

## Self-review

- Shell modules contain no `window`, `localStorage`, calculation, storage, or routing imports; all state and callbacks are controlled props.
- The shared shell is rooted at `.planner-app`; all new style rules remain namespaced and import after legacy CSS.
- The shell wordmark is text-only and uses approved planner tokens. No seal, logo, campus photo, or new external asset was introduced or copied.
- The Ribbon and both navigation systems call existing route handlers; they are not decorative progress marks.
- Locked result/plan destinations expose reasons through visible desktop text and accessible descriptions on mobile/Ribbon.
- The mobile fixed navigation reserves safe-area-aware bottom space, uses 44–48px controls, and closes its more menu after route selection.
- Print rules remove only shell navigation chrome and restore content to full width, leaving existing result/plan print behavior intact.
- New focus rules use the approved green double-outline treatment; no gradients, glass, generic equal-card shell grid, decorative numbers, or redundant border-plus-shadow treatment were introduced.

## Concerns

- Task 3 intentionally wraps rather than redesigns interior screens. The legacy landing content and internal layouts remain until their dedicated later tasks; superseded legacy headers are hidden under the shared shell but retained in source for staged migration safety.
- The mobile Ribbon is horizontally scrollable so all five route destinations remain real controls at 390px. Its final density and scrollbar treatment remain a Task 11 responsive-polish concern.
- Browser smoke did not synthesize a private PDF draft. The fixed-nav safe-area geometry was verified, while the complete PDF matching/approval smoke remains part of the PDF and final release tasks.

## Fix round 1 — utility reachability and fact-backed Ribbon completion

### Findings addressed

1. Restored pointer and keyboard reachability for both legacy utility screens without adding steps to the six-item guidebook hierarchy. Desktop now exposes a compact header utility navigation for `트랙제 안내` and `문의사항`; mobile more now contains `트랙제 안내` as well as the existing `문의`. Both surfaces use the existing controlled route callback and expose `aria-current="page"`. The mobile current-step header names `트랙제 안내` or `문의사항` instead of the parent `기록·근거` group.
2. Separated route context from saved completion facts in the Compass Path Ribbon. `current` still follows the canonical URL, while `completed` comes only from explicit `SavedAppStateV2` facts: completed/selected interest survey, reviewed course input, applicable target-track selection, and a saved graduation plan. Unfinished milestones before a direct late-stage URL now render `pending` / `대기`, not `complete`.

The two reviewer Minor findings remain deferred to Task 11 as requested.

### RED

```text
pnpm.cmd vitest run src/features/shell/GuidebookShell.test.tsx src/features/shell/MobileJourneyNav.test.tsx src/features/journey/CompassPathRibbon.test.tsx src/App.recommendation-dom.test.tsx src/App.graduation-plan-integration.test.tsx
Test Files  4 failed | 1 passed (5)
Tests  9 failed | 36 passed (45)
```

The failures reproduced missing desktop utility navigation/current labels, missing mobile overview, missing pending/completed Ribbon metadata, and all five prerequisite-state contradictions.

### GREEN

```text
pnpm.cmd vitest run src/features/shell/GuidebookShell.test.tsx src/features/shell/MobileJourneyNav.test.tsx src/features/journey/CompassPathRibbon.test.tsx src/App.recommendation-dom.test.tsx src/App.graduation-plan-integration.test.tsx
Test Files  5 passed (5)
Tests  45 passed (45)
```

The App coverage compares empty state, profile only, reviewed courses with a missing track-major target, selected target with incomplete course input, and a saved graduation plan. It also exercises desktop and mobile overview/contact callbacks, actual current labels, `aria-current`, canonical URL writes, and one main landmark.

### Type/build correction

The first build correctly caught a test-only tuple inference issue:

```text
pnpm.cmd build
src/App.graduation-plan-integration.test.tsx(397,78): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
src/App.graduation-plan-integration.test.tsx(398,63): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
```

The expected-stage fixture is now read as a `readonly string[]`. Fresh build output:

```text
pnpm.cmd build
tsc --noEmit && vite build
built successfully
```

### Full verification

```text
pnpm.cmd test
Test Files  38 passed (38)
Tests  458 passed (458)

git diff --check
passed
```

### Browser smoke

In-app Browser/connected Edge against the local app:

- Desktop `1440×900`, overview: URL `?view=overview`, current text `현재 · 트랙제 안내`, utility visible, overview `aria-current=page`, one `main`, zero console warnings/errors.
- Desktop contact: utility click changed URL to `?view=contact`, current text to `현재 · 문의사항`, contact `aria-current=page`, one `main`.
- Keyboard: pressing Enter on `트랙제 안내` returned from contact to overview and restored the correct current text.
- Fresh-origin empty plan `?view=plan&step=setup`: `interest/courses/modules/track` each reported `state=pending`, `completed=false`; `semester` reported `state=current`, `completed=false`; the prerequisite page showed `프로필 입력 필요`; zero console warnings/errors.
- Mobile `390×844`: overview current text and mobile `aria-current` were correct; utility nav was hidden; fixed mobile nav was visible; `scrollWidth === clientWidth`; bottom reservation remained `86px`. Mobile more → `문의` changed the URL and current text to contact, preserved one `main`, and closed the menu.

### Self-review

- `GuidebookShell` remains a pure controlled component and still renders no `main`.
- The header utility is secondary navigation, not a seventh guidebook milestone; the committed six-step guide index remains unchanged.
- Mobile fixed destinations and safe-area rules are unchanged; only the missing overview utility entry was added to more.
- `data-completed` records persisted completion independently of `data-state`, allowing a completed current stage to remain current without losing its fact state.
- No route, storage, calculation, PDF, guide, focus, scroll, snapshot, or print handler moved into shell components.
