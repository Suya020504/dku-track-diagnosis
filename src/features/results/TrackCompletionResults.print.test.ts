// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
afterEach(() => { document.head.innerHTML = ""; document.body.innerHTML = ""; });
it("removes result-table clipping and interactive actions when the print stylesheet is active", () => {
  const style = document.createElement('style'); style.textContent = readFileSync('src/features/results/track-completion-results.css', 'utf8'); document.head.append(style);
  const activeRules = [...style.sheet!.cssRules].flatMap(rule => {
    if (rule.type === CSSRule.STYLE_RULE) return [rule.cssText];
    if (rule.type === CSSRule.MEDIA_RULE && (rule as CSSMediaRule).conditionText === 'print') return [...(rule as CSSMediaRule).cssRules].map(child => child.cssText);
    return [];
  });
  style.remove(); const printed = document.createElement('style'); printed.textContent = activeRules.join('\n'); document.head.append(printed);
  document.body.innerHTML = '<main class="track-completion-page"><div class="track-completion-table-scroll"><table><tbody><tr><td>인쇄할 수업</td></tr></tbody></table></div><footer class="track-completion-footer"><button>보관하기</button></footer></main>';
  expect(getComputedStyle(document.querySelector('.track-completion-table-scroll')!).maxHeight).toBe('none');
  expect(getComputedStyle(document.querySelector('.track-completion-table-scroll')!).overflow).toBe('visible');
  expect(getComputedStyle(document.querySelector('.track-completion-footer')!).display).toBe('none');
});
