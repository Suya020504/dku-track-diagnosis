# 기능 위계·시안 충실도·영상 안내 최종 검수

## Findings

- P2 해결: 계획을 선택이라고 써도 진단의 다음 필수 단계처럼 보였다. 진단 입력만 3단계로 표시하며 결과·계획에는 진단 단계 리본이 없다. 이력부터 찾는 경로는 내 정보→수강 이력→트랙 선택 순으로 맞춘다. 계획은 메뉴의 도구, 결과의 추가 도구에서 이용한다.
- P2 해결: 결과표의 반복 담기 버튼, 별도 수정 버튼과 항상 드러난 부가 기능이 경쟁했다. 반복 버튼을 제거하고 입력 수정, 대체 과목, 다른 트랙, 학기 비교를 목적별 펼침으로 나눴다. 진단 완료를 명확히 표시하고 보관만 채움 버튼으로 둔다.
- P2 해결: 시안의 보고서 카드·진도 카드·요약과 아이콘 구도가 실제 구조와 달랐다. 보고서/aside를 최상위 grid에 배치하고 같은 시각 요소를 구현했다. [대조표](../../design-proposals/2026-09-09-hierarchy/IMPLEMENTATION.md)와 실제 캡처를 남겼다.
- P2 해결: 가이드 중간에 진단·설문으로 이탈시키는 행동이 있었다. 제도 설명 순서로 연결하고 신청 안내 끝에 서비스 시작을 둔다.
- P2 해결: 예시 조작 화면이 개인 진단과 혼동될 수 있었다. 기본 안내를 실제 화면 기반 영상으로 바꾸고 조작 예시는 접힌 보조 링크로 남겼다.
- 영상 검수 중 발견한 두 번째 자막 줄 잘림은 줄별 좌표를 분리해 수정했고 결과·계획 프레임을 다시 확인했다.

## Summary

사용자 제공 MajorEvolutionHomepage 데모와 GitHub를 우선 출발점으로 삼았다. 주요 행동 하나를 강조하는 HubPrimaryTask, 모바일에서 핵심 내용을 먼저 두는 HubAdaptiveLayout, 단계별 입력 및 상세 접기 구조를 참고했다. 이미지 생성 시안과 실제 구조의 대조를 완료했다.

영상은 가상 이력으로 실제 사이트를 조작한 화면 캡처를 장면으로 편집하고 자막·작은 화면 이동을 더한 86초 안내다. 음성·음악은 없다. 자동재생하지 않으며 한국어 설명이 영상에 포함돼 있다. 추가 텍스트 자막은 기본 끔으로 제공해 자막이 겹치지 않게 한다. 글 안내와 다운로드·재시도, 기존 예시 체험도 보조로 제공한다.

## Verification

- 전체 **107파일 1,014개 테스트 PASS**: `tmp/upgrade-tests.json` / `tmp/upgrade-tests.log`. 새 위계로 바뀐 라우트·보관·메뉴·진단 단계의 검증을 실제 새 동작에 맞게 갱신했다. 저장·계산 검증은 유지했다.
- TypeScript/Vite 빌드 및 `git diff --check` PASS. 주 JS627.94kB/CSS363.67kB의 기존 큰 청크 경고는 남는다. `tmp/upgrade-build.log`.
- 홈·개요 가이드·결과·영상 ×390/430/820/1440px =16개 실제 조합에서 페이지 가로 넘침0, 깨진 이미지0. 각 검사에서 실제 innerWidth를 확인했다.
- 1280×720에서 첫 방문 홈의 주요 시작 버튼 하단644.8px로 첫 화면 안에 들어온다. 헤더·영상·폼 경쟁을 줄였고 재방문은 새 선택을 접어둔다.
- 실제 가이드 overview→benefits→outcomes→structure→application 순서와 마지막 홈 시작 연결을 클릭으로 검증했다. 설명 중간에는 진단/설문 버튼을 두지 않는다.
- 결과의 리본없음, 기본 접힌 추가도구, 반복 담기 버튼0, 보고서·현황 카드 구조, 입력수정과 대체펼침을 확인했다. 진단 후 도구를 열어 계획 생성까지 연결했다.
- 데스크톱 도구 메뉴의 계획/자료실/문의 표시, Escape 닫기와 호출 위치 포커스 복귀 확인. 모바일 주메뉴는 홈·진단·결과·보관함이고 계획은 더보기 안에 있다.
- 단색 기반 대비 도구가 그라데이션을 흰 바탕으로 잘못 처리한 항목은 실제 색상 끝점을 별도 계산했다. 요약 흰 제목 최소11.32:1, 요약 설명8.95:1, 보관 버튼4.71:1, 보고서 설명5.47:1. 전체 WCAG 적합성 인증은 아니다.
- 영상: H.264,1280×720,25fps,2150프레임,86초,약1.57MB. faststart 적용. 실제 video.readyState4, duration86, 재생시간0.16→27.36→40.42초 진행 및 일시정지 확인. 네 크기에서 플레이어가 페이지 폭 안에 들어간다. 가상 이력 표기·두 줄 자막·결과/계획 대표 프레임 확인.
- 전체 검수는 기존 학생 입력이 없는 별도5177 원점에서 가상 이력 f-1 완료를 사용했다. 기존5173 및 운영 학생 기록은 바꾸지 않았다. 개발 중간 문법/오래된 기준 기대값 실패는 마감 뒤 전체 검사로 재검증했다.
- 메인 실제 브라우저 콘솔 error/warn0건. 독립 시안 대조 리뷰에서 핵심 누락/P0/P1 발견 없음.

### Coverage

| 안정 ID | 판정 | 근거·범위 |
|---|---|---|
| FLOW-JOURNEY-ENTRY | PASS | 영상 중심·새방문/재방문 위계 |
| FLOW-JOURNEY-NAVIGATION | PASS | 설명5단계·마지막 시작·진단 종료 |
| FLOW-JOURNEY-ACTIONS | PASS | 수정/대체/도구/보관/영상재생 주요 제어 |
| FLOW-STATE-PERSISTENCE | PASS | 저장 회귀 유지, 영상/설명은 기록을 덮어쓰지 않음 |
| FLOW-STATE-COUNTS | PASS | 두 트랙3/30·10%, 잔여13/39 실제 계산 |
| FLOW-STATE-ISOLATION | PASS | 별도 가상 원점, 기존 기록 보존 회귀 |
| FLOW-STATE-CORRUPTION | BLOCKED | 자동 회귀 통과, 이번 실제 손상 주입 없음 |
| FLOW-STATE-STORAGE-FAILURE | BLOCKED | 자동 회귀 통과, 이번 실제 브라우저 저장차단 없음 |
| FLOW-ERROR-RECOVERY | PASS | 영상/자막 오류 재시도·글 안내 회귀 |
| FLOW-ROUTE-INVALID | PASS | 영상기본/interactive URL 호환·기존라우트 회귀 |
| FLOW-ROUTE-INVENTORY | PASS | 핵심 메뉴와 도구 분리·가이드 순서 대조 |
| FLOW-FRAMEWORK-OVERLAY | PASS | 마감 브라우저 오류화면 없음 |
| UI-RESP-OVERFLOW | PASS | 16개 실제 화면조합 넘침0 |
| UI-RESP-FIXED-UI | PASS | 모바일 카드·하단내비·플레이어 폭 |
| UI-RESP-EDGE-STATES | PASS | 첫/재방문·입력없음·다중트랙·접힘·재생/일시정지 |
| UI-HIERARCHY-PRIMARY-SECONDARY | PASS | 결과의 보관1개 강조, 부가도구 접힘 |
| UI-IDENTITY-TABS | PASS | 가이드/진단/결과/계획의 목적 분리 |
| UI-ABOVE-FOLD-CTA | PASS | 노트북720높이의 시작버튼644.8px |
| UI-RESP-WIDE | PASS | 시안 대조 데스크톱·태블릿 |
| A11Y-TITLE | PASS | 영상/가이드/결과 현재 제목 |
| A11Y-LANDMARKS | PASS | 보고서main/h1·진도aside·추가details |
| A11Y-NAMES | PASS | 도구/대체/영상 접근성 이름·native controls |
| A11Y-KEYBOARD | PASS | details·Escape·포커스 복귀 |
| A11Y-CONTRAST | PASS | 핵심 글자 실측+gradient 끝점 보완 |
| A11Y-CONSOLE | PASS | 최종대표콘솔 error/warn0 |

SD-CORE-TEST-FIRST/RELATED-TESTS/FULL-TESTS/TYPECHECK/PRODUCTION-BUILD/DIFF-CHECK/CONSOLE-OVERLAY: PASS. 관련 새 기대값 실패 확인 후 수정·통합 검증을 진행했다.

## Remaining Risk

시안과 동일하지 않은 수치는 실제 계산값을 우선한 의도적 차이다. 모바일은 보고서→현황→도구 순으로 재배치한다. 영상은 단계별 실제 화면 캡처를 편집한 안내로 연속 조작 녹화가 아니다. 실물기기·전체 스크린리더·모든 오류 주입·학생 참여 사용성 실험은 별도다. 학사 인정과 미래 개설 확인 범위는 기존대로 유지한다.

## Release

배포 완료 후 실제 검증 결과를 기록한다.
