# 생성 시안과 실제 화면의 대조

기준일: 2026-09-09. 사용자 제공 [실제 서비스](https://major-evolution-demo-private.vercel.app/)와 [GitHub](https://github.com/Suya020504/MajorEvolutionHomepage-demo-private)의 main a137dc1을 읽고, 해당 화면을 참조 이미지로 사용해 결과 시안을 생성했다.

- 시안: results-target.png
- 실제: results-actual-desktop.jpg, results-actual-mobile.jpg
- 참고 코드: components/app/service-hub.tsx의 HubPrimaryTask/HubAdaptiveLayout, components/screens/research-condition.tsx의 단계와 단일 다음 행동, research-result.tsx의 contextDisclosure/CriteriaDisclosure.

| 시안 특징 | 실제 반영 | 검증 |
|---|---|---|
| 하나의 큰 흰 보고서 카드 | 제목·상태·트랙·요약·표·학사조건·보관을 report 안에 묶음 | 실제 데스크톱 이미지·DOM |
| 오른쪽 현황 카드가 위에서 시작 | 동일 최상위 grid에 aside 배치 | 같은 시작 높이·전체 카드 구조 |
| 완료 배지와 원형 아이콘 | 초록 체크 배지, 네이비 요약 안 원형 아이콘판 | 실제 양 화면 |
| 두 영역으로 나뉜 네이비 요약 | 계산 기준/잔여 과목 분리, 작은 설명과 큰 수치 | 1280·1440px 렌더 |
| 표와 보조 정보의 구분 | 과목·학점·트랙·대체 정보 4열, 대체는 펼침 | 반복 담기 버튼 없음 |
| 주요 버튼 1개 | 진단 보관은 채움, 인쇄는 텍스트 | 실제 동작·테스트 |
| 보조 기능은 하단에 모음 | 전체 폭의 기본 닫힌 추가 도구 | 기본상태·펼침 확인 |
| 모바일도 같은 정체성 | 보고서→진도→도구, 네이비 요약 세로 재배치 | 실제390px 이미지 |

의도적인 차이: 시안의 임의 퍼센트와 과목수는 복제하지 않는다. 예시 입력 f-1 완료, 두 트랙 선택은 3/30학점·10%, 공통 잔여13과목39학점으로 계산된다. 시안의 트랙 칩 X는 입력 수정으로 통합해 실수로 삭제하는 동작을 만들지 않았다. 결과에 남은 필수 진행 단계처럼 보이는 리본도 제거했다. 인쇄·보관은 실제 기능이며 모듈 필수/학번별 조건의 구분은 유지한다.

독립 읽기 전용 검토에서 시안의 핵심 디자인 누락이나 P0/P1은 발견되지 않았다. 화면 밖의 하단 제어는 코드로, 메인 검수에서는 실제 펼침 동작으로 확인했다. 픽셀 일치율이나 학생 사용성 실험 결과를 산출한 것은 아니다.

영상 소스는 video-source/render_video.py와 captures에 보관한다. Windows에 설치된 맑은 고딕과 FFmpeg를 사용하며 폰트·중간 영상은 Git에서 제외한다. 화면은 가상 이력으로 실제 조작한 캡처를 사용하고, 장면별 자막·완만한 화면 이동으로 설명하는 방식이다. 연속 화면 녹화 또는 음성 내레이션을 제공한다고 주장하지 않는다.
