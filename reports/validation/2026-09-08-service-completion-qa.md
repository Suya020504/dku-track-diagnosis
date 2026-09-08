# 학과 트랙 안내·이수 지원 — 로컬 마감 검수

2026-09-08. 기능 구현·로컬 검증·GitHub 갱신·운영 배포와 배포 후 검수를 마쳤다. 새 PDF 원문은 사용자 요청대로 비공개 처리했다. 학교의 공식 승인이나 개인별 학사 인정 완료를 뜻하지 않는다.

## 바뀐 사용 흐름

필수 진단은 이수 유형 → 이수 과목 → 결과다. 제도 설명, 관심 설문, 학기 계획은 선택 기능으로 유지했다. 과목 목록에서는 학년·검색어로 범위를 좁히고 완료·수강 중·계획을 직접 바꾼다. 모바일은6개, 그 외 화면은12개씩 나누어 보여준다.

트랙 밖에서 완료한 과목과 기타 인정학점은 별도로 입력한다. 전체 전공학점에만 합산하고, 필수·모듈 충족에는 자동 반영하지 않는다. 추천 후보를 담으면 실제 계획 상태로 저장한다. 진단 결과만 보관할 수도 있고, 저장 기록에서는 당시 결과를 읽기 전용으로 연다.

가이드에 신청·상담 준비를 추가했다. 학과 공식 연락과 자료를 연결하되 확인되지 않은 신청기간·개인 인정 기준을 만들지 않았다. 제공 PDF6쪽 대조에서 확인한 필수 배지 오류와 원문 내부 차이는 [대조 기록](../../docs/service-completion/2026-09-08-provided-pdf-audit.md)에 정리했다.

## 발견한 문제와 수정

| 중요도 | 문제 | 수정·재확인 |
| --- | --- | --- |
| P1 | 브라우저 저장 객체를 읽는 것 자체가 차단되면 사이트 전체가 빈 화면 | getter·초기 읽기를 안전하게 취득. 저장 불가를 알리고 현재 탭에서 진단 가능. 두 차단 방식20개 브라우저 검사 통과 |
| P1 | 기존 입력 화면의 복수·부전공 필수 배지가 실제 경로 계산과 다름 | StudentProfile 기준으로 통일. 복수전공 필수18/전공42, 부전공 필수 없음/전공21을 일치시킴 |
| P1 | 트랙 밖 이수학점 입력 경로와 추천 계획 담기 동작이 없음 | 별도 완료학점 입력과 실제 계획 추가·해제·학기 변경 연결 |
| P2 | 추가학점 이름의 공백 차이에 따라 체크·저장·피드백이 다름 | 같은 정규화 함수로 판단. 실제 체크 해제와 저장 결과 일치 |
| P2 | 같은 저장 기록 재선택 시 뒤로가기 기록이 중복 | 같은 주소 이동은 새 방문 기록을 만들지 않음 |
| P2 | 작은 링크·동일한 원문 링크 이름·구별 어려운 저장 목록 | 최소44px 조작 영역, 문서명 접근성 이름, 기록별 입력 요약·초 단위 저장 시간 추가 |

## 검증 환경과 결과

- 로컬 주소: `http://127.0.0.1:4217/`
- 실제 화면: 독립 Chromium context. 사용자 브라우저의 이수 기록을 테스트 값으로 덮어쓰지 않았다.
- Browser plugin not available: `browser` skill이 없어 기존 bundled Playwright를 사용했다. 새 설치 없음.
- 크기: 344×882, 360×800, 390×844, 430×932, 768×1024, 820×1180, 860×912, 1024×768, 1920×1080.
- 자동 테스트: 비공개 정책 반영 후 **72파일741개 통과**, 실패0·보류0. 결과 JSON을 별도 작업 폴더에 보관했다.
- 타입 검사·프로덕션 빌드·diff check 통과. Vite 초기 JS가510.32kB(gzip149.51kB)여서500kB 기준의 크기 경고가 있다. 빌드 오류는 아니며 경고 임계치를 높여 숨기지 않았다. PDF 해석 코드는 별도 청크다.
- 31개 화면×9개 크기279건. 링크·헤더 보완 후9개 화면×9개 크기81건 재검수. 가로 넘침·빈 이름·main/h1 중복·콘솔 오류·프레임워크 오버레이 없음.
- 하단 가림 후보10건은 닫힌 details 안의 숨은 요소였음을 재확인했다. 실제 노출 컨트롤의 가림은0건이다.
- 핵심 입력·추가학점·추천 담기·기록 보관·인쇄·복귀20개 검사, 손상·백업·저장실패·재시도·잘못된 주소17개 검사 통과.
- 새 방문자 진입→목표 없이 진단→5트랙 비교→목표 확인→결과, 시간표 코드·요일 검색, 소속별 설문·방향키·재방문도 실제 브라우저에서 완주했다.
- 저장소 getter/초기 읽기 거부 모드에서 홈·과목·가이드·보관함과 임시 진단20개 검사 통과. 영구 저장 실패를 성공으로 표시하지 않는다.

## 디자인 시안과 구현 대조

과목 입력 시안의 하늘색·평면 목록·상단 검색·상태 선택을 살렸다. 학기와 모듈명은 생성 이미지의 예시 대신 실제 교육과정 데이터를 사용한다. 긴 모바일 목록은6행으로 나눴다. 추가학점과 PDF는 접어 두어 일상적인 과목 체크를 가리지 않는다.

저장 기록 시안의 크림색·목록/상세 구조·읽기 전용 결과·인쇄를 구현했다. 공통 DKU 헤더는 기존 것을 유지한다. 임의 이름·가짜 수치·예시 기록은 넣지 않았다. 모바일은 목록과 상세를 구별하고 복귀 버튼을 제공한다. 과목 정보와 학기 조건은 접을 수 있지만 인쇄에서는 내용이 빠지지 않는다.

루트가 과목390/1920, 결과, 계획 포함 기록1920 캡처를 직접 확인했고 모바일6행 최종 캡처도 별도로 남겼다. 새 주요 행동은 상단에서 찾을 수 있게 하고 보관·자료·인쇄는 보조 영역으로 배치했다.

## 개발 게이트

| Gate | 결과 | 근거 |
| --- | --- | --- |
| SD-CORE-TEST-FIRST | PASS | 새 경로·상태 수정·추가학점·PDF 충돌·보관·저장소 차단·모바일 행 수의 실패를 먼저 재현 |
| SD-RELATED-TESTS | PASS | 담당 영역 테스트와 통합 회귀 통과 |
| SD-FULL-TESTS | PASS | 최종741개/72파일, 실패0 |
| SD-TYPECHECK | PASS | tsc --noEmit 및 build 내 재실행 |
| SD-PRODUCTION-BUILD | PASS | Vite 빌드 완료. 초기 청크 크기 경고는 위에 기재 |
| SD-DIFF-CHECK | PASS | git diff --check exit0, 줄바꿈 전환 안내만 있음 |
| SD-CONSOLE-OVERLAY | PASS | 실제 화면·핵심·복구 검사에서 앱 오류/오버레이 없음 |

## QA 계약 범위

| 안정 ID | 상태 | 이번 실행 근거 |
| --- | --- | --- |
| FLOW-JOURNEY-ENTRY | PASS | 신규 방문자 홈→소속→경로→과목→결과 완주 |
| FLOW-JOURNEY-NAVIGATION | PASS | 목표 확정 전/후·기록 주소·뒤로/앞으로·같은 기록 재선택 |
| FLOW-JOURNEY-ACTIONS | PASS | 과목 상태·추가학점·추천 담기/해제·진단/계획 보관·인쇄·자료 검색·설문 실사용 |
| FLOW-STATE-PERSISTENCE | PASS | 상태·상대학기·선택·기록의 새로고침 복원 |
| FLOW-STATE-COUNTS | PASS | 화면 선택 수/학점/12개 기록과 저장값 일치, 중복·실패 시 증가 없음 |
| FLOW-STATE-ISOLATION | PASS | 과거 기록은 현재 입력과 분리, 소속별 설문이 과목 상태를 변경하지 않음 |
| FLOW-STATE-CORRUPTION | PASS | JSON 손상3종, 백업 복원, 기존 schema 단위 테스트 |
| FLOW-STATE-STORAGE-FAILURE | PASS | quota/setItem/getter/getItem 실패, 임시 진단, 저장 재시도 |
| FLOW-ERROR-RECOVERY | PASS | 유실 기록·차단 저장·PDF 검수 재진입 복구. PDF는 기존 beta 경계 유지 |
| FLOW-ROUTE-INVALID | PASS | 임의/구형 주소10종, 기록 유실 주소의 정상 복귀 |
| FLOW-ROUTE-INVENTORY | PASS | canonical31화면 방문, AppRoute·진단 전제 조건·선택 기능 분리 테스트 |
| FLOW-FRAMEWORK-OVERLAY | PASS | 279+81 및 핵심·복구 실행에서 오류 오버레이 없음 |
| UI-RESP-OVERFLOW | PASS | 9크기 가로 넘침0 |
| UI-RESP-FIXED-UI | PASS | 실제 노출 요소 하단 가림0. 실기기 키보드는 미검증 |
| UI-RESP-EDGE-STATES | PASS | 빈 입력/기록12개/유실/저장차단/검색결과 없음/긴 목록 페이지 |
| UI-HIERARCHY-PRIMARY-SECONDARY | PASS | 직접 진단 우선, 가이드·설문·계획 선택, 상세·자료·보관은 보조로 분리 |
| UI-IDENTITY-TABS | PASS | 하늘색 입력·네이비 결과·크림 기록, 기존 가이드/홈/자료 색 체계 유지 |
| UI-ABOVE-FOLD-CTA | PASS | 진단 확인·가이드 주요 행동·자료 검색·기록 선택이 첫 화면에 위치. 장문 기록의 현재 입력 복귀는 상세 하단에도 제공 |
| UI-RESP-WIDE | PASS | 태블릿·1024·1920 실제 렌더와 대표 시안 대조 |
| A11Y-TITLE | PASS |31화면 실제 제목 수집, 기록·신규 가이드 제목 확인 |
| A11Y-LANDMARKS | PASS | main/h1 각1개 |
| A11Y-NAMES | PASS | 빈 이름0, 문서별 원문 이름·과목별 상태·학기 이름 확인 |
| A11Y-KEYBOARD | PASS | 설문 방향키/포커스, 가이드 Tab, 과목 정보, 기록·인쇄 및 기존 modal/navigation 회귀 |
| A11Y-CONTRAST | PASS | 신규7화면×390/1920의 단색 판정1,226건 미달0. PDF 그라데이션3문구의 낮은 끝점 대비도5.9789 이상. 비활성 제어는 제외 |
| A11Y-CONSOLE | PASS | 실제 매트릭스·핵심·복구에서 앱 오류0 |

## 근거 파일

작업 폴더: `C:/Users/HAPPY/Documents/Codex/2026-08-31/new-chat/_workspace/2026-09-08-service-goal/`. 실제 학생 기록이 아닌 synthetic 입력으로 만든 검증 산출물이다.

- `unit-tests-final.json`: 원문 비공개 정책 반영 전738개 테스트
- `unit-tests-private-release.json`: 비공개 배포 경계까지 반영한 최종741개 테스트
- `private-pdf-ui-review.json`: 문의·신청 준비·출처3화면×모바일/PC, 원문 링크0·비공개 안내·공식 공개 링크 유지
- `local-core-service.json`: 핵심20개
- `edge-local.json`: 오류·복구17개
- `core-flow-local.json`: 신규 방문자·시간표·설문 실제 완주
- `responsive-matrix-raw.json`, `responsive-affected-matrix.json`, `responsive-bottom-recheck.json`: 전체279/후속81/가림 후보 검토
- `storage-getter-review.json`, `storage-read-review.json`: 저장 객체·읽기 차단20개
- `predeploy-independent-review.md`, `predeploy-review-browser.json`: 독립 리뷰와 수정 재검증
- `new-ui-contrast-audit.json`, `new-ui-contrast-report.md`: 새 화면1,226개 수치 판정과 그라데이션 끝점 검토
- `matrix-final-courses-{390,860,1920}.png`, `records-list-refined-{390,860}.png`: 최종 시각 증거

## 공개와 남은 경계

### 배포와 실제 운영 검수

| 항목 | 확인 결과 |
| --- | --- |
| GitHub 반영 | `codex/track-service-expansion`에 기능 커밋 `ed7a6b957d0bfd098e3bc3fcd54b619ba94fd7f6` 푸시 완료. main 병합이나 새 PR은 수행하지 않음 |
| Vercel 배포 | `dpl_Hip4cXPrZ4J19Maty7WLBq7vcVc2`, Ready, target production |
| 승격 전 주소 | <https://dku-track-diagnosis-cb8zliyke-startlink0504.vercel.app> |
| 운영 주소 | <https://dku-track-diagnosis.vercel.app> — 같은 배포본 승격 완료, HTTP200 |
| 운영 정적 자산 | `index-Dwi-JLE9.js`, `index-CYvqSJDe.css` |
| 검수한 스타일 일치 | 운영 CSS261,669bytes, SHA-256 `ACF0623876A47FD74E6349A8FF3C71989652A8D5710D9F14DC6449AB9AFCAC29`, 검증한 로컬 CSS와 동일 |
| 원문 비공개 | 제공 원본·비공개 복사본 해시 일치. public/dist/Git 추적에 원문 없음. 승격 전·운영 원문 경로404/text/plain, `%PDF` 서명 없음 |
| 승격 전 브라우저 | 핵심20개, 오류·복구17개, 신규 방문자/시간표/설문3흐름, 비공개 안내3화면×2크기6조합 PASS |
| 운영 직접 브라우저 | 동일 핵심20개·복구17개·3흐름·비공개6조합 PASS. 별도31화면×9크기279건 PASS |
| 운영 매트릭스 | hardFailures=[], touchFailureRows=0, 콘솔 오류·경고·가로 넘침·랜드마크 중복·노출 요소 하단 가림·원문 링크0 |
| 기록 보관 | 운영 UI에서 새 synthetic 기록12개 생성, 계획 학기 새로고침 복원·기록 상세 복귀·현재 입력 불변 확인 |

승격 전 주소는 보호 설정을 해제하지 않았다. 기존 승인된 `vercel curl`이 가져온 **해당 배포의 실제 원격 응답**을 Playwright 요청에 전달해 렌더·클릭을 검수했다. 로컬 빌드 파일을 원격 응답 대신 사용하지 않았고 인증 파일·토큰·쿠키를 읽거나 출력하지 않았다. CLI 중계 때문에 탐색 제한만120초이며 이 구간을 사이트 성능 측정으로 해석하지 않는다. 운영 주소 검수는 중계 없이 직접 접속했다.

원격 빌드는 Vite7.3.6, 로컬은7.3.5여서 JS 청크 이름은 다르다. 실제 원격 결과와 완주 동작을 별도로 검수했다. 원격 빌드에도500kB 크기 경고와 esbuild 설치 스크립트 승인 안내가 있으나 빌드는 성공했고 설정을 임의 변경하지 않았다. 브라우저 콘솔은 깨끗했다. 서버 로그 수집·지속 모니터링·새 외부 분석 도구는 추가하지 않았다.

추가 증거(앞의 작업 폴더): `preview-release-core-service.json`, `core-flow-preview-release.json`, `edge-preview-release.json`, `preview-release-private-ui.json`, `production-release-core-service.json`, `core-flow-production-release.json`, `edge-production-release.json`, `production-release-private-ui.json`, `production-responsive-matrix-summary.json`, `production-responsive-matrix-raw.json`, `production-private-source-probe.json`, `production-representative-interaction.json`. 승격 전과 운영 결과를 서로 대신하는 증거로 사용하지 않았다.

새 제공 PDF는 사용자 요청으로 **원문 비공개**를 확정했다. 원본은 보존하고 개발용 복사본은 저장소 밖의 비공개 작업 폴더로 옮겼다. Git/Vercel 제외 규칙과 배포 경계 테스트를 추가했으며 사이트에서는 내려받기 링크 대신 제공 자료의 제목·받은 날·참고 쪽수와 비공개 상태를 설명한다. 승인된 소스·운영 사이트 갱신은 이 범위로 진행한다.

실물 iPhone·Galaxy·Fold·태블릿, Safari/Samsung Internet, 실제 가상 키보드·프린터 출력은 검증하지 않았다. 로그인 없는 저장은 브라우저별로 분리되고 데이터 삭제 시 없어질 수 있다. 저장이 차단된 환경은 새로고침 후 임시 입력을 복원할 수 없다. 개인별 학위·트랙 인정, 향후 개설 여부, PDF 내부 차이는 학과 확인 대상이다. PDF 자동 입력은 beta이며 직접 선택을 기본으로 유지한다.
