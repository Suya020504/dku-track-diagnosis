import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CourseSticker } from "./CourseSticker";

describe("CourseSticker", () => {
  it("keeps the course evidence state visible in the planner row", () => {
    const markup = renderToStaticMarkup(
      <CourseSticker
        courseName="농산물유통론"
        moduleLabel="유통 모듈"
        evidenceState="historical-2026-snapshot"
      />,
    );

    expect(markup).toContain("농산물유통론");
    expect(markup).toContain("유통 모듈");
    expect(markup).toContain("근거: 2026 이력 스냅샷");
  });
});
