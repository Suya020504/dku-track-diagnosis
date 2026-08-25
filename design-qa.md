# Landing redesign design QA

## Comparison target

- Source visual truth: `C:\Users\HAPPY\.codex\generated_images\01a03522-bcb6-7732-bed8-7daf20230593\exec-f181ea14-9e28-4185-879a-2033d69cc952.png`
- Rendered implementation: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-landing-redesign-round2\05-implementation-1254.png`
- Side-by-side comparison: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-landing-redesign-round2\07-source-vs-implementation.png`
- Responsive evidence: `C:\Users\HAPPY\.codex\visualizations\2026\08\25\dku-landing-redesign-round2\06-implementation-mobile-390.png`
- Route and state: `http://127.0.0.1:5173/#landing-top`, first question selected, preview progress settled at 60%.

## Viewport and normalization

- Source pixels: 1254 × 1254.
- Implementation pixels: 1254 × 1254, device scale factor 1.
- The in-app browser override was 1269 × 1269; its visible content capture was 1254 × 1254 because of browser scrollbar allocation. The implementation capture therefore matched the source pixel dimensions directly.
- Mobile responsive check: 390 × 844 override, 375 × 844 visible capture, no horizontal overflow (`scrollWidth === clientWidth === 375`).

## Full-view comparison evidence

- Composition: the same two-column hero is preserved—editorial student image and headline on the left, one interactive diagnostic surface on the right, and a four-item value strip below.
- Typography: the Korean headline keeps the three-line rhythm, dark navy weight, green final line, and restrained supporting copy. UI text uses the existing Pretendard/SUIT/system stack and explicit control sizes.
- Colors and tokens: true white background, deep navy, forest green, cool gray borders, and pale green selected states match the approved concept. No gradients, glow, glass effects, or decorative card grid were introduced.
- Image treatment: the photo remains a natural campus-study scene with no overlay or tint. The crop keeps the student, laptop, books, and campus background visible.
- Container and spacing: the diagnostic panel begins and ends with the photo column, with the stepper, questions, result, CTA, and note distributed through the panel rather than leaving a dead lower region.
- Copy: the approved headline, question prompt, three questions, three result values, and primary CTA are present and ordered correctly.

## Focused-region evidence

- Question picker: each row has a numbered state, native button semantics, `aria-pressed`, hover/press feedback, and the selected green outline.
- Live preview: selecting question 2 changed pressed states to `[false, true, false]` and moved the active emphasis to the `남은 과목` metric; the progress count-up completed at 60%.
- CTA: `내 이수 현황 확인하기` opened the real diagnosis workspace, where the diagnosis navigation item exposed `aria-current="step"`.
- Accessibility and runtime: the page has one H1, labelled regions and controls, meaningful photo alt text, focus-visible treatment, reduced-motion handling, and no relevant console warnings or errors.
- Mobile: the hero stacks as headline → image → diagnostic preview, exposes the diagnostic heading within the first viewport, and has no clipping or horizontal overflow.

## Above-the-fold copy diff

- Exact matches: headline, interactive prompt, all three questions, `푸드마케팅 60%`, `남은 과목 4개`, `다음 우선순위 식품유통경제학`, and `내 이수 현황 확인하기`.
- Intentional factual adjustment: the concept note said the history was not saved, but the existing app stores diagnosis state locally. The implementation correctly says `입력 내용은 이 브라우저에만 저장돼요`.
- Intentional editorial adjustment: supporting copy was shortened slightly so the diagnostic preview begins within the mobile first viewport.

## Comparison history

1. P2 — the first desktop render let the right panel stretch below its content, producing a large dead region. Fixed by setting a measured 500px media slot and distributing the diagnostic sections through the shared hero height. The final panel and photo both end at 957px in the normalized capture.
2. P2 — the first mobile render pushed the diagnostic preview entirely below the 844px first viewport. Fixed by reducing mobile display type, tightening supporting copy, and using a 260px editorial image crop. The diagnostic now begins at approximately 643px.
3. P2 — the result icons lacked the visual weight of the concept. Fixed with consistent pale-green circular icon containers and a taller result row.

## Findings

- No actionable P0, P1, or P2 mismatches remain.
- P3 intentional deviation: the generated concept contained invented university marks on clothing and the laptop. The production asset uses an unbranded navy sweatshirt and laptop while preserving the approved scene and crop.
- P3 intentional deviation: the concept used a hand-drawn curved underline. The implementation uses a native text underline to avoid shipping an unnecessary decorative raster or custom-drawn asset.
- P3 test gap: Firefox and Safari were not run; Chromium-based in-app browser coverage passed.

## Implementation checklist

- [x] Approved 1:1 source resolved and inspected.
- [x] Standalone hero asset generated and optimized to 162KB JPEG.
- [x] Desktop 1254 × 1254 visual comparison completed.
- [x] Question selection and active-result state verified.
- [x] Primary CTA-to-diagnosis flow verified.
- [x] Mobile overflow and first-viewport continuity verified.
- [x] Browser console checked with no relevant errors or warnings.
- [x] Unit tests and production build passed.

final result: passed
