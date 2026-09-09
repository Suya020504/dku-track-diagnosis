import { ArrowRight, Building2, ExternalLink, FileDown, Mail, PenLine } from "lucide-react";
import { TRACK_APPLICATION_2026 } from "../../data/trackApplication2026";
import "./guide-student-details.css";

export function GuideApplication({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  return <section className="guide-application" data-track-guide-section="application" aria-labelledby="track-guide-application-heading">
    <div className="guide-application-start">
      <div><span className="guide-eyebrow">트랙 신청 준비</span><h2 id="track-guide-application-heading">관심 트랙과 남은 과목을 먼저 살펴보세요</h2><p>졸업기한 안에 이수할 수 있는 트랙을 선택해 학과에 신청합니다.</p></div>
      <button className="guide-next" type="button" onClick={onStartDiagnosis}>내 이수 현황 정리하기<ArrowRight aria-hidden="true" /></button>
    </div>
    <section className="guide-application-round" aria-label="2026년 1학기 신청 안내">
      <div><span className="guide-closed-badge">{TRACK_APPLICATION_2026.statusLabel}</span><p>{TRACK_APPLICATION_2026.periodLabel}</p></div>
      <dl><div><dt>신청 대상</dt><dd>{TRACK_APPLICATION_2026.eligibility}</dd></div><div><dt>신청 인원</dt><dd>{TRACK_APPLICATION_2026.capacity}</dd></div></dl>
    </section>
    <ol className="guide-application-steps" aria-label="트랙 신청 준비와 제출 순서">
      <li><span aria-hidden="true">01</span><div><h3><FileDown size={20} aria-hidden="true" />학교 공지에서 신청서 받기</h3><p>공지에 첨부된 HWP 신청서와 교육과정 자료를 확인하세요.</p><a className="guide-source-link" href={TRACK_APPLICATION_2026.noticeUrl} target="_blank" rel="noopener noreferrer">신청 공지·서식 확인<ExternalLink aria-hidden="true" /></a></div></li>
      <li><span aria-hidden="true">02</span><div><h3><PenLine size={20} aria-hidden="true" />신청할 트랙을 표시하고 서명하기</h3><p>성명·학과·학번·학년·휴대폰·이메일을 적고 원하는 트랙에 √ 표시하세요. 복수 선택이 가능합니다. 신청일과 서명도 작성하세요.</p></div></li>
      <li><span aria-hidden="true">03</span><div><h3><Building2 size={20} aria-hidden="true" />학과 사무실에 원본 제출하기</h3><p>작성한 신청서 원본을 <strong>{TRACK_APPLICATION_2026.submissionRoom}</strong>에 제출합니다.</p></div></li>
    </ol>
    <div className="guide-application-cancel"><div><strong>신청한 트랙을 삭제하려면</strong><p>학과 담당자에게 이메일로 문의하세요.</p></div><a className="guide-source-link" href={TRACK_APPLICATION_2026.cancellationMailto}><Mail aria-hidden="true" />삭제 문의 메일 작성</a></div>
  </section>;
}
