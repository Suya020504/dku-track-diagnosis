---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/styles.css","src/features/recommendations/InterestSurvey.tsx","src/features/planning/GraduationPlanResult.tsx"]
---

## Scope and mode

Full visual redesign of the web app shell and its landing, onboarding, diagnosis, results, recommendation, planning, resources, and history surfaces. Landing is Persuade; task screens are Operate; educational and evidence screens are Read.

## Audience, job, and action

Primary audience is a Dankook University Food and Resource Economics freshman who does not yet understand the track system. The first action is `내 관심 트랙 찾기`; students who already know their direction use `이수 과목 바로 진단` as a secondary shortcut.

## Product proof and constraints

The surface must demonstrate the real path from interest questions to track choice, completed courses, independent recommendation axes, and a semester plan. It must preserve current calculations, evidence boundaries, URL restore, local-only state, keyboard/mobile behavior, print PDF output, and the private PDF import beta. No fake official completion, accounts, names, logos, progress numbers, or student data.

## Chosen direction

User-selected C: `학업 플래너형`, inside the committed `캠퍼스 안내책자 × 학업 플래너` world. A left guidebook index, central Compass Path Ribbon, and progressively unfolding semester planner replace the incumbent card-grid dashboard. The memorable moment is the planner opening from interest → track → semester after the first action.

## First viewport

Index `01 시작하기` active; headline and primary interest CTA central-left; quiet direct-diagnosis shortcut; compass landscape upper-right; three-step planner ribbon across the center; only a partial locked planner preview below. Exact UI text and real data remain semantic HTML.

## Unresolved decisions

Exact bundled Korean display/body font files and licensing; whether the official campus photo source card ships enabled before external reuse permission is confirmed; final density of the desktop index after usability testing.
