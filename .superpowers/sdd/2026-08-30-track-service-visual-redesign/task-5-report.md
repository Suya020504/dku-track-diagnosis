# Task 5 Report — Interest And Profile One-Decision Entry

## Outcome

- 관심 설문을 한 문항, `N / 10`, native 1–5 radio scale, 이전/다음, 로컬 저장 상태, 건너뛰기 구조로 재설계했다.
- 결과는 상위 3개 트랙을 실제 `TrackGlyph`와 함께 보여주며, 공동 상위/상위권을 텍스트로 구분하고 학생이 직접 트랙을 선택하게 유지했다.
- 프로필을 URL-controlled `affiliation` / `path` 두 단계로 분리했다. 각 단계는 하나의 H1과 하나의 주 동작만 가지며, 미완료 값은 `profileDraft`에 남고 최종 동작만 `onComplete`를 한 번 호출한다.
- `profile=path`에 소속 없이 진입하면 명시적인 복구 안내와 소속 단계 이동 버튼을 제공한다.

## RED / GREEN

### RED

- 설문 테스트: 기존 다섯 버튼에는 native radio가 없어 1–5 radio 기대가 실패했고, 결과에 실제 트랙 glyph/공동 상위 표기가 없어 실패했다.
- 프로필 테스트: `ProfileFlow`가 없었고, 기존 화면은 두 단계 DOM을 동시에 보유해 affiliation-only 계약, direct path 복구, 최종 완료 1회 계약이 실패했다.
- 재로딩 회귀 테스트: 완료 프로필이 미완료 `profileDraft`를 덮어 external 소속에 이전 `advanced-major`가 섞이는 실패를 재현했다.
- 비호환 경로 테스트: 완료는 막혔지만 상태 문구가 허용되지 않은 경로를 사용한다고 표시하는 실패를 재현했다.
- 기존 브라우저 통합 테스트는 설문 버튼과 기본 프로필 화면의 숨겨진 path DOM을 전제로 해 각각 실패했다.

### GREEN

- Task 5 집중 테스트: 9 files / 158 tests passed.
- 최종 전체 테스트: 41 files / 481 tests passed.
- 최종 빌드: `tsc --noEmit && vite build` passed, 1,752 modules transformed.
- `git diff --check`: whitespace error 없음. 줄바꿈 변환 경고만 확인했다.

## Route / Focus / Keyboard / Reload Smoke

- Desktop 1280×900:
  - 빈 상태의 `?view=diagnosis&step=profile&profile=path`에서 복구 안내가 렌더링되고, 복구 버튼으로 `profile=affiliation` URL이 갱신됐다.
  - 단계 이동마다 활성 H1이 programmatic focus를 받았다.
  - 키보드만으로 소속 radio 선택 → 다음 → 경로 radio 선택 → 최종 완료를 수행했고 `?view=diagnosis&step=courses`로 이동했다.
- Mobile 390×844:
  - 관심 척도를 Tab + ArrowRight로 선택하고 다음으로 이동해 `2 / 10`을 확인했다. 새로고침 후에도 `2 / 10`, 답변 1개, H1 focus가 복원됐다.
  - 완료 프로필을 수정해 external 소속 초안을 만든 뒤 `profile=path`를 새로고침했다. 복수전공/부전공/트랙형전공만 노출되고 경로 미선택 상태가 정확히 복원됐다.
  - 수평 overflow 없음(`document/body width 375 <= innerWidth 390`). 페이지 끝에서 관심 skip과 프로필 action 영역 모두 고정 하단 내비와 겹치지 않았다(`overlap: false`).
  - browser console error 0.

## Files

- Product:
  - `src/features/recommendations/InterestSurvey.tsx`
  - `src/features/profile/ProfileFlow.tsx`
  - `src/features/profile/AffiliationStep.tsx`
  - `src/features/profile/StudyPathStep.tsx`
  - `src/features/profile/StudyPathSetup.tsx`
  - `src/styles/planner-entry.css`
  - `src/App.tsx`
  - `src/main.tsx`
- Tests:
  - `src/features/recommendations/InterestSurvey.test.tsx`
  - `src/features/profile/ProfileFlow.test.tsx`
  - `src/features/profile/StudyPathSetup.test.tsx`
  - `src/App.profile-transition.test.tsx`
  - `src/App.recommendation-dom.test.tsx`
  - `src/App.result-integration.test.tsx`

## Self-review

- 점수 계산, 질문/가중치, close-match 기준, 저장 schema, 트랙 선택 transition은 변경하지 않았다.
- `ProfileFlow`는 하나의 draft만 소유하고 URL 단계는 App callback에 위임한다. draft가 존재하면 마지막 완료 프로필보다 우선하며, 최종 완료 뒤 기존 `completeProfileTransition`이 draft를 제거한다.
- 최종 제출은 ref guard로 중복 호출을 막는다. affiliation/path 입력 변경은 `onChange`만 호출한다.
- native radio/fieldset/label, 44px 이상 hit area, 초록 focus ring, 텍스트가 포함된 상태 표기를 확인했다.
- React 검토: 컴포넌트 내부 선언 없음, 정적 label map은 module scope, effect dependency는 primitive question index/completion time으로 제한해 첫 답변 선택 때 focus를 빼앗지 않는다.

## Plan deviations and concerns

- 승인된 호환 테스트 수정 1: `App.recommendation-dom.test.tsx`의 이전 `4그렇다` 버튼 클릭을 native radio `value="4"` 선택으로 변경했다. 가짜 숨김 버튼은 추가하지 않았다.
- 승인된 호환 테스트 수정 2: `App.result-integration.test.tsx`의 path 전용 기대 URL에 `profile=path`를 추가했다. affiliation 화면에 path 필드를 다시 노출하지 않았다.
- 입학연도는 기존 계약대로 선택 입력이며, 2000–2026 native 범위를 유지했다.
- 의존성 추가 없음. untracked `.playwright-cli/`는 지시대로 삭제·수정·커밋하지 않는다.
