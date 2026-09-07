# Visual Redesign Asset Sources

## Current runtime status (2026-09-03)

- The map and compass visual concept is retired from the running service.
- Current runtime assets are `track-service-hero-desk-v2.webp`, `course-module-track-structure-v2.webp`, and `progress-next-semester-planner-v2.webp`.
- The v2 images use course checklist cards, module folders, track cards, and a semester planner. They contain no compass, route, location pin, geographic map, readable text, logo, or watermark.
- Previous campus-map and compass runtime files were removed from `public`. The sections below are retained only as historical provenance for earlier iterations.

## Campus compass illustration

- Runtime file: `public/campus-compass-illustration.webp`
- Read-only source: `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현\public\campus-compass-illustration.webp`
- SHA256: `7B9F017DDC2CF9CB4BD7FB94D73EB2CEA348EF124DC75C08B85B01DA1FC93A25`
- Dimensions: `1672 × 941 px`
- Status: generated concept illustration; it is not an official campus photograph, seal, logo, or curriculum evidence.
- Runtime purpose: provide the landing compass-and-path scene only; all factual text, course data, progress, and evidence labels remain HTML.
- Alt guidance: describe it as a concept illustration of campus wayfinding and an academic route. Use an empty alt only when nearby text already provides the same non-factual context.

No official-campus photo derivative, university logo/seal asset, or `landing-student.jpg` was copied for this redesign foundation.

## Academic journey campus-map background

- Generation mode: built-in `image_gen` tool (`stylized-concept`) using the provided campus-map mockup as the composition reference and the planner-compass mockup as the material/style reference.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\019fae1d-952c-7f52-a1b5-66d624e265e7\exec-17400c91-5a60-4e63-b13f-65d84cb2efa6.png`
- Runtime file: `public/illustrations/academic-journey-campus-map-v1.webp`
- Runtime conversion: FFmpeg, 1600 × 900 center crop, WebP quality 82.
- Runtime SHA256: `DE931E600D6FACAEBB57FBF08A78AB258CE22830E37952AB76CF27D4C31627FC`
- Dimensions and size: `1600 × 900 px`, `85,268 bytes`.
- Purpose: non-factual folded-paper background for the interactive academic-journey map. All route lines, pins, labels, zoom controls, current location, saved state, and navigation remain semantic HTML/React/SVG.
- Alt: empty because the image is decorative; the adjacent H1, explanation, route buttons, legend and route list contain the complete meaning.
- Boundary: this is not a real geographic map, not an official Dankook University campus map, and not evidence of building locations.
- Inspection: no text, letters, numbers, logo, seal, people, route line, pin, button, data, watermark, or exact-campus claim.
- Final prompt:

```text
Use case: stylized-concept
Asset type: responsive website hero background for an interactive academic journey map
Primary request: create a text-free conceptual university campus journey map background that can sit behind real HTML controls, path lines, pins, legend, and cards. It represents a student's academic journey, not a real geographic map and not an official campus map.
Scene/backdrop: a large unfolded paper map with subtle accordion folds and edge shadows, viewed from a gently elevated near-top-down angle. Include faint, generic campus-like academic buildings, library silhouettes, tree-lined paths, a small pond, garden plots, and soft rolling green terrain. Keep the central and lower map areas calm enough for interactive route overlays.
Style/medium: premium Korean campus guidebook illustration; delicate watercolor wash combined with clean vector-like architectural linework; sophisticated and student-friendly.
Composition/framing: very wide landscape composition with useful calm zones for a decision sheet, route overlays and a legend panel.
Color palette: paper white, pale sky blue, mint, restrained deep blue, department green and sparse wheat accents.
Constraints: no text, Korean, English, letters, numbers, logos, seals, people, route lines, pins, buttons, UI panels, legend, compass, data, percentages, watermark, or exact real-campus geography.
```

## Flat academic-journey campus map v2

- Status: supersedes the folded v1 background in the running UI; v1 is preserved for provenance and rollback.
- Generation mode: built-in `image_gen` edit using v1 as the visual reference.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\019fae1d-952c-7f52-a1b5-66d624e265e7\exec-1500ce16-b6d4-4900-b1ee-88b441498f81.png`
- Runtime file: `public/illustrations/academic-journey-campus-map-flat-v2.webp`
- Runtime conversion: FFmpeg, 1600 × 900 center crop, WebP quality 82.
- Runtime SHA256: `E6259BCCF43745FA67076609DB3C38815AD448FC5D039B5D3C003B038350F164`
- Dimensions and size: `1600 × 900 px`, `84,098 bytes`.
- Purpose: quiet, flat 2D guide background for straight HTML/SVG journey routes. The generated background remains decorative and non-geographic.
- Alt: empty because route meaning is provided by the adjacent heading, real buttons, legend and accessible route list.
- Inspection: flat rectangular composition, straight zoning and calm center; no folds, warped edges, text, letters, numbers, logo, seal, people, route line, pin, button, watermark or exact-campus claim.
- Final prompt summary: convert the reference to an orthographic flat 2D campus plan with two tidy horizontal building rows, straight lawns and walkways, a clear central corridor, subtle paper grain, no hills, folds, serpentine roads, UI or text.

### 2026-08-31 local QA captures

- `docs/assets/2026-08-31-campus-map/01-landing-desktop.png` — 1440 × 1100 local Chromium viewport, SHA256 `1F8681233614BD98BD93E13297922CBF109C743AD2A11D04E85F0D9A1EC4AACA`.
- `docs/assets/2026-08-31-campus-map/02-landing-mobile-map.png` — 390 × 844 local Chromium viewport after one vertical scroll to the map, SHA256 `BE790844F53E868FC88BC71FDF0898D07C966659F82E67F4C97C018C7DBF6748`.
- Both captures use a fresh, synthetic, non-personal browser state. They validate visual layout only and do not prove official curriculum recognition or deployment.

## Course → module → track concept illustration

- Generation mode: built-in `image_gen` tool (`stylized-concept`); no CLI/API fallback and no external key.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\01a05325-6894-79e2-91d3-80a61545afcc\exec-8e291479-2a76-4879-b619-272c30a7e550.png`
- Generated source SHA256: `0CF39694C6390748F6DD856387EEA2F4C18CD10EEF73387D20B16D1315908754`
- Runtime file: `public/illustrations/course-module-track-compass-v1.webp`
- Runtime conversion: FFmpeg, Lanczos resize to 960px width, WebP quality 78, picture preset.
- Runtime SHA256: `8CD6D655F7627256C3CE4A0B23239A4AFE8FA08E3855742C02D927866C1104B1`
- Dimensions and size: `960 × 640 px`, `44,030 bytes`.
- Purpose: optional visual support for the HTML explanation of several courses grouping into modules and branching into five tracks.
- Alt: `여러 과목이 모듈로 묶이고 다섯 갈래 트랙으로 이어지는 개념 설명 이미지`
- Inspection: accepted after original and runtime inspection; exactly five terminal branches, blank cards/folders, no text, letters, numbers, logo, seal, people, UI controls, chart, watermark, or official-campus claim.
- Final prompt:

```text
Use case: stylized-concept
Asset type: wide website section illustration for an educational guidebook
Primary request: Create a text-free educational scene showing several separate course notebooks and paper cards flowing from the left into a few grouped module folders in the center, then converging into a five-branch track compass and branching path on the right.
Scene/backdrop: airy abstract Korean campus-guidebook landscape with pale sky, soft mint fields, gentle path lines, tiny wheat sprigs, and generous white space; do not depict a specific real campus.
Subject: clear visual progression from many course items to grouped module folders to exactly five distinct track branches, readable left to right.
Style/medium: clean watercolor and vector hybrid, delicate ink contours, soft translucent washes, polished editorial illustration consistent with an airy academic planner.
Composition/framing: wide landscape, 3:2 aspect ratio, clear left-to-right flow, calm negative space around the objects, all important objects safely inside the frame.
Lighting/mood: bright diffused daylight, calm, optimistic, trustworthy.
Color palette: pale sky blue and mint fields, deep Dankook-like blue linework, department green route accents, tiny warm wheat accents, off-white paper.
Text: none.
Constraints: exactly five final branch directions; no people; no school buildings presented as official; no factual data; no readable markings on cards, notebooks, folders, or compass.
Avoid: text, letters, numbers, logos, seals, school marks, watermarks, UI buttons, charts, graphs, labels, official-campus claims, photorealism, clutter, dark shadows.
```

## Progress → next course → semester planner concept illustration

- Generation mode: built-in `image_gen` tool (`stylized-concept`); no CLI/API fallback and no external key.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\01a05325-6894-79e2-91d3-80a61545afcc\exec-7ba2ca81-4919-4a48-af5f-c391c4bc7ec8.png`
- Generated source SHA256: `2F756837321550B1FB923D47443CE61ED37119A1AA4EF6E778EC03FB2CD9E671`
- Runtime file: `public/illustrations/progress-next-semester-planner-v1.webp`
- Runtime conversion: FFmpeg, Lanczos resize to 960px width, WebP quality 78, picture preset.
- Runtime SHA256: `460AE99B5A97C8E81057673B4BB815411905FF623CE1680BE88B038DB190A084`
- Dimensions and size: `960 × 640 px`, `47,040 bytes`.
- Purpose: optional visual support for the HTML journey from checked progress to one next-course choice and a blank semester planner.
- Alt: `확인한 진행도에서 다음 과목을 고르고 학기 계획으로 이어지는 개념 설명 이미지`
- Inspection: accepted after original and runtime inspection; blank ticket and ledger blocks, non-numeric check marks, no text, letters, numbers, logo, seal, people, fake percentage/data, UI controls, watermark, or official claim.
- Final prompt:

```text
Use case: stylized-concept
Asset type: wide website section illustration for an academic planner guidebook
Primary request: Create a text-free academic-planner journey: a gentle stream of completed progress marks and checked blank paper pieces on the left flows to one highlighted next-course ticket in the center, then opens into a semester planner on the right with blank ledger blocks and a small compass route.
Scene/backdrop: airy abstract academic guidebook landscape with pale sky, soft mint ground, light paper textures, tiny wheat sprigs, and generous white space; no specific real campus.
Subject: a clear left-to-right sequence of confirmed progress, one emphasized next-course ticket, and an open semester planner with a small compass and route line. The progress marks should be simple check shapes without numbers, percentages, or labels. The planner blocks must be blank.
Style/medium: clean watercolor and vector hybrid, delicate deep-blue ink contours, soft translucent washes, polished Korean university guidebook feeling matching an airy campus-compass illustration.
Composition/framing: wide landscape, 3:2 aspect ratio, clear left-to-right journey, highlighted ticket near center, planner clearly open on the right, all important objects safely inside the frame.
Lighting/mood: bright diffused daylight, calm, encouraging, trustworthy.
Color palette: pale sky blue and mint, deep Dankook-like blue linework, department green route accents, small warm wheat accents, off-white paper.
Text: none.
Constraints: blank ticket and blank ledger blocks; no fake progress percentages or data; no people; no school buildings presented as official; semantic meaning will be provided separately in HTML.
Avoid: text, letters, numbers, logos, seals, school marks, watermarks, UI controls, buttons, charts, graphs, labels, official claims, photorealism, clutter, dark shadows.
```
