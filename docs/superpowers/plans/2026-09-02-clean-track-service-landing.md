# Clean Track-Service Landing and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the campus-map landing with a clean four-section student home, make situation simulation the primary action, keep the track guide optional, and remove the duplicate academic ribbon from reference pages.

**Architecture:** Build a focused landing feature from small semantic components and keep all routing callbacks in `App.tsx`. Reuse real track data, the existing planner-status resolver, the official DKU logo file, and current canonical URLs; generated comps remain visual references rather than runtime UI screenshots.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest 4, Lucide React, CSS container queries

**Spec:** `docs/superpowers/specs/2026-09-02-full-service-interaction-responsive-expansion-design.md`

## Global Constraints

- Landing headline is exactly `어떤 트랙이 나한테 잘 맞을까?`.
- Primary CTA is `내 트랙 확인하기`; optional guide CTA is `트랙제 먼저 알아보기`.
- No map, road, route SVG, legend, geographical interaction, fake percentage, or fake student data appears on landing.
- Render `public/dku-logo.png` directly; do not bake or regenerate the logo in a bitmap.
- Existing diagnosis, recommendation, result, plan, and resource URLs remain valid.
- Reference pages use their own local tabs and do not render the academic journey ribbon.
- Mobile and desktop have the same actions with different composition.

---

### Task 1: Lock the Landing Contract with Failing Tests

**Files:**
- Create: `src/features/landing/TrackServiceLanding.test.tsx`
- Modify: `src/App.track-guide-dom.test.tsx`
- Create: `src/App.resources-navigation.test.tsx`

**Interfaces:**
- Future component: `TrackServiceLandingProps`
- App contract: landing and resources pass `[]` to `GuidebookShell.journeyItems`

- [ ] **Step 1: Write the failing landing contract test**

```tsx
function renderLanding() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <TrackServiceLanding
      tracks={tracks}
      plannerStatus="empty"
      onStartSimulation={() => undefined}
      onOpenGuide={() => undefined}
      onOpenRecommendation={() => undefined}
    />,
  ));
  return { host, root };
}

it("presents simulation first without a map metaphor", () => {
  renderLanding();
  expect(screen.getByRole("heading", { level: 1, name: "어떤 트랙이 나한테 잘 맞을까?" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "내 트랙 확인하기" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "트랙제 먼저 알아보기" })).toBeTruthy();
  expect(document.querySelector("[data-map-mode]")).toBeNull();
  expect(document.querySelector("[data-map-stop]")).toBeNull();
});
```

- [ ] **Step 2: Write the failing resources-ribbon test**

```tsx
it("uses only local resource tabs", async () => {
  await mountAt("/?view=resources&section=modules");
  expect(document.querySelector('nav[aria-label="학업 여정"]')).toBeNull();
  expect(document.querySelectorAll("[data-resource-section-tab]")).toHaveLength(4);
});
```

- [ ] **Step 3: Run tests and verify RED**

Run: `npm.cmd test -- --run src/features/landing/TrackServiceLanding.test.tsx src/App.resources-navigation.test.tsx`

Expected: FAIL because the new landing does not exist and resources still render the academic ribbon.

---

### Task 2: Build the Four-Section Landing Components

**Files:**
- Create: `src/features/landing/TrackServiceLanding.tsx`
- Create: `src/features/landing/TrackPreviewAccordion.tsx`
- Create: `src/features/landing/SimulationSteps.tsx`
- Create: `src/styles/planner-home.css`
- Modify: `src/styles.css` import list

**Interfaces:**
- `TrackServiceLanding({ headingRef, tracks, plannerStatus, onStartSimulation, onOpenGuide, onOpenRecommendation, onPlannerAction })`
- `TrackPreviewAccordion({ tracks, onOpenGuide })`
- `SimulationSteps({ resultReady, planReady })`

- [ ] **Step 1: Implement the semantic hero**

```tsx
<header className="track-home__hero">
  <div className="track-home__brand">
    <img src="/dku-logo.png" width="92" height="43" alt="단국대학교" />
    <span aria-hidden="true" />
    <strong>식품자원경제학과</strong>
  </div>
  <p>단국대 학생을 위한 트랙제 안내·자가진단</p>
  <h1 ref={headingRef} tabIndex={-1}>어떤 트랙이 나한테 잘 맞을까?</h1>
  <p>관심 있는 분야와 지금까지 들은 과목을 입력하면, 가까운 트랙과 앞으로 더 들어야 할 과목을 확인할 수 있어요.</p>
  <button type="button" onClick={onStartSimulation}>내 트랙 확인하기</button>
  <button type="button" onClick={onOpenGuide}>트랙제 먼저 알아보기</button>
</header>
```

Add the trust line from spec section 6.1. Keep the primary button filled green and the guide action as an underlined or outlined secondary action.

- [ ] **Step 2: Implement the distinct start paths**

The main panel calls `onStartSimulation`; a smaller optional panel calls `onOpenRecommendation`. Do not use identical card tokens for both.

- [ ] **Step 3: Implement the five-track accordion**

Use `tracks` and `TrackGlyph`; the first item can be expanded by default, but every button must expose `aria-expanded` and work by click, Enter, and Space. Never rely on hover alone.

- [ ] **Step 4: Implement the four-step strip**

```ts
const steps = ["소속·경로", "과목 입력", "결과 확인", "선택형 계획"] as const;
```

Display state with icon, label, and text; plan remains visually optional.

- [ ] **Step 5: Implement saved-state resume copy**

Map the existing `LandingPlannerStatus` states to one resume action. Do not render fake course counts.

- [ ] **Step 6: Run component tests and verify GREEN**

Run: `npm.cmd test -- --run src/features/landing/TrackServiceLanding.test.tsx`

- [ ] **Step 7: Commit when explicitly authorized**

```bash
git add src/features/landing src/styles/planner-home.css src/styles.css
git commit -m "feat: build clean track simulation landing"
```

---

### Task 3: Replace the Map Landing in App Routing

**Files:**
- Modify: `src/App.tsx:30,1058-1175,1355-1368`
- Modify: `src/App.recommendation-integration.test.tsx`
- Modify: `src/features/landing/TrackServiceLanding.test.tsx`

**Interfaces:**
- Removes runtime dependency on `CampusMapLanding`
- Reuses `startEntryFlow("check-progress")`, `startEntryFlow("find-track")`, `landingPlannerStatus`, and `landingPlannerAction`

- [ ] **Step 1: Write failing App CTA route tests**

```ts
await click("내 트랙 확인하기");
expect(location.search).toBe("?view=diagnosis&step=profile&profile=affiliation");

await mountAt("/");
await click("트랙제 먼저 알아보기");
expect(location.search).toBe("?view=track-guide&section=overview");
```

- [ ] **Step 2: Run the App tests and verify RED**

Run: `npm.cmd test -- --run src/App.recommendation-integration.test.tsx`

- [ ] **Step 3: Replace the landing render branch**

```tsx
if (activeView === "landing") {
  return renderGuidebook(
    <TrackServiceLanding
      headingRef={stepHeadingRef}
      tracks={tracks}
      plannerStatus={landingPlannerStatus}
      onStartSimulation={() => startEntryFlow("check-progress")}
      onOpenGuide={() => navigateAppRoute({ view: "track-guide", section: "overview" })}
      onOpenRecommendation={() => startEntryFlow("find-track")}
      onPlannerAction={landingPlannerAction}
    />,
    [],
    true,
  );
}
```

Change GUIDE INDEX label `지도 안내` to `홈` and current label to `홈`.

- [ ] **Step 4: Run App tests and verify GREEN**

Run: `npm.cmd test -- --run src/App.recommendation-integration.test.tsx src/App.help-dialog.test.tsx src/features/landing/TrackServiceLanding.test.tsx`

- [ ] **Step 5: Commit when explicitly authorized**

```bash
git add src/App.tsx src/App.recommendation-integration.test.tsx src/App.help-dialog.test.tsx
git commit -m "feat: make simulation the landing primary action"
```

---

### Task 4: Remove the Floating Journey Ribbon from Reference Pages

**Files:**
- Modify: `src/App.tsx` track-guide and resources render branches
- Modify: `src/features/resources/ResourceIndexView.tsx`
- Test: `src/App.resources-navigation.test.tsx`
- Test: `src/App.track-guide-dom.test.tsx`

**Interfaces:**
- `renderGuidebook(content, [])` hides the global journey ribbon
- Resource tabs remain the only local sequence

- [ ] **Step 1: Add stable resource-tab markers**

```tsx
<button data-resource-section-tab={page.id} aria-current={section === page.id ? "page" : undefined}>
```

- [ ] **Step 2: Hide the journey ribbon on resources**

Move resources before the generic service-shell return and use this exact branch. Remove the old `activeView === "resources"` section from the generic workspace.

```tsx
if (activeView === "resources") {
  return renderGuidebook(
    <main className="planner-resources-main">
      <ResourceIndexView
        section={resourceSection}
        onSectionChange={navigateResourceSection}
      />
    </main>,
    [],
  );
}
```

Preserve exactly one `main` element.

- [ ] **Step 3: Run navigation tests**

Run: `npm.cmd test -- --run src/App.resources-navigation.test.tsx src/App.track-guide-dom.test.tsx src/features/resources/ResourceIndexView.test.tsx`

Expected: PASS; the local four tabs still push canonical URLs and browser Back restores the previous section.

- [ ] **Step 4: Commit when explicitly authorized**

```bash
git add src/App.tsx src/features/resources/ResourceIndexView.tsx src/App.resources-navigation.test.tsx src/App.track-guide-dom.test.tsx
git commit -m "fix: use local navigation on reference pages"
```

---

### Task 5: Retire Map-Only Runtime Code and Validate Responsive Layout

**Files:**
- Delete after zero-reference proof: `src/features/map/CampusMapLanding.tsx`
- Delete after zero-reference proof: `src/features/map/CampusJourneyMap.tsx`
- Delete corresponding obsolete map-only tests if no shared contract remains
- Modify: `src/styles/planner-map.css`
- Modify: `src/styles/planner-responsive.css`
- Test: `src/features/landing/TrackServiceLanding.test.tsx`

**Interfaces:**
- Preserves all data/routing functions; removes only orphaned presentation code

- [ ] **Step 1: Prove zero runtime references before deletion**

Run: `rg -n "CampusMapLanding|CampusJourneyMap|academic-journey-campus-map" src public README.md CHANGELOG.md`

Expected: references only in files being retired, historical documentation, or assets. Do not delete historical docs.

- [ ] **Step 2: Remove orphaned runtime imports and CSS**

Delete map-only components only after Step 1. Keep generated/reference assets until the final diff review confirms they are unused and safe to retain as historical assets.

- [ ] **Step 3: Add responsive CSS contracts**

Use these tiers from the spec: 320-359, 360-599, 600-899, 900-1199, 1200-1679, and 1680+. At 600-899, the track accordion may use two columns; at 360-599, every CTA is full width; at 1920, cap content width to avoid stretched empty space.

- [ ] **Step 4: Run related and full test gates**

Run: `npm.cmd test -- --run src/features/landing/TrackServiceLanding.test.tsx src/App.resources-navigation.test.tsx`

Run: `npm.cmd test -- --run`

Run: `npm.cmd run build`

Run: `git diff --check`

- [ ] **Step 5: Commit when explicitly authorized**

```bash
git add -A src/features/map src/features/landing src/styles src/App.tsx
git commit -m "refactor: retire the campus map landing"
```
