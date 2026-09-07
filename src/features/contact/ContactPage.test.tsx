import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactPage } from "./ContactPage";
import { DEPARTMENT_HOME_URL } from "../../data/officialResources";

describe("ContactPage", () => {
 it("separates official recognition questions from the personal operator", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[]} />);
  expect(html).toContain(DEPARTMENT_HOME_URL);
  expect(html).toContain('mailto:shuai020504@naver.com');
  expect(html).toContain("학번·성적표 등 개인정보는 보내지 마세요");
  expect(html.indexOf("학과 공식 안내 열기")).toBeLessThan(html.indexOf("개인 프로젝트 운영자에게 문의하기"));
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).not.toContain("<main");
 });
 it("keeps the original history available behind an optional disclosure", () => {
  const html = renderToStaticMarkup(<ContactPage updates={[{date:"2026-09-08",title:"확인된 변경",items:["기존 기록"]}]} />);
  expect(html).toContain("<details");
  expect(html).not.toContain('open=""');
  expect(html).toContain("기존 기록");
 });
});
