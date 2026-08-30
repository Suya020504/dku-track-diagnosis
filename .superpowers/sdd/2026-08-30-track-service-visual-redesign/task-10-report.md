# Task 10 Report — Distribute Track Education And Official Evidence

## SDD status

`COMPLETE` — 네 자료 경로를 독립 읽기 페이지로 교체하고, 공식 출처/증거 상태와 생성 보조 이미지 2종을 연결했다. 레거시 모듈 주소, 이미지 실패, 외부 링크, 데스크톱·모바일 렌더링을 검증했다.

## RED / GREEN

- RED: `pnpm.cmd test -- src/features/resources/ResourceIndexView.test.tsx`
  - 새 자료 페이지 구현 전 `ResourceIndexView.test.tsx`의 4개 테스트가 모두 의도대로 실패했다.
  - 실패 원인: `data-resource-page`, EvidenceBand, 교육과정 관계표/이미지 fallback, 캠퍼스 출처 카드가 기존 밀집 화면에 없었다.
  - 당시 전체 결과: 45 test files 중 44 passed / 1 failed, 526 tests 중 522 passed / 4 failed.
- GREEN: `pnpm.cmd exec vitest run src/features/resources/ResourceIndexView.test.tsx src/lib/appRouting.test.ts`
  - 2 files / 31 tests passed.
- 통합 GREEN: `pnpm.cmd exec vitest run src/App.profile-transition.test.tsx src/features/resources/ResourceIndexView.test.tsx src/lib/appRouting.test.ts`
  - 3 files / 38 tests passed.
- 레거시 리소스 코드 제거 후 재검증: 동일 3 files / 38 tests passed.
- `requirementRules2026` 필수 참고안 노출 RED: 해당 문구 assertion 1 failed / 3 passed.
- 위 보강 GREEN: `ResourceIndexView.test.tsx` 4/4 passed.

## 구현 결과

- `tracks`: 현재 `curriculumData`의 실제 5개 트랙과 모듈·학점 조건, `TrackGlyph`, 공식 공개 확인 EvidenceBand를 읽기 순서로 제공한다.
- `modules`: 실제 15개 모듈과 포함 과목, `courseOfferings2026`의 2026 확인 학기를 세 그룹으로 제공하고 미래 개설 비보장/학과 확인 필요를 분리했다.
- `curriculum`: 의미를 HTML로 유지하는 `CourseModuleTrackFigure`와 추천 시점별 9행 교육과정 관계표를 제공한다.
- `official`: 현재 공개 교육과정, 시간표 검색, 학과 홈페이지, 캠퍼스 갤러리의 네 외부 확인 경로를 제공한다.
- `?view=modules`는 마운트 시 `?view=resources&section=modules`로 정규화된다. App이 URL/상태 controller 권한을 유지한다.
- 기존 `App.tsx`의 도달 불가능한 밀집 리소스·모듈·영상 컴포넌트는 제거했다. 계산, 저장 schema, 런타임 의존성은 변경하지 않았다.

## 출처·증거 확인

- 교육과정: `OFFICIAL_CURRICULUM_SOURCE`의 현재 메타데이터만 사용했다.
  - 제목 `2026학년도 학사종합안내`
  - 확인일 `2026-08-30`
  - 서버 수정 시각 `2026-08-27T11:19:56+09:00`
  - 현재 공개본 72쪽
- 개설 이력: `COURSE_OFFERING_SNAPSHOT_META`와 `courseOfferings2026`만 사용했다.
  - 관찰 `2026-08-11`, 재점검 `2026-08-30`
  - 현재 공개 재검증 상태 `blocked-by-public-access`
  - 향후 개설 보장 `false`
- 증거 문구는 `evidenceSources`의 네 상태를 `EvidenceBand`로 표시했다. 공식 판정과 사용자 제공 최종안 참고를 합치지 않았다.
- 필수 참고안은 `REQUIRED_COURSE_VARIANTS["starred-six-2026"]`의 6과목·18학점과 `allowsOfficialCompletion=false`를 그대로 표시했다.
- 단국대학교 공식 캠퍼스 갤러리에서 `천안캠퍼스 항공사진(2022)`, 정보기획팀, `2023-04-05`를 재확인했다.
  - 링크: `https://www.dankook.ac.kr/ko/-565`
  - 사진 파일은 내려받거나 앱에 복제하지 않았다. 아이콘·텍스트·외부 링크만 제공하고 재사용 허가 전 미재현 문구를 고정했다.
- 학생용 참고 도구이며 공식 판정·승인 시스템이 아니라는 disclaimer와 기존 텍스트 wordmark를 유지했다.

## Built-in image generation

두 이미지 모두 built-in `image_gen`의 `stylized-concept` 모드로 생성했다. CLI/API fallback, API key, 의존성 설치를 사용하지 않았다. 정확한 최종 프롬프트 전문과 원본/런타임 경로는 `docs/assets/visual-redesign-2026-08-30/asset-sources.md`에도 기록했다.

### A. 과목 → 모듈 → 트랙

- Final prompt: text-free website section illustration; several blank course notebooks/cards flow left-to-right into grouped module folders, then converge into a compass and exactly five track branches; airy watercolor/vector Korean campus-guidebook feel; pale sky/mint, deep blue linework, green route, wheat accents; no text, letters, numbers, logos, seals, people, UI, chart, watermark, or official-campus claim.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\01a05325-6894-79e2-91d3-80a61545afcc\exec-8e291479-2a76-4879-b619-272c30a7e550.png`
- Source SHA256: `0CF39694C6390748F6DD856387EEA2F4C18CD10EEF73387D20B16D1315908754`
- Runtime: `public/illustrations/course-module-track-compass-v1.webp`
- Runtime SHA256: `8CD6D655F7627256C3CE4A0B23239A4AFE8FA08E3855742C02D927866C1104B1`
- Runtime: `960 × 640`, `44,030 bytes`, FFmpeg Lanczos/WebP quality 78.
- Inspection: 원본과 변환본을 각각 열어 정확히 다섯 종착 갈래, 빈 카드/폴더, 무문자·무로고·무인물·무공식주장을 확인했다.
- Alt: `여러 과목이 모듈로 묶이고 다섯 갈래 트랙으로 이어지는 개념 설명 이미지`

### B. 진행도 → 다음 과목 → 학기 계획

- Final prompt: text-free academic-planner journey; non-numeric checked progress marks flow to one blank highlighted next-course ticket, then to an open semester planner with blank ledger blocks and a small compass route; same airy watercolor/vector palette; no text, letters, numbers, logos, seals, people, fake percentage/data, UI controls, watermark, or official claim.
- Generated source: `C:\Users\HAPPY\.codex\generated_images\01a05325-6894-79e2-91d3-80a61545afcc\exec-7ba2ca81-4919-4a48-af5f-c391c4bc7ec8.png`
- Source SHA256: `2F756837321550B1FB923D47443CE61ED37119A1AA4EF6E778EC03FB2CD9E671`
- Runtime: `public/illustrations/progress-next-semester-planner-v1.webp`
- Runtime SHA256: `460AE99B5A97C8E81057673B4BB815411905FF623CE1680BE88B038DB190A084`
- Runtime: `960 × 640`, `47,040 bytes`, FFmpeg Lanczos/WebP quality 78.
- Inspection: 원본과 변환본을 각각 열어 빈 티켓·빈 원장 블록, 무숫자 체크, 무문자·무로고·무인물·무가짜데이터를 확인했다.
- Alt: `확인한 진행도에서 다음 과목을 고르고 학기 계획으로 이어지는 개념 설명 이미지`

## Browser smoke

Flow: `tracks` → 인덱스 클릭 `modules` → `curriculum` → `official`, 그리고 레거시 `?view=modules` 직접 진입.

- Browser: Codex in-app Browser, localhost `http://127.0.0.1:5173/`.
- 1440×900 override(실제 문서 client 1425px): 네 페이지 모두 URL, active `aria-current=page`, 단일 `data-resource-page`가 일치했다.
- 트랙: 생성 이미지 `naturalWidth=960`, 정확한 alt, 5개 실제 트랙과 공식 EvidenceBand 확인.
- 모듈: 15개 `data-module-id`, 개설 이력 EvidenceBand, 문서 `scrollWidth=clientWidth=1425`.
- 교육과정: 의미 HTML 도식, `식품유통경제학 → F. 유통무역 → 3개 트랙`, 추천 시점 표 확인.
- 이미지 실패: 브라우저 개발 검증으로 B 이미지 주소만 일시적으로 실패시켜 fallback 1개, 이미지 0개, semantic table 유지 `true`를 확인했다. 즉시 reload하여 이미지 1개/fallback 0개로 복구했다.
- 공식 근거: 외부 링크 4개 모두 `target=_blank`, `rel="noopener noreferrer"`, 표시 문구 `외부 링크`; 캠퍼스 출처 카드 내부 사진 0개.
- 390×844 override(실제 문서 client 375px): 문서 `scrollWidth=clientWidth=375`, 본문 폭 351px, 인덱스 폭 323px, 생성 이미지 표시 폭 323px, main 하단 여백 94px. 고정 하단 nav와 본문 action이 겹치지 않았다.
- 브라우저 error/warn log: 0.
- desktop/mobile/fallback 화면은 in-app Browser에서 캡처로 확인했으며 저장소에는 임시 스크린샷 파일을 추가하지 않았다.

## 자동 검증

- Focused resource/routing/App tests: 3 files / 38 passed.
- Full suite: `pnpm.cmd run test` — 45 files / 526 tests passed.
- Build: `tsc --noEmit && vite build` exit 0; 1,772 modules transformed.
- `git diff --check`: 통과.

## 변경 파일

- `src/features/resources/ResourceIndexView.tsx`
- `src/features/resources/ResourceIndexView.test.tsx`
- `src/features/resources/TrackSystemOverview.tsx`
- `src/features/resources/ModuleReferenceView.tsx`
- `src/features/resources/CurriculumReferenceView.tsx`
- `src/features/resources/OfficialResourcesView.tsx`
- `src/styles/planner-resources.css`
- `src/App.tsx`
- `src/main.tsx`
- `src/lib/appRouting.test.ts`
- `public/illustrations/course-module-track-compass-v1.webp`
- `public/illustrations/progress-next-semester-planner-v1.webp`
- `docs/assets/visual-redesign-2026-08-30/asset-sources.md`
- `.superpowers/sdd/2026-08-30-track-service-visual-redesign/task-10-report.md`

## 남은 리스크

- 캠퍼스 갤러리 사진의 외부 재사용 허가는 확인되지 않았으므로 계속 미재현 상태다.
- 교과목 공개 시간표의 현재 재검증 상태가 `blocked-by-public-access`이므로 2026 이력은 미래 개설 보장이 아니다.
- 390px의 기존 상단 학업 여정 리본은 자체 가로 스크롤 표현을 유지한다. 이번 리소스 본문과 문서 전체에는 가로 overflow가 없고 하단 nav 겹침도 없지만, 리본 자체의 모바일 표현은 shell 소유 범위에서 별도 정리할 수 있다.
- `.playwright-cli/`와 외부 브라우저 저장소는 무시했고 삭제·커밋하지 않았다.

---

## Fix round 1/5 — Important findings

### 수정 내용

1. **푸드바이오 조건 문구 완전성**
   - `TrackSystemOverview`의 융합 조건 문구를 `baseModuleIds`, `requiredCreditsPerBaseModule`, `requiredBaseCreditsTotal`, `convergenceRequirements`, `totalTrackCredits`에서 파생하도록 변경했다.
   - 실제 표시: `F/H/I 각각 3학점 이상 · F/H/I 합산 15학점 · M 8학점 · N+O 7학점 · 합계 30학점`.
   - 테스트가 `각각 3학점`과 `합산 15학점`을 별도로 고정해 어느 한 조건만 사라져도 실패한다.

2. **과목→모듈→트랙 관계 근거 상태**
   - `CourseModuleTrackFigure`의 관계 EvidenceBand를 `official-public-confirmed`로 변경했다.
   - 출처 문구를 `2026학년도 학사종합안내의 현재 공개본 72쪽`에서 공식 공개 확인한 관계라고 명시했다.
   - 개인별 이수 완료 판정은 아니라는 경계는 유지했다.
   - 같은 교육과정 페이지의 필수 6과목·18학점 최종안 참고 EvidenceBand는 `provided-final-plan-reference` 그대로 유지했다.

3. **로고 disclaimer 범위**
   - 광범위한 `이 화면은 학교 로고나 공식 시스템을 모사하지 않는다` 주장을 제거했다.
   - 생성한 개념 설명 이미지에 학교 로고·인장을 사용하지 않았고 공식 학교 이미지가 아니라는 범위로 한정했다.
   - 학생 제작 도구와 학교 공식 페이지가 구분되며 최종 판정은 공식 확인을 따른다고 명시했다.
   - 새 공식 로고·사진·학교 UI 자산은 추가하지 않았다.

### RED / GREEN

- RED: `pnpm.cmd exec vitest run src/features/resources/ResourceIndexView.test.tsx src/features/education/CourseModuleTrackFigure.test.tsx`
  - 2 files, 5 tests 중 4 failed / 1 passed.
  - 실패 원인: `각각 3학점` 누락, 관계 도식이 final-plan evidence 상태, 공식 출처 문구 누락, disclaimer 범위 과장.
- GREEN: 동일 focused command — 2 files / 5 tests passed.
- Full suite: `pnpm.cmd run test` — 45 files / 526 tests passed.
- Build: `pnpm.cmd run build` — TypeScript/Vite exit 0, 1,772 modules transformed.

### 브라우저 copy/source smoke

- localhost `http://127.0.0.1:5173/`, Browser runtime이 선택한 Chrome session에서 읽기 전용 확인.
- `tracks`: 푸드바이오 문구가 `F/H/I 각각 3학점 이상 · F/H/I 합산 15학점 · M 8학점 · N+O 7학점 · 합계 30학점`으로 표시됨.
- `curriculum`: 관계 도식 evidence state `official-public-confirmed`, figure 내부 final-plan evidence 0개, 페이지 전체 final-plan evidence 1개.
- 관계 출처: `2026학년도 학사종합안내의 현재 공개본 72쪽` 문구 확인.
- `official`: 새 disclaimer 정확히 표시, 기존 과장 문구 0개, 공식 캠퍼스 출처 카드 이미지 0개.
- 확인한 세 경로 모두 browser error/warn log 0; 문서 `scrollWidth=clientWidth`.

### 범위 경계

- 이미지 파일, 외부 링크, fallback, resource routes는 변경하지 않았다.
- 검토의 두 Minor finding은 이번 loop에서 구현하지 않았고 Task 11/12 ledger에 남긴다.
- `.playwright-cli/`는 계속 무시하며 삭제·커밋하지 않는다.
