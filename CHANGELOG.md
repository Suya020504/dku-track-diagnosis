# 변경 기록

이 문서는 GitHub 커밋 목록만 봐서는 파악하기 어려운 변경 목적과 검증 결과를 협업자가 빠르게 이해할 수 있도록 정리합니다.

## 2026-08-25

### Add service-first landing page

- 기존 진단 기능 앞에 서비스 목적, 트랙제 구조, 이용 흐름을 설명하는 반응형 랜딩페이지를 추가했습니다.
- `과목 → 모듈 → 트랙` 관계, 다섯 트랙 비교, 3단계 진단 흐름, 결과 예시를 한 페이지에서 확인할 수 있도록 구성했습니다.
- 결과 예시와 트랙 선택 탭은 실제 선택 상태가 바뀌도록 구현했습니다.
- 진단 화면의 학과 로고를 누르면 랜딩페이지로 돌아올 수 있게 연결했습니다.
- 화면 전반을 흰색·쿨그레이 배경, 단국대 블루, 포레스트 그린 기반의 절제된 디자인으로 정리했습니다.
- README의 첫 화면 이미지도 새 랜딩페이지로 교체했습니다.

공식 근거:

- [2026학년도 공식 교육과정](https://www.dankook.ac.kr/documents/d/kor/2026-1-_-260119-pdf?download=true)
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
