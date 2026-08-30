# 변경 기록

이 문서는 GitHub 커밋 목록만 봐서는 파악하기 어려운 변경 목적과 검증 결과를 협업자가 빠르게 이해할 수 있도록 정리합니다.

## 2026-08-30

### Resolve the planner final-review findings

- 랜딩의 두 진입 CTA가 저장된 프로필·과목 검토 시각·학기 계획을 지우지 않고 선택한 목표만 `profileDraft`에 보관하도록 수정했습니다.
- 결과 현재 화면의 다음 CTA를 실제 이동 대상과 맞는 `다음 수강 후보 확인`으로 바꾸고, 결과 주소는 `current → next → confirm` 순서를 유지했습니다.
- 랜딩 H1의 초기·색인·뒤로가기·새로고침 초점, 안내 모달 제목에서 Shift+Tab 역방향 감금, 저장된 계획 보존을 회귀 테스트로 고정했습니다.
- Compass Path를 아이콘·상태 텍스트·색을 함께 쓰는 연속 종이 경로로 재구성하고, 모바일에서는 가로 넘침 없는 세로 경로로 전환했습니다.
- 로컬 설치 후보와 시스템 fallback만 사용하는 display/body 글꼴 토큰을 추가하고, 1440px 랜딩 H1을 66.24px로 조정했습니다. 원격 글꼴 요청·설치·새 의존성은 추가하지 않았습니다.
- 1440×900 설문에서 `다음` 버튼 하단을 901.09px에서 736.48px로 올려 첫 화면에 완전히 노출했고, 모바일 skip focus와 하단 내비게이션 사이 간격도 다시 확보했습니다.
- 공통 리본·글꼴 영향을 반영해 합성 비개인 승인 캡처 15개를 모두 재생성하고 원본/추적 복사 SHA-256 일치를 확인했습니다.
- 최종 런타임 소스는 `4c110a2b93f86baa09fd92368b5458d2d0aa232e`입니다. 이 항목을 포함하는 후속 커밋은 문서만 변경하며 자기 자신의 해시는 문서 안에 기록하지 않습니다.

검증:

- focused regression — 9개 테스트 파일·89개 테스트 통과
- pnpm.cmd test — Vitest 4.1.8, 47개 테스트 파일·550개 테스트 통과
- pnpm.cmd build — TypeScript noEmit과 Vite 7.3.5 프로덕션 빌드 통과, 1,774개 모듈 변환
- git diff --check — 공백 오류 0건
- Chromium 151 — 저장 계획 CTA 2경로, 랜딩 복귀 초점, 모달 Shift+Tab, 1440/390/320 리본·타이포·설문·overflow·console 확인

경계와 남은 리스크:

- PDF beta는 synthetic-course-history.pdf에서 0 matched / 1 unmatched이며 직접 선택만 완전한 기본 경로입니다.
- 공식 캠퍼스 사진 재사용 허가는 확인되지 않아 앱에 삽입하지 않았고, 개설 이력 공개 재검증은 blocked-by-public-access입니다.
- Impeccable detector was run exactly once in Task 11 and failed before JSON because the installed detect-url.mjs was missing. Do not rerun it or alter/install the skill. Preserve this limitation verbatim.
- push, merge, deploy, 외부 제출은 수행하지 않았습니다.

### Validate the planner visual redesign release gate

- 2026-08-31 KST에 캠퍼스 안내책자 × 학업 플래너 시각 체계를 실제 프로덕션 미리보기로 검증했습니다.
- fresh 관심 설문 10문항 경로, fresh 직접 진단 경로, PDF beta 검수·취소, 결과·독립 추천·학기 계획, 자료 읽기 4개 주소를 완주했습니다.
- 1440×900, 1024×768, 768×1024, 390×844, 320×800에서 보이는 H1/main 각 1개, 가로 overflow·수평 잘림·44px 미만 조작 요소 0건을 확인했습니다.
- 키보드 전용 직접 진단, 3px skip-link focus, reduced motion, schedule/checks history 복원, 합성 localStorage 실패 alert, 모바일 하단 내비게이션 비겹침을 확인했습니다.
- 결과 2쪽과 계획 3쪽을 print media PDF로 저장하고 전 페이지 PNG를 육안 검수했습니다.
- 합성 비개인 QA 상태의 승인 캡처 15개를 docs/assets/2026-08-30-planner-redesign/에 추가하고 원본과 SHA-256 일치를 확인했습니다.

검증:

- pnpm.cmd test — Vitest 4.1.8, 46개 테스트 파일·544개 테스트 통과
- pnpm.cmd build — TypeScript noEmit과 Vite 7.3.5 프로덕션 빌드 통과, 1,774개 모듈 변환
- git diff --check — 공백 오류 0건
- 로컬 Chromium 151 — 5개 핵심 흐름, 5개 뷰포트, 키보드·히스토리·인쇄·개인정보·이미지 fallback 확인

경계와 남은 리스크:

- 이수 과목 직접 선택은 완전한 기본 경로입니다. PDF beta는 synthetic-course-history.pdf에서 0 matched / 1 unmatched라 release-ready로 판정하지 않았습니다.
- localStorage에는 앱 상태 키 2개만 남고 PDF 원래 파일명·원문 오탈자·개인 식별 sentinel은 없었습니다. 네트워크는 localhost 정적 GET만 있었고 업로드·POST는 없었습니다.
- 생성 이미지는 공식 캠퍼스 사진·로고·인장·근거 자료가 아닙니다. 공식 캠퍼스 사진은 재사용 허가 미확인으로 삽입하지 않았습니다.
- Impeccable detector was run exactly once in Task 11 and failed before JSON because the installed detect-url.mjs was missing. Do not rerun it or alter/install the skill. Preserve this limitation verbatim.
- 이번 작업은 push, merge, deploy, 외부 제출을 수행하지 않았습니다. 운영 Vercel에 반영됐다고 주장하지 않습니다.

### Validate independent recommendations and graduation planning

- 관심 적합도, 현재 완료 과목 접근성, 졸업 전 계획 가능성을 하나의 종합 순위로 합치지 않고 독립 축으로 검증했습니다.
- 정규학기 계획 가능, 학기당 수강량 조정, 추가 학기 필요 가능성, 공식 확인 필요 결과를 실제 브라우저에서 각각 재현했습니다.
- 모바일 계획 화면의 단계 전환·뒤로가기·앞으로가기에서 새 H1 포커스와 상단 스크롤을 복원하고, 계획 화면을 벗어나면 브라우저의 기본 스크롤 정책으로 돌아오는지 확인했습니다.
- 현재 HEAD에서 데스크톱 1440×900, 모바일 390×844 캡처 6개를 다시 만들고 육안 검수 및 원본/문서 자산 SHA-256 동일성을 확인했습니다.

검증:

- `pnpm.cmd run test` — 22개 테스트 파일, 278개 테스트 통과
- `pnpm.cmd run build` — TypeScript 검사 및 Vite 프로덕션 빌드 통과, 1,722개 모듈 변환
- 로컬 Chromium — 직접 진단, 설문→트랙→프로필→과목→결과, 일치·불일치 추천 축, 4개 계획 상태, 저장·back·forward·reload, 키보드 전용 핵심 흐름 통과
- 모든 승인 캡처에서 콘솔 오류·경고 0건, 가로 넘침 0px

근거와 다음 계획 경계:

- 2026-1·2 개설값은 확보 당시의 과거 스냅샷이며, 현재 공개 원문의 재검증은 차단되어 있습니다. 미래 반복 개설과 공식 졸업·트랙 이수를 보장하지 않습니다.
- 이수 과목은 직접 선택이 기본입니다. 기존 `PDF 저장/인쇄`는 브라우저 결과 출력이며 성적표 PDF 불러오기가 아닙니다.
- 브라우저 내부 PDF 불러오기 beta, 저장된 진단 변화 비교, 설명 이미지 3개 슬롯, 공식 캠퍼스 사진의 라이선스 확인과 전체 E2E QA는 다음 계획으로 남겼습니다.

### Record track-diagnosis foundation validation

- 학생 소속·이수 경로 분리, 규칙 근거 상태, 필수·트랙·전체학점 진행도, 저장 v2 마이그레이션, 주소·새로고침 복원을 기반 기능으로 기록했습니다.
- 공식 공개 자료는 규칙 확인의 출발점이며, 화면 계산은 제공된 최종계획을 구조화한 기준으로 수행합니다.
- 개인별 적용 학번, 필수 변형, 기타 인정학점, 경제학 트랙형 복수전공 최소학점은 학과 검토 전까지 참고 결과로만 취급합니다.
- 데스크톱·모바일 핵심 화면 캡처 5개와 SHA-256을 검증 보고서에 보존했습니다. 원본 QA 파일은 `output/`에 남겨 두고, 이후 임시 출력은 Git에서 제외합니다.

검증:

- `pnpm.cmd run test` — 9개 테스트 파일, 82개 테스트 통과
- `pnpm.cmd run build` — TypeScript 검사 및 Vite 프로덕션 빌드 통과
- `git diff --check` — 공백 오류 없음

검증 한계 및 다음 계획:

- 데스크톱·모바일 핵심 경로, 뒤로가기·앞으로가기·새로고침, 콘솔 오류·경고, 가로 넘침은 브라우저에서 확인했습니다.
- 키보드만으로 프로필→과목→결과를 완주하는 흐름과 강제 저장 실패 시 알림 표시는 브라우저에서 아직 확인하지 않았습니다. 저장 실패 처리 자체는 자동 테스트로 확인합니다.
- 사전 존재 기능인 결과 화면의 브라우저 인쇄 대화상자 PDF 저장은 이번 기반 릴리스 게이트의 신규 검증 범위가 아닙니다. PDF 과목 불러오기·자동 채움과 이미지 생성은 다음 계획 범위이며 이번 기반 검증에서 구현하거나 판정하지 않았습니다.

## 2026-08-25

### Complete the product-led diagnosis journey

- 랜딩페이지를 트랙제 의미, 선택 이유, 서비스 이용 흐름 중심으로 줄여 긴 스크롤과 반복 설명을 정리했습니다.
- 자가진단 표를 학년·학기별 목록과 모듈별 목록 전환 구조로 바꾸고 과목 검색을 추가했습니다.
- 결과에 `맞춤 트랙 추천` 탭을 추가해 가장 가까운 트랙, 추가 후보, 공통 도움 과목을 설명합니다.
- 학기 계획에서 추천 과목을 `다음 학기 · 다다음 학기 · 나중에`로 배치하고 브라우저에 저장할 수 있게 했습니다.
- 실제 이수 과목과 계획 과목을 분리해, 계획은 사용자가 선택한 경우에만 추천 비교에 반영합니다.
- 토스 TDS의 회색 단계와 녹색 상태색, 48px 조작 영역, 당근 사례의 행동 발견 가능성, AI 템플릿의 반복 카드·그라데이션 회피 기준을 적용했습니다.

검증:

- `npm test` 기준 23개 테스트 통과
- `npm run build` 기준 TypeScript 검사 및 Vite 프로덕션 빌드 통과
- 인앱 브라우저 1440×1024와 390×844에서 랜딩, 트랙 선택, 과목 체크, 보기 전환, 맞춤 추천, 계획 저장 흐름 확인
- 모바일 `scrollWidth === viewport width`와 브라우저 오류 0건 확인

남은 리스크:

- 과목 개설 시기와 실제 트랙 인정은 학과 최신 안내가 최종 기준입니다.
- 추천은 입력 과목과 구조화한 2026 교육과정만을 기준으로 하며 진로나 개인 선호를 확정하지 않습니다.

### Add service-first landing page

- 기존 진단 기능 앞에 서비스 목적, 트랙제 구조, 이용 흐름을 설명하는 반응형 랜딩페이지를 추가했습니다.
- `과목 → 모듈 → 트랙` 관계, 다섯 트랙 비교, 3단계 진단 흐름, 결과 예시를 한 페이지에서 확인할 수 있도록 구성했습니다.
- 결과 예시와 트랙 선택 탭은 실제 선택 상태가 바뀌도록 구현했습니다.
- 진단 화면의 학과 로고를 누르면 랜딩페이지로 돌아올 수 있게 연결했습니다.
- 화면 전반을 흰색·쿨그레이 배경, 단국대 블루, 포레스트 그린 기반의 절제된 디자인으로 정리했습니다.
- README의 첫 화면 이미지도 새 랜딩페이지로 교체했습니다.

공식 근거:

- [2026학년도 공식 공개 PDF 교육과정 원문 — 규칙 검증의 출발점이며 현재 계산 입력 자체는 아님](https://www.dankook.ac.kr/documents/d/kor/2026-1-_-260119-pdf?download=true)
- [식품자원경제학과 공식 트랙제 안내 영상](https://www.youtube.com/watch?v=osc9yOuq0IU)
- [식품자원경제학과 홈페이지](https://cms.dankook.ac.kr/web/ere)

검증:

- `pnpm run test` 기준 20개 테스트 통과
- `pnpm run build` 기준 TypeScript 검사 및 Vite 프로덕션 빌드 통과
- 인앱 브라우저에서 데스크톱 1440×1024, 모바일 390×844 화면과 고정 헤더, 탭, 진단 진입·랜딩 복귀 흐름 확인
- 브라우저 오류·경고 로그 없음

남은 리스크:

- 트랙 인정, 변경, 중복 모듈 인정 기준은 학과의 최신 공지와 상담 결과가 최종 기준입니다.
- 구현본은 아직 원격 저장소의 본 작업 브랜치나 운영 Vercel에 배포하지 않았습니다.

### Redesign the internal diagnosis flow

- 내부 사이드 메뉴 7개를 `자가진단 → 결과 → 학기 계획` 3단계 상단 내비게이션으로 축소했습니다.
- 트랙 선택을 완료하면 입력 영역을 접고 과목 선택에 바로 집중할 수 있게 했습니다.
- 과목표는 화면 안에서 스크롤하도록 제한하고, 모바일에서는 학기별 세로 목록으로 전환했습니다.
- 학기 미정 과목, 5개 트랙 상세 순위, 추가 안내 영상, 전체 교육과정표는 필요할 때 펼쳐보는 구조로 변경했습니다.
- 결과 화면을 `한눈에 보기 · 부족 모듈 · 필수 과목` 탭으로 나눴습니다.
- 트랙 추천과 실험실을 `학기 계획` 아래 `트랙 추천 · 학기별 계획` 탭으로 통합했습니다.
- 기존 하늘색·연두색 그라데이션과 반복 카드 표현을 제거하고 랜딩과 같은 흰색·쿨그레이·네이비·포레스트 그린 체계를 적용했습니다.
- 토스 TDS, 토스 제품 원칙, 당근 SEED, WCAG 자료를 정리한 내부 UX 리서치 문서를 추가했습니다.

검증:

- `pnpm run test` 기준 20개 테스트 통과
- `pnpm run build` 기준 TypeScript 검사 및 Vite 프로덕션 빌드 통과
- 데스크톱 1440×1024와 모바일 390×844에서 주요 단계, 탭, 트랙 선택 접기·수정, 과목 목록을 확인했습니다.

## 2026-06-11

### Add production deployment URL to repository docs

- README 상단에 Vercel 프로덕션 URL을 추가했습니다.
- `package.json`에 `homepage`와 GitHub 저장소 URL을 추가해 저장소 메타 정보로도 배포 주소를 남겼습니다.

배포 URL:

- https://dku-track-diagnosis.vercel.app

검증:

- 배포 URL 응답 확인

### Fix Vercel install configuration

- Vercel 배포 중 `pnpm install --frozen-lockfile` 단계가 실패해 lockfile을 `package.json` 기준으로 재생성했습니다.
- Vercel 원격 설치 단계의 pnpm 실행 문제가 반복되어 Vercel 배포 설정을 `npm install` / `npm run build` 기준으로 전환했습니다.
- 로컬 Vercel 연결 폴더가 저장소에 올라가지 않도록 `.vercel`을 `.gitignore`에 추가했습니다.

검증:

- `pnpm run test`
- `pnpm run build`

### Repository documentation cleanup

- README에 서비스 첫 화면 스크린샷과 사이트 목적, 주요 기능, 실행/검증 방법을 정리했습니다.
- 협업을 위한 `CONTRIBUTING.md`와 PR 템플릿을 추가했습니다.
- GitHub 저장소 루트에 잘못 포함된 `-` 하위 저장소 항목을 제거했습니다.

검증:

- 문서 변경 중심입니다.
- 앱 스크린샷은 로컬 실행 화면 기준으로 생성했습니다.

### Add lab feasibility and deployment setup

커밋: [`ee2160e`](https://github.com/Suya020504/dku-track-diagnosis/commit/ee2160e3ee5a526d7108da178e730f8c47be5971)

- 실험실 탭에 현재 학년/학기 입력 기능을 추가했습니다.
- 남은 정규학기 기준으로 트랙 달성 가능성을 `정규학기 안에 가능`, `초과학기 진행시 가능`, `장기 계획 필요` 등으로 구분했습니다.
- 복수 트랙 선택 시 겹치는 부족 모듈과 공통 수강 추천 과목을 표시했습니다.
- Vercel 배포 설정 파일을 추가했습니다.
- README에 기본 실행, 검증, 배포 설정을 정리했습니다.

검증:

- `pnpm run test`
- `pnpm run build`
- 브라우저에서 실험실 탭의 학기 입력, 가능성 분류, 겹치는 모듈 추천 영역을 확인했습니다.

### Initial commit

커밋: [`5fbfaf5`](https://github.com/Suya020504/dku-track-diagnosis/commit/5fbfaf564f94d6c376f006f158999d156a956d67)

- Vite + React + TypeScript 기반 정적 웹앱을 구성했습니다.
- 2026학년도 식품자원경제학과 트랙/모듈/과목 데이터를 코드와 분리해 구조화했습니다.
- 트랙제 설명, 트랙/모듈, 자가진단, 결과, 도구/정보, 문의사항 화면을 구현했습니다.
- 트랙별 모듈 충족 여부, 부족 학점, 필수 과목 누락, 추천 과목 계산 로직을 구현했습니다.
- 진단 로직 테스트를 추가했습니다.
- 단국대학교 및 식품자원경제학과 톤을 반영한 기본 디자인과 이미지 자산을 추가했습니다.

검증:

- 주요 진단 계산 케이스를 테스트로 확인했습니다.
- 로컬 브라우저에서 주요 탭과 반응형 레이아웃을 확인했습니다.
