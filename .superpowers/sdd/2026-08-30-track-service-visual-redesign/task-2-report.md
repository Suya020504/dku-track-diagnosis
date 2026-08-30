# Task 2 Report — Planner Design Foundation

## Outcome

Added a standalone planner design foundation without changing `App.tsx` or legacy `styles.css`. The foundation supplies route-to-journey metadata, five accessible track glyphs, a planner course row, four explicit evidence states, isolated planner CSS tokens/primitives, and the approved compass runtime asset.

## TDD evidence

### RED

Command:

```text
pnpm.cmd vitest run src/app/journeyView.test.ts src/components/TrackGlyph.test.tsx src/components/CourseSticker.test.tsx src/components/EvidenceBand.test.tsx src/data/evidenceSources.test.ts
```

Observed output before implementation:

```text
Test Files  5 failed (5)
Tests  no tests
```

Each suite failed because its new production module did not exist yet: `journeyView`, the three planner primitives, and `evidenceSources` could not be imported. This was the expected missing-feature boundary before implementation.

### GREEN

The same focused command after implementation:

```text
Test Files  5 passed (5)
Tests  18 passed (18)
```

Coverage includes all five readable glyph labels, a decorative glyph hidden from assistive technology, planner-row evidence text, all four evidence states, the historical-snapshot future-guarantee boundary, and canonical route-to-journey stages.

## Asset verification

- Source: `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현\public\campus-compass-illustration.webp`
- Target: `public/campus-compass-illustration.webp`
- SHA256: `7B9F017DDC2CF9CB4BD7FB94D73EB2CEA348EF124DC75C08B85B01DA1FC93A25`
- Dimensions: `1672 × 941 px`
- Status: generated concept illustration, explicitly documented as non-official imagery rather than campus or curriculum evidence.

## Changed files

- `src/app/journeyView.ts`
- `src/app/journeyView.test.ts`
- `src/components/TrackGlyph.tsx`
- `src/components/TrackGlyph.test.tsx`
- `src/components/CourseSticker.tsx`
- `src/components/CourseSticker.test.tsx`
- `src/components/EvidenceBand.tsx`
- `src/components/EvidenceBand.test.tsx`
- `src/data/evidenceSources.ts`
- `src/data/evidenceSources.test.ts`
- `src/styles/planner-tokens.css`
- `src/styles/planner-components.css`
- `src/main.tsx`
- `public/campus-compass-illustration.webp`
- `docs/assets/visual-redesign-2026-08-30/asset-sources.md`

## Verification

```text
pnpm.cmd vitest run src/app/journeyView.test.ts src/components/TrackGlyph.test.tsx src/components/CourseSticker.test.tsx src/components/EvidenceBand.test.tsx src/data/evidenceSources.test.ts
Test Files  5 passed (5)
Tests  18 passed (18)

pnpm.cmd test
Test Files  34 passed (34)
Tests  443 passed (443)

pnpm.cmd build
tsc --noEmit && vite build
built successfully

git diff --check
passed
```

## Self-review

- Planner CSS imports after `styles.css`; every planner rule starts under `.planner-app`, so it cannot restyle legacy surfaces before the planner shell adopts that root.
- Tokens use only the approved paper, sky, mint, blue, green, ink, wheat, and coral palette; the primitives use page bands and planner rows rather than card grids, gradients, glass, or border-plus-shadow treatments.
- `TrackGlyph` maps each current `TrackId` to the required Lucide glyph and exposes a real accessible label only when it is meaningful. Its decorative form has no accessible name or image role.
- Evidence labels explicitly distinguish official public confirmation, a non-guaranteeing 2026 historical snapshot, a provided final-plan reference, and department confirmation required.
- The WebP copy is the sole new runtime visual asset. No official-campus photo derivative, logo/seal, `landing-student.jpg`, legacy app/data file, or north-star UI text/numbers was copied.

## Concerns

- This task intentionally does not mount `.planner-app` or replace legacy screen markup. The imported CSS is dormant until the shell task adopts the planner root, which preserves the current visual UI during parallel work.
- The evidence primitives define presentation and metadata only; later screen tasks must select the correct state for every existing source-backed claim rather than treating the labels as a general official determination.
