import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactPage } from "./ContactPage";
import { DEPARTMENT_CONTACT_URL, DEPARTMENT_CURRICULUM_URL } from "../../data/officialResources";
import { PROVIDED_TRACK_CURRICULUM } from "../../data/departmentService";

describe("ContactPage", () => {
 it("routes academic questions to the published department contact without personal promotion", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[]} />);
  expect(html).toContain(DEPARTMENT_CONTACT_URL);
  expect(html).toContain('href="tel:0415503610"');
  expect(html).toContain("mailto:jhuu11@dankook.ac.kr");
  expect(html).not.toContain("instagram.com");
  expect(html).not.toContain("개인 프로젝트 운영자");
  expect(html).toContain("사회과학관 337호");
  expect(html).toContain("트랙 삭제 문의");
  expect(html).not.toContain("별도 오류 접수 창구");
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).not.toContain("<main");
 });
 it("keeps source audit details off the student contact page", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[]} />);
  expect(html).not.toContain('href="/documents/2026-ere-module-track-curriculum.pdf"');
  expect(html).toContain(DEPARTMENT_CURRICULUM_URL);
  expect(html).not.toContain("제공된 2026 트랙 교육과정 PDF");
  expect(html).not.toContain("자료 받은 날");
  expect(html).not.toContain("SHA-256");
  expect(html).not.toContain("<form");
 });
 it("keeps developer release history out of the student contact page", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[{date:"2026-09-08",title:"확인된 변경",items:["기존 기록"]}]} />);
  expect(html).not.toContain("날짜별 개선 내역");
  expect(html).not.toContain("기존 기록");
 });
 it("keeps document provenance separate from publication and approval", () => {
  expect(PROVIDED_TRACK_CURRICULUM.sha256).toBe("c0fe9390fcec59790fbb5a429dc2bec65a0030199176b19c5a9e49c205a7d5fc");
  expect(PROVIDED_TRACK_CURRICULUM.pageCount).toBe(6);
  expect(PROVIDED_TRACK_CURRICULUM.publishedAt).toBeNull();
  expect(PROVIDED_TRACK_CURRICULUM.approvalStatus).toBe("not-verified");
  expect(PROVIDED_TRACK_CURRICULUM.url).toBeNull();
  expect(PROVIDED_TRACK_CURRICULUM.availability).toBe("private-reference");
 });
});
