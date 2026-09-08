import { describe, expect, it } from "vitest";
import { buildAppHref, resolveAppRoute } from "./appRouting";
import { createEmptyAppState } from "./storage";

describe("optional service routes", () => {
  it("opens records without a current diagnosis and preserves a missing record for recovery", () => {
    expect(resolveAppRoute("?view=records&record=old%20record", createEmptyAppState()))
      .toEqual({ view: "records", recordId: "old record" });
    expect(resolveAppRoute("?view=records", createEmptyAppState())).toEqual({ view: "records" });
  });
  it("clears stale diagnosis parameters and carries only the selected record", () => {
    const href = buildAppHref("http://local/?view=diagnosis&step=courses&profile=path&section=current&record=old&guide=off", { view: "records", recordId: "saved 1" });
    expect(href).toBe("/?view=records&guide=off&record=saved+1");
    expect(buildAppHref(`http://local${href}`, { view: "contact" })).toBe("/?view=contact&guide=off");
  });
  it("keeps application guidance optional and directly addressable", () => {
    expect(resolveAppRoute("?view=track-guide&section=application", createEmptyAppState()))
      .toEqual({ view: "track-guide", section: "application" });
  });
});
