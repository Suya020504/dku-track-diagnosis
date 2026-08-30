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
