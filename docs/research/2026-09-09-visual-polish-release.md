# 디자인 마감·첫 방문 안내 릴리스

사용자 요청: 이전 디자인 변경, 첫 방문 안내·명암비 수정, 헤더 로고/현재 위치 개선을 GitHub에 올리고 운영 재배포. 업로드 전 추가 브라우저 피드백(안내 버튼 통합, 홈 제목 ‘트랙’ 색 강조, 모든 페이지 파스텔 배경)을 먼저 반영했다.

## 구현·로컬 검증

- 기존 미완료 변경과 원문을 보존했다. 새 런타임 이미지 WebP2개·아이콘·가이드/설문/과목/결과/계획/보관함 디자인이 포함된다.
- 홈 안내 버튼 하나 → 트랙제 알아보기 overview. 로고 링크 → 홈. 기존 입력과 보관 기록은 유지한다.
- 첫 방문 안내·명암비·저장 및 3분기 실사용 검수는 [상세 검수](2026-09-09-first-visit-final-qa.md)에 있다.
- 최종 전체 검사: **99파일 971개 테스트 PASS**, 29.06초. `npm.cmd test -- --reporter=dot`, 로그 `tmp/release-final-tests.log`.
- TypeScript 및 Vite 빌드 PASS. 주 JS598.92kB, CSS338.17kB. 기존 주 청크500kB 경고 유지. `tmp/release-final-build.log`.
- 데스크톱에서 9개 서비스 구간의 10개 경로(홈, 가이드, 내 정보, 과목, 결과, 추천, 계획, 자료, 문의, 보관함)를 실제 로드하여 그라데이션 적용, 페이지 가로 넘침0, 깨진 이미지0 확인.
- 모바일390px 홈 실제 화면에서 제목 강조·단일 안내 버튼·로고 옆 현재 화면명 확인. 통합 안내 클릭 후 ‘트랙제 알아보기’ 제목/overview URL, 로고 클릭 후 홈 복귀 확인.
- 새 그라데이션은 screen에만 적용한다. 배경 위 대표 보조 글자의 색상쌍 계산 최저4.56:1. 실물 기기·실제 인쇄 및 모든 상태의 WCAG 전체 감사는 미실행.
- 독립 읽기 전용 릴리스 리뷰에서 P0/P1 발견 없음. 비공개 PDF/HWP 원문은 Git 추적 및 public/dist에 없음.
- 검토용 새 시안 폴더는 .vercelignore에서 제외해 배포 소스 업로드 범위를 줄였다. 실제 경량 WebP는 포함한다.

## 배포

- 기능 커밋: `74ac6bd816e8e7c902ae2e3859d7b7ca7a7b8040`. GitHub `codex/track-service-expansion` 브랜치에 업로드했고 원격 SHA 일치를 확인했다.
- Vercel 배포: `dpl_ADTErLfwe2UVo3f4LUVWZgQDTmMY`, 상태 READY. 새 배포 주소는 `https://dku-track-diagnosis-peey6l4ut-startlink0504.vercel.app`.
- `vercel deploy --prod --skip-domain --yes`로 생성 후 새 주소에서 검수하고 `vercel promote` 성공을 확인했다. 운영 주소는 `https://dku-track-diagnosis.vercel.app`.
- 새 주소에서 첫 안내 자동 표시 → 확인 → 새로고침 재노출 없음, 390px 홈의 그라데이션/‘트랙’ 색/안내 버튼1개, 안내 클릭→overview, 로고 클릭→홈을 실제 확인했다. 콘솔 error/warn0건.
- 운영에서도 통합 안내→‘트랙제 알아보기’/overview, 로고→홈, 390px 넘침0·깨진 이미지0·안내버튼1개 확인. 운영의 기존 입력을 수정·삭제하지 않았다.
- 운영 HTML의 `index-y2RPYmJy.js` 및 `index-CvD2kZVK.css`가 새 배포 출력과 일치한다. 원격 빌드 Vite7.3.6과 로컬7.3.5 차이로 JS 해시는 로컬과 다르지만 CSS와 실제 동작·배포본을 대조했다.
- HTTP 홈200, 새 WebP2개200, 비공개 PDF 원래 경로404, 내부 릴리스 문서 경로404. 원문·실제 학생 파일은 업로드하지 않았다.
- 이후 문서 전용 커밋은 이 운영 검증 기록을 보존한다. 런타임 소스는 위 기능 커밋과 동일하다.
