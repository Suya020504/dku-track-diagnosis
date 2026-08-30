import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TrackId } from "../types";
import { TrackGlyph } from "./TrackGlyph";

describe("TrackGlyph", () => {
  it.each<[TrackId, string, string]>([
    ["food-marketing", "푸드마케팅 트랙", "lucide-shopping-cart"],
    ["regional-development-consulting", "지역개발 및 컨설팅 트랙", "lucide-map-pinned"],
    ["agri-food-distribution", "농식품유통 트랙", "lucide-truck"],
    ["economics", "경제학 트랙", "lucide-chart-no-axes-combined"],
    ["food-bio-economy", "푸드바이오경제 트랙", "lucide-dna"],
  ])("renders the stable %s identity marker with its accessible name", (trackId, label, iconClass) => {
    const markup = renderToStaticMarkup(<TrackGlyph trackId={trackId} />);

    expect(markup).toContain('role="img"');
    expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain(iconClass);
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
