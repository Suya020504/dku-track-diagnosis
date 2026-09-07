// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { modules } from "../../data/curriculumData";
import { ModuleReferenceView } from "./ModuleReferenceView";

let root: Root | undefined;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
});

describe("ModuleReferenceView", () => {
  it("keeps all modules available while opening only the first disclosure by default", () => {
    const markup = renderToStaticMarkup(<ModuleReferenceView />);

    expect(markup.match(/data-module-disclosure=/g)).toHaveLength(modules.length);
    expect(markup.match(/<details[^>]* open=""/g)).toHaveLength(1);
    expect(markup).toContain("A. 학문기초(교양)");
    expect(markup).toContain("O. 식품공학");
  });

  it("opens one module at a time", async () => {
    const host = document.querySelector<HTMLDivElement>("#root");
    if (!host) throw new Error("Missing root host");
    root = createRoot(host);
    await act(async () => root?.render(<ModuleReferenceView />));

    const moduleA = document.querySelector<HTMLDetailsElement>('[data-module-disclosure="A"]');
    const moduleB = document.querySelector<HTMLDetailsElement>('[data-module-disclosure="B"]');
    expect(moduleA?.open).toBe(true);
    expect(moduleB?.open).toBe(false);

    await act(async () => moduleB?.querySelector("summary")?.click());

    expect(moduleA?.open).toBe(false);
    expect(moduleB?.open).toBe(true);
  });
});
