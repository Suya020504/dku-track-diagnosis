// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import { FIRST_VISIT_GUIDE_KEY } from "./lib/firstVisitGuide";
let root: Root | undefined;
async function mount(route: string) { history.replaceState({}, "", route); root=createRoot(document.querySelector('#root')!); await act(async()=>root?.render(<App/>)); }
async function click(text: string) { const button=[...document.querySelectorAll<HTMLElement>('button, a, summary')].find(b=>b.textContent?.trim()===text);expect(button).toBeDefined();await act(async()=>button?.click()); }
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;document.body.innerHTML='<div id="root"></div>';localStorage.clear();localStorage.setItem(FIRST_VISIT_GUIDE_KEY,'seen');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;vi.restoreAllMocks();});
it('opens a shareable video guide without requiring or storing a student profile',async()=>{
 await mount('/'); await click('사용 방법 영상 보기'); expect(location.search).toBe('?view=example');
 expect(document.querySelector('h1')?.textContent).toBe('영상으로 사용 방법을 알아보세요');
 expect(document.querySelector('video')?.getAttribute('src')).toBe('/videos/track-service-guide.mp4');
 expect(document.querySelector('[data-example-result]')).toBeNull();
 expect(document.title).toContain('사용 방법 영상');
 expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});
it('keeps personal records unchanged through video, optional example and return home',async()=>{
 const original=JSON.stringify({...createEmptyAppState(),courseSelections:[{courseId:'b-1',status:'completed'}]});localStorage.setItem(STORAGE_KEY_V2,original);
 await mount('/?view=example');
 await click('직접 예시를 살펴보고 싶다면'); await click('가상 이력으로 예시 체험하기');
 expect(new URLSearchParams(location.search).get('mode')).toBe('interactive');
 expect(document.activeElement).toBe(document.querySelector('h1'));
 expect(document.querySelector('[data-example-result]')?.textContent).toContain('4과목 · 12학점 남음');
 await click('두 트랙 함께');expect(document.querySelector('[data-example-result]')?.textContent).toContain('8과목 · 24학점 남음');await click('예시 학기 계획');await click('내 수강 이력으로 시작하기');
 expect(location.search).toBe('');expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(original);
});
it('restores the example on an explicit direct URL and leaves no personal result behind',async()=>{
 await mount('/?view=example&mode=interactive');expect(document.querySelector('[data-example-result]')).not.toBeNull();
 expect(document.querySelector('video')).toBeNull();
 expect(document.title).toContain('예시 결과 체험');expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});

it('restores the video and interactive example when browser history changes',async()=>{
 await mount('/?view=example&mode=interactive');
 await act(async()=>{history.replaceState({view:'example'},'', '/?view=example');window.dispatchEvent(new PopStateEvent('popstate'));});
 expect(document.querySelector('video')).not.toBeNull();
 expect(document.querySelector('[data-example-result]')).toBeNull();
 expect(document.title).toContain('사용 방법 영상');
 expect(document.activeElement).toBe(document.querySelector('h1'));
 await act(async()=>{history.replaceState({view:'example',mode:'interactive'},'', '/?view=example&mode=interactive');window.dispatchEvent(new PopStateEvent('popstate'));});
 expect(document.querySelector('[data-example-result]')).not.toBeNull();
 expect(document.querySelector('video')).toBeNull();
 expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});
