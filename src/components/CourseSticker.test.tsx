import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EvidenceState } from "../data/evidenceSources";
import { CourseSticker } from "./CourseSticker";

describe("CourseSticker", () => {
  it.each<[EvidenceState, string]>([
    ["official-public-confirmed", "공식 공개 확인"],
    ["historical-2026-snapshot", "2026 이력 스냅샷"],
    ["provided-final-plan-reference", "제공 최종안 참고"],
    ["department-confirmation-required", "학과 확인 필요"],
  ])("keeps the %s evidence state visible in the planner row", (evidenceState, label) => {
    const markup = renderToStaticMarkup(
      <CourseSticker
        courseName="농산물유통론"
        moduleLabel="유통 모듈"
        evidenceState={evidenceState}
      />,
    );

    expect(markup).toContain("농산물유통론");
    expect(markup).toContain("유통 모듈");
    expect(markup).toContain(`근거: ${label}`);
  });
});
