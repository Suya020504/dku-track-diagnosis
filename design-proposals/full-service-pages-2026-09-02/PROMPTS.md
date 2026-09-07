# 페이지별 이미지 생성 프롬프트 기록

## 공통 프롬프트

```text
Use case: ui-mockup
Asset type: Korean university track self-diagnosis web page, desktop 16:9 horizontal frontend reference
Style: pristine off-white paper, sky #DDF2FC, mint #DDF3E8, Dankook blue #174B82, department green #087A58, ink #14243A, wheat #F2C66D; matte editorial guidebook; Swiss rational sans; implementation-ready React UI
Brand: use the official DKU logo reference only as a compact header lockup; actual runtime uses public/dku-logo.png
Interaction: 44px controls, keyboard-focus-ready, one primary action, secondary actions visually quieter
Avoid: map, geographic routes, fake metrics, aggregate AI score, official completion claim, purple gradient, glassmorphism, watermark, invented logo, tiny unreadable text
```

## 01 홈

```text
Create a clean landing hero with the exact headline "어떤 트랙이 나한테 잘 맞을까?" and supporting line "관심 있는 분야와 지금까지 들은 과목을 바탕으로 확인해 보세요." Use a student desk, notebook, track tabs, leaves and wheat as the explanatory image. Primary CTA "내 트랙 확인하기"; secondary CTA "트랙제 먼저 알아보기". No map or route metaphor.
```

## 02 트랙제 알아보기

```text
Create an optional three-minute guide. Show Course cards -> Module folders -> Track direction, local tabs "왜 트랙제일까", "어떻게 구성될까", "5개 트랙", "공식 자료", and CTA "내 트랙 확인하기". Explain meaning before rules; no global journey ribbon.
```

## 03 관심 트랙 추천 설문

```text
Create an external-student survey state with affiliation context, 1/10 progress, one exact question, five large response choices, local save status and one next action. Department and external questions must not be mixed.
```

## 04 학생 유형·이수 경로

```text
Create a two-step profile page with current step "소속" and next step "이수 경로". Show separate department and external student radio rows, explain that next questions change by affiliation, and provide one "이수 경로 선택" action.
```

## 05 이수 과목 입력

```text
Create a responsive course ledger with search, grouping, grade/semester filters, four accurate sample rows, sticky summary, selected track "푸드마케팅", and CTA "진단 결과 확인하기". Direct selection is the default; PDF is optional. Rows must not overlap the summary.
```

## 06 상황별 시뮬레이션 결과

```text
Create a result page separating current reference status, required courses, track modules, total major credits, next courses, missing areas and official checks. Use cautious status language and one primary next-course CTA. Recommendation and target-term planning are secondary add-ons.
```

## 07 트랙 추천 비교

```text
Create independent "관심 기준" and "현재 과목 기준" panels, compare exactly five tracks, do not make an aggregate winner, and require the student to choose a track before continuing.
```

## 08 목표 학기 이수 가능성·플래너

```text
Create a four-semester reference plan with local tabs "일정", "확인", "조건 수정", input summary, named course stickers, anonymous elective slots, unplaced items, official checks and "계획 저장". Never state official possibility or guarantee future offerings.
```

## 09 공식 자료

```text
Create a reference page with only four local tabs: "트랙", "모듈", "교육과정", "공식 근거". Active page "모듈" shows grouped module rows and an official-source band. No academic journey ribbon or "현재 모듈" journey button.
```
