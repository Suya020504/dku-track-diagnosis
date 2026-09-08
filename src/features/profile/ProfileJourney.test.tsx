// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProfileFlow } from "./ProfileFlow";
let root: Root;
beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.querySelector('#root')!); });
afterEach(async () => { await act(async () => root.unmount()); });
it("automatically sets department primary role without requiring an administrative path decision", async () => {
  const completed = vi.fn();
  await act(async () => root.render(<ProfileFlow profileStage="path" initialDraft={{ affiliation: "department-student" }} onChange={vi.fn()} onComplete={completed} />));
  expect(document.querySelector('input[name="studyPath"]')).toBeNull();
  expect(document.body.textContent).toContain('주전공');
  await act(async () => document.querySelector<HTMLInputElement>('input[name="otherMajor"][value="no"]')?.click());
  await act(async () => document.querySelector<HTMLButtonElement>('.study-path-complete')?.click());
  expect(completed).toHaveBeenCalledWith(expect.objectContaining({ affiliation: "department-student", majorRole: "primary", otherMajor: "no", studyPath: "advanced-major" }));
});
it("offers an undecided external major role without exposing a 63-credit conclusion", async () => {
  const completed = vi.fn();
  await act(async () => root.render(<ProfileFlow profileStage="path" initialDraft={{ affiliation: "external-student", studyPath: "track-major" }} onChange={vi.fn()} onComplete={completed} />));
  expect(document.querySelector<HTMLInputElement>('input[name="majorRole"][value="undecided"]')?.checked).toBe(true);
  expect(document.body.textContent).not.toContain('63');
  expect(document.body.textContent).not.toContain('트랙형전공');
  await act(async () => document.querySelector<HTMLButtonElement>('.study-path-complete')?.click());
  expect(completed).toHaveBeenCalledWith(expect.objectContaining({ majorRole: "undecided", studyPath: "track-major" }));
});
it("keeps direction choice separate from academic information and starts only the selected route", async () => {
  const start = vi.fn();
  await act(async () => root.render(<ProfileFlow profileStage="direction" profile={{ affiliation: "external-student", studyPath: "minor", goal: "check-progress", curriculumRuleVersion: "2026-provided-final-plan", ruleApplicability: "reference-only" }} entryIntent="completed-courses" onEntryIntentChange={vi.fn()} onStartDirection={start} onChange={vi.fn()} onComplete={vi.fn()} />));
  expect(document.querySelectorAll('input[name="entryIntent"]')).toHaveLength(3);
  expect(document.querySelector('input[name="majorRole"]')).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[data-start-direction]')?.click());
  expect(start).toHaveBeenCalledWith('completed-courses');
});
