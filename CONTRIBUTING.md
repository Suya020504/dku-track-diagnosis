# 협업 및 커밋 지침

이 저장소는 학생들이 직접 사용할 수 있는 자가진단 도구를 목표로 합니다. 기능을 추가할 때는 코드뿐 아니라 변경 이유와 검증 결과가 남아야 합니다.

## 작업 전 확인

- `README.md`에서 프로젝트 목적과 실행 방법을 확인합니다.
- 트랙, 모듈, 과목 데이터 변경은 `src/data/curriculumData.ts`를 우선 확인합니다.
- 진단 계산 변경은 `src/lib/diagnosis.ts`와 테스트 파일을 함께 봅니다.

## 커밋 메시지 기준

커밋 메시지는 협업자가 목록만 봐도 변경 의도를 알 수 있게 작성합니다.

좋은 예:

- `Add semester-based lab feasibility check`
- `Document Vercel deployment settings`
- `Fix duplicate track module recommendation`

피해야 할 예:

- `update`
- `fix`
- `final`
- `수정`

## 변경 기록 기준

기능, 데이터, 배포, 화면 구조가 바뀌면 `CHANGELOG.md`에 다음 내용을 남깁니다.

- 변경 목적
- 핵심 변경 사항
- 확인한 테스트 또는 브라우저 검증
- 남은 주의사항

## PR 또는 변경 요청 체크리스트

- 테스트를 실행했는가?
- 빌드가 성공했는가?
- 모바일/데스크톱에서 글자 겹침이나 overflow가 없는가?
- 학생이 보는 문구가 너무 길거나 모호하지 않은가?
- 공식 PDF 기준과 다를 수 있는 내용은 주의 문구를 남겼는가?
- README나 변경 기록 업데이트가 필요한가?

## 배포 전 확인

```bash
pnpm run test
pnpm run build
```

Vercel 설정은 `vercel.json`과 README의 배포 설정을 기준으로 맞춥니다.
