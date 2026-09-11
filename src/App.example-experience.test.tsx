// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import { FIRST_VISIT_GUIDE_KEY } from "./lib/firstVisitGuide";
import { VIDEO_GUIDE_CHAPTERS, VIDEO_GUIDE_SRC } from "./features/journey/VideoGuide";
import type { SavedAppStateV2 } from "./types";

let root: Root | undefined;
async function mount(route: string) { history.replaceState({}, "", route); root=createRoot(document.querySelector('#root')!); await act(async()=>root?.render(<App/>)); }
async function click(text: string) { const button=[...document.querySelectorAll<HTMLElement>('button, a, summary')].find(b=>b.textContent?.trim()===text);expect(button).toBeDefined();await act(async()=>button?.click()); }
async function selectVideoChapter(id: string) {
  const chapter = VIDEO_GUIDE_CHAPTERS.find(item => item.id === id)!;
  expect(chapter).toBeDefined();
  const chapters = document.querySelector<HTMLDetailsElement>('.video-guide__chapters')!;
  if (!chapters.open) await act(async () => chapters.querySelector('summary')!.click());
  const chapterButton = [...chapters.querySelectorAll<HTMLButtonElement>('li>button')].find(node => node.textContent?.includes(chapter.title));
  expect(chapterButton).toBeDefined();
  await act(async () => chapterButton!.click());
  expect(chapterButton?.getAttribute('aria-current')).toBe('true');
}
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;document.body.innerHTML='<div id="root"></div>';localStorage.clear();localStorage.setItem(FIRST_VISIT_GUIDE_KEY,'seen');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;vi.restoreAllMocks();});
it('opens a shareable video guide without requiring or storing a student profile',async()=>{
 await mount('/'); await click('사용 방법 영상 보기'); expect(location.search).toBe('?view=example');
 expect(document.querySelector('h1')?.textContent).toBe('영상으로 사용 방법을 알아보세요');
 expect(document.querySelector('video')?.getAttribute('src')).toBe(VIDEO_GUIDE_SRC);
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

it('opens the required personal information step when a new visitor tries a result chapter', async () => {
  await mount('/?view=example');
  await selectVideoChapter('result-preview');
  expect(location.search).toBe('?view=example');
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
  await click('이 기능 직접 열기');
  const route = new URLSearchParams(location.search);
  expect(route.get('view')).toBe('diagnosis');
  expect(route.get('step')).toBe('profile');
  expect(document.querySelector('video')).toBeNull();
  expect(document.querySelector('#track-completion-title')).toBeNull();
  expect(document.querySelector('[data-example-result]')).toBeNull();
  expect(document.body.textContent).toContain('소속');
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();
});

it('preserves unfinished course input while starting the selected track feature with its prerequisite', async () => {
  const original: SavedAppStateV2 = {
    ...createEmptyAppState(),
    courseSelections: [{ courseId: 'b-1', status: 'completed' }, { courseId: 'c-1', status: 'in-progress' }],
  };
  const savedBefore = JSON.stringify(original);
  localStorage.setItem(STORAGE_KEY_V2, savedBefore);
  await mount('/?view=example');
  await selectVideoChapter('multi-track');
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(savedBefore);
  await click('이 기능 직접 열기');
  const route = new URLSearchParams(location.search);
  expect(route.get('view')).toBe('diagnosis');
  expect(route.get('step')).toBe('profile');
  expect(route.get('profile')).toBe('affiliation');
  const savedAfter = JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!);
  expect(savedAfter).toEqual({ ...JSON.parse(savedBefore), entryIntent: 'known-tracks' });
  expect(savedAfter.profile).toBeUndefined();
  expect(document.querySelector('[data-example-result]')).toBeNull();
});

it('opens the real result from a chapter and keeps the existing student record byte for byte', async () => {
  const original: SavedAppStateV2 = {
    ...createEmptyAppState(),
    profile: { affiliation: 'external-student', studyPath: 'minor', majorRole: 'minor', goal: 'check-progress', curriculumRuleVersion: '2026-provided-final-plan', ruleApplicability: 'reference-only' },
    targetTrackId: 'economics',
    courseSelections: [{ courseId: 'b-1', status: 'completed' }, { courseId: 'c-1', status: 'in-progress' }],
    courseInputReviewedAt: '2026-09-12T00:00:00Z',
  };
  const savedBefore = JSON.stringify(original);
  localStorage.setItem(STORAGE_KEY_V2, savedBefore);
  await mount('/?view=example');
  await selectVideoChapter('alternatives');
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(savedBefore);
  await click('이 기능 직접 열기');
  const route = new URLSearchParams(location.search);
  expect(route.get('view')).toBe('result');
  expect(route.get('section')).toBe('current');
  expect(document.querySelector('#track-completion-title')).not.toBeNull();
  expect(document.querySelector('video')).toBeNull();
  expect(document.querySelector('[data-example-result]')).toBeNull();
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(savedBefore);
});

it.each([
  ['modules', 'modules'],
  ['curriculum', 'curriculum'],
  ['timetable', 'timetable'],
  ['resources', 'official'],
])('opens the precise resource tab for the %s chapter without changing personal records', async (feature, section) => {
  const savedBefore = JSON.stringify({ ...createEmptyAppState(), courseSelections: [{ courseId: 'b-1', status: 'completed' }] });
  localStorage.setItem(STORAGE_KEY_V2, savedBefore);
  await mount('/?view=example');
  await selectVideoChapter(VIDEO_GUIDE_CHAPTERS.find(chapter => chapter.feature === feature)!.id);
  await click('이 기능 직접 열기');
  const route = new URLSearchParams(location.search);
  expect(route.get('view')).toBe('resources');
  expect(route.get('section')).toBe(section);
  expect(document.querySelector(`[data-resource-section="${section}"]`)?.getAttribute('aria-current')).toBe('page');
  expect(document.querySelector('.dku-resource-page')).not.toBeNull();
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(savedBefore);
});

it('opens existing help from its chapter and returns focus to the feature action when closed', async () => {
  const savedBefore = JSON.stringify({ ...createEmptyAppState(), courseSelections: [{ courseId: 'b-1', status: 'completed' }] });
  localStorage.setItem(STORAGE_KEY_V2, savedBefore);
  await mount('/?view=example');
  await selectVideoChapter(VIDEO_GUIDE_CHAPTERS.find(chapter => chapter.feature === 'help')!.id);
  const featureButton = document.querySelector<HTMLButtonElement>('.video-guide__chapter-action button')!;
  await act(async () => featureButton.click());
  expect(location.search).toBe('?view=example');
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(document.querySelector('[data-open-quick-guide]')).not.toBeNull();
  expect(document.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(featureButton);
  expect(document.querySelector('video')).not.toBeNull();
  expect(localStorage.getItem(STORAGE_KEY_V2)).toBe(savedBefore);
});
