import { DEPARTMENT_CONTACT_URL, DEPARTMENT_CURRICULUM_URL } from "./officialResources";

/** A supplied document is a calculation reference, not proof of institutional approval. */
export const PROVIDED_TRACK_CURRICULUM = {
  title: "제공된 2026 트랙 교육과정 PDF",
  originalFileName: "2. 2026학년도 식품자원경제학과 모듈형 트랙제 교육과정 (1).pdf",
  url: null,
  availability: "private-reference",
  availabilityLabel: "제공자료 · 원문 비공개",
  sharingNotice: "교육과정 확인을 위해 제공된 자료로, 원문 파일은 이 사이트에서 공개하지 않습니다.",
  academicYear: 2026,
  pageCount: 6,
  receivedAt: "2026-09-08",
  publishedAt: null,
  approvalStatus: "not-verified",
  sha256: "c0fe9390fcec59790fbb5a429dc2bec65a0030199176b19c5a9e49c205a7d5fc",
  pageGuide: [
    { pages: "2쪽", content: "모듈별 과목과 학점" },
    { pages: "3쪽", content: "다섯 트랙의 모듈 구성" },
    { pages: "4–5쪽", content: "이수 경로별 기준과 운영 예시" },
    { pages: "6쪽", content: "학년·학기별 교육과정표" },
  ],
  boundary: "공식 승인 여부나 개인별 적용이 확정됐다는 뜻은 아닙니다.",
} as const;

export const DEPARTMENT_SUPPORT = {
  name: "식품자원경제학과 사무실",
  phone: "041-550-3610",
  phoneUrl: "tel:0415503610",
  contactUrl: DEPARTMENT_CONTACT_URL,
  curriculumUrl: DEPARTMENT_CURRICULUM_URL,
  checkedAt: "2026-09-08",
  serviceBoundary: "학과 공개·제공 자료를 바탕으로 안내합니다. 개인별 적용과 최종 이수 인정은 학과에서 확인해 주세요.",
} as const;

export const DEPARTMENT_INQUIRY_CHECKLIST = [
  { id: "profile", title: "내 소속과 이수 경로", description: "학과 입학생인지 타 학과 학생인지, 심화전공·트랙전공·복수전공·부전공 중 어떤 경로인지 정리해 주세요." },
  { id: "year", title: "내 입학 연도에 적용되는 기준", description: "입학 연도와 현재 학년을 기준으로 어떤 교육과정을 적용받는지 물어보세요." },
  { id: "track", title: "관심 트랙과 지금까지 들은 과목", description: "확인하려는 트랙 이름과 완료한 과목 목록을 준비하면 남은 조건을 함께 살펴보기 좋습니다." },
  { id: "recognition", title: "대체·중복 인정이 필요한 과목", description: "이름이 바뀐 과목, 타 학과 과목, 현장실습 등 별도 인정이 필요한 항목을 적어 두세요." },
  { id: "application", title: "신청 기간과 방법", description: "올해 신청 대상과 기간, 신청하는 곳, 제출 자료와 승인 절차를 확인해 주세요." },
  { id: "record", title: "이수 후 증명서 표기", description: "트랙명이 어떤 증명서에 표시되는지, 별도로 신청할 일이 있는지 확인해 주세요." },
] as const;
