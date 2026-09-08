import type { RefObject } from "react";
import { Check, ExternalLink, FileText, Phone } from "lucide-react";
import { DEPARTMENT_INQUIRY_CHECKLIST, DEPARTMENT_SUPPORT, PROVIDED_TRACK_CURRICULUM } from "../../data/departmentService";
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
      <p>내 학번에 맞는 이수 기준이나 트랙 신청 방법이 궁금하다면 학과 사무실에 확인해 주세요.</p>
    </header>
    <section className="dku-contact-page__official" aria-labelledby="contact-official">
      <div><span>학사 기준·신청 문의</span><h2 id="contact-official">{DEPARTMENT_SUPPORT.name}</h2>
        <p>{DEPARTMENT_SUPPORT.serviceBoundary}</p></div>
      <address>
        <a className="dku-contact-page__phone" href={DEPARTMENT_SUPPORT.phoneUrl} aria-label={`식품자원경제학과 사무실 ${DEPARTMENT_SUPPORT.phone} 전화하기`}><Phone aria-hidden="true" size={20} />{DEPARTMENT_SUPPORT.phone}</a>
        <a href={DEPARTMENT_SUPPORT.contactUrl} target="_blank" rel="noopener noreferrer">학과 사무실 위치·연락처 <ExternalLink aria-hidden="true" size={17} /></a>
      </address>
    </section>
    <section className="dku-contact-page__preparation" aria-labelledby="contact-preparation">
      <h2 id="contact-preparation">문의 전에 이 내용을 정리해 두세요</h2>
      <ul>{DEPARTMENT_INQUIRY_CHECKLIST.map(item => <li key={item.id}><Check aria-hidden="true" size={18} /><div><h3>{item.title}</h3><p>{item.description}</p></div></li>)}</ul>
      <p className="dku-contact-page__privacy">이 사이트에는 학번이나 성적표를 제출하는 문의 양식이 없습니다. 필요한 개인정보는 학과가 안내한 공식 경로에서만 전달해 주세요.</p>
    </section>
    <section className="dku-contact-page__reference" aria-labelledby="contact-reference">
      <FileText aria-hidden="true" size={25} /><div><h2 id="contact-reference">계산에 참고한 자료</h2>
      <p><strong>{PROVIDED_TRACK_CURRICULUM.title}</strong> · {PROVIDED_TRACK_CURRICULUM.availabilityLabel}</p>
      <p>{PROVIDED_TRACK_CURRICULUM.pageCount}쪽 · 자료 받은 날 {PROVIDED_TRACK_CURRICULUM.receivedAt}. {PROVIDED_TRACK_CURRICULUM.boundary}</p>
      <p>{PROVIDED_TRACK_CURRICULUM.sharingNotice}</p>
      <p>참고한 내용: 과목표 2쪽 · 트랙 구성 3쪽 · 이수 경로 4–5쪽 · 학기별 교육과정 6쪽</p>
      <a href={DEPARTMENT_SUPPORT.curriculumUrl} target="_blank" rel="noopener noreferrer">학과 공개 교육과정 확인 <ExternalLink aria-hidden="true" size={16} /></a></div>
    </section>
    <details className="dku-contact-page__support">
      <summary>화면이나 계산에 문제가 있다면</summary>
      <p>문제가 생긴 화면 주소, 눌렀던 버튼, 예상과 달랐던 내용을 적어 두세요. 화면을 캡처할 때는 이름·학번·성적 등 개인정보를 가려 주세요.</p>
      <p>별도 오류 접수 창구는 아직 마련되지 않았습니다. 이수 인정에 영향을 주는 계산 결과는 학과 기준과 먼저 대조해 주세요.</p>
    </details>
    <details className="dku-contact-page__updates">
      <summary>날짜별 개선 내역</summary>
      <ol>{updates.map(entry => <li key={entry.date}>
        <time>{entry.date}</time><div><h3>{entry.title}</h3><ul>{entry.items.map(item => <li key={item}>{item}</li>)}</ul></div>
      </li>)}</ol>
    </details>
  </div>;
}
