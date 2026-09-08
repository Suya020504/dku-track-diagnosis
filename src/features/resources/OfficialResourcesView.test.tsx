// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OFFICIAL_2026_SOURCE } from "../../data/officialTimetable2026";
import { DEPARTMENT_CONTACT_URL, DEPARTMENT_HOME_URL, OFFICIAL_TRACK_VIDEOS } from "../../data/officialResources";
import { OfficialResourcesView } from "./OfficialResourcesView";

let root: Root;
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
  await act(async () => root.render(<OfficialResourcesView />));
});
afterEach(async () => { await act(async () => root.unmount()); });

describe("student official resource links", () => {
  it("directs students to the live handbook landing page instead of a dated PDF page fragment", () => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>(".dku-resource-source-list > li > a")];
    expect(links.map((link) => link.href)).toEqual([
      OFFICIAL_2026_SOURCE.departmentCurriculumUrl,
      OFFICIAL_2026_SOURCE.timetableUrl,
      "https://www.dankook.ac.kr/web/kor/%ED%95%99%EC%82%AC%EC%A2%85%ED%95%A9%EC%95%88%EB%82%B4-%EC%B2%9C%EC%95%88-",
    ]);
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "학과 정규 교과과정 바로가기", "수강 시간표 조회 바로가기", "학사종합안내 바로가기",
    ]);
  });

  it("does not render internal file verification, historical audit notes, or unresolved mapping records", () => {
    expect(document.querySelector(".dku-resource-method")).toBeNull();
    expect(document.body.textContent).not.toMatch(/자료 검증 기록|남은 한계|SHA-256|bytes|139쪽|파일 72쪽|인쇄 60쪽|서버 파일 수정|소급 검증|코드 밀림|공식 승인/);
    expect(document.body.textContent).not.toContain(OFFICIAL_2026_SOURCE.pdfSha256);
  });

  it("preserves all four videos and public department contact routes with safe external links", () => {
    for (const video of OFFICIAL_TRACK_VIDEOS) {
      const link = [...document.querySelectorAll<HTMLAnchorElement>("a")].find((candidate) => candidate.href === video.watchUrl);
      expect(link?.textContent).toContain(video.shortTitle);
      expect(link?.parentElement?.textContent).toContain(video.duration);
    }
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>("a")].map((link) => link.href);
    expect(hrefs).toContain(DEPARTMENT_CONTACT_URL);
    expect(hrefs).toContain(DEPARTMENT_HOME_URL);
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')) {
      expect(link.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
      expect(new URL(link.href).protocol).toBe("https:");
    }
  });
});
