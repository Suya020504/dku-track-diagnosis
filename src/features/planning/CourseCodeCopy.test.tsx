// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CourseCodeCopy } from "./CourseCodeCopy";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("copies the official numeric code rather than the track document identifier", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CourseCodeCopy courseId="f-2" courseName="마케팅원론" />));
    await act(async () => host.querySelector("button")!.click());
    expect(writeText).toHaveBeenCalledWith("446410");
    expect(host.textContent).toContain("학사 과목코드");
    expect(host.querySelector('[role="status"]')?.textContent).toContain("과목코드를 복사했어요: 446410");
    expect(host.textContent).not.toContain("F-2");
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});

it("offers selectable code when clipboard permission fails", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CourseCodeCopy courseId="f-2" courseName="마케팅원론" />));
    await act(async () => host.querySelector("button")!.click());
    const field = host.querySelector<HTMLInputElement>("input")!;
    expect(field.value).toBe("446410");
    expect(field.readOnly).toBe(true);
    await act(async () => field.focus());
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(6);
    expect(host.querySelector('[role="status"]')?.textContent).toContain("직접 복사");
    expect(host.textContent).not.toContain("복사했어요");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});

it("does not offer an unverified internal id as a course number", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<CourseCodeCopy courseId="unknown-course" courseName="미확인 과목" />));
    expect(host.querySelector("button")).toBeNull();
    expect(host.textContent).toBe("학사 과목코드 확인 필요");
  } finally {
    await act(async () => root.unmount());
  }
});
