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
  expect(html).not.toContain("mailto:");
  expect(html).not.toContain("instagram.com");
  expect(html).not.toContain("개인 프로젝트 운영자");
  expect(html).toContain("이 사이트에는 학번이나 성적표를 제출하는 문의 양식이 없습니다");
  expect(html).toContain("신청 기간과 방법");
  expect(html).toContain("별도 오류 접수 창구는 아직 마련되지 않았습니다");
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).not.toContain("<main");
 });
 it("preserves the private source metadata without publishing the supplied PDF", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[]} />);
  expect(html).not.toContain('href="/documents/2026-ere-module-track-curriculum.pdf"');
  expect(html).toContain(DEPARTMENT_CURRICULUM_URL);
  expect(html).toContain("제공된 2026 트랙 교육과정 PDF");
  expect(html).toContain("제공자료 · 원문 비공개");
  expect(html).toContain("원문 파일은 이 사이트에서 공개하지 않습니다");
  expect(html).toContain("2026-09-08");
  expect(html).toContain("공식 승인 여부나 개인별 적용이 확정됐다는 뜻은 아닙니다");
  expect(html).not.toContain("<form");
 });
 it("keeps the original history available behind an optional disclosure", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[{date:"2026-09-08",title:"확인된 변경",items:["기존 기록"]}]} />);
  expect(html).toContain("<details");
  expect(html).not.toContain('open=""');
  expect(html).toContain("기존 기록");
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
