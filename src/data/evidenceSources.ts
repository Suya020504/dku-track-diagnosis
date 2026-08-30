export type EvidenceState =
  | "official-public-confirmed"
  | "historical-2026-snapshot"
  | "provided-final-plan-reference"
  | "department-confirmation-required";

export type EvidenceSource = {
  label: string;
  description: string;
  allowsFutureOfferingGuarantee: boolean;
};

export const EVIDENCE_SOURCES: Record<EvidenceState, EvidenceSource> = {
  "official-public-confirmed": {
    label: "공식 공개 확인",
    description: "공개된 학교 안내 자료에서 확인한 내용입니다.",
    allowsFutureOfferingGuarantee: false,
  },
  "historical-2026-snapshot": {
    label: "2026 이력 스냅샷",
    description: "2026년에 확인한 개설 이력이며, 이후 개설을 보장하지 않습니다.",
    allowsFutureOfferingGuarantee: false,
  },
  "provided-final-plan-reference": {
    label: "제공 최종안 참고",
    description: "사용자가 제공한 교육과정 최종안을 참고한 내용입니다.",
    allowsFutureOfferingGuarantee: false,
  },
  "department-confirmation-required": {
    label: "학과 확인 필요",
    description: "개별 이수와 최종 적용 여부는 학과에 확인해야 합니다.",
    allowsFutureOfferingGuarantee: false,
  },
};

export function getEvidenceSource(state: EvidenceState): EvidenceSource {
  return EVIDENCE_SOURCES[state];
}
