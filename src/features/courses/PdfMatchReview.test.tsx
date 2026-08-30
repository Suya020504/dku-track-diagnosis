// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PdfImportDraft } from "../../types";
import { PdfMatchReview } from "./PdfMatchReview";

const draft: PdfImportDraft = {
  pageCount: 4,
  extractedCharacters: 120,
  matched: [{
    sourceId: "p1-c1",
    courseId: "b-1",
    matchKind: "exact-name",
    pageNumbers: [1],
    displayLabel: "경제원론",
  }],
  ambiguous: [{
    sourceId: "p2-c1",
    candidateCourseIds: ["c-1", "c-2"],
    pageNumbers: [2, 3],
    displayLabel: "유사한 과목 후보",
  }],
  unmatched: [{
    sourceId: "p4-c1",
    pageNumbers: [4],
    displayLabel: "민감한 PDF 원문 과목명",
  }],
};

let root: Root | undefined;

function button(label: string): HTMLButtonElement {
  const match = [...document.querySelectorAll<HTMLButtonElement>("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

function labeledInput(label: string, type: "checkbox" | "radio"): HTMLInputElement {
  const match = [...document.querySelectorAll<HTMLLabelElement>("label")]
    .find((candidate) => candidate.textContent?.includes(label))
    ?.querySelector<HTMLInputElement>(`input[type="${type}"]`);
  if (!match) throw new Error(`Input not found: ${label}`);
  return match;
}

async function renderReview(overrides: Partial<React.ComponentProps<typeof PdfMatchReview>> = {}) {
  const container = document.querySelector<HTMLDivElement>("#root");
  if (!container) throw new Error("Missing root");
  root = createRoot(container);
  const props: React.ComponentProps<typeof PdfMatchReview> = {
    draft,
    conflicts: [],
    onApprove: vi.fn(),
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onSearchCourse: vi.fn(),
    ...overrides,
  };
  await act(async () => root?.render(<PdfMatchReview {...props} />));
  return props;
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

describe("PdfMatchReview", () => {
  it("renders canonical course names and generic page-based unmatched rows only", async () => {
    await renderReview();

    expect(document.body.textContent).toContain("아직 어떤 과목도 선택되지 않았어요");
    expect(document.body.textContent).toContain("자동 일치 1개");
    expect(document.body.textContent).toContain("선택 필요 1개");
    expect(document.body.textContent).toContain("직접 확인 1개");
    expect(document.body.textContent).toContain("경제원론");
    expect(document.body.textContent).toContain("미시경제학");
    expect(document.body.textContent).toContain("소비자경제학");
    expect(document.body.textContent).toContain("PDF 4쪽에서 확인이 필요한 항목");
    expect(document.body.textContent).not.toContain("민감한 PDF 원문 과목명");
    expect(labeledInput("경제원론", "checkbox").checked).toBe(false);
  });

  it("explains that existing completed, in-progress, and planned selections stay unchanged", async () => {
    await renderReview({ existingSelectionCount: 3 });

    expect(document.body.textContent).toContain("기존 직접 선택 3개는 그대로 유지됩니다");
    expect(document.body.textContent).toContain("승인한 PDF 후보만 새 과목으로 추가");
    expect(document.body.textContent).not.toContain("아직 어떤 과목도 선택되지 않았어요");
  });

  it("submits only explicitly checked matched and ambiguous choices", async () => {
    const props = await renderReview();

    await act(async () => labeledInput("경제원론", "checkbox").click());
    await act(async () => labeledInput("미시경제학", "radio").click());
    await act(async () => labeledInput("선택한 후보 승인", "checkbox").click());

    expect(button("승인한 새 과목 2개 적용")).toBeTruthy();
    await act(async () => button("승인한 새 과목 2개 적용").click());

    expect(props.onApprove).toHaveBeenCalledWith([
      { sourceId: "p1-c1", courseId: "b-1" },
      { sourceId: "p2-c1", courseId: "c-1" },
    ]);
  });

  it("shows conflicts with canonical names and keeps navigation actions available", async () => {
    const props = await renderReview({
      conflicts: [{
        courseId: "c-2",
        existingStatus: "planned",
        message: "이미 수강 예정 상태라 완료로 변경하지 않았어요.",
      }],
    });

    expect(document.querySelector('[role="status"]')?.textContent).toContain("소비자경제학");
    expect(document.body.textContent).toContain("수강 예정 상태라 완료로 변경하지 않았어요");

    await act(async () => button("직접 검색하기").click());
    await act(async () => button("검수 취소").click());
    await act(async () => button("과목 선택으로 돌아가기").click());

    expect(props.onSearchCourse).toHaveBeenCalledWith([4]);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });
});
