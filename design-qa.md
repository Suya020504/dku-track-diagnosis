# Design QA

final result: passed

## Comparison target

- Source concept: `C:\Users\HAPPY\.codex\generated_images\01a03522-bcb6-7732-bed8-7daf20230593\exec-430980e9-b7ae-4edf-8abf-b7edca1ec5a2.png` (`864 × 1821`)
- Rendered implementation: local Vite app at `http://127.0.0.1:5173/`
- Browser verification: Codex in-app Browser/IAB
- Desktop capture: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-landing-research\33-local-landing-desktop-final.png`
- Full-page capture: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-landing-research\35-local-landing-full-final.png`
- Mobile capture: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-landing-research\36-local-landing-mobile-hero-final.png`
- Combined comparison: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-landing-research\34-source-vs-implementation-final.png`

The source first-viewport crop (`864 × 614`) and the desktop implementation capture (`1425 × 1013` image pixels from a `1440 × 1024` CSS viewport) were normalized to the same aspect ratio and placed in one comparison image. Device scale factor was `1`.

## Iteration findings and fixes

### P2 — mobile sticky header did not remain visible

- Evidence: the header bounding box moved above the viewport after scrolling even though `position: sticky` was set.
- Cause: `overflow-x: hidden` on the page root created a containing block that prevented the expected sticky behavior.
- Fix: changed the horizontal overflow policy to `overflow-x: clip`.
- Post-fix evidence: at mobile scroll positions the header remained at `top: 0`; the fixed state is visible in the mobile section capture.

### P2 — result-preview navigation looked duplicated and showed a native scrollbar on mobile

- Evidence: the mobile preview showed both the top tab row and the desktop side navigation, plus a persistent Windows scrollbar.
- Fix: kept the top tab row as the mobile control, hid duplicate side buttons at the mobile breakpoint, reduced tab typography, and visually hid the scrollbar while preserving horizontal scroll.
- Post-fix evidence: the mobile preview uses one clear tab row and the selected `다음 수강 추천` panel remains readable.

### P2 — hero heading had an unbalanced final line

- Evidence: an intermediate desktop capture left `있나요?` on a short final line.
- Fix: applied balanced text wrapping and a bounded desktop type scale.
- Post-fix evidence: the final desktop capture keeps a strong three-line hierarchy without an orphaned word.

## Fidelity ledger

| Surface | Source evidence | Render evidence | Result |
| --- | --- | --- | --- |
| Header | DKU brand, four anchors, one green CTA | Same navigation labels and one primary CTA | Matched |
| Hero copy | Pre-enrollment context, problem-first headline, two actions | Same copy hierarchy and action order | Matched; three-line responsive wrap at 1440 is acceptable |
| Before/after story | Manual course comparison transformed into a 60% result | Same two-panel comparison, arrow, remaining-course and priority data | Matched; native horizontal progress replaces the concept ring |
| Problem band | Three numbered student questions | Same order, copy intent, light-gray band, green number markers | Matched |
| Track explanation | Course → module → track relationship | Same five-row flow and 푸드마케팅 destination | Matched |
| Track explorer | Five track tabs and selected track details | Uses real curriculum data and working selected states | Matched and functional |
| Process | Three-step diagnosis flow | Same progression and hierarchy with responsive vertical mobile layout | Matched |
| Result preview | Summary, modules, courses, recommendations | All four tabs change local UI state; CTA enters the real diagnosis | Matched and functional |
| Closing trust block | Reference-only tool, official-data basis, final CTA | Same trust framing plus department source link | Matched |

## Required fidelity surfaces

- Fonts and typography: Korean system-first stack with Pretendard/SUIT fallbacks, deliberate weights and line heights on headings, controls, tabs, labels, and small supporting text. Desktop and mobile wraps were inspected; no clipping or orphaned hero line remains.
- Spacing and layout rhythm: 1120px desktop container, open white sections, alternating cool-gray bands, low-radius panels, and restrained borders preserve the reference's institutional service rhythm. Desktop and 390px mobile layouts were inspected.
- Colors and visual tokens: true white background, cool gray `#f7f9fb`, navy `#172b4d`, blue `#1f57b8`, and forest green `#087a5b`. No decorative gradients or warm tint were introduced.
- Image quality and asset fidelity: the supplied DKU logo asset renders sharply at desktop and mobile sizes. The visual target does not rely on photographic or illustrative assets; semantic icons come from the project's existing icon library.
- Copy and content: above-the-fold headline, nav labels, CTAs, trust line, problem questions, and before/after labels match the accepted concept. Official-benefit copy was added below the track explanation because the user explicitly requested source-grounded reasons for taking a track.

## Above-the-fold copy diff

- Added copy: none beyond the accepted concept and user-requested service explanation.
- Removed copy: none.
- Renamed copy: none.
- Reordered copy: none.

## Intentional deviations

- The source concept's circular `60%` indicator is implemented as a native horizontal progress element for accessibility and responsive reliability.
- The official-benefits section is inserted between the relationship explanation and track explorer. This is a user-requested content addition grounded in official department sources.
- The functional result preview contains meaningful selected states and content changes that the static concept could only imply.

## Functional and responsive verification

- Track tabs update the selected track and module list.
- All four result-preview tabs update the visible panel.
- Landing CTA enters the existing diagnosis flow without opening the tutorial unexpectedly.
- The app-shell brand returns from diagnosis to the landing page.
- Desktop `1440 × 1024` and mobile `390 × 844` were inspected.
- No horizontal content overflow was found on mobile.
- Browser error/warning log was empty.
- `pnpm run test`: 20 tests passed.
- `pnpm run build`: passed.

No actionable P0, P1, or P2 visual mismatches remain. The implementation was faithfully verified against the accepted design, with the intentional deviations above retained for accessibility and the user's explicit content requirement.
