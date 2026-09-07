/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const courseStyles = readFileSync(new URL("./planner-courses.css", import.meta.url), "utf8");

describe("course ledger responsive contract", () => {
  it("keeps course rows compact without a side diagnosis column", () => {
    expect(courseStyles).toMatch(/\.course-ledger\s*\{[\s\S]*?container-type:\s*inline-size;/);
    expect(courseStyles).toMatch(/container-name:\s*course-ledger;/);
    expect(courseStyles).toMatch(
      /\.course-ledger-row-primary\s*\{[\s\S]*?grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\)/,
    );
    expect(courseStyles).toMatch(/\.course-ledger-group\s*>\s*summary/);
  });
});
