import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuidebookShell } from "./GuidebookShell";

describe("GuidebookShell", () => {
  it("uses the same top navigation shell when no display mode is supplied", () => {
    const markup = renderToStaticMarkup(
      <GuidebookShell
        activeId="resources"
        currentLabel="도구 & 정보"
        guideItems={[
          { id: "start", index: "01", label: "홈", available: true, onSelect: vi.fn() },
          { id: "resources", index: "06", label: "도구 & 정보", available: true, onSelect: vi.fn() },
        ]}
        mobilePrimaryItems={[]}
        mobileMoreItems={[]}
        externalLinks={[]}
        journeyItems={[]}
        saveState="saved"
        onOpenHelp={vi.fn()}
      >
        <main><h1>도구 & 정보</h1></main>
      </GuidebookShell>,
    );

    expect(markup).toContain('class="planner-shell-primary-nav"');
    expect(markup).toContain('class="planner-shell-layout is-immersive"');
    expect(markup).not.toContain('class="planner-guide-index"');
  });

  it("uses top journey navigation and omits the retired side index", () => {
    const markup = renderToStaticMarkup(
      <GuidebookShell
        activeId="start"
        currentLabel="서비스 홈"
        guideItems={[
          { id: "start", index: "01", label: "서비스 홈", available: true, onSelect: vi.fn() },
          { id: "diagnosis", index: "02", label: "나의 진단", available: true, onSelect: vi.fn() },
        ]}
        mobilePrimaryItems={[]}
        mobileMoreItems={[]}
        externalLinks={[]}
        journeyItems={[]}
        saveState="saved"
        onOpenHelp={vi.fn()}
      >
        <main><h1>서비스 홈</h1></main>
      </GuidebookShell>,
    );

    expect(markup).toContain('class="planner-shell-primary-nav"');
    expect(markup).toContain('class="planner-shell-layout is-immersive"');
    expect(markup).not.toContain('class="planner-guide-index"');
    expect(markup).toContain('aria-current="page"');
  });

  it("renders safe department website and YouTube anchors separately from internal utility navigation", () => {
    const markup = renderToStaticMarkup(
      <GuidebookShell
        activeId="start"
        currentLabel="시작하기"
        guideItems={[]}
        mobilePrimaryItems={[]}
        mobileMoreItems={[]}
        externalLinks={[
          {
            id: "department-home",
            label: "학과 홈페이지",
            href: "https://cms.dankook.ac.kr/web/ere",
          },
          {
            id: "department-youtube",
            label: "학과 YouTube",
            href: "https://www.youtube.com/@FoodandResourcesEconomics_dku/videos",
          },
        ]}
        utilityItems={[
          { id: "overview", label: "트랙제 안내", available: true, onSelect: vi.fn() },
        ]}
        journeyItems={[]}
        saveState="saved"
        onOpenHelp={vi.fn()}
      >
        <main />
      </GuidebookShell>,
    );

    expect(markup).toContain('class="planner-shell-external-links"');
    expect(markup).toContain('aria-label="학과 공식 링크"');
    expect(markup).toContain('href="https://cms.dankook.ac.kr/web/ere"');
    expect(markup).toContain('href="https://www.youtube.com/@FoodandResourcesEconomics_dku/videos"');
    expect(markup.match(/target="_blank"/g)).toHaveLength(2);
    expect(markup.match(/rel="noopener noreferrer"/g)).toHaveLength(2);

    const externalNav = markup.match(/<nav class="planner-shell-external-links"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(externalNav).toContain("학과 홈페이지");
    expect(externalNav).toContain("학과 YouTube");
    expect(externalNav).toContain('aria-hidden="true"');
    expect(externalNav).not.toContain("aria-current");
  });

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
    expect(markup).toContain("식품자원경제학과");
    expect(markup).toContain('src="/dku-logo.png"');
    expect(markup).toContain('alt="단국대학교"');
    expect(markup).toContain("이 브라우저에 저장됨");
    expect(markup).toContain("트랙제 안내");
    expect(markup).toContain("문의사항");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="#planner-main-content"');
    expect(markup).toContain('<span>도움말</span>');
    expect(markup).toContain('aria-label="도움말 열기"');
    expect(markup).not.toContain('class="planner-shell-wordmark" aria-label=');
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
