# 2026-08-30 학업 플래너 시각 재설계 검증 보고서

## 판정

상태는 **DONE_WITH_CONCERNS**다. 캠퍼스 안내책자 × 학업 플래너 시각 체계, 두 진입 경로, 결과·독립 추천·학기 계획, 자료 읽기 화면, 주소·저장·키보드·반응형·인쇄 경로는 검증 대상 소스에서 동작했다. 직접 과목 선택은 완전한 기본 경로다.

다만 PDF 과목 불러오기 beta는 합성 fixture에서 자동 일치 0개, 선택 필요 0개, 직접 확인 1개로 남았다. 따라서 PDF beta를 release-ready로 판정하지 않는다. 이 보고서는 화면·동작 검증이며 단국대학교나 학과의 공식 트랙 이수·졸업 판정이 아니다.

### Fix round 1 정정

최초 Task 12 승인 캡처의 04-course-ledger-desktop.png를 통과로 판정한 것은 잘못이었다. DiagnosisPanel이 progress-ring, progress-bar, panel-metrics, mini-row, recommend-row 구조를 계속 렌더링했지만 해당 시각 규칙이 삭제되어, 진행률·선택 수·학점·트랙 행이 붙고 progress fill이 보이지 않았다. 이 항목은 실제 visual release blocker였다.

Fix round 1에서 planner-diagnosis-panel root hook과 planner-courses.css의 namespaced 원장형 스타일을 추가하고, 구조 회귀 테스트와 1440/390/320 실제 Chromium 계산값으로 다시 검증했다. 아래의 최신 캡처·해시·브라우저 계산값이 이 정정을 반영한다.

## 실행 기준

| 항목 | 값 |
| --- | --- |
| 실제 실행일 | 2026-08-31 KST |
| 검증 대상 소스 커밋 | cf92134b11e8f4f036c97dae5f907bd3770c5773 |
| 앱 | http://127.0.0.1:4217/ |
| 미리보기 | pnpm.cmd exec vite preview --host 127.0.0.1 --port 4217 --strictPort |
| 미리보기 PID | 21508 |
| 운영체제 | Windows 11 Pro 10.0.26200, build 26200 |
| Node.js | v24.16.0 |
| pnpm | 11.19.0 |
| Vite | 7.3.5 |
| Playwright CLI | 0.1.18 |
| Chromium | HeadlessChrome 151.0.0.0 |
| 언어·DPR | ko-KR, DPR 1 |

모든 브라우저 상태는 이름 있는 in-memory Chromium 세션에 합성 비개인 상태로 만들었다. 사용자 브라우저나 Edge 저장소를 읽거나 지우지 않았다.

- visual-redesign-release-20260831
- visual-redesign-direct-20260831
- visual-redesign-matrix-20260831
- visual-redesign-storage-failure-20260831
- visual-redesign-keyboard-20260831

원본 스냅샷·콘솔·캡처·인쇄물은 Git에서 제외된 output/playwright/visual-redesign-20260830/에 보존했다. 승인 캡처만 docs/assets/2026-08-30-planner-redesign/에 복사했다.

Fix round 1은 부모 커밋 f474dd0bf6c84f87d390e0fb237f725860f736c2에서 실행했다. 프로덕션 미리보기는 같은 127.0.0.1:4217 strictPort, PID 32992였고 visual-redesign-fix1-20260831과 visual-redesign-fix1-empty-20260831 in-memory 세션을 사용했다. 전후 원본과 새 스냅샷은 output/playwright/visual-redesign-20260830/fix-round-1/에 추가 보존했다.

## 시각 세계와 North Star 비교

승인 North Star의 SHA-256은 BD8494DEC6E9771E12E965A1C6B573E400B14AE0D7068436561C4D7EB8FEB150이다.

랜딩은 왼쪽 안내책자 색인, 하늘색 종이 면, 오른쪽 컴퍼스 풍경, 관심 질문→트랙→학기 계획 리본, 입력 전 잠긴 플래너 예고를 실제 semantic HTML로 구현했다. 플래너는 한 화면에 학기 열을 펼치고, 이름 있는 과목과 익명 선택전공 자리를 구분한다. 생성 시안의 가짜 이름·수치·로고·텍스트는 복제하지 않았다. 랜딩과 플래너의 구성·재료·위계 의도는 유지됐지만, 최초 course ledger summary 판정에는 위 visual blocker가 있었고 Fix round 1에서 해결했다.

## 핵심 흐름

| 흐름 | 결과 |
| --- | --- |
| 관심 설문 경로 | fresh landing → 10문항 → 공동 상위 트랙 비교 → 푸드마케팅 직접 선택 → 소속 → 트랙형전공 → 직접 5과목 → 결과 현재/다음 → 독립 추천 → 계획 setup/schedule/checks 완주 |
| 직접 진단 경로 | 별도 fresh 세션에서 landing → 이수 과목 바로 진단 → 소속 → 심화전공 → 직접 2과목 → 결과 현재 완주. 목표 트랙은 null로 유지 |
| PDF beta | synthetic-course-history.pdf → 자동 일치 0, 선택 필요 0, 직접 확인 1 → 검수 취소. 직접 선택 5개와 저장값 5개 유지 |
| 계획 히스토리 | schedule → checks → back → forward → reload에서 canonical URL, H1, H1 focus, scrollY=0, 저장 계획 복원 |
| 자료 읽기 | tracks → modules → curriculum → official 네 canonical 주소와 H1 복원. 외부 링크 4개 모두 target=_blank, rel=noopener noreferrer, 보이는 외부 링크 라벨 제공 |

## 화면 주소

| 화면 | canonical query |
| --- | --- |
| 랜딩 | / |
| 관심 설문 | ?view=recommendation&step=survey |
| 소속·이수 경로 | ?view=diagnosis&step=profile&profile=affiliation 또는 profile=path |
| 과목 직접 선택 | ?view=diagnosis&step=courses |
| PDF 검수 beta | ?view=diagnosis&step=courses&input=pdf-review |
| 결과 | ?view=result&step=result&section=current, next, checks |
| 독립 추천 | ?view=recommendation&step=axes |
| 학기 계획 | ?view=plan&step=setup, schedule, checks |
| 자료 읽기 | ?view=resources&section=tracks, modules, curriculum, official |

## 뷰포트·접근성 행렬

대표 게이트 화면은 landing, courses, result current, plan checks이며 흐름 중 survey, profile, PDF review, result next, recommendation axes, plan schedule, official resources도 별도로 확인했다.

| 뷰포트 | 확인 화면 | 보이는 H1/main | 가로 overflow | 44px 미만 조작 | 수평 잘림 | 콘솔 error/warning |
| --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | landing, courses, result, plan, resources | 각 1/1 | 0px | 0 | 0 | 0/0 |
| 1024×768 | landing, courses, result, plan | 각 1/1 | 0px | 0 | 0 | 0/0 |
| 768×1024 | landing, courses, plan | 각 1/1 | 0px | 0 | 0 | 0/0 |
| 390×844 | landing, courses, plan, storage alert | 각 1/1 | 0px | 0 | 0 | 0/0 |
| 320×800 | landing, courses, plan | 각 1/1 | 0px | 0 | 0 | 0/0 |

390×844 과목 화면에서 Tab 1회로 결과로 건너뛰기에 초점이 이동했고, 조작 높이 44px, outline 3px, offset 3px를 확인했다. plan checks H1은 outline 2px로 초점을 표시했다. 화면 끝까지 내렸을 때 마지막 행동 하단과 고정 모바일 내비게이션 상단 사이에는 약 129px가 남아 겹침이 없었다.

### Fix round 1 DiagnosisPanel 계산값

| 상태·뷰포트 | panel | progress track / fill | label 분리 | metric·행 구조 | action·겹침 | overflow·console |
| --- | --- | --- | ---: | --- | --- | --- |
| 선택 트랙 1440×900 | grid, gap 0, sticky, 286×679.8px | 248×8px / 76.3×6px, 선언 31% | 12px | metric flex gap 12px, track grid gap 8px, recommendation grid gap 3px | 48px, panel 94–773.8px로 완전 노출 | 0px · 0/0 |
| 선택 트랙 390×844 | grid, gap 0, static, 322×674px | 292×8px / 89.9×6px, 선언 31% | 12px | 같은 원장 구조 | 292×48px, bottom-nav overlap false | 0px · 0/0 |
| 선택 트랙 320×800 | grid, gap 0, static, 252×674px | 222×8px / 68.2×6px, 선언 31% | 12px | 같은 원장 구조 | 222×48px, header/bottom-nav overlap false | 0px · 0/0 |
| no-track 1440/390/320 | grid, progress 없음, mint empty band | 해당 없음 | 해당 없음 | 2개 과목 체크됨과 선택 사항 문구 분리 | 모두 48px, mobile bottom-nav overlap false | 모두 0px · 0/0 |

구조 회귀 테스트는 두 DiagnosisPanel 분기가 planner-diagnosis-panel root 아래 progress, metric, track, recommendation, empty, action hook을 유지하는지 고정한다. 테스트를 구현 전 2건 실패로 확인했고, 구현 뒤 2건 통과했다.

키보드 전용 별도 세션에서는 Tab, Space, Enter, Shift+Tab만 사용해 fresh landing → 직접 진단 → 소속 → 심화전공 → 과목 화면의 결과 skip link → 결과 현재를 완주했다. 결과 H1이 초점되고 scrollY는 0이었다.

prefers-reduced-motion: reduce를 실제 emulation했을 때 matchMedia는 true였고, 최대 animation/transition duration은 0.00001초, body scroll-behavior는 auto였다.

합성 Storage.setItem 실패 세션에서는 프로필 화면에 role=alert로 “이 브라우저에 변경 내용을 저장하지 못했습니다...”가 나타났고 콘솔 오류·경고는 0건이었다.

## 주소·스크롤·저장 복원

| 단계 | URL | H1 | 초점 | scrollY | history.scrollRestoration |
| --- | --- | --- | --- | --- | --- |
| checks 진입 | ?view=plan&step=checks | 배치하지 못한 과목 | H1 | 0 | manual |
| back | ?view=plan&step=schedule | 학기당 수강량 조정이 필요해요 | H1 | 0 | manual |
| forward | ?view=plan&step=checks | 배치하지 못한 과목 | H1 | 0 | manual |
| reload | ?view=plan&step=checks | 배치하지 못한 과목 | H1 | 0 | manual |

reload 뒤 graduationPlan이 localStorage에서 복원됐다.

## 인쇄

Playwright의 print media PDF로 결과와 계획을 저장하고 Poppler로 전 페이지를 PNG 렌더링해 육안 검수했다.

| 파일 | 페이지 | SHA-256 | 판정 |
| --- | ---: | --- | --- |
| output/playwright/visual-redesign-20260830/result-current-print-20260831.pdf | 2 | 91735BEF4AC756D806A7FFA031E222DFAD07C2B6C54D5EB736A5FB9278CF7B21 | shell/nav/actions 숨김, 내용 겹침·잘림 없음 |
| output/playwright/visual-redesign-20260830/plan-schedule-print-20260831.pdf | 3 | 2AEC23BC76E04723EE9F2F3B7B35BE51FC5ACE90B6C62C62BCA99FBE9044E110 | shell/nav/actions 숨김, 세 학기 내용 겹침·잘림 없음 |

렌더 PNG도 같은 output 폴더에 보존했다. 결과는 2장, 계획은 3장이다.

## PDF beta·개인정보·네트워크

- 사용 fixture: tests/fixtures/pdf/synthetic-course-history.pdf. 합성 비개인 자료만 사용했다.
- 검수 결과: 자동 일치 0개, 선택 필요 0개, 직접 확인 1개.
- 검수 취소 전후 직접 선택은 화면 5개, localStorage 5개로 동일했다.
- localStorage 키는 track-sim:v2, track-sim:v2:last-valid 두 개였다.
- 두 값 모두 원래 파일명 synthetic-course-history.pdf, fixture 원문 오탈자 경제원롱, 개인 식별 sentinel을 포함하지 않았다.
- cookie와 sessionStorage는 비어 있었다.
- 네트워크는 앱·JS·CSS·컴퍼스 이미지·PDF import chunk·PDF worker의 localhost GET 6건뿐이었다. POST·업로드 요청은 없었다.
- PDF 검수 초안은 메모리에만 존재했고 취소 뒤 canonical courses 주소로 돌아왔다.

이 증거는 현재 합성 fixture와 현재 브라우저 구현에 한정된다. 실제 포털 PDF 표본의 매칭 성공을 증명하지 않는다.

## 이미지·공식 경계

- 랜딩 컴퍼스와 두 설명 이미지는 생성 개념 이미지이며 공식 캠퍼스 사진·로고·인장·교육과정 근거가 아니다.
- source와 runtime 해시·프롬프트·용도는 docs/assets/visual-redesign-2026-08-30/asset-sources.md에 기록돼 있다.
- 공식 근거 화면의 이미지 요소는 0개였고, landing-student.jpg나 공식 캠퍼스 사진을 삽입하지 않았다.
- 공식 캠퍼스 갤러리는 출처 카드와 외부 링크로만 제공한다. 외부 재사용 허가는 확인되지 않았다.
- 생성 설명 이미지에 합성 error 이벤트를 보냈을 때 role=status 대체문이 나타났고 콘솔 오류·경고는 0건이었다.
- 별도 404 fault injection은 예상된 브라우저 네트워크 오류 1건을 만들었다. 이 화면은 승인 캡처에서 제외하고 raw-fault-injected-404-generated-image-fallback-desktop.png로만 보존했다.

## 승인 캡처

아래 화면은 합성 비개인 QA 상태만 포함한다. 원본과 추적 복사본의 SHA-256은 모두 일치한다.

| 파일 | SHA-256 |
| --- | --- |
| docs/assets/2026-08-30-planner-redesign/01-landing-desktop.png | 9DD35508FA41161F2F32866A1E94C5F3D4AB15B0A1712E93005F6995785C9D96 |
| docs/assets/2026-08-30-planner-redesign/02-interest-survey-desktop.png | 70940D5980D05F91E6D8232973FE9C21E5D8AD52768B41C2989E8E1FC5D23A7D |
| docs/assets/2026-08-30-planner-redesign/03-profile-desktop.png | 2DFB5185127F50C3E1418A881640BA90DAD4009A366701548633C33EC6656E29 |
| docs/assets/2026-08-30-planner-redesign/04-course-ledger-desktop.png | D0AED1F8F1B2C693709B9373C603292B734760FF266E197899CB3341E5D5D975 |
| docs/assets/2026-08-30-planner-redesign/05-pdf-review-zero-match-desktop.png | E3D67E51A6EDCE5DD28231CC111EB939831C3C7D4EEB08D490EBB693A90E31B3 |
| docs/assets/2026-08-30-planner-redesign/06-result-current-desktop.png | EE71449C420892C58E3EBA6F0DE09B0CAB7C64F3F5805B1A6D83610602DDC91A |
| docs/assets/2026-08-30-planner-redesign/07-result-next-desktop.png | 06E99A47B28652420F10318B43ED40F99D7E7E4674FC05658A8E46F3C9CB4A84 |
| docs/assets/2026-08-30-planner-redesign/08-recommendation-axes-desktop.png | A1A074E0EC7EC467E1788111B8153065759DD37C02684338CE998D8CF0E2DB88 |
| docs/assets/2026-08-30-planner-redesign/09-planner-schedule-desktop.png | 52DC59CD5CAF01B15448B69FC77327D9AED9E9D313E98F13C31E8C2477B92262 |
| docs/assets/2026-08-30-planner-redesign/10-official-resources-desktop.png | 8EF5D2AEB3AC1EBD9752315AFBFDD7D3FC9E14A64BE676BCCFD1861D05C7185B |
| docs/assets/2026-08-30-planner-redesign/11-generated-image-fallback-desktop.png | 9181901EFFAF21074EA1EC2A611D07C4B318AE15785BE4F5A3AD2C60B4EC1C36 |
| docs/assets/2026-08-30-planner-redesign/12-mobile-landing-390.png | A7EE6299F954320FB6EE0AE256BFA697610E253D4F2B5C3E769F33F7C2F00555 |
| docs/assets/2026-08-30-planner-redesign/13-mobile-courses-skip-focus-390.png | C972314B22E055267EC7D72AF7F2E35BECF0EF00536340B9A15ECAC97152B531 |
| docs/assets/2026-08-30-planner-redesign/14-mobile-plan-checks-390.png | 49F59B1D8B29B19E0829D9C9DB1ECC96895E9F72D74B2411F2A135EFD3064531 |
| docs/assets/2026-08-30-planner-redesign/15-mobile-storage-failure-alert-390.png | BDE0C916D36A55297BCE225D6BFC020FF23B7D7F4BFA008EE1CF1CDE63B8C866 |

Fix round 1 전후 해시:

- 04 desktop: before 2D5A0D6454C1D2EC7A3D32656FA1EA3F65348A8D12FA10EAC8C9F4B7E14867FB → after D0AED1F8F1B2C693709B9373C603292B734760FF266E197899CB3341E5D5D975
- 13 mobile skip/focus: before/after C972314B22E055267EC7D72AF7F2E35BECF0EF00536340B9A15ECAC97152B531. 실제 재캡처했으나 수정된 summary가 초기 모바일 뷰포트 아래에 있어 픽셀 결과가 동일했다.

## 자동 검증

최종 문서 반영 뒤 실행한 결과를 아래에 기록한다.

- focused regression — src/App.diagnosis-panel.test.tsx, 1개 파일·2개 테스트 통과
- pnpm.cmd test — Vitest 4.1.8, 47개 테스트 파일·546개 테스트 통과
- pnpm.cmd build — TypeScript noEmit과 Vite 7.3.5 프로덕션 빌드 통과, 1,774개 모듈 변환
- git diff --check — 공백 오류 0건

## 실패·한계

- PDF beta는 합성 fixture에서 0 matched / 1 unmatched다. 직접 선택만 완전한 기본 경로다.
- 실제 포털 PDF 표본을 사용하지 않았고 매칭 성공률을 주장하지 않는다.
- 공식 캠퍼스 사진 재사용 허가는 확인되지 않았고 앱에 삽입하지 않았다.
- 개설 이력의 공개 재검증 상태는 blocked-by-public-access이며 미래 개설·폐강·인정을 보장하지 않는다.
- Impeccable detector was run exactly once in Task 11 and failed before JSON because the installed detect-url.mjs was missing. Do not rerun it or alter/install the skill. Preserve this limitation verbatim.
- Playwright CLI help/version 출력 뒤 Node 24 libuv assertion 문구가 나타났지만, 이름 있는 브라우저 세션의 실제 명령과 캡처는 정상 완료됐다.
- 이번 작업은 push, merge, deploy, 외부 제출을 수행하지 않았다. 운영 Vercel이 이 검증본을 제공한다고 주장하지 않는다.
