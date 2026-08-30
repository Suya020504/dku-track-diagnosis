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

    expect(document.querySelector('input[name="studyPath"][value="double-major"]')).not.toBeNull();
    expect(document.querySelector('input[name="studyPath"]:checked')).toBeNull();
    expect(document.querySelector('[role="status"]')?.textContent).toContain("이수 경로를 선택해 주세요");
  });

  it("keeps affiliation as the only first-step decision and stores it in the draft", async () => {
    const onChange = vi.fn();
    const onProfileStageChange = vi.fn();
    await mountProfileFlow({ onChange, onProfileStageChange });

    expect(document.querySelector('fieldset[aria-labelledby="affiliation-question"]')).not.toBeNull();
    expect(document.querySelector('input[name="studyPath"]')).toBeNull();
    expect(document.querySelectorAll('.profile-entry-actions .primary-button')).toHaveLength(1);

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
    expect(document.querySelector('input[name="studyPath"]')).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(true);

    await act(async () => click('input[name="studyPath"][value="minor"]'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ studyPath: "minor" }));
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

    const year = document.querySelector<HTMLInputElement>('.profile-entry-year input[type="number"]');
    const complete = document.querySelector<HTMLButtonElement>(".study-path-complete");
    if (!year || !complete) throw new Error("Missing admission year controls");

    expect(complete.disabled).toBe(true);
    expect(year.getAttribute("aria-invalid")).toBe("true");
    expect(document.body.textContent).toContain("2000년부터 2026년 사이");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(year, "2000");
      year.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(complete.disabled).toBe(false);
    expect(year.getAttribute("aria-invalid")).toBeNull();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(year, "2027");
      year.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(complete.disabled).toBe(true);
    expect(year.getAttribute("aria-invalid")).toBe("true");
  });

  it("lets a progress-checking track-major continue without choosing a target and clear an old target", async () => {
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

    expect(document.body.textContent).toContain(
      "2·3학년도 현재 이수 과목으로 참고 진단할 수 있습니다. 실제 트랙 신청 가능 시기, 적용 학번과 최종 인정 범위는 학과 확인이 필요합니다.",
    );
    expect(document.body.textContent).toContain("아직 정하지 않았어요 · 5개 트랙 비교");

    await act(async () => click('[data-target-track-choice="compare-all"]'));
    expect(onTargetTrackChange).toHaveBeenLastCalledWith(undefined);
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(false);

    await act(async () => click(".study-path-complete"));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      goal: "check-progress",
      studyPath: "track-major",
    }));
  });

  it("requires a target only when the student chooses graduation planning", async () => {
    await mountProfileFlow({
      profileStage: "path",
      initialDraft: {
        affiliation: "department-student",
        studyPath: "track-major",
        goal: "plan-graduation",
      },
    });

    expect(document.body.textContent).not.toContain("아직 정하지 않았어요 · 5개 트랙 비교");
    expect(document.querySelector<HTMLButtonElement>(".study-path-complete")?.disabled).toBe(true);
  });
});
