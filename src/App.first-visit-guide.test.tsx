// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import { FIRST_VISIT_GUIDE_KEY } from "./lib/firstVisitGuide";
let root: Root | undefined;
async function mount(route = "/") { history.replaceState({}, "", route); root = createRoot(document.querySelector("#root")!); await act(async () => root?.render(<App />)); }
async function unmount() { if(root) await act(async () => root?.unmount()); root = undefined; }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); document.body.innerHTML = '<div id="root"></div>'; vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(async () => { await unmount(); vi.restoreAllMocks(); });
it("shows one short first-visit guide, dismisses without changing inputs, and stays closed on reload", async () => {
  await mount();
  expect(document.querySelector('[data-first-visit-guide]')).not.toBeNull();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("들은 과목으로 남은 수업을 찾아요");
  expect(document.querySelector('[role="dialog"] [data-open-current-reset]')).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[data-welcome-skip]')?.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(localStorage.getItem(FIRST_VISIT_GUIDE_KEY)).toBe("seen");
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
  expect(document.activeElement?.classList.contains('journey-home-start')).toBe(true);
  await unmount(); await mount(); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("does not interrupt returning students and allows reopening the short guide from help", async () => {
  const original = JSON.stringify({...createEmptyAppState(), courseSelections:[{courseId:"b-1",status:"completed"}]});
  localStorage.setItem(STORAGE_KEY_V2, original); await mount();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="도움말 열기"]')?.click());
  await act(async () => document.querySelector<HTMLButtonElement>('[data-open-quick-guide]')?.click());
  expect(document.querySelector('[data-first-visit-guide]')).not.toBeNull();
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  expect(document.activeElement?.getAttribute('aria-label')).toBe('도움말 열기');
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(original);
});
it("leaves direct guide links unobstructed and only offers the introduction when home is opened", async () => {
  await mount('/?view=track-guide&section=overview'); expect(document.querySelector('[role="dialog"]')).toBeNull();
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('.planner-shell-primary-nav button')].find(b=>b.textContent==='홈')?.click());
  expect(document.querySelector('[data-first-visit-guide]')).not.toBeNull();
});
it("keeps the service usable when the first-visit preference cannot be stored", async () => {
  await mount(); vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
  await act(async () => document.querySelector<HTMLButtonElement>('[data-welcome-skip]')?.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.querySelector('.journey-home-start')).not.toBeNull();
});
