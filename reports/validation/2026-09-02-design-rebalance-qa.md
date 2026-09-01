# 2026-09-02 디자인 리벨런싱·마감 QA

## Findings

- P0: 0건
- P1: 0건
- P2: 0건
- 수정 완료: 트랙 가이드의 중복 `학업 여정` 리본, GUIDE INDEX 긴 라벨, 과목 선택 제목의 브라우저 기본 검은 포커스 테두리, 공식 자료 링크의 44px 미만 클릭 영역

## Summary

이번 변경은 계산 규칙과 저장 구조를 바꾸지 않고 화면 목적과 행동 위계를 정리한 제한적 리벨런싱입니다. 랜딩은 두 진입 경로와 평면 여정 지도를 유지하고, 읽기 전용 트랙 가이드는 GUIDE INDEX와 4개 내부 페이지에 집중시켰습니다. 진단·결과·계획 화면은 기존 주소와 브라우저 저장값을 그대로 사용합니다.

완료 상태는 `검수 완료`입니다. 현재 브랜치는 GitHub 푸시 대상이며 운영 Vercel 배포 대상은 아닙니다.

## Verification

### 자동 검증

- 핵심 변경 RED: `src/App.track-guide-dom.test.tsx`에서 가이드 리본 부재와 짧은 라벨을 먼저 요구해 기존 구현 실패를 확인했습니다.
- 핵심 변경 GREEN: 같은 파일 4개 테스트 통과
- 전체 회귀: 51개 테스트 파일·579개 테스트 통과
- 타입 검사와 프로덕션 빌드: 1,778개 모듈 변환, 성공
- `git diff --check`: 공백 오류 0건

### 실제 브라우저 검증

- 크기: 390×844, 430×932, 1024×768, 1440×900
- 주요 화면: 랜딩, 트랙 가이드 4개 주소, 관심 설문, 소속·이수 경로, 과목 직접 선택, 결과 비교, 결과 상세, 플래너 조건·일정, 공식 자료, 문의
- 경로 완주: 관심 설문 진입, 설문 건너뛰기, 직접 진단, 과목 1개 선택, 결과 비교, 목표 트랙 선택, 선택형 플래너 생성
- 저장 복원: 과목 1개, 목표 트랙, 계획 상태와 학기 배치가 새로고침·뒤로가기 후 유지
- 합성 QA 계획: 저장된 이름 있는 배치 14개와 화면 배치 14개가 일치
- 콘텐츠 개수: 평면 지도 목적지 7개, 트랙 5개, 모듈 자료 15개, 공식 영상 4개
- YouTube: 동의 전 iframe 0개, 재생 뒤 `youtube-nocookie.com` iframe과 제목 제공
- 콘솔: 오류 0건, 개발 오류 오버레이 0건

### 흐름·상태 커버리지

| QA ID | 결과 | 근거 |
| --- | --- | --- |
| FLOW-JOURNEY-ENTRY | PASS | 랜딩의 관심 탐색 주 행동과 직접 진단 보조 행동을 각각 실제 주소로 진입 |
| FLOW-JOURNEY-NAVIGATION | PASS | 가이드 탭, GUIDE INDEX, 모바일 하단 내비, 결과·계획 이동과 브라우저 뒤로가기 확인 |
| FLOW-JOURNEY-ACTIONS | PASS | 설문, 프로필, 과목 선택, 결과 보기, 목표 트랙 선택, 플래너 생성 버튼 실제 동작 |
| FLOW-STATE-PERSISTENCE | PASS | 과목·목표 트랙·계획 14개 배치가 새로고침과 뒤로가기 후 복원 |
| FLOW-STATE-COUNTS | PASS | 지도 7, 트랙 5, 모듈 15, 영상 4, 저장·표시 계획 배치 14로 일치 |
| FLOW-STATE-ISOLATION | PASS | 설문 답변 1개를 추가해도 과목 1개·목표 트랙·계획 14개 배치 유지 |
| FLOW-STATE-CORRUPTION | PASS | 잘못된 `track-sim:v2` JSON에서 빈 프로필 시작 화면으로 안전 복구 |
| FLOW-STATE-STORAGE-FAILURE | PASS | 저장소 quota 예외와 1·2차 쓰기 실패 롤백 자동 테스트 통과 |
| FLOW-ERROR-RECOVERY | PASS | 결과·계획 선행 조건 가드, PDF 안전 오류 분류, 공식 확인 필요 상태와 복구 CTA 확인 |
| FLOW-ROUTE-INVALID | PASS | 알 수 없는 view는 랜딩, 잘못된 가이드 section은 overview, 잘못된 video는 videos 기본값으로 정규화 |
| FLOW-ROUTE-INVENTORY | PASS | 랜딩·가이드·추천·진단·결과·계획·자료·문의 canonical query를 실제 화면과 대조 |
| FLOW-FRAMEWORK-OVERLAY | PASS | Vite/React 오류 오버레이 0개, 콘솔 오류 0건 |

### 반응형·접근성 커버리지

| QA ID | 결과 | 근거 |
| --- | --- | --- |
| UI-RESP-OVERFLOW | PASS | 390·430·1024·1440 주요 5개 화면에서 scrollWidth와 clientWidth 일치 |
| UI-RESP-FIXED-UI | PASS | 모바일 마지막 행동과 하단 내비 사이 여백 확인: 랜딩·진단·결과·계획 모두 겹침 없음 |
| UI-RESP-EDGE-STATES | PASS | 빈 프로필, 목표 트랙 필요, 공식 확인 필요, 저장 완료 상태를 각각 표시 |
| UI-HIERARCHY-PRIMARY-SECONDARY | PASS | 랜딩 주 행동과 직접 진단의 색·채움·문구 위계를 분리하고 가이드 중복 리본 제거 |
| UI-IDENTITY-TABS | PASS | 가이드 4개 페이지, 설문·기준 비교, 결과·계획 탭의 현재 상태를 색과 텍스트로 함께 표시 |
| UI-ABOVE-FOLD-CTA | PASS | 모바일 랜딩과 가이드에서 H1·목적·핵심 행동 또는 핵심 탭을 첫 화면에 노출 |
| UI-RESP-WIDE | PASS | 1440×900 랜딩·가이드·결과에서 과도한 빈 공간과 잘린 주요 행동 없음 |
| A11Y-TITLE | PASS | 주소별 문서 제목이 랜딩·가이드·탐색·진단·결과·계획·자료·문의 목적을 구분 |
| A11Y-LANDMARKS | PASS | 검사 화면마다 main 1개·h1 1개, banner와 navigation 이름 확인 |
| A11Y-NAMES | PASS | CTA, 설문 라디오, 프로필 라디오, 계획 입력, 외부 링크와 iframe에 접근 가능한 이름 제공 |
| A11Y-KEYBOARD | PASS | 랜딩 H1 → Tab 주 행동 → Enter 관심 설문 이동, 초록 포커스 링 확인 |
| A11Y-CONTRAST | PASS | 랜딩 H1 15.04:1, 본문 5.18:1, 주 CTA 5.34:1, 보조 CTA 8.54:1 |
| A11Y-CONSOLE | PASS | 전체 실사용 흐름 뒤 콘솔 오류 0건; YouTube 재생 시 Chromium Windows WebGPU 경고 1건만 관찰 |

### 디자인 스킬 완료 게이트

| 게이트 | 결과 | 근거 |
| --- | --- | --- |
| SD-CORE-TEST-FIRST | PASS | 가이드 리본·라벨 요구를 먼저 추가해 실패한 뒤 구현 |
| SD-RELATED-TESTS | PASS | 트랙 가이드 DOM 4개 테스트 통과 |
| SD-FULL-TESTS | PASS | 51개 파일·579개 테스트 통과 |
| SD-TYPECHECK | PASS | `tsc --noEmit` 통과 |
| SD-PRODUCTION-BUILD | PASS | Vite 7.3.5 빌드, 1,778개 모듈 변환 |
| SD-DIFF-CHECK | PASS | `git diff --check` 오류 0건 |
| SD-CONSOLE-OVERLAY | PASS | 브라우저 콘솔 오류·개발 오류 오버레이 0건 |

## Remaining Risk

- 2026 최종안 기반 계산은 학생 개인의 공식 이수·졸업 판정이 아닙니다. 적용 학번, 실제 개설, 인정 범위는 학과 확인이 필요합니다.
- PDF 불러오기는 선택형 beta이며 실제 포털 PDF 표본의 범용 매칭은 아직 검증하지 않았습니다. 직접 선택이 완전한 기본 경로입니다.
- 공식 YouTube 재생 과정의 Chromium Windows WebGPU 경고는 브라우저 구현 경고로 확인됐고 앱 콘솔 오류는 없었습니다.
- 운영 Vercel에는 이번 브랜치를 배포하지 않았습니다.
