// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { createEmptyAppState, STORAGE_KEY_V2 } from './lib/storage';
import type { SavedAppStateV2 } from './types';
let root: Root | undefined;
const base = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile: { affiliation:'department-student', studyPath:'advanced-major', majorRole:'primary', otherMajor:'no', goal:'check-progress', curriculumRuleVersion:'2026-provided-final-plan', ruleApplicability:'reference-only' } });
async function mount(state: SavedAppStateV2, route='/') { localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); history.replaceState({},'',route); root=createRoot(document.querySelector('#root')!); await act(async()=>root?.render(<App/>)); }
async function click(label: string) { const button=[...document.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent?.trim()===label); expect(button).toBeDefined(); await act(async()=>button!.click()); }
function expectSurvey() { const params=new URLSearchParams(location.search); expect(params.get('view')).toBe('recommendation'); expect(params.get('step')).toBe('survey'); expect(params.get('audience')).toBe('department-student'); }
beforeEach(()=>{ (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true; document.body.innerHTML='<div id="root"></div>'; localStorage.clear(); vi.spyOn(window,'scrollTo').mockImplementation(()=>{}); });
afterEach(async()=>{ if(root) await act(async()=>root?.unmount()); root=undefined; vi.restoreAllMocks(); localStorage.clear(); });
it('resumes the saved survey question from home without altering course history',async()=>{
 const state: SavedAppStateV2={...base(),entryIntent:'interest-survey',courseSelections:[{courseId:'b-1',status:'completed'}],interestSurvey:{audience:'department-student',answers:{'dept-consumer-choice':4},currentIndex:1}};
 await mount(state); await click('이전 입력 이어보기'); expectSurvey(); expect(document.querySelector('.ds-progress-row strong')?.textContent).toBe('2 / 10');
 const saved=JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!); expect(saved.interestSurvey).toEqual(state.interestSurvey); expect(saved.courseSelections).toEqual(state.courseSelections);
});
it('starts the survey selected in the track guide even after an earlier known-track journey',async()=>{
 const state: SavedAppStateV2={...base(),entryIntent:'known-tracks',targetTrackId:'food-marketing',courseSelections:[{courseId:'b-1',status:'completed'}]};
 await mount(state,'/?view=track-guide&section=overview'); await click('관심으로 트랙 추천받기'); expectSurvey();
 const saved=JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!); expect(saved.entryIntent).toBe('interest-survey'); expect(saved.profile).toEqual(state.profile); expect(saved.targetTrackId).toBe(state.targetTrackId); expect(saved.courseSelections).toEqual(state.courseSelections);
});
it.each([{ids:[]},{ids:['food-marketing']}])('resumes the saved track selection draft $ids',async({ids})=>{
 const state: SavedAppStateV2={...base(),entryIntent:'known-tracks',pendingSelectedTrackIds:ids as SavedAppStateV2['pendingSelectedTrackIds']};
 await mount(state); await click('이전 입력 이어보기'); expect(new URLSearchParams(location.search).get('step')).toBe('tracks');
 expect(JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!).pendingSelectedTrackIds).toEqual(ids);
});
