import { describe, expect, it } from "vitest";
import { buildAppHref, resolveAppRoute } from "./appRouting";
import { createEmptyAppState } from "./storage";

describe("video guide and optional interactive example routing", () => {
  it("keeps the original shared example URL as the default video guide", () => {
    expect(resolveAppRoute("?view=example", createEmptyAppState())).toEqual({ view: "example" });
    expect(resolveAppRoute("?view=example&mode=unknown", createEmptyAppState())).toEqual({ view: "example" });
  });

  it("preserves explicit interactive mode through a shared URL", () => {
    const route = resolveAppRoute("?view=example&mode=interactive", createEmptyAppState());
    expect(route).toEqual({ view: "example", mode: "interactive" });
    expect(buildAppHref("https://local.invalid/?utm_source=mail", route))
      .toBe("/?utm_source=mail&mode=interactive&view=example");
  });

  it("removes example mode when returning to the video guide or another screen", () => {
    const current = "https://local.invalid/?view=example&mode=interactive&utm_source=mail";
    expect(buildAppHref(current, { view: "example" })).toBe("/?view=example&utm_source=mail");
    expect(buildAppHref(current, { view: "landing" })).toBe("/?utm_source=mail");
    expect(buildAppHref(current, { view: "track-guide", section: "overview" }))
      .toBe("/?view=track-guide&utm_source=mail&section=overview");
  });
});
