# 2026 요구사항 시나리오 오라클

이 표는 학생 소속과 이수 경로를 분리해 현재 입력에 대한 계산 결과와 공식 확인 필요 여부를 고정한다. `reference-only` 값은 제공된 최종안에 따른 참고 계산이며 공식 졸업 판정이 아니다.

| ID | Profile | Input summary | Expected result | Evidence |
|---|---|---|---|---|
| ADV-60 | 학과·심화·reference-only | 필수 18, 전공 60 | incomplete | PDF p.4 |
| ADV-63 | 학과·심화·reference-only | 필수 18, 전공 63 | reference-calculation-satisfied + review | PDF p.4 |
| MIN-21 | 타학과·부전공 | 전공 21 | current-input-satisfied | PDF p.5 |
| EXT-ECO | 타학과·트랙·경제학 | 트랙 30, 밖 필수 18 | 48 + official-review-required | PDF p.5 contradiction |
| DMO-42 | 학과·다전공·reference-only | 필수 18, 고유 전공 42 | reference-calculation-satisfied + review | PDF p.4 |
| DBL-42 | 타학과·복수·reference-only | 필수 18, 고유 전공 42 | reference-calculation-satisfied + review | PDF p.5 |
| MAJ-29 | 학과·푸드마케팅 | 한 모듈 3, 총 트랙 30 | track incomplete | PDF p.4 |
| MAJ-63 | 학과·푸드마케팅 | 모듈 조건 30, 전체 63 | reference-calculation-satisfied + review | PDF p.4 |
| BIO-BASE | 학과·푸드바이오 | F/H/I 합계 15, H 0 | track incomplete | PDF p.4 |
| BIO-M | 학과·푸드바이오 | M 6 | track incomplete | PDF p.4 |
| BIO-NO | 학과·푸드바이오 | N+O 5 | track incomplete | PDF p.4 |
| BIO-30 | 학과·푸드바이오 | F/H/I 개별·합계, M8, N+O7 | track satisfied | PDF p.4 |
| EXT-FM | 타학과·푸드마케팅 트랙 | 트랙30 + 밖 필수12 | 42 + review | PDF p.5 |
| EXT-REG | 타학과·지역개발 트랙 | 트랙30 + 밖 필수15 | 45 + review | PDF p.5 |
| DUP-ID | 임의 | 같은 완료 과목 ID 2회 | 한 번만 합산 | 계산 계약 |
| A-EXCLUDE | 임의 | A모듈 12 + 전공 9 | 전공 9만 합산 | 교육과정 영역 |
| PLAN-EXCLUDE | 임의 | 완료3 + 수강중3 + 예정3 | 현재 완료 3 | 상태 계약 |
| UNKNOWN | 임의 | unknown-101 완료 입력 | review item + 0학점 | 신뢰 계약 |

## 출처 및 판정 경계

- PDF 4~5쪽의 경로·트랙 조건을 계산 기준으로 사용한다.
- PDF 5쪽과 경제학 트랙의 외부 필수 과목 해석이 충돌하므로 해당 결과는 `official-review-required`로 남긴다.
- 과목 ID가 중복되거나 미등록이면 입력 신뢰성 검토 항목으로 분리하며, 미등록 과목은 학점 0으로 계산한다.
