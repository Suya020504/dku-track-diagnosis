# 트랙제 서비스 페이지별 도안·와이어프레임

> 이 폴더는 9월 2일의 디자인 레퍼런스입니다. 현재 구현은 [9월 8일 승인 A안](../../docs/superpowers/specs/2026-09-08-purpose-zones-design.md)을 따릅니다. 참고 이미지의 좌측 내비게이션·나침반 묘사·예시 수치를 현재 서비스 화면이나 데이터로 사용하지 않습니다.

- 제작일: 2026-09-02
- 범위: 핵심 페이지 9개, 고해상도 도안 9장, 반응형 와이어프레임 9장
- 시각 방향: 지도 없는 전공 탐색 홈, 하늘색·민트·단국 블루·학과 녹색, 대학생용 학업 플래너
- 이미지 제작: built-in `image_gen`
- 와이어프레임 제작: HTML/CSS + Chromium element screenshot
- 기준 명세: `docs/superpowers/specs/2026-09-02-full-service-interaction-responsive-expansion-design.md`

## 페이지 인덱스

| 페이지 | 고해상도 도안 | 데스크톱·모바일 와이어프레임 |
| --- | --- | --- |
| 01 홈 | [mockup-home.png](mockups/mockup-home.png) | [wireframe-home.png](wireframes/wireframe-home.png) |
| 02 트랙제 알아보기 | [mockup-guide.png](mockups/mockup-guide.png) | [wireframe-guide.png](wireframes/wireframe-guide.png) |
| 03 관심 트랙 추천 설문 | [mockup-survey.png](mockups/mockup-survey.png) | [wireframe-survey.png](wireframes/wireframe-survey.png) |
| 04 학생 유형·이수 경로 | [mockup-profile.png](mockups/mockup-profile.png) | [wireframe-profile.png](wireframes/wireframe-profile.png) |
| 05 이수 과목 입력 | [mockup-courses.png](mockups/mockup-courses.png) | [wireframe-courses.png](wireframes/wireframe-courses.png) |
| 06 상황별 시뮬레이션 결과 | [mockup-result.png](mockups/mockup-result.png) | [wireframe-result.png](wireframes/wireframe-result.png) |
| 07 트랙 추천 비교 | [mockup-recommendation.png](mockups/mockup-recommendation.png) | [wireframe-recommendation.png](wireframes/wireframe-recommendation.png) |
| 08 목표 학기 이수 가능성·플래너 | [mockup-plan.png](mockups/mockup-plan.png) | [wireframe-plan.png](wireframes/wireframe-plan.png) |
| 09 공식 자료 | [mockup-resources.png](mockups/mockup-resources.png) | [wireframe-resources.png](wireframes/wireframe-resources.png) |

## 사용 경계

- 고해상도 도안은 색·밀도·위계·컴포넌트 배치를 확인하는 디자인 레퍼런스다.
- 생성 이미지 속 작은 글자, 표, 과목코드, 날짜, 학점, 진행 막대는 구현 데이터의 근거가 아니다.
- 실제 과목·모듈·트랙·학점·개설학기·공식 출처는 현재 저장소의 데이터와 공식 자료를 사용한다.
- DKU 로고는 이미지 속 재현본이 아니라 `public/dku-logo.png` 원본을 HTML로 렌더링한다.
- `가능/불가능`, `졸업 가능`, `이수 확정` 같은 공식 판정 문구를 구현하지 않는다.
- 공식 자료 화면은 학업 여정 리본을 사용하지 않고 네 개의 자료 탭만 사용한다.

## 와이어프레임 원본

[wireframes.html](wireframes.html)은 모든 페이지의 1080p 데스크톱과 모바일 구조를 한 문서에서 확인하는 결정적 구조 원본이다. 와이어프레임의 한글 제목과 정보 순서가 생성 이미지보다 우선한다.

## Figma 캡처 원본

[figma-source.html](figma-source.html)은 토큰, 공통 컴포넌트 목록, 9개 도안과 9개 와이어프레임을 Figma 캡처용으로 구성한 원본이다. Figma 파일 키가 준비되면 `generate_figma_design`의 최초 레이아웃 참조로 사용하고, 편집 가능한 컴포넌트 프레임은 `use_figma`로 별도 구성한다.

## 프롬프트 기록

페이지별 이미지 제작 의도와 제약은 [PROMPTS.md](PROMPTS.md)에 기록했다.
