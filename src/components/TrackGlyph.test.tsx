import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TrackId } from "../types";
import { TrackGlyph } from "./TrackGlyph";

describe("TrackGlyph", () => {
  it.each<[TrackId, string]>([
    ["food-marketing", "푸드마케팅 트랙"],
    ["regional-development-consulting", "지역개발 및 컨설팅 트랙"],
    ["agri-food-distribution", "농식품유통 트랙"],
    ["economics", "경제학 트랙"],
    ["food-bio-economy", "푸드바이오경제 트랙"],
  ])("names the %s glyph for assistive technology", (trackId, label) => {
    const markup = renderToStaticMarkup(<TrackGlyph trackId={trackId} />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain(`aria-label="${label}"`);
  });

  it("hides decorative glyphs from assistive technology", () => {
    const markup = renderToStaticMarkup(
      <TrackGlyph trackId="food-marketing" decorative />,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain("aria-label=");
  });
});
