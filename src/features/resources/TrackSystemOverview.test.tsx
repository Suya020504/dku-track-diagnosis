// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHEONAN_ACADEMIC_GUIDE_URL } from "../../data/trackApplication2026";
import { tracks } from "../../data/curriculumData";
import { TrackSystemOverview } from "./TrackSystemOverview";

let root: Root;
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
  await act(async () => root.render(<TrackSystemOverview />));
});
afterEach(async () => { await act(async () => root.unmount()); });

describe("student track introduction", () => {
  it("links to the current handbook landing page without a historical PDF page number", () => {
    const link = document.querySelector<HTMLAnchorElement>(".dku-resource-track-intro a");
    expect(link?.href).toBe(CHEONAN_ACADEMIC_GUIDE_URL);
    expect(link?.textContent).toContain("학사종합안내");
    expect(link?.textContent).not.toMatch(/파일\s*72쪽/);
    expect(link?.rel.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
  });

  it("does not repeat internal approval and source-status audit language under every track", () => {
    expect(document.body.textContent).not.toMatch(/제공된 최종안에 따른 참고 계산|개별 학생의 적용·공식 승인|공식 승인을 뜻하지/);
  });

  it("retains all five track descriptions and their expandable numerical requirements", () => {
    expect(document.querySelectorAll("[data-track-id]")).toHaveLength(5);
    for (const track of tracks) {
      const row = document.querySelector(`[data-track-id="${track.id}"]`);
      expect(row?.textContent).toContain(track.name);
      expect(row?.textContent).toContain(track.description);
      expect(row?.querySelector("details summary")).not.toBeNull();
      expect(row?.textContent).toContain("30학점");
    }
    const major = document.querySelector('[data-track-id="food-marketing"] details');
    expect(major?.textContent).toContain("5개 모듈에서 각각 6학점");
    const convergence = document.querySelector('[data-track-id="food-bio-economy"] details');
    expect(convergence?.textContent).toContain("F/H/I 각각 3학점 이상");
    expect(convergence?.textContent).toContain("합산 15학점");
    expect(convergence?.textContent).toContain("M 8학점");
    expect(convergence?.textContent).toContain("N+O 7학점");
  });
});
