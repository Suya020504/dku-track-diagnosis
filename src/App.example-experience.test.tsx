// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import { FIRST_VISIT_GUIDE_KEY } from "./lib/firstVisitGuide";
let root: Root | undefined;
async function mount(route: string) { history.replaceState({}, "", route); root=createRoot(document.querySelector('#root')!); await act(async()=>root?.render(<App/>)); }
async function click(text: string) { const button=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()===text);expect(button).toBeDefined();await act(async()=>button?.click()); }
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;document.body.innerHTML='<div id="root"></div>';localStorage.clear();localStorage.setItem(FIRST_VISIT_GUIDE_KEY,'seen');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;vi.restoreAllMocks();});
it('opens a shareable example without requiring or storing a student profile',async()=>{
 await mount('/'); await click('예시 결과 먼저 보기'); expect(location.search).toBe('?view=example');
  expect(document.querySelector('h1')?.textContent).toContain('입력 없이 결과를 먼저');
  expect(document.querySelector('[data-example-result]')?.textContent).toContain('4과목 · 12학점 남음');
 expect(document.body.textContent).toContain('가상 수강 이력');expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
 await click('예시 학기 계획'); expect(document.querySelector('[data-example-plan]')).not.toBeNull();
 expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});
it('keeps personal records unchanged through example changes and return to home',async()=>{
 const original=JSON.stringify({...createEmptyAppState(),courseSelections:[{courseId:'b-1',status:'completed'}]});localStorage.setItem(STORAGE_KEY_V2,original);
 await mount('/?view=example'); await click('두 트랙 함께');expect(document.querySelector('[data-example-result]')?.textContent).toContain('8과목 · 24학점 남음');await click('예시 학기 계획');await click('내 수강 이력으로 시작하기');
 expect(location.search).toBe('');expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(original);
});
it('restores the example on a direct shared URL and leaves no personal result behind',async()=>{
 await mount('/?view=example');expect(document.querySelector('[data-example-result]')).not.toBeNull();
 expect(document.title).toContain('예시 결과 체험');expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});
