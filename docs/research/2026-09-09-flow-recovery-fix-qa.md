# 흐름 오류·입학연도 선택 수정 검수

2026-09-09. 기준 커밋 `23c1daf` 이후 로컬 변경. 승인 범위는 입력 초기화의 보관 기록 삭제, 플래너 미저장, 비교·가이드 잘못된 목적지, 입학연도 선택이다. 전공 유형 재구성과 전체 서비스 아키텍처는 별도 제안 문서에 있으며 이번 코드 변경에 포함하지 않았다.

## Findings

- 수정 P1: 초기화가 빈 전체 상태를 저장하던 경로를 보관 snapshots 유지로 변경. 확인·취소를 추가하고 저장 실패 시 현재 상태를 유지한다.
- 수정 P2: 플래너 임시 입력이 새로고침으로 소실됐다. version 1의 독립 초안 필드로 문자열·빈칸·잘못된 입력을 보존한다. 확정 조건과 계획은 생성 시에만 갱신한다. 저장 실패 안내·재시도를 추가한다.
- 수정 P2: 홈의 비교 버튼은 계획 설정 대신 완료 과목 기준으로, 결과의 비교 버튼도 같은 기준으로 이동한다. 관심 추천 진입의 기본 축은 바꾸지 않는다.
- 수정 P3: 홈 아래 트랙 상세는 structure, 위의 일반 안내는 overview로 나눴다.
- 수정 P2: 새 초기화 안내를 브라우저에서 확인하는 중 기존 TrackPicker가 390px에서 634px 폭으로 늘어나 화면 밖이 숨겨지고 안내와 겹치는 것을 발견했다. 명시적인 그리드 영역과 모바일 1열/PC 2열로 수정해 390px의 실제 패널 폭이 335px이 됐다. 전체 문서 overflow 0만으로 잘림이 없다고 판정하지 않는다.
- 수정 P2: 계획 수강량의 `0x2`·`0b11` 같은 특수 숫자 표기가 일반 숫자로 확정될 수 있어 1~6의 일반 정수 텍스트만 허용하도록 수정했다.

## Summary

입학연도는 2017~2026년 목록, 미선택, 이전 연도 직접 입력으로 제공한다. 기존 2000~2016년 값과 1999·2027 등 오류 수정 경로를 유지한다. 학과/타학과의 허용 이수 경로와 학사 계산 데이터는 이번 수정에서 바꾸지 않았다.

사용자 제안 흐름과 학사 층위 재조사는 [설계 제안](2026-09-09-enrollment-and-service-flow-proposal.md)으로 분리했다. 근거가 부족한 학적 변환을 자동 적용하지 않는다.

## Verification

### 수정 전후 증거

- 이전 읽기 전용 감사에서 홈 비교→계획 필수 선택, 결과 비교→관심 입력 빈 화면, 플래너 목표학기·수강량 소실을 실제 CUA에서 재현했다. 당시 문서는 작업 공간 `_workspace/2026-09-09-flow-audit.md`에 있다.
- 구현 담당자가 흐름 8건, 초안 정규화 5건, 특수 숫자 3건, 모바일 그리드 1건의 실패를 먼저 확인했다. 기존 잘못된 목적지를 기대하던 통합 테스트는 승인된 새 계약으로 갱신했다.
- 최종 전체 테스트: 81파일 **825/825 PASS**. `npm.cmd test` / `tsc --noEmit` / Vite build / `git diff --check` 통과.
- 빌드: `index-CIDeG_lA.js`, `index-BqrGHale.css`. 기존 500kB 청크 경고는 남아 있다.

### 실제 CUA 검수

별도 검수 주소 `http://localhost:5173/`의 합성 상태를 사용했다. 학생이 쓰던 `127.0.0.1:5173` 및 운영 주소의 입력은 조작하지 않았다. 검수용 진단 기록 1개를 직접 만든 뒤 입력 초기화 취소·확인을 테스트했다. 초기화 후 소속 미선택 화면으로 돌아왔고, 보관함에는 **기록 1개·완료 1과목·3학점**이 그대로 남아 있었다.

- 홈 ‘5개 트랙 자세히 보기’ → `?view=track-guide&section=structure`. 일반 ‘트랙제 먼저 알아보기’ → overview.
- 목표 트랙 없는 진단의 홈 비교 → `?view=recommendation&step=axes&axis=progress`, 완료 과목 기준 제목 표시.
- 결과 ‘세 기준별 트랙 비교 보기’ → 같은 progress 축. 관심 설문 입력을 먼저 요구하지 않음.
- 플래너 `2028-2`, `4` 입력 → 초안 저장 안내 → 새로고침 → 값 유지. 공식 자료 화면으로 나갔다가 플래너에 돌아와도 같은 값 유지.
- 390px: 초기화 확인 문구·취소·현재 입력 초기화가 겹치지 않음. 취소 후 초기화 버튼으로 포커스 복귀.
- 430px: 입학연도 2024 선택. 이전 연도 직접 입력 1999는 오류 및 진행 불가, 2016은 진행 가능, 미선택도 진행 가능. 다시 2024 선택 후 완료 가능.
- 820×1180: 완료 과목 비교 화면, 단일 main/h1, 가로 넘침 0.
- 1920×1080: TrackPicker 280px/892px 두 열, 화면 내 폭 1220px, 가로 넘침 0. 모든 트랙·수정 제어가 보임.
- 관련 화면의 앱 error/warn 0, Vite 오류 overlay 없음. CUA 일시적 클릭/렌더 대기는 새 스냅샷·키보드 조작·별도 캡처로 확인했으며 앱 장애로 보고하지 않는다.

### 구현 게이트

| ID | 판정 | 증거 |
|---|---|---|
| SD-CORE-TEST-FIRST | PASS | 위 RED→GREEN 회귀 |
| SD-RELATED-TESTS | PASS | 흐름·초안·프로필·레이아웃 관련 테스트 |
| SD-FULL-TESTS | PASS | 825/825 |
| SD-TYPECHECK | PASS | tsc --noEmit |
| SD-PRODUCTION-BUILD | PASS | Vite build, 기존 청크 경고 구분 |
| SD-DIFF-CHECK | PASS | 공백·패치 검사 |
| SD-CONSOLE-OVERLAY | PASS | CUA 앱 오류·경고 0 |

### QA coverage

PASS는 증거에 명시된 범위이며 전 기기·전 상태·실제 보조기술의 전체 적합성을 뜻하지 않는다.

| ID | 판정 | 증거 또는 사유 |
|---|---|---|
| FLOW-JOURNEY-ENTRY | PASS | 홈 일반 안내/트랙 상세 목적 구분 |
| FLOW-JOURNEY-NAVIGATION | PASS | 비교 progress/structure/overview 실제 이동 |
| FLOW-JOURNEY-ACTIONS | PASS | 변경 버튼·확인·취소·초안·년도 조작 |
| FLOW-STATE-PERSISTENCE | PASS | 계획 초안 새로고침·자료 왕복 보존 |
| FLOW-STATE-COUNTS | PASS | 초기화 후 보관 1개·완료 1과목·3학점 유지 |
| FLOW-STATE-ISOLATION | PASS | 현재 입력 초기화와 별도 보관 기록 분리 |
| FLOW-STATE-CORRUPTION | BLOCKED | 정규화 모의 테스트 통과, 브라우저 손상값 주입은 미수행 |
| FLOW-STATE-STORAGE-FAILURE | BLOCKED | 실패·재시도 자동 테스트 통과, 실제 브라우저 저장 거부 주입 미수행 |
| FLOW-ERROR-RECOVERY | PASS | 잘못된 연도→진행 차단→수정 후 진행, 저장 재시도는 모의 검사 |
| FLOW-ROUTE-INVALID | EXCLUDED | 이번 수정은 정상 목적지 연결, 기존 비정상 주소 전체 브라우저 감사는 제외 |
| FLOW-ROUTE-INVENTORY | PASS | 변경된 홈·결과·프로필·플래너 연결 대조 |
| FLOW-FRAMEWORK-OVERLAY | PASS | 대표 화면 overlay 없음 |
| UI-RESP-OVERFLOW | PASS | 390/430/820/1920 범위, 문서뿐 아니라 실제 패널 폭 확인 |
| UI-RESP-FIXED-UI | PASS | 모바일 확인·선택과 하단 내비, 패널 겹침 해소 |
| UI-RESP-EDGE-STATES | PASS | 초기화 확인·빈 초안·미선택/오류 연도·목표 없음 |
| UI-HIERARCHY-PRIMARY-SECONDARY | PASS | 초기화 대상과 확인/취소 분리, 진단의 비교 기본값 맞춤 |
| UI-IDENTITY-TABS | PASS | 이력 비교 기본 축 표시 및 기존 관심 진입 유지 |
| UI-ABOVE-FOLD-CTA | PASS | 초기화 안내와 확인 행동이 같은 영역에 표시 |
| UI-RESP-WIDE | PASS | PC 2열 TrackPicker, 태블릿 비교 폭 확인 |
| A11Y-TITLE | PASS | 목적지의 실제 제목 확인 |
| A11Y-LANDMARKS | PASS | main/h1, 명명된 확인 group/연도 label |
| A11Y-NAMES | PASS | 초기화 대상·입학연도·비교 버튼 명명 |
| A11Y-KEYBOARD | PASS | Enter 진입·후보/상세 이동·취소 포커스 복귀 |
| A11Y-CONTRAST | BLOCKED | 모든 상태의 AA 수치 대비 측정은 미수행 |
| A11Y-CONSOLE | PASS | 앱 오류·경고 0 |

## Remaining Risk

현재 변경은 로컬 구현·검수까지다. 이번 요청에서 새 커밋·푸시·운영 재배포는 하지 않았다. 운영 페이지에 적용됐다고 표시하지 않는다. 확대된 서비스 아키텍처와 학적·트랙 데이터 분리는 제안 단계이며 기존 학사 규칙을 변경하지 않았다. 브라우저 저장 거부/손상 주입, 모든 상태 대비, 실제 보조기술, 운영 전수 검수는 별도다. 비공개 PDF/HWP는 외부 업로드하지 않았다.
