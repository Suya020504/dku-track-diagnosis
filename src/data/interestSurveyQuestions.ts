import type { InterestSurveyAudience, TrackId } from "../types";

export type InterestSurveyQuestion = {
  id: string;
  statement: string;
  weights: Partial<Record<TrackId, number>>;
};

const departmentQuestions: InterestSurveyQuestion[] = [
  {
    id: "dept-consumer-choice",
    statement: "식품 소비자가 어떤 상품을 선택하는지 분석하는 수업을 더 배우고 싶다.",
    weights: { "food-marketing": 1, "agri-food-distribution": 0.25 },
  },
  {
    id: "dept-brand-strategy",
    statement: "소비자 조사 결과를 식품 상품·브랜드 전략으로 발전시키는 프로젝트를 해 보고 싶다.",
    weights: { "food-marketing": 1, economics: 0.2 },
  },
  {
    id: "dept-regional-problem",
    statement: "농촌·지역 현장을 조사하고 지역 문제의 해결책을 제안하는 활동에 관심이 있다.",
    weights: { "regional-development-consulting": 1, economics: 0.25 },
  },
  {
    id: "dept-sustainable-policy",
    statement: "환경과 지역사회를 함께 고려한 정책·컨설팅 방안을 설계해 보고 싶다.",
    weights: { "regional-development-consulting": 1, "food-bio-economy": 0.2 },
  },
  {
    id: "dept-distribution-flow",
    statement: "농식품이 생산자에서 소비자에게 전달되는 유통 구조를 깊게 배우고 싶다.",
    weights: { "agri-food-distribution": 1, "food-marketing": 0.25 },
  },
  {
    id: "dept-supply-chain",
    statement: "가격·물류·재고 데이터를 비교해 농식품 공급망을 개선하는 일에 관심이 있다.",
    weights: { "agri-food-distribution": 1, economics: 0.25 },
  },
  {
    id: "dept-economic-data",
    statement: "경제이론과 데이터를 이용해 식품시장과 사회 현상을 분석하는 일이 흥미롭다.",
    weights: { economics: 1, "food-marketing": 0.15 },
  },
  {
    id: "dept-policy-evidence",
    statement: "정책 효과를 자료로 검증하고 대안을 비교하는 분석을 더 배우고 싶다.",
    weights: { economics: 1, "regional-development-consulting": 0.25 },
  },
  {
    id: "dept-food-science",
    statement: "식품·영양·바이오 지식을 산업과 경제 관점으로 함께 배우고 싶다.",
    weights: { "food-bio-economy": 1, "food-marketing": 0.2 },
  },
  {
    id: "dept-future-food",
    statement: "푸드테크·미래식품 분야의 사업과 산업 구조를 탐색하고 싶다.",
    weights: { "food-bio-economy": 1, "agri-food-distribution": 0.2 },
  },
];

const externalQuestions: InterestSurveyQuestion[] = [
  {
    id: "external-consumer-bridge",
    statement: "현재 전공의 지식이나 역량을 식품 소비자·시장 분석에 연결하고 싶다.",
    weights: { "food-marketing": 1, "agri-food-distribution": 0.25 },
  },
  {
    id: "external-product-bridge",
    statement: "데이터·콘텐츠·디자인·기술 역량을 식품 상품과 브랜드 기획에 활용하고 싶다.",
    weights: { "food-marketing": 1, economics: 0.2 },
  },
  {
    id: "external-regional-bridge",
    statement: "현재 전공을 활용해 농촌·지역사회 문제를 해결하는 프로젝트를 해 보고 싶다.",
    weights: { "regional-development-consulting": 1, economics: 0.25 },
  },
  {
    id: "external-policy-bridge",
    statement: "공공정책·환경·커뮤니티 관점과 식품자원경제를 결합하고 싶다.",
    weights: { "regional-development-consulting": 1, "food-bio-economy": 0.2 },
  },
  {
    id: "external-distribution-bridge",
    statement: "내 전공을 농식품 유통·물류·판매 과정과 연결해 보고 싶다.",
    weights: { "agri-food-distribution": 1, "food-marketing": 0.25 },
  },
  {
    id: "external-supply-bridge",
    statement: "무역·물류·가격·공급망 데이터를 보완 역량으로 배우고 싶다.",
    weights: { "agri-food-distribution": 1, economics: 0.25 },
  },
  {
    id: "external-economics-bridge",
    statement: "현재 전공에 경제이론과 정량 분석을 보완하고 싶다.",
    weights: { economics: 1, "food-marketing": 0.15 },
  },
  {
    id: "external-evidence-bridge",
    statement: "내 전공 분야의 시장이나 정책 효과를 경제 자료로 평가하고 싶다.",
    weights: { economics: 1, "regional-development-consulting": 0.25 },
  },
  {
    id: "external-bio-bridge",
    statement: "과학·공학·영양·보건 지식을 식품산업과 경제 분석에 연결하고 싶다.",
    weights: { "food-bio-economy": 1, "food-marketing": 0.2 },
  },
  {
    id: "external-future-food-bridge",
    statement: "디지털·바이오·푸드테크 역량을 미래 식품산업과 결합하고 싶다.",
    weights: { "food-bio-economy": 1, "agri-food-distribution": 0.2 },
  },
];

export const INTEREST_SURVEY_QUESTIONS: Record<
  InterestSurveyAudience,
  readonly InterestSurveyQuestion[]
> = {
  "department-student": departmentQuestions,
  "external-student": externalQuestions,
};

export function getInterestSurveyQuestions(audience: InterestSurveyAudience) {
  return INTEREST_SURVEY_QUESTIONS[audience];
}
