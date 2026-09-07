// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraduationPlanPreferences } from "../../types";
import { GraduationPlanSetup } from "./GraduationPlanSetup";

let root: Root | undefined;

async function renderSetup(
  value: Partial<GraduationPlanPreferences>,
  onChange = vi.fn(),
  onSubmit = vi.fn(),
) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root container");
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <GraduationPlanSetup value={value} onChange={onChange} onSubmit={onSubmit} />,
    );
  });
  return { onChange, onSubmit };
}

function input(label: string): HTMLInputElement {
  const labels = [...document.querySelectorAll("label")];
  const match = labels.find((candidate) => candidate.textContent?.includes(label));
  const field = match?.querySelector("input");
  if (!(field instanceof HTMLInputElement)) throw new Error(`Input not found: ${label}`);
  return field;
}

async function change(field: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
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

describe("GraduationPlanSetup", () => {
  it("defaults only a new empty form to current term 2026-2 and keeps it editable", async () => {
    const { onChange } = await renderSetup({});

    const currentTerm = input("현재 학기");
    expect(currentTerm.value).toBe("2026-2");

    await change(currentTerm, "2027-1");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      currentTerm: "2027-1",
    }));
  });

  it("does not overwrite an existing intentionally empty current term", async () => {
    await renderSetup({
      currentTerm: undefined,
      targetGraduationTerm: "2027-2",
      maxMajorCoursesPerTerm: 3,
      considerSeasonalTerm: false,
    });

    expect(input("현재 학기").value).toBe("");
  });

  it("disables submission when the target is earlier than the current term", async () => {
    await renderSetup({
      currentTerm: "2027-1",
      targetGraduationTerm: "2026-2",
      maxMajorCoursesPerTerm: 3,
      considerSeasonalTerm: false,
    });

    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(document.body.textContent).toContain("현재 학기와 같거나 이후");
  });

  it.each([0, 1.5, 7])("rejects an invalid per-term major course load of %s", async (load) => {
    await renderSetup({
      currentTerm: "2026-2",
      targetGraduationTerm: "2027-2",
      maxMajorCoursesPerTerm: load,
      considerSeasonalTerm: false,
    });

    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it("states that seasonal terms do not add automatic calculation capacity", async () => {
    await renderSetup({});

    expect(document.body.textContent).toContain(
      "계절학기는 자동 가능성 계산에 포함하지 않고 확인할 항목으로만 남겨요.",
    );
  });

  it("restores valid preferences and enables the primary action", async () => {
    await renderSetup({
      currentTerm: "2026-1",
      targetGraduationTerm: "2028-2",
      maxMajorCoursesPerTerm: 4,
      considerSeasonalTerm: true,
    });

    expect(input("현재 학기").value).toBe("2026-1");
    expect(input("목표 졸업 학기").value).toBe("2028-2");
    expect(input("학기당 최대 전공과목 수").value).toBe("4");
    expect(input("계절학기 고려 여부").checked).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });

  it("renders exactly four form inputs and routes evidence through the official resources UI", async () => {
    await renderSetup({});

    expect(document.querySelectorAll("form input")).toHaveLength(4);
    const decisions = [...document.querySelectorAll("form fieldset label")];
    expect(decisions).toHaveLength(4);
    expect(decisions.map((item) => item.textContent)).toEqual([
      expect.stringContaining("현재 학기"),
      expect.stringContaining("목표 졸업 학기"),
      expect.stringContaining("학기당 최대 전공과목 수"),
      expect.stringContaining("계절학기 고려 여부"),
    ]);
    expect(document.querySelector<HTMLAnchorElement>('a[href="?view=resources"]')).not.toBeNull();
    expect(document.body.textContent).toContain("2026학년도 개설 이력");
  });
});
