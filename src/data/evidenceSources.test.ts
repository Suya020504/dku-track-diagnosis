import { describe, expect, it } from "vitest";
import { EVIDENCE_SOURCES, getEvidenceSource } from "./evidenceSources";

describe("planner evidence sources", () => {
  it("keeps the four non-interchangeable evidence boundaries available", () => {
    expect(Object.keys(EVIDENCE_SOURCES)).toEqual([
      "official-public-confirmed",
      "historical-2026-snapshot",
      "provided-final-plan-reference",
      "department-confirmation-required",
    ]);
  });

  it("does not treat a 2026 offering snapshot as a future offering guarantee", () => {
    expect(getEvidenceSource("historical-2026-snapshot")).toMatchObject({
      label: "2026 개설 이력",
      allowsFutureOfferingGuarantee: false,
    });
  });
});
