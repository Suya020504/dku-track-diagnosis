# 단국대학교 식품자원경제학과 트랙제 자가진단

2026학년도 식품자원경제학과 모듈형 트랙제 교육과정 기준으로, 수강한 과목과 관심 트랙에 따라 부족 모듈, 남은 학점, 추천 과목을 확인하는 정적 웹앱입니다.

## 실행

```bash
pnpm install
pnpm run dev
```

## 검증

```bash
pnpm run test
pnpm run build
```

## Vercel 배포 설정

- Framework Preset: `Vite`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm run build`
- Output Directory: `dist`
- Development Command: `pnpm run dev`

위 설정은 `vercel.json`에도 고정되어 있습니다.
