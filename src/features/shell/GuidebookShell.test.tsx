import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuidebookShell } from "./GuidebookShell";

describe("GuidebookShell", () => {
  it("adds the planner shell and local-save status without owning a second main landmark", () => {
    const markup = renderToStaticMarkup(
      <GuidebookShell
        activeId="start"
        currentLabel="시작하기"
        guideItems={[
          { id: "start", index: "01", label: "시작하기", available: true, onSelect: vi.fn() },
        ]}
        mobilePrimaryItems={[
          { id: "start", label: "시작", available: true, onSelect: vi.fn() },
          { id: "diagnosis", label: "진단", available: true, onSelect: vi.fn() },
          { id: "result", label: "결과", available: false, onSelect: vi.fn() },
          { id: "plan", label: "계획", available: false, onSelect: vi.fn() },
        ]}
        mobileMoreItems={[]}
        utilityItems={[
          { id: "overview", label: "트랙제 안내", available: true, onSelect: vi.fn() },
          { id: "contact", label: "문의사항", available: true, onSelect: vi.fn() },
        ]}
        utilityActiveId="overview"
        journeyItems={[]}
        saveState="saved"
        onOpenHelp={vi.fn()}
      >
        <main><h1>화면 제목</h1></main>
      </GuidebookShell>,
    );

    expect(markup).toContain('class="planner-app');
    expect(markup).toContain("단국대학교 식품자원경제학과");
    expect(markup).toContain("이 브라우저에 저장됨");
    expect(markup).toContain("트랙제 안내");
    expect(markup).toContain("문의사항");
    expect(markup).toContain('aria-current="page"');
    expect((markup.match(/<main/g) ?? [])).toHaveLength(1);
  });

  it("reports a local storage failure without reading browser state itself", () => {
    const markup = renderToStaticMarkup(
      <GuidebookShell
        activeId="start"
        currentLabel="시작하기"
        guideItems={[]}
        mobilePrimaryItems={[]}
        mobileMoreItems={[]}
        utilityItems={[]}
        journeyItems={[]}
        saveState="error"
        onOpenHelp={vi.fn()}
      >
        <main />
      </GuidebookShell>,
    );

    expect(markup).toContain("저장하지 못함");
    expect(markup).toContain('role="alert"');
  });
});
