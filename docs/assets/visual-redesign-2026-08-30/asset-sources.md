# Visual Redesign Asset Sources

## Campus compass illustration

- Runtime file: `public/campus-compass-illustration.webp`
- Read-only source: `C:\Users\HAPPY\Desktop\개인 프로젝트 모음\트랙제 시뮬 사이트 구현\public\campus-compass-illustration.webp`
- SHA256: `7B9F017DDC2CF9CB4BD7FB94D73EB2CEA348EF124DC75C08B85B01DA1FC93A25`
- Dimensions: `1672 × 941 px`
- Status: generated concept illustration; it is not an official campus photograph, seal, logo, or curriculum evidence.
- Runtime purpose: provide the landing compass-and-path scene only; all factual text, course data, progress, and evidence labels remain HTML.
- Alt guidance: describe it as a concept illustration of campus wayfinding and an academic route. Use an empty alt only when nearby text already provides the same non-factual context.

No official-campus photo derivative, university logo/seal asset, or `landing-student.jpg` was copied for this redesign foundation.

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
