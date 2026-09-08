# 학생용 자료 화면 검수 · 2026-09-09

이 문서는 GitHub 협업 기록이다. 앱에서 렌더하지 않으며 `docs/research/`는 배포 업로드에서도 제외한다. 원문 PDF/HWP, 포털 개인 정보, 인증 정보는 포함하지 않는다.

## Findings

- 수정 P2: 공식 자료의 검증 기록·해시·bytes·과거 자료 간 차이가 학생 안내보다 크게 노출됐다. 자료·모듈·가이드·문의에서 해당 렌더링을 제거하고 별도 내부 자료 기록에 보존했다.
- 수정 P2: 교육과정·시간표가 긴 목록 중심이었다. 교육과정은 학습분야×8개 학기 표, 시간표는 요일×시작 시각 표와 37분반 목록으로 변경했다. 표의 가로 스크롤은 표 영역 안에 한정했다.
- 수정 P2: 학번별 전공필수와 모듈 내 필수가 혼동될 수 있었다. 두 조건을 분리하고 결과 제목·다음 과목 추천의 충족 범위를 명시했다. 2021학번 모듈필수 완료/환경경제학 미이수 사례를 회귀 테스트했다.
- 유지 P3: 기본 JS 청크가 514.59kB(압축 전)로 기존 500kB 경고가 남는다. PDF는 기존 지연 로딩을 유지한다. 현장 성능 개선을 검증한 것은 아니다.

## Summary

현재 행동은 대학생이 이수 조건을 이해하고 과목·수업 시간을 찾는 것이다. 병목은 반복 설명과 내부 검증 정보, 세로로 긴 목록이다. 이번 범위는 안내·표·필터·세부 정보와 전공필수 분리이며 AI 생성 기능은 필요하지 않다. 계산·검색·상태는 기존 규칙과 UI로 처리한다. 계정·신청 대행·PDF 공개·새 학사 계산 엔진은 학생 자료 조회와 다른 책임이므로 추가하지 않는다.

참고 이미지의 표 구조만 사용했다. 2025년 이미지의 과목 배치를 현재 데이터로 오인해 복제하지 않았다. 학습분야 행은 읽기 위한 분류이며 트랙 인정 규칙을 바꾸지 않는다.

## Verification

### 수정 전후

- 각 담당 테스트에서 제거 대상 메타, 기존 목록, 신규 학번 조건을 실패로 확인한 뒤 수정했다. 통합 중 793개 중 3개는 옛 문구·근거 노출을 요구하는 기대값이라 새 공개 정책에 맞춰 수정했다.
- 최종 `npm.cmd test`: 80파일, 802/802 PASS. 로컬 원본 보고서: `_workspace/2026-09-09-student-guide/release-tests.json` (작업 공간, Git 미포함).
- `npm.cmd run build`: TypeScript noEmit 및 Vite PASS. `index-BU6EDtUl.js`, `index-CRb_8OBd.css`.
- `git diff --check`: PASS. 줄바꿈 변환 안내 외 공백 오류 없음.
- `public`·`dist`에서 PDF/HWP/HWPX 원문 0개.

### 실제 브라우저

Codex CUA, `http://127.0.0.1:5173/`, 실제 스냅샷·스크린샷·DOM·콘솔을 확인했다. 별도 외부 브라우저 자동화나 인증정보 추출은 사용하지 않았다.

- 학교 자료: 320·390px, 내부 audit 문자열 없음, 단일 main/h1, 페이지 가로 넘침 0.
- 교육과정: 390px에서 2학년 선택→2개 학기/10과목, 소비자경제학 Enter 상세→Escape 닫기·포커스 복귀. 없는 과목 검색→0개→전체 교육과정 복원. 1920×1080에서 47개 과목과 8학기 표 확인.
- 시간표: 담당자 390·759·1440px 및 통합 430·759px. 37분반 목록→토요일 1분반→초기화 37분반. 야간 19:50–21:35, 비동기·원격 구분, 상세·가로 스크롤 확인.
- 가이드: 1136px에서 전공 유형 3개와 표기 예시 2개, 390px 신청 마감/337호/서식 링크. 영상 선택 후 동의 전 iframe 0, 동의 후 youtube-nocookie의 선택한 2편 연결 확인.
- 진단 결과: 기존 부전공 3/21학점·저장 기록 1개가 새로고침 후 유지. 문의 화면→뒤로가기 결과 복귀 확인. 개인 입력을 초기화하거나 새 기록으로 덮지 않았다.
- 앱 콘솔 오류·경고 0, Vite 오류 overlay 없음. CUA 선택자 호출 2회가 일시적으로 시간 초과됐으며 새 스냅샷 확인 후 키보드/재조회로 동작을 검증했다. 앱 장애와 도구 지연을 구분한다.

### 완료 게이트

| ID | 판정 | 증거 |
|---|---|---|
| SD-CORE-TEST-FIRST | PASS | 학번 조건·통합 제목 회귀 및 자료 노출 RED→GREEN |
| SD-RELATED-TESTS | PASS | 담당 영역 및 공유 테스트 재검사 |
| SD-FULL-TESTS | PASS | 802/802 |
| SD-TYPECHECK | PASS | tsc --noEmit |
| SD-PRODUCTION-BUILD | PASS | Vite 빌드, 청크 경고 별도 기록 |
| SD-DIFF-CHECK | PASS | git diff --check |
| SD-CONSOLE-OVERLAY | PASS | CUA 로컬 앱 오류/경고 0, overlay 없음 |

### 적용 범위 coverage

PASS는 아래 증거의 범위만 의미한다. 변경 없는 엔진·저장 경계는 전체 테스트로 회귀 검사했지만 이번 브라우저에서 오류 주입까지 재수행했다고 주장하지 않는다.

| ID | 판정 | 증거 또는 제외 사유 |
|---|---|---|
| FLOW-JOURNEY-ENTRY | PASS | 자료 제목→검색·필터→표 |
| FLOW-JOURNEY-NAVIGATION | PASS | 자료 탭·가이드 목차·문의→뒤로가기 |
| FLOW-JOURNEY-ACTIONS | PASS | 변경한 표·필터·상세·초기화·영상 선택 동작; 전화·메일 실제 발송 제외 |
| FLOW-STATE-PERSISTENCE | PASS | 기존 결과 3/21·저장 기록 1 새로고침 유지 |
| FLOW-STATE-COUNTS | PASS | 47과목·37분반·요일 필터 1건 대조 |
| FLOW-STATE-ISOLATION | EXCLUDED | 조회 UI와 체크리스트만 변경, 기록 생성/혼합 기능 미변경 |
| FLOW-STATE-CORRUPTION | EXCLUDED | 기존 저장 엔진 미변경, 단위 회귀는 수행하되 사용자 저장소 손상 주입 안 함 |
| FLOW-STATE-STORAGE-FAILURE | EXCLUDED | 저장 엔진 미변경, 기존 단위 회귀 외 오류 주입 안 함 |
| FLOW-ERROR-RECOVERY | PASS | 검색 0개→전체 복원, 안전한 기본 필터 |
| FLOW-ROUTE-INVALID | EXCLUDED | 라우터 미변경, 전체 회귀 테스트만 수행 |
| FLOW-ROUTE-INVENTORY | PASS | 수정된 resources 5개/guide 6개/문의의 기존 진입 유지 |
| FLOW-FRAMEWORK-OVERLAY | PASS | CUA 대표 화면 overlay 없음 |
| UI-RESP-OVERFLOW | PASS | 320/390/430/759/1136/1440/1920 중 기록된 대표 화면, 표 내부 스크롤 |
| UI-RESP-FIXED-UI | PASS | 모바일 하단 내비와 자료 버튼/표 영역 확인 |
| UI-RESP-EDGE-STATES | PASS | 0개·47과목·37분반·긴 과목명 |
| UI-HIERARCHY-PRIMARY-SECONDARY | PASS | 자료는 조회 먼저, 원문·문의는 보조. 실제 화면 확인 |
| UI-IDENTITY-TABS | PASS | 현재 자료/가이드 목차 표시와 페이지 제목 |
| UI-ABOVE-FOLD-CTA | PASS | 제목 다음 검색·필터, 상세는 표에서 선택 |
| UI-RESP-WIDE | PASS | 1920 교과표·1440 시간표·1136 가이드 |
| A11Y-TITLE | PASS | 자료/학위/신청/결과의 실제 document.title |
| A11Y-LANDMARKS | PASS | 수정 대표 화면 main/h1·table/caption/rowheader |
| A11Y-NAMES | PASS | 과목명 포함 상세·닫기, 목적 포함 공식 링크 이름 |
| A11Y-KEYBOARD | PASS | Enter 상세/영상 선택, Escape 닫기/복귀 |
| A11Y-CONTRAST | BLOCKED | 색·크기와 렌더 확인은 했으나 모든 상태의 AA 수치 대조는 미수행 |
| A11Y-CONSOLE | PASS | CUA 앱 오류·경고 0 |
| PROD-AUTH | EXCLUDED | 로그인 없는 서비스, 포털은 안내 공지 읽기만 수행 |
| PROD-TRANSACTION | EXCLUDED | 실제 신청/결제/발송 기능 없음 |
| PROD-ASYNC | EXCLUDED | 동기 로컬 조회, 서버·두 탭 쓰기 로직 미변경 |
| PROD-INTEGRATION | PASS | 영상 동의 후 연결·외부 링크 목적 확인; 실제 전화/메일 발송 없음 |
| PROD-DATA | PASS | 기존 학생 저장 엔진 불변, 원문 파일 공개 없음 |
| PROD-ACCESSIBILITY | PASS | 320 리플로·표 예외·명명·키보드의 범위 검사; 실제 스크린리더 미수행 |
| PROD-PERFORMANCE | EXCLUDED | 성능 개선 요청 범위 아님, 현장 p75 없음, 번들 경고 기록 |
| PROD-OPERATIONS | PASS | 문의 연락처·337호·마감 표시; 장애복구 훈련 의미 아님 |
| PROD-RELEASE | PASS | 9bb2a20 소스, 배포 READY, 승격 전·운영 동일 대표 조회 흐름 확인 |
| PROD-OUTCOME | EXCLUDED | 사용성 효과나 이탈률을 측정한 사용자 표본 없음 |

## Remaining Risk

- 학번별 전공필수는 독립 확인이며 기존 추천·계획 엔진에 통합하지 않았다. 모듈·전공학점 충족을 전체 졸업 인정이라고 표시하지 않는다.
- 증명서 형태는 공식 영상의 설명을 바탕으로 만든 표기 예시다. 실제 발급 증명서의 확정 견본은 아니다.
- 시간표는 2026-09-08 조회 기록이며 실시간 변경·여석 API가 아니다.
- 모든 화면/기기 조합, 실제 스크린리더, 전체 상태 대비, 현장 성능은 검수하지 않았다.
- 배포 전용 URL 보호 설정은 유지한다. 운영 검증은 배포 후 별도로 기록한다.

## 배포 확인

- 기능 소스: `9bb2a20d6e15e557c72a76e86442decc02bb5c3f`, `codex/track-service-expansion`에 push 완료. 별도 PR 생성·main 병합은 하지 않았다.
- Vercel 배포: `dpl_3RGGoJn2xnnnjNzDHshtvY4reqP7`, READY. 배포 메타의 `gitCommitSha`가 위 소스와 일치한다.
- 승격 전 주소: `https://dku-track-diagnosis-79uf73lh2-startlink0504.vercel.app`.
- 운영 주소: `https://dku-track-diagnosis.vercel.app`.
- 기존 보호 설정은 변경하지 않았다. CUA에서 배포 전용 주소를 직접 열 수 있어 CLI 우회·인증 추출 없이 검수했다.
- 두 환경에서 각각 390px 학교 자료 스크린샷, audit 문자열 부재, 과목 47개/8개 학기→미시경제학 검색 1건, 시간표 목록 37행, 1136px 전공 유형 3개/표기 예시 2개/신청 마감·원본·337호를 확인했다. 페이지 가로 넘침 및 앱 콘솔 오류·경고 0. 운영 장점 페이지의 기존 면책 문장도 제거됨을 확인했다.
- 운영 원문 PDF 경로 `/documents/2026-ere-module-track-curriculum.pdf`는 HTTP 404. 내부 감사 문서 경로 `/docs/research/2026-09-09-internal-resource-audit.md`도 HTTP 404다.
- 로컬 JS 번들에서도 제거한 audit 제목·옛 파일 해시·원문 PDF 다운로드 경로가 모두 발견되지 않았다. 내부 자료는 브라우저 표시뿐 아니라 배포 업로드에서도 제외했다.
- 운영 빌드는 Vite 7.3.6, 로컬은 7.3.5여서 자산 파일 해시는 달랐다. 운영의 `index-ieQxkmCi.js`를 실제 DOM에서 확인했고 배포 소스 커밋과 동작을 별도로 대조했다. 잠금파일·설치 정책의 재현성 통일은 이번 학생 UI 변경에서 수정하지 않았다.
- 배포 후 정적 SPA 대표 페이지·콘솔은 확인했다. 서버 로그 수집·장애복구 훈련·사용자 성과 측정은 수행하지 않았다.
