# Task 9 Report — Apply The Planner Grammar To Graduation Planning

## Status

PASS — 졸업 계획의 설정·일정·확인 화면을 종이 원장, 학기 바인더 열, 경로선 문법으로 재구성했다. 계산 엔진, 계획 타입, 저장 스키마, stale 무효화 함수는 변경하지 않았다.

## RED / GREEN

### RED

- `pnpm.cmd exec vitest run src/features/planning/GraduationPlanSetup.test.tsx src/features/planning/GraduationPlanResult.test.tsx src/App.graduation-plan-integration.test.tsx`
  - 6 failed / 52 passed.
  - 의도한 실패: 네 조건의 순차 입력 구조 부재, 일정·확인·조건 수정 경로선 부재, 일정 열/과목 종류 표식 부재, 준비 상태 3종 및 단일 복구 경로 부재.
- `pnpm.cmd exec vitest run src/features/planning/GraduationPlanResult.test.tsx`
  - 1 failed / 12 passed.
  - 의도한 실패: 미배치 사유와 공식 확인 근거 상태를 읽을 수 있는 원장 표식 부재.

### GREEN

- 집중 회귀: 3 files / 58 tests passed.
- 최종 전체 회귀: 44 files / 516 tests passed.
- 최종 빌드: `tsc --noEmit && vite build` passed, 1,766 modules transformed.
- `git diff --check` 오류 없음. Windows CRLF 변환 안내만 확인했다.

## 구현 결과

- 설정: 현재 학기 → 목표 졸업 학기 → 학기당 최대 전공과목 수 → 계절학기 고려 여부를 하나의 번호 매긴 의사결정 흐름으로 구성했다.
- 설정 근거: `EvidenceBand`로 2026 이력 스냅샷과 미래 개설 비보장 문구, 공식 자료 링크를 계속 노출했다.
- 일정: 데스크톱은 가로 학기 열, 모바일은 세로 시간축으로 전환한다.
- 과목: 실제 교육과정 과목은 `CourseSticker`와 `named-course`, 익명 선택전공 자리는 `elective-reservation`으로 시각·텍스트·DOM 상태를 분리했다.
- 확인: 미배치 과목/사유, 검토 항목/근거 상태, 학과에 물을 공식 질문, 이수 과목과 공식 자료 링크를 원장형 목록으로 분리했다.
- 경로: `일정`, `확인`, `조건 수정`을 별도 경로선으로 제공하고 App의 URL 전환, H1 ref, scroll restoration 책임을 그대로 사용했다.
- 준비 경계: 프로필·이수 과목·목표 트랙의 실제 ready/pending 상태를 항상 표시하고, 현재 부족 상태에 맞춘 버튼 하나만 제공한다. 목표 트랙을 자동 선택하지 않는다.

## 계획 상태 / 저장 / stale 회귀

- 다섯 상태(`currently-satisfied`, `regular-plan-possible`, `load-adjustment-needed`, `extra-term-possible`, `official-review-required`)의 기존 안전 문구 테스트 통과.
- `졸업 가능`, `이수 확정`, `개설 보장`을 제목으로 표시하지 않는 회귀 테스트 통과.
- 엔진이 생성한 정규/추가 학기 배치, 선택전공 배정, 미배정 학점, 계절학기 확인 경계를 그대로 렌더링하는 테스트 통과.
- 완료/진행/계획 과목, 추가 전공학점, 목표 트랙, 프로필 변경 시 기존 계획을 무효화하고 선호 조건은 보존하는 테스트 통과.
- 명시적 저장 1회, 빠른 2회 클릭 방지, 저장 실패 후 재시도, 동일 generatedAt 중복 스냅샷 차단 테스트 통과.
- 브라우저에서 저장 전 버튼 활성 → 1회 저장 뒤 비활성 및 성공 피드백 → 새로고침 뒤 계속 비활성을 확인했다.

## 라우트 / 포커스 / 브라우저 근거

- Browser 플러그인으로 `http://127.0.0.1:5173`을 검증했다.
- 설정 → 일정 계산: URL `?view=plan&step=schedule`, H1 1개, H1 포커스, 안정화 후 `scrollY=0`.
- 일정 → 확인: URL `?view=plan&step=checks`, H1 1개, `배치하지 못한 과목` 포커스, `scrollY=0`.
- 뒤로가기: 일정 URL/H1/scrollY 0 복원.
- 앞으로가기: 확인 URL/H1/scrollY 0 복원.
- 새로고침: 확인 단계 URL/H1/공식 질문 원장 복원, 콘솔 error/warn 0.
- 데스크톱 일정: `grid-auto-flow: column`, 내부 `overflow-x: auto`, 문서 폭과 스크롤 폭 일치.
- 390px 검증: 브라우저 실측 content width 375px에서 문서 `clientWidth=scrollWidth=375`, 일정 `grid-auto-flow: row`, 학기 열 left 52px로 동일한 세로축, 경로 버튼 높이 48px, H1 1개, `scrollY=0`.
- 390px 확인: 문서 가로 넘침 없음, 경로 버튼 48px, 공식 링크 폭 327px로 화면 안에 유지.

## 변경 파일

- `src/features/planning/GraduationPlanSetup.tsx`
- `src/features/planning/GraduationPlanSetup.test.tsx`
- `src/features/planning/GraduationPlanResult.tsx`
- `src/features/planning/GraduationPlanResult.test.tsx`
- `src/features/planning/TermPlanColumn.tsx`
- `src/features/planning/OfficialCheckQuestions.tsx`
- `src/features/planning/UnplacedCourseList.tsx`
- `src/features/planning/GraduationPlanPrerequisite.tsx` (new)
- `src/styles/planner-planning.css` (new)
- `src/main.tsx`
- `src/App.tsx`
- `src/App.graduation-plan-integration.test.tsx`

## 자가 검토 및 남은 우려

- Task 9 소유 파일 밖의 계산·저장·스키마 파일은 변경하지 않았다.
- `.playwright-cli/`는 기존 미추적 상태 그대로 두었고 커밋 대상에 포함하지 않는다.
- 브라우저의 현재 저장 상태는 익명 선택전공 자리만 생성해 실제 명명 과목 스티커가 보이는 일정 스크린샷은 만들지 못했다. 실제 과목명, 이력 배지, 선택전공 자리 분리는 엔진 실데이터 fixture를 쓰는 컴포넌트 테스트로 검증했다.
- 긴 브라우저 이력 검증을 한 호출로 묶었을 때 한 차례 제한시간이 발생했다. 재연결 후 뒤로·앞으로·새로고침을 분리 실행해 각각 통과했다.

## Fix Round 1 — Important Findings

### RED / GREEN

- RED: `pnpm.cmd exec vitest run src/App.graduation-plan-integration.test.tsx src/features/planning/GraduationPlanResult.test.tsx`
  - 6 failed / 49 passed.
  - 준비 항목에 명시적 `ready/pending/not-applicable` 상태가 없고, review code가 evidence보다 우선해 잘못된 라벨을 만드는 지점에서 실패했다.
- GREEN: 같은 App/result 집중 테스트 55 passed.
- 계획 화면 최종 집중 회귀: setup/result/App 3 files / 64 tests passed.
- 최종 전체 회귀: 44 files / 522 tests passed.
- 최종 빌드: `tsc --noEmit && vite build` passed, 1,766 modules transformed.

### 1. 준비 상태 진실성

- App이 세 상태를 명시적으로 계산한다.
  - profile: 프로필 존재 시에만 `ready`.
  - courses: 프로필과 `courseInputReviewedAt`이 모두 있을 때만 `ready`.
  - target: 프로필이 없으면 `pending`; track-major는 실제 목표 트랙 유무에 따라 `ready/pending`; 다른 경로는 `not-applicable`.
- `not-applicable`은 ready 색이나 완료 아이콘을 쓰지 않고 `적용 대상 아님` 및 별도 muted 상태로 표시한다.
- 통합 fixture:
  - empty: profile/courses/target 모두 pending.
  - minor + unreviewed: profile ready, courses pending, target not-applicable.
  - track-major + missing target: profile/courses ready, target pending.
  - ready track-major: 준비 경계를 건너뛰고 setup H1로 진입.
  - 프로필 없이 과목 검토 시각만 남은 레거시 상태도 courses pending.

### 2. 검토 근거 라벨

- review code 분기를 제거하고 `item.evidence`만으로 표시 상태와 라벨을 결정한다.
  - `official-public` → `official-public-confirmed` / `공식 공개 확인`.
  - `provided-final-plan` → `provided-final-plan-reference` / `제공 최종안 참고`.
  - `official-review-required` → `department-confirmation-required` / `학과 확인 필요`.
  - `project-derived` → `project-derived` / `서비스 참고 계산`.
- exact fixture로 future-offering/official-review-required, seasonal-term/project-derived, elective-placeholder/project-derived, rule-source/provided-final-plan, unknown-course/official-public 조합을 검증했다.
- future-offering이 official-review-required인 fixture에서 historical snapshot 라벨이 나타나지 않는 것을 검증했다.

### 3. H1 포커스 가시성

- plan H1의 blanket `outline: 0`을 제거하고 `2px solid` 학과 초록 outline, `5px` offset, mint 배경을 적용했다.
- Browser 실측:
  - 빈 prerequisite: activeElement `H1`, outline `solid 2px rgb(8, 122, 88)`, background `rgba(221, 243, 232, 0.38)`, scrollY 0.
  - schedule → checks: checks activeElement `H1` (`배치하지 못한 과목`), 같은 outline/background, scrollY 0.
  - checks DOM에서 `provided-final-plan-reference / 제공 최종안 참고`와 `project-derived / 서비스 참고 계산`을 함께 확인했다.
  - 빈 상태는 세 항목 pending, 실제 UI로 만든 minor + unreviewed 상태는 target `not-applicable / 목표 트랙 적용 대상 아님`을 확인했다.
  - 브라우저 console error/warn 0.
- Browser가 처음 선택한 Chrome 창에서 session grouping과 새 탭 생성이 지원되지 않아, 문서화된 방식으로 열린 `about:blank` 탭을 claim해 동일 로컬 URL을 검증했다. 기능 검증 범위에는 영향이 없었다.
