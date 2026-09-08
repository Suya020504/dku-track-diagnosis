// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getInterestSurveyQuestions } from "./data/interestSurveyQuestions";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";
import type { SavedAppStateV2 } from "./types";
let root: Root | undefined;
const fixture = (): SavedAppStateV2 => ({ ...createEmptyAppState(), profile: { affiliation: "external-student", studyPath: "minor", majorRole: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" }, targetTrackId: "economics", interestSurvey: { audience: "external-student", answers: Object.fromEntries(getInterestSurveyQuestions("external-student").map(question => [question.id, 3])), currentIndex: 9, completedAt: "2026-09-09" } });
const read = () => JSON.parse(localStorage.getItem(STORAGE_KEY_V2)!) as SavedAppStateV2;
async function mount(state?: SavedAppStateV2) { if (state) localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state)); root = createRoot(document.querySelector('#root')!); await act(async () => root?.render(<App />)); }
async function clickText(text: string) { const button = [...document.querySelectorAll('button')].find(element => element.textContent?.trim() === text); expect(button).toBeDefined(); await act(async () => button?.click()); }
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; localStorage.clear(); history.replaceState({}, "", "/?view=recommendation&step=survey&audience=external-student"); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; vi.restoreAllMocks(); });

describe("multiple choices immediately after the interest survey", () => {
  it("preserves two choices across refresh and reviews them before changing committed tracks or the minor role", async () => {
    const original = fixture(); await mount(original);
    const choices = document.querySelectorAll<HTMLButtonElement>('.ds-result-list button[aria-pressed]');
    await act(async () => choices[0].click()); await act(async () => choices[1].click());
    expect(document.querySelectorAll('.ds-result-list button[aria-pressed="true"]')).toHaveLength(2);
    expect(read().pendingSelectedTrackIds).toEqual(['food-marketing', 'regional-development-consulting']);
    expect(read().targetTrackId).toBe('economics'); expect(read().profile).toEqual(original.profile);
    await act(async () => root?.unmount()); root = undefined; await mount();
    expect(document.querySelectorAll('.ds-result-list button[aria-pressed="true"]')).toHaveLength(2);
    expect(document.querySelector('.ds-choice-summary')?.textContent).toContain('2개');
    await clickText('2개 트랙으로 이어가기');
    expect(new URLSearchParams(location.search).get('step')).toBe('tracks');
    expect(read().targetTrackId).toBe('economics'); expect(read().profile).toEqual(original.profile);
    const confirm = document.querySelector<HTMLButtonElement>('[data-confirm-tracks]'); await act(async () => confirm?.click());
    expect(new URLSearchParams(location.search).get('step')).toBe('courses');
    expect(read().targetTrackId).toBe('food-marketing'); expect(read().comparisonTrackIds).toEqual(['regional-development-consulting']); expect(read().profile).toEqual(original.profile);
  });
  it("clears only unconfirmed recommendation choices when restarting the questionnaire", async () => {
    const original = { ...fixture(), pendingSelectedTrackIds: ['food-marketing', 'regional-development-consulting'] as SavedAppStateV2['pendingSelectedTrackIds'], pendingTargetTrackId: 'food-marketing' as const };
    await mount(original); await clickText('다시 답하기');
    expect(read().pendingSelectedTrackIds).toEqual([]); expect(read().pendingTargetTrackId).toBeNull();
    expect(read().targetTrackId).toBe('economics'); expect(read().profile).toEqual(original.profile); expect(read().interestSurvey?.answers).toEqual({});
  });
  it.each(['answer', 'audience'] as const)("invalidates pending recommendation choices after a changed %s without changing the confirmed major", async change => {
    const original = fixture(); original.interestSurvey = { ...original.interestSurvey!, completedAt: undefined, currentIndex: 0, selectedTrackId: 'food-marketing' }; original.pendingSelectedTrackIds = ['food-marketing']; original.pendingTargetTrackId = 'food-marketing';
    await mount(original);
    if (change === 'answer') await act(async () => document.querySelector<HTMLInputElement>('input[name="interest-consumer-scale"][value="5"]')?.click());
    else await clickText('소속 바꾸기');
    expect(read().pendingSelectedTrackIds).toEqual([]); expect(read().pendingTargetTrackId).toBeNull();
    expect(read().targetTrackId).toBe('economics'); expect(read().profile).toEqual(original.profile);
  });
});
