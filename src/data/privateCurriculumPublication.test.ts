import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PROVIDED_TRACK_CURRICULUM } from "./departmentService";

describe("private curriculum publication boundary", () => {
  it("keeps the supplied reference identifiable but not downloadable", () => {
    expect(PROVIDED_TRACK_CURRICULUM.url).toBeNull();
    expect(PROVIDED_TRACK_CURRICULUM.pageCount).toBe(6);
    expect(PROVIDED_TRACK_CURRICULUM.sha256).toBe("c0fe9390fcec59790fbb5a429dc2bec65a0030199176b19c5a9e49c205a7d5fc");
  });
  it("has no raw supplied PDF in public assets and excludes accidental copies from both publishing paths", () => {
    const path = "public/documents/2026-ere-module-track-curriculum.pdf";
    expect(existsSync(path)).toBe(false);
    expect(readFileSync(".gitignore", "utf8")).toContain(path);
    expect(readFileSync(".vercelignore", "utf8")).toContain(path);
    expect(readFileSync(".vercelignore", "utf8")).toContain("dist");
  });
});
