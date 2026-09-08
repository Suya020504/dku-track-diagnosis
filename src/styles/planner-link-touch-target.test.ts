// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const css = ["planner-resources.css", "planner-results.css", "planner-planning.css", "planner-shell.css"]
  .map((file) => readFileSync(`src/styles/${file}`, "utf8")).join("\n");

function install(markup: string) {
  document.head.innerHTML = `<style>${css}</style>`;
  document.body.innerHTML = markup;
}

afterEach(() => { document.head.innerHTML = ""; document.body.innerHTML = ""; });

describe("reference link touch areas", () => {
  it.each([
    '<div class="dku-resource-track-intro"><div><a href="#source">트랙 원문</a></div></div>',
    '<div class="dku-resource-scope-strip"><a href="#source">교육과정 원문</a></div>',
    '<ul class="dku-resource-source-list"><li><a href="#source">원문 열기</a></li></ul>',
    '<ul class="dku-resource-video-links"><li><a href="#source">안내 영상</a></li></ul>',
    '<div class="dku-resource-official-columns"><section><a href="#source">전체 영상</a></section></div>',
    '<aside class="dku-resource-contact"><a href="#source">학과 연락</a></aside>',
    '<details open class="dku-resource-method"><summary>방법</summary><a href="#source">공식 교시표</a></details>',
  ])("makes standalone resource links actually honor the touch-height floor: %s", (markup) => {
    install(`<div class="dku-resource-page">${markup}</div>`);
    const link = document.querySelector("a")!;
    const style = getComputedStyle(link);
    expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(["inline-flex", "flex", "block", "inline-block"]).toContain(style.display);
  });

  it.each(["planner-official-questions", "planner-check-ledger", "planner-official-links"])("keeps result %s source actions at 44px", (className) => {
    install(`<div class="dku-results-page"><section class="${className}"><ul><li><a href="#source">공식 원문</a></li></ul></section></div>`);
    const style = getComputedStyle(document.querySelector("a")!);
    expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(["inline-flex", "flex", "block", "inline-block"]).toContain(style.display);
  });

  it("enlarges the inline planner reference without adding a button background", () => {
    install('<div class="dku-plan-page"><form class="dku-plan-form"><div class="planner-evidence-band"><p>조건은 <a href="?view=resources">공식 자료 화면</a>에서 확인해 주세요.</p></div></form></div>');
    const style = getComputedStyle(document.querySelector("a")!);
    expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(style.display).toBe("inline-flex");
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps the short Home navigation label at least 44px wide", () => {
    install('<nav class="planner-shell-primary-nav"><button>홈</button></nav>');
    const style = getComputedStyle(document.querySelector("button")!);
    expect(Number.parseFloat(style.minWidth)).toBeGreaterThanOrEqual(44);
  });
});
