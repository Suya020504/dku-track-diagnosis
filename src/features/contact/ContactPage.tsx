import type { RefObject } from "react";
import { ExternalLink, Mail } from "lucide-react";
import { DEPARTMENT_HOME_URL } from "../../data/officialResources";
import "./contact-page.css";

type UpdateEntry = { date: string; title: string; items: readonly string[] };

export function ContactPage({ headingRef, updates }: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  updates: readonly UpdateEntry[];
}) {
  return <div className="dku-contact-page">
    <header>
      <span>문의사항</span>
      <h1 id="contact-page-title" ref={headingRef} tabIndex={-1}>무엇을 확인하고 싶으세요?</h1>
      <p>학사 인정은 학과에, 서비스 오류와 개선 의견은 개인 프로젝트 운영자에게 문의해 주세요.</p>
    </header>
    <section className="dku-contact-page__official" aria-labelledby="contact-official">
      <span>학사 기준 확인</span>
      <div><h2 id="contact-official">졸업·트랙 인정은 학과에서 확인해요</h2>
        <p>이 도구의 결과는 자가진단 참고용입니다. 실제 인정 여부와 적용 교육과정은 학과 사무실 또는 공식 안내로 확인해 주세요.</p></div>
      <a href={DEPARTMENT_HOME_URL} target="_blank" rel="noopener noreferrer">학과 공식 안내 열기 <ExternalLink aria-hidden="true" size={17} /></a>
    </section>
    <section className="dku-contact-page__operator" aria-labelledby="contact-operator">
      <div><span>오류 제보 · 데이터 검수 · 기능 제안</span><h2 id="contact-operator">개인 프로젝트 운영자에게 문의하기</h2>
        <p>어느 화면에서 어떤 일이 있었는지 알려주시면 확인에 도움이 됩니다. 학번·성적표 등 개인정보는 보내지 마세요.</p></div>
      <address>
        <strong>단국대학교 수학과 이연수</strong>
        <a href="mailto:shuai020504@naver.com"><Mail aria-hidden="true" size={18} />shuai020504@naver.com</a>
        <a href="https://www.instagram.com/yourdiary_02" target="_blank" rel="noopener noreferrer">@yourdiary_02 <ExternalLink aria-hidden="true" size={16} /></a>
      </address>
    </section>
    <details className="dku-contact-page__updates">
      <summary>날짜별 개선 내역</summary>
      <ol>{updates.map(entry => <li key={entry.date}>
        <time>{entry.date}</time><div><h3>{entry.title}</h3><ul>{entry.items.map(item => <li key={item}>{item}</li>)}</ul></div>
      </li>)}</ol>
    </details>
  </div>;
}
