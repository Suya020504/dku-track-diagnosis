// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeCss = readFileSync("src/styles/planner-home.css", "utf8");
const courseCss = readFileSync("src/styles/planner-courses.css", "utf8");
const tokenCss = readFileSync("src/styles/planner-tokens.css", "utf8");

type Rgb = readonly [number, number, number];

function parseColor(value: string): Rgb {
  const normalized = value.trim();
  const hex = normalized.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  const rgb = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  throw new Error(`Unsupported color: ${value}`);
}

function luminance([red, green, blue]: Rgb) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(parseColor(foreground));
  const backgroundLuminance = luminance(parseColor(background));
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function installStyles() {
  document.head.innerHTML = `<style>${tokenCss}\n${homeCss}\n${courseCss}</style>`;
}

function cssVariable(element: Element, name: string) {
  return getComputedStyle(element).getPropertyValue(name).trim();
}

function resolvedColor(element: Element, variableScope: Element) {
  const computed = getComputedStyle(element).color.trim();
  const variable = computed.match(/^var\((--[^)]+)\)$/)?.[1];
  return variable ? cssVariable(variableScope, variable) : computed;
}

describe("planner small-text contrast", () => {
  it("keeps home step and track metadata at WCAG AA small-text contrast", () => {
    installStyles();
    document.body.innerHTML = `
      <main class="track-home">
        <span class="track-home__step-index">1</span>
        <ol class="track-home__steps"><li><p>나에게 적용할 이수 기준을 고릅니다.</p></li></ol>
        <span class="track-home__track-number">01</span>
        <span class="track-home__track-title"><small>학과전공</small></span>
      </main>
    `;
    const home = document.querySelector(".track-home")!;
    const mint = cssVariable(home, "--home-mint");
    const white = "#ffffff";
    const targets = [
      document.querySelector(".track-home__step-index")!,
      document.querySelector(".track-home__steps p")!,
      document.querySelector(".track-home__track-number")!,
      document.querySelector(".track-home__track-title small")!,
    ];

    for (const target of targets) {
      const color = resolvedColor(target, home);
      expect(contrastRatio(color, mint)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, white)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the PDF optional label at WCAG AA small-text contrast", () => {
    installStyles();
    document.body.innerHTML = `
      <div class="planner-app">
        <div class="planner-course-selection-view">
          <span class="pdf-import-toggle-copy"><small>선택 사항</small></span>
        </div>
      </div>
    `;
    const app = document.querySelector(".planner-app")!;
    const label = document.querySelector(".pdf-import-toggle-copy small")!;
    const color = resolvedColor(label, app);

    expect(contrastRatio(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
