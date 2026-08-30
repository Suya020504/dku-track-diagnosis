// @vitest-environment jsdom

import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PdfImportDraft } from "../../types";
import { PdfCourseImportPanel } from "./PdfCourseImportPanel";

const draft: PdfImportDraft = {
  pageCount: 2,
  extractedCharacters: 24,
  matched: [],
  ambiguous: [],
  unmatched: [],
};

let root: Root | undefined;

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("File input not found");
  return input;
}

async function renderPanel(
  analyzeFile: (file: File, signal: AbortSignal) => Promise<PdfImportDraft>,
  onAnalyzed = vi.fn(),
) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root");
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <PdfCourseImportPanel analyzeFile={analyzeFile} onAnalyzed={onAnalyzed} />,
    );
  });
  return { onAnalyzed };
}

async function chooseFile(file: File, nativeValue?: string) {
  const input = fileInput();
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  if (nativeValue !== undefined) {
    Object.defineProperty(input, "value", {
      configurable: true,
      writable: true,
      value: nativeValue,
    });
  }
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
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

describe("PdfCourseImportPanel", () => {
  it("keeps the beta workflow collapsed behind explicit privacy and limit copy", async () => {
    await renderPanel(vi.fn());

    expect(document.body.textContent).toContain("PDF로 선택값 채우기 beta");
    expect(document.body.textContent).not.toContain("브라우저 안에서만 분석");

    await act(async () => button("PDF로 선택값 채우기 beta").click());

    expect(document.body.textContent).toContain("10MB 이하");
    expect(document.body.textContent).toContain("50쪽 이하");
    expect(document.body.textContent).toContain("텍스트가 포함된 PDF");
    expect(document.body.textContent).toContain("브라우저 안에서만 분석");
    expect(document.body.textContent).toContain("저장하거나 업로드하지 않습니다");
    expect(fileInput().accept).toBe("application/pdf,.pdf");
  });

  it("analyzes only after file selection and never renders the filename", async () => {
    let resolveDraft!: (value: PdfImportDraft) => void;
    const analyzeFile = vi.fn((_file: File, _signal: AbortSignal) =>
      new Promise<PdfImportDraft>((resolve) => { resolveDraft = resolve; }),
    );
    const { onAnalyzed } = await renderPanel(analyzeFile);
    await act(async () => button("PDF로 선택값 채우기 beta").click());

    const file = new File(["private transcript"], "20261234_홍길동_성적표.pdf", {
      type: "application/pdf",
    });
    await chooseFile(file);

    expect(analyzeFile).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("분석 중");
    expect(document.body.textContent).not.toContain(file.name);
    expect(document.body.textContent).not.toContain("private transcript");

    await act(async () => resolveDraft(draft));

    expect(onAnalyzed).toHaveBeenCalledWith(draft);
    expect(document.body.textContent).not.toContain(file.name);
  });

  it("clears the native filename synchronously and exposes only a generic picker label while pending", async () => {
    const analyzeFile = vi.fn(() => new Promise<PdfImportDraft>(() => undefined));
    await renderPanel(analyzeFile);
    await act(async () => button("PDF로 선택값 채우기 beta").click());
    const file = new File(["private transcript"], "20261234_홍길동_성적표.pdf", {
      type: "application/pdf",
    });

    await chooseFile(file, `C:\\fakepath\\${file.name}`);

    expect(fileInput().value).toBe("");
    expect(fileInput().classList.contains("sr-only")).toBe(true);
    expect(fileInput().labels?.[0]?.textContent?.trim()).toBe("PDF 선택");
    expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe(
      "PDF를 분석 중이에요. 잠시만 기다려 주세요.분석 취소",
    );
    expect(document.body.textContent).not.toContain(file.name);
  });

  it("accepts a completed analysis after the StrictMode effect replay", async () => {
    const onAnalyzed = vi.fn();
    const container = document.querySelector<HTMLDivElement>("#root");
    if (!container) throw new Error("Missing root");
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <StrictMode>
          <PdfCourseImportPanel
            analyzeFile={vi.fn().mockResolvedValue(draft)}
            onAnalyzed={onAnalyzed}
          />
        </StrictMode>,
      );
    });
    await act(async () => button("PDF로 선택값 채우기 beta").click());

    await chooseFile(new File(["strict"], "strict.pdf", { type: "application/pdf" }));

    expect(onAnalyzed).toHaveBeenCalledWith(draft);
  });

  it("aborts the previous analysis on replacement, cancel, and unmount", async () => {
    const signals: AbortSignal[] = [];
    const analyzeFile = vi.fn((_file: File, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<PdfImportDraft>(() => undefined);
    });
    await renderPanel(analyzeFile);
    await act(async () => button("PDF로 선택값 채우기 beta").click());

    const repeatedFile = new File(["same"], "same.pdf", { type: "application/pdf" });
    await chooseFile(repeatedFile, "C:\\fakepath\\same.pdf");
    expect(fileInput().disabled).toBe(false);
    await chooseFile(repeatedFile, "C:\\fakepath\\same.pdf");
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => button("분석 취소").click());
    expect(signals[1]?.aborted).toBe(true);

    await chooseFile(new File(["third"], "third.pdf", { type: "application/pdf" }));
    await act(async () => root?.unmount());
    root = undefined;
    expect(signals[2]?.aborted).toBe(true);
  });

  it("shows a fixed failure path and clears the input so the same file can retry", async () => {
    const analyzeFile = vi.fn().mockRejectedValue(new Error("student raw text"));
    await renderPanel(analyzeFile);
    await act(async () => button("PDF로 선택값 채우기 beta").click());

    await chooseFile(new File(["secret"], "secret.pdf", { type: "application/pdf" }));

    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "PDF를 분석하지 못했어요",
    );
    expect(document.body.textContent).toContain("직접 선택 계속하기");
    expect(document.body.textContent).not.toContain("student raw text");
    expect(document.body.textContent).not.toContain("secret.pdf");
    expect(fileInput().value).toBe("");

    await chooseFile(new File(["secret"], "secret.pdf", { type: "application/pdf" }));
    expect(analyzeFile).toHaveBeenCalledTimes(2);
  });
});
