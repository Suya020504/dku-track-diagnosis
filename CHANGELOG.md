# 변경 기록

이 문서는 GitHub 커밋 목록만 봐서는 파악하기 어려운 변경 목적과 검증 결과를 협업자가 빠르게 이해할 수 있도록 정리합니다.

## 2026-06-11

### Fix Vercel install configuration

- Vercel 배포 중 `pnpm install --frozen-lockfile` 단계가 실패해 lockfile을 `package.json` 기준으로 재생성했습니다.
- Vercel 빌드 서버가 같은 패키지 매니저를 쓰도록 `packageManager`를 `pnpm@11.5.2`로 고정했습니다.
- Vercel 원격 빌드에서도 같은 pnpm 버전이 실행되도록 install command를 `npx --yes pnpm@11.5.2 install --frozen-lockfile`로 고정했습니다.
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
