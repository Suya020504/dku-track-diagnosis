import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CourseModuleTrackFigure } from "./CourseModuleTrackFigure";

describe("CourseModuleTrackFigure", () => {
  it("teaches one true course to module to tracks relationship without claiming completion", () => {
    const markup = renderToStaticMarkup(<CourseModuleTrackFigure />);

    expect(markup).toContain("식품유통경제학");
    expect(markup).toContain("F. 유통무역");
    expect(markup).toContain("푸드마케팅");
    expect(markup).toContain("농식품유통");
    expect(markup).toContain("푸드바이오경제");
    expect(markup).toContain("연결 관계를 설명하는 예시");
    expect(markup).toContain("공식 이수 완료 판정이 아닙니다");
    expect(markup.match(/class="planner-track-glyph/g)).toHaveLength(3);
    expect(markup).not.toContain("이수 확정");
    expect(markup).not.toContain("졸업 가능");
  });
});
