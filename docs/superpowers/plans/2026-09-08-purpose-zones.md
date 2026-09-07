# Purpose Zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 페이지 목적을 시각적으로 구분하고 기존 진단 여정을 보존해 배포한다.

**Architecture:** App이 이미 확정한 shellRoute.view를 GuidebookShell의 serviceView로 전달한다. 하나의 CSS 파일이 화면별 토큰과 목적에 맞는 제목·표면 스타일을 소유하고, 기존 기능 CSS와 저장 로직은 그대로 사용한다.

**Tech Stack:** React 19, TypeScript 5, Vite 7, CSS custom properties, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-09-08-purpose-zones-design.md

## Global Constraints

- 공통 흰색 헤더, DKU 로고와 학과 홈페이지·YouTube 링크를 유지한다.
- 기존 직접 진단, 관심 추천, 선택적 플래너의 진입 조건과 저장 스키마를 바꾸지 않는다.
- 모바일 360/390/430, Fold 344/768, 태블릿 820/1024, PC 1920×1080을 검증한다.
- 기존 학업 이미지 3개를 재사용하고 신규 의존성을 추가하지 않는다.

### Task 1: 페이지별 표면과 제목

**Files:** Modify src/App.tsx, src/features/shell/GuidebookShell.tsx, src/main.tsx; Create src/styles/planner-service-zones.css.

**Interfaces:** Consumes AppRoute['view']; produces data-service-zone on the shared shell.

- [x] 기준 화면 캡처와 DOM 배경 확인: 홈·가이드·자료·프로필 모두 흰색 계열 동일 표면.
- [x] 아래 전달 경로와 CSS 토큰을 구현한다.

```tsx
<GuidebookShell serviceView={shellRoute.view} /* existing props */ />
// shell prop: serviceView?: AppRoute['view']; default 'landing'
<div className="planner-app planner-guidebook-shell" data-service-zone={serviceView}>
```

```css
.planner-app[data-service-zone="diagnosis"] {
  --service-bg: #edf5fd;
  --service-tint: #dcecfb;
  --service-accent: #22578a;
  --service-line: #c5d8ea;
}
```

- [x] 각 화면 배경·제목·선택 탭·읽기 표면을 명세 팔레트에 맞추고 UI 상태색은 유지한다.
- [x] 관련 테스트: npm test -- src/features/shell/GuidebookShell.test.tsx src/features/landing/TrackServiceLanding.test.tsx src/features/courses/CourseSelectionView.test.tsx src/App.resources-navigation.test.tsx.

### Task 2: 브라우저 사용성과 반응형

**Files:** 필요 시 Task 1 CSS 및 각 기능의 소유 CSS/TSX만 수정.

**Interfaces:** 기존 URL·accessible name 기반 상호작용. 데이터 스키마 변경 없음.

- [x] 직접 진단 → 소속/경로 → 과목 체크 → 결과 → 선택적 플래너를 실행한다.
- [x] 관심 추천 진입·질문·비교 및 가이드 5개 탭, 자료 4개 탭, 도움말을 확인한다.
- [x] 새로고침 후 선택 수·URL 복원, 브라우저 뒤로가기를 확인한다.
- [x] 명세 뷰포트에서 아래 렌더 조건과 스크린샷을 확인한다.

```js
({
  overflow: document.documentElement.scrollWidth > innerWidth,
  mainCount: document.querySelectorAll('main').length,
  h1Count: document.querySelectorAll('h1').length,
  zone: document.querySelector('[data-service-zone]').dataset.serviceZone
})
// Expected: false, 1, 1, current route view
```

### Task 3: 검증과 릴리스

**Files:** README.md, CHANGELOG.md 및 이번 배포에 포함될 기존 누적 변경.

**Interfaces:** 기존 GitHub origin 및 확인한 Vercel 프로젝트.

- [x] npm test; npx tsc --noEmit; npm run build; git diff --check를 실행한다. 53파일·598테스트, 타입·빌드 통과.
- [x] 출처·구형 URL·임시 파일 공개 범위를 검토하고 README/CHANGELOG에 변경·검증·한계를 적는다.
- [x] 관련 파일만 스테이징하고 커밋·현재 브랜치 push. 구현 dc93697.
- [x] 기존 Vercel 프로젝트에 배포하고 production URL에서 홈·가이드·진단 여정을 재검수한다. dpl_5tzC1ZafacXuR9hMqaZBfyXcyLGJ Ready, https://dku-track-diagnosis.vercel.app . 공개 모바일 과목 체크→새로고침→결과, 430/1920 안내 화면 확인.

## Self-review

색상, CTA, 기존 상태, 반응형, 이미지 재사용, GitHub/배포를 각 작업이 포함한다. 과목·트랙 계산 로직은 이번 테마 구현에서 수정하지 않으며, 시각 변경은 렌더 검증을 사용한다.
