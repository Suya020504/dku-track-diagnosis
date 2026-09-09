import type { RefObject } from "react";
import { BookOpen, Check, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { DEPARTMENT_INQUIRY_CHECKLIST, DEPARTMENT_SUPPORT } from "../../data/departmentService";
import "./contact-page.css";

type UpdateEntry = { date: string; title: string; items: readonly string[] };
const preparation = DEPARTMENT_INQUIRY_CHECKLIST.filter(item => ["profile", "track", "record"].includes(item.id));

export function ContactPage({ headingRef }: {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  updates: readonly UpdateEntry[];
}) {
  return <div className="dku-contact-page">
    <header>
      <h1 id="contact-page-title" ref={headingRef} tabIndex={-1}>학과 사무실에 물어보세요</h1>
      <p>트랙 신청, 내 이수 기준, 증명서 발급을 안내받을 수 있어요.</p>
    </header>
    <section className="dku-contact-page__official" aria-labelledby="contact-official">
      <div><span>신청·이수·발급 문의</span><h2 id="contact-official">{DEPARTMENT_SUPPORT.name}</h2><p className="dku-contact-page__location"><MapPin size={18} aria-hidden="true" />{DEPARTMENT_SUPPORT.room}</p></div>
      <address>
        <a className="dku-contact-page__phone" href={DEPARTMENT_SUPPORT.phoneUrl} aria-label={`식품자원경제학과 사무실 ${DEPARTMENT_SUPPORT.phone} 전화하기`}><Phone aria-hidden="true" size={20} />{DEPARTMENT_SUPPORT.phone}</a>
        <a href={DEPARTMENT_SUPPORT.contactUrl} target="_blank" rel="noopener noreferrer">학과 사무실 위치·연락처 <ExternalLink aria-hidden="true" size={17} /></a>
        <a className="dku-contact-page__email" href={`${DEPARTMENT_SUPPORT.emailUrl}?subject=${encodeURIComponent("트랙 삭제 문의")}`}><Mail size={17} aria-hidden="true" />트랙 삭제 문의 · {DEPARTMENT_SUPPORT.email}</a>
      </address>
    </section>
    <section className="dku-contact-page__preparation" aria-labelledby="contact-preparation">
      <h2 id="contact-preparation">문의 전에 준비하면 좋아요</h2>
      <ul>{preparation.map(item => <li key={item.id}><Check aria-hidden="true" size={18} /><div><h3>{item.title}</h3><p>{item.description}</p></div></li>)}</ul>
    </section>
    <p><a href={DEPARTMENT_SUPPORT.curriculumUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={18} aria-hidden="true" />학과 공개 교육과정 확인 <ExternalLink aria-hidden="true" size={16} /></a></p>
  </div>;
}
