import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EvidenceState } from "../data/evidenceSources";
import { EvidenceBand } from "./EvidenceBand";

describe("EvidenceBand", () => {
  it.each<[EvidenceState, string]>([
    ["official-public-confirmed", "공식 공개 확인"],
    ["historical-2026-snapshot", "2026 개설 이력"],
    ["provided-final-plan-reference", "제공 최종안 참고"],
    ["department-confirmation-required", "학과 확인 필요"],
  ])("states %s explicitly as %s", (state, label) => {
    const markup = renderToStaticMarkup(<EvidenceBand state={state} />);

    expect(markup).toContain(label);
    expect(markup).toContain(`data-evidence-state="${state}"`);
  });
});
