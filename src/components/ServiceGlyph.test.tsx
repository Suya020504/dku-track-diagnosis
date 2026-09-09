import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServiceGlyph, type ServiceGlyphKind } from "./ServiceGlyph";

describe("ServiceGlyph", () => {
  it.each<ServiceGlyphKind>(["tracks", "interest", "courses", "guide", "plan", "records", "profile"])("renders a decorative scalable %s glyph without duplicate names", kind => {
    const html = renderToStaticMarkup(<ServiceGlyph kind={kind}/>);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).not.toContain('role="img"');
  });
  it("supplies an explicit name only when used as meaningful standalone content", () => {
    expect(renderToStaticMarkup(<ServiceGlyph kind="plan" label="학기 계획"/>)).toContain('aria-label="학기 계획"');
  });
});
