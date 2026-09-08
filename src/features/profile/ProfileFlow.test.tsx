// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentProfile } from "../../types";
import { ProfileFlow } from "./ProfileFlow";

let root: Root | undefined;

async function mountProfileFlow(
  props: Partial<React.ComponentProps<typeof ProfileFlow>> = {},
) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  const defaultProps: React.ComponentProps<typeof ProfileFlow> = {
    onChange: vi.fn(),
    onComplete: vi.fn(),
    onProfileStageChange: vi.fn(),
  };
  await act(async () => root?.render(<ProfileFlow {...defaultProps} {...props} />));
}

function click(selector: string) {
  const control = document.querySelector<HTMLElement>(selector);
  if (!control) throw new Error(`Missing control: ${selector}`);
  control.click();
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  vi.restoreAllMocks();
});

describe("ProfileFlow", () => {
  it("keeps optional purposes out of the initial path decision", async () => {
    await mountProfileFlow({ profileStage: "path", initialDraft: { affiliation: "department-student" } });
    const purpose = document.querySelector('input[name="goal"]');
    expect(purpose).toBeNull();
    expect(document.querySelector('input[name="studyPath"]')).toBeNull();
    expect(document.querySelector('input[name="otherMajor"]')).not.toBeNull();
  });
  it("restores an in-progress draft over the last completed profile", async () => {
    await mountProfileFlow({
      profile: {
        affiliation: "department-student",
        studyPath: "advanced-major",
        goal: "check-progress",
        curriculumRuleVersion: "2026-provided-final-plan",
        ruleApplicability: "reference-only",
      },
      initialDraft: {
        affiliation: "external-student",
      },
      profileStage: "path",
    });

    expect(document.querySelector('input[name="majorRole"][value="double-major"]')).not.toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="majorRole"][value="undecided"]')?.checked).toBe(true);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("학사 이수 기준은 확정하지 않아요");
  });

  it("keeps affiliation as the only first-step decision and stores it in the draft", async () => {
    const onChange = vi.fn();
    const onProfileStageChange = vi.fn();
    await mountProfileFlow({ onChange, onProfileStageChange });

    expect(document.querySelector('fieldset[aria-labelledby="affiliation-question"]')).not.toBeNull();
    expect(document.querySelector('input[name="studyPath"]')).toBeNull();
    expect(document.querySelectorAll('.dku-profile-actions .primary-button')).toHaveLength(1);

    await act(async () => click('input[name="affiliation"][value="external-student"]'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      affiliation: "external-student",
      studyPath: undefined,
    }));

    await act(async () => click('[data-profile-next]'));
    expect(onProfileStageChange).toHaveBeenCalledWith("path");
  });

  it("gives a direct path URL without affiliation one clear recovery action", async () => {
    const onProfileStageChange = vi.fn();
    await mountProfileFlow({ profileStage: "path", onProfileStageChange });

    expect(document.querySelector('[role="status"]')?.textContent).toContain("소속을 먼저 선택");
    expect(document.querySelector('input[name="studyPath"]')).toBeNull();
    expect(document.querySelector(".study-path-complete")).toBeNull();

    await act(async () => click("[data-profile-recover]"));
    expect(onProfileStageChange).toHaveBeenCalledTimes(1);
    expect(onProfileStageChange).toHaveBeenCalledWith("affiliation");
  });

  it("keeps path edits incomplete and calls final completion only once", async () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const initialDraft: Partial<StudentProfile> = {
      affiliation: "external-student",
      goal: "check-progress",
    };
    await mountProfileFlow({
      profileStage: "path",
      initialDraft,
      onChange,
      onComplete,
    });

    expect(document.querySelector('fieldset[aria-labelledby="affiliation-question"]')).toBeNull();
    expect(document.querySelector('input[name="majorRole"]')).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(false);

    await act(async () => click('input[name="majorRole"][value="minor"]'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ majorRole: "minor" }));
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      click(".study-path-complete");
      click(".study-path-complete");
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      affiliation: "external-student",
      studyPath: "minor",
    }));
  });

  it("blocks completion when an entered admission year is outside 2000–2026", async () => {
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "external-student",
        studyPath: "minor",
        goal: "check-progress",
        entryYear: 1999,
      },
    });

    const year = document.querySelector<HTMLInputElement>('.dku-profile-year input[type="number"]');
    const complete = document.querySelector<HTMLButtonElement>(".study-path-complete");
    if (!year || !complete) throw new Error("Missing admission year controls");

    expect(complete.disabled).toBe(true);
    expect(year.getAttribute("aria-invalid")).toBe("true");
    expect(document.body.textContent).toContain("2000년부터 2026년 사이");
    const disclosure = year.closest("details");
    expect(disclosure?.open).toBe(true);
    year.focus();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(year, "2000");
      year.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(complete.disabled).toBe(false);
    expect(year.getAttribute("aria-invalid")).toBeNull();
    expect(disclosure?.open).toBe(true);
    expect(document.activeElement).toBe(year);

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(year, "2027");
      year.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(complete.disabled).toBe(true);
    expect(year.getAttribute("aria-invalid")).toBe("true");
    await act(async () => disclosure?.querySelector("summary")?.click());
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelector("summary")?.textContent).toContain("2000~2026년으로 수정 필요");
    await act(async () => disclosure?.querySelector("summary")?.click());
    expect(disclosure?.open).toBe(true);
    expect(year.value).toBe("2027");
  });

  it("selects a recent admission year and keeps clearing it optional without changing study rules", async () => {
    const completed: StudentProfile[] = [];
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "external-student",
        studyPath: "minor",
        goal: "check-progress",
      },
      onComplete: (profile) => { completed.push(profile); },
    });

    const year = document.querySelector<HTMLSelectElement>('.dku-profile-year select');
    expect(year).not.toBeNull();
    if (!year) return;
    expect([...year.options].map(option => option.value)).toEqual([
      "", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "custom",
    ]);
    expect(year.value).toBe("");
    expect(document.querySelector('.dku-profile-year input[type="number"]')).toBeNull();
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(false);

    await act(async () => {
      year.value = "2023";
      year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => click(".study-path-complete"));
    expect(completed[0]).toMatchObject({
      entryYear: 2023,
      affiliation: "external-student",
      studyPath: "minor",
      curriculumRuleVersion: "2026-provided-final-plan",
      ruleApplicability: "reference-only",
    });

    await act(async () => {
      year.value = "";
      year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => click(".study-path-complete"));
    expect(completed).toHaveLength(2);
    expect(completed[1]?.entryYear).toBeUndefined();
  });

  it.each([2000, 2016])("preserves an existing %s admission year through the direct input option", async (entryYear) => {
    const completed: StudentProfile[] = [];
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "department-student",
        studyPath: "advanced-major",
        goal: "check-progress",
        entryYear,
      },
      onComplete: (profile) => { completed.push(profile); },
    });

    const year = document.querySelector<HTMLSelectElement>('.dku-profile-year select');
    expect(year?.value).toBe("custom");
    expect(year?.selectedOptions[0]?.textContent).toBe("이전 연도 직접 입력");
    expect(document.querySelector<HTMLInputElement>('.dku-profile-year input[type="number"]')?.value).toBe(String(entryYear));
    await act(async () => click(".study-path-complete"));
    expect(completed[0]?.entryYear).toBe(entryYear);
  });

  it("lets a student enter an earlier admission year before returning to the recent-year list", async () => {
    const completed: StudentProfile[] = [];
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: { affiliation: "external-student", studyPath: "minor" },
      onComplete: (profile) => { completed.push(profile); },
    });

    const year = document.querySelector<HTMLSelectElement>('.dku-profile-year select');
    expect(year).not.toBeNull();
    if (!year) return;
    await act(async () => {
      year.value = "custom";
      year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const directYear = document.querySelector<HTMLInputElement>('.dku-profile-year input[type="number"]');
    expect(directYear).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(directYear, "2015");
      directYear?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => click(".study-path-complete"));
    expect(completed[0]?.entryYear).toBe(2015);

    await act(async () => {
      year.value = "2026";
      year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(document.querySelector('.dku-profile-year input[type="number"]')).toBeNull();
    expect(year.value).toBe("2026");
    await act(async () => click(".study-path-complete"));
    expect(completed[1]?.entryYear).toBe(2026);
  });

  it("preserves an old target while academic information is edited separately", async () => {
    const onComplete = vi.fn();
    const onTargetTrackChange = vi.fn();
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "department-student",
        studyPath: "track-major",
        goal: "check-progress",
      },
      targetTrackId: "food-marketing",
      onComplete,
      onTargetTrackChange,
    });

    expect(document.querySelector('input[name="targetTrackId"]')).toBeNull();
    expect(onTargetTrackChange).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(false);

    await act(async () => click(".study-path-complete"));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      goal: "check-progress",
      studyPath: "track-major",
    }));
  });

  it("does not require a track while saving academic information for planning", async () => {
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "department-student",
        studyPath: "track-major",
        goal: "plan-graduation",
      },
    });

    expect(document.body.textContent).not.toContain("아직 정하지 않았어요 · 5개 트랙 비교");
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(false);
    const targetDisclosure = document.querySelector('input[name="targetTrackId"]')?.closest("details");
    expect(targetDisclosure).toBeUndefined();
  });
});
