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

---

## Internal service redesign QA — 2026-08-25

### Comparison target

- Approved visual language: `C:\Users\HAPPY\.codex\generated_images\01a03522-bcb6-7732-bed8-7daf20230593\exec-430980e9-b7ae-4edf-8abf-b7edca1ec5a2.png`
- Before state: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-audit\03-result-top.png`
- After state: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\17-result-desktop-final.png`
- Combined comparison input: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\19-reference-before-after-comparison.png`
- Diagnosis desktop: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\16-diagnosis-desktop-final.png`
- Diagnosis mobile: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\10-diagnosis-mobile-final.png`
- Course list mobile: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\12-course-table-mobile-fixed.png`
- Result mobile: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\14-result-mobile-final.png`
- Planning desktop: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-track-internal-redesign\18-plan-desktop-final.png`

The before and after captures use the same `1440 × 1024` browser viewport, the same selected track, and the same three checked courses. The approved landing concept crop, before result, and after result were placed in one normalized comparison image.

### Iteration findings and fixes

#### P2 — mobile course cells collapsed and overlapped inside the bounded table

- Evidence: the first mobile table pass compressed each semester cell to about 39px while its content overflowed into following rows.
- Cause: the bounded grid allowed automatic rows to shrink because the mobile cells had `min-height: 0`.
- Fix: set `grid-auto-rows: max-content` for the mobile transposed semester table.
- Post-fix evidence: each semester cell height now matches its content and the table scrolls internally without overlap.

#### P2 — mobile icon-only header buttons lost their accessible names

- Evidence: when visible text was hidden at the mobile breakpoint, the Browser accessibility snapshot exposed unnamed buttons.
- Fix: added `aria-label="사이트 사용법 열기"` and `aria-label="더보기 메뉴"`.
- Post-fix evidence: the usage guide and secondary menu can be targeted by accessible name.

#### P2 — course selection and result pages remained unnecessarily long

- Evidence: the first mobile redesign still measured 3,766px and showed all twelve semester-unassigned courses by default.
- Fix: collapse completed track setup, contain the timetable in a viewport-relative scroll area, move semester-unassigned courses into disclosure, limit summary recommendations, and divide result details into three tabs.
- Post-fix evidence: the mobile diagnosis page dropped to 2,995px while keeping the full course dataset available on demand; the result's first screen is now focused on four metrics and one detail tab.

### Fidelity ledger

| Comparison point | Evidence | Result |
| --- | --- | --- |
| Navigation | Seven-item gradient sidebar replaced with three numbered primary steps and a secondary menu | Matches the approved task-first structure |
| Palette | Decorative cyan/lime gradients removed; white, cool gray, navy, blue and forest green tokens used | Matches the landing visual language |
| Typography | Large navy task heading, green contextual label, restrained body copy and deliberate control text | Matches the approved hierarchy |
| Container model | Large repeated cards reduced to open bands, bounded work surfaces, rows and disclosures | Matches the reference's visual economy |
| Tabs | Result and planning tabs use selected underline, clear labels, `role="tab"`, `aria-selected` and panel relationships | Matches TDS-inspired behavior |
| Course selection | Desktop keeps a readable timetable; mobile changes to stacked semester rows; both preserve real checkboxes and filters | Functional responsive extension |
| Results | Summary, module status and required courses no longer render as one long stack | Matches `One thing per one page` intent |
| Secondary content | Guidance, official resources, full curriculum and additional videos remain available without competing with the main flow | Intentional progressive disclosure |

### Required fidelity surfaces

- Fonts and typography: the landing font stack and navy/green hierarchy are reused across header, headings, tabs, filters, metrics, table cells and buttons. Desktop and mobile wrapping were inspected.
- Spacing and layout rhythm: 1240px internal canvas, 14–18px component gaps, 44–46px primary controls, 12–14px radii, and bounded table height create a consistent service rhythm without nested-card accumulation.
- Colors and visual tokens: foreground, background and stroke roles are separated. Green is reserved for active/complete/primary actions, blue for secondary information, orange for warning, and cool gray for neutral surfaces.
- Image quality and asset fidelity: the DKU seal remains sharp at both header sizes. Video embeds retain a stable `16:9` aspect ratio and do not exceed their container.
- Copy and content: primary labels were intentionally shortened to `자가진단`, `결과`, and `학기 계획`; the detailed explanation and official sources remain available through the secondary menu.

### Core interaction verification

- Track setup expands, accepts selections, and collapses into a compact summary.
- Desktop and mobile course filters remain interactive.
- Existing course selections and local browser persistence remain intact.
- Result tabs switch among summary, missing modules and required courses.
- Planning tabs switch between track recommendation and semester plan.
- More menu opens official resources, track guidance and contact pages.
- The four-step usage guide opens and closes.
- Browser error/warning log is empty.
- `pnpm run test`: 20 tests passed.
- `pnpm run build`: passed.

### Intentional deviations

- Status surfaces keep restrained blue, green and warning tints where color communicates meaning; decorative page gradients were removed.
- The internal app uses a desktop table because the task is comparison-heavy, while mobile uses list rows rather than shrinking the desktop grid.
- Long reference material is not deleted; it is moved behind explicit disclosures so the primary task stays short.

No actionable P0, P1, or P2 visual or interaction issues remain in the inspected states. The internal service was visually checked against the approved landing language and functionally checked through the complete diagnosis, result and planning path.
