import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, BookOpenCheck, Check, ExternalLink, FileCheck2, GraduationCap, Layers3, Network, Phone, PlayCircle, Target } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { TrackGlyph } from "../../components/TrackGlyph";
import { modules, OFFICIAL_CURRICULUM_SOURCE, tracks } from "../../data/curriculumData";
import { DEPARTMENT_INQUIRY_CHECKLIST, DEPARTMENT_SUPPORT, PROVIDED_TRACK_CURRICULUM } from "../../data/departmentService";
import { DEPARTMENT_CONTACT_URL, DEPARTMENT_CURRICULUM_URL, DEPARTMENT_GREETING_URL, DEPARTMENT_YOUTUBE_URL, DEGREE_MAJOR_NAMES_URL, OFFICIAL_TRACK_VIDEOS, TRACK_CERTIFICATE_VIDEO_URL, TRACK_DEGREE_VIDEO_URL, TRACK_LATE_ENTRY_VIDEO_URL, TRACK_QA_VIDEO_URL, TRACK_REGULATION_URL, privacyEnhancedEmbedUrl, type OfficialTrackVideoId } from "../../data/officialResources";
import type { TrackGuideSection } from "../../lib/appRouting";
import type { ModuleId, Track } from "../../types";

const GUIDE_SECTIONS = [
  { id: "overview", label: "트랙제란?", title: "트랙제 알아보기", description: "관심 분야에 맞는 과목을 모듈로 묶고 모듈을 조합해 이수하는 전공 제도예요." },
  { id: "benefits", label: "트랙제의 장점", title: "관심 분야에 맞춰 수업을 고르는 방법", description: "과목을 고르고 배운 내용을 설명할 때 트랙을 활용하는 네 가지 이유를 살펴보세요." },
  { id: "outcomes", label: "학위·이수 결과", title: "학위와 트랙 이수 기록은 어떻게 다른가요?", description: "졸업할 때 받는 학위·전공명과 트랙 이수 기록의 차이를 알아보세요." },
  { id: "structure", label: "5개 트랙 구성", title: "다섯 트랙, 어떤 모듈을 배우나요?", description: "2026학년도 학교 공개본의 트랙·모듈 구성을 비교해 보세요." },
  { id: "application", label: "신청·상담 준비", title: "트랙 신청 전에 무엇을 확인해야 하나요?", description: "내 이수 현황을 먼저 정리하고 신청 기간과 개인별 적용 기준을 학과에 물어보세요." },
  { id: "videos", label: "공식 영상·자료", title: "학과의 설명을 직접 확인하세요", description: "영상으로 제도를 이해하고 원문과 학과 답변으로 현재 기준을 확인하세요." },
] as const;

export const TRACK_GUIDE_SECTION_TITLES: Record<TrackGuideSection, string> = {
  overview: "트랙제란?", benefits: "트랙제의 장점", outcomes: "학위·이수 결과", structure: "5개 트랙 구성", application: "신청·상담 준비", videos: "공식 영상·자료",
};

function SourceLink({ href, children, label }: { href: string; children: ReactNode; label?: string }) {
  return <a className="guide-source-link" href={href} aria-label={label} target="_blank" rel="noopener noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
}

function NextAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className="guide-next" onClick={onClick}>{children}<ArrowRight aria-hidden="true" /></button>;
}

export function TrackGuideView({ section, headingRef, onSectionChange, onStartInterestSurvey, onStartDiagnosis, videoId, onVideoChange }: {
  section: TrackGuideSection;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSectionChange: (section: TrackGuideSection) => void;
  onStartInterestSurvey: () => void;
  onStartDiagnosis: () => void;
  videoId: OfficialTrackVideoId;
  onVideoChange: (videoId: OfficialTrackVideoId) => void;
}) {
  const meta = GUIDE_SECTIONS.find((item) => item.id === section) ?? GUIDE_SECTIONS[0];
  const chaptersRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = chaptersRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    // Keep the current chapter visible without moving the page or keyboard focus.
    nav.scrollLeft += active.getBoundingClientRect().left - nav.getBoundingClientRect().left - 12;
  }, [section]);
  return <article className="dku-guide-page">
    <header className="guide-chapter">
      <span className="guide-eyebrow">2026 공개·제공 교육과정 · 학생용 트랙 가이드</span>
      <h1 id="track-guide-title" ref={headingRef} tabIndex={-1}>{meta.title}</h1>
      <p>{meta.description}</p>
    </header>
    <nav ref={chaptersRef} className="guide-chapters" aria-label="트랙 가이드 목차">
      {GUIDE_SECTIONS.map((item) => <button type="button" key={item.id} aria-current={item.id === section ? "page" : undefined} onClick={() => { if (item.id !== section) onSectionChange(item.id); }}>{item.label}</button>)}
    </nav>
    {section === "overview" ? <OverviewSection onStartDiagnosis={onStartDiagnosis} onStartInterestSurvey={onStartInterestSurvey} /> : null}
    {section === "benefits" ? <BenefitsSection onContinue={() => onSectionChange("outcomes")} /> : null}
    {section === "outcomes" ? <OutcomesSection onContinue={() => onSectionChange("structure")} /> : null}
    {section === "structure" ? <StructureSection onStartDiagnosis={onStartDiagnosis} /> : null}
    {section === "application" ? <ApplicationSection onStartDiagnosis={onStartDiagnosis} /> : null}
    {section === "videos" ? <><VideosSection videoId={videoId} onVideoChange={onVideoChange} /><OfficialSourceLedger /></> : null}
  </article>;
}

function OverviewSection({ onStartDiagnosis, onStartInterestSurvey }: { onStartDiagnosis: () => void; onStartInterestSurvey: () => void }) {
  return <section className="guide-overview" data-track-guide-section="overview" aria-labelledby="track-guide-overview-heading">
    <div className="guide-concept-layout">
      <figure className="guide-concept">
        <img src="/illustrations/course-module-track-structure-v2.webp" alt="개별 수업 카드가 모듈 폴더에 모이고 여러 트랙 방향으로 이어지는 구조" />
        <figcaption className="guide-concept-captions" aria-label="과목·모듈·트랙의 관계">
          <div><BookOpenCheck aria-hidden="true" /><div><strong>과목 — 하나의 수업</strong><p>개별 과목을 배우며 기초 지식과 역량을 쌓아요.</p></div></div>
          <div><Layers3 aria-hidden="true" /><div><strong>모듈 — 관련 과목의 묶음</strong><p>공통 주제의 과목을 모아 더 깊이 배워요.</p></div></div>
          <div><Network aria-hidden="true" /><div><strong>트랙 — 모듈의 조합</strong><p>관심 진로에 맞는 모듈을 함께 이수해요.</p></div></div>
        </figcaption>
      </figure>
      <aside className="guide-fact-rail" aria-label="공식 공개본에서 확인한 수치">
        <span className="guide-eyebrow">공식 확인 · 2026 공개본</span>
        <h2 id="track-guide-overview-heading">졸업 후 진로를 고려한 구성</h2>
        <dl><div><dt>트랙</dt><dd><strong>5</strong>개 트랙</dd></div><div><dt>모듈</dt><dd><strong>15</strong>개 모듈</dd></div></dl>
        <p><strong>학과전공 4개 · 융합전공 1개</strong><br />2024학년도 개설 교육과정</p>
        <SourceLink href={OFFICIAL_CURRICULUM_SOURCE.url}>2026 공개본 확인</SourceLink>
      </aside>
    </div>
    <footer className="guide-launch">
      <div><h2>내 이수 과목으로 확인해 보세요</h2><p>들은 과목을 체크하면 트랙별 진행도와 남은 과목을 볼 수 있어요.</p></div>
      <NextAction onClick={onStartDiagnosis}>내 트랙 현황 확인하기</NextAction>
      <button className="guide-text-action" type="button" onClick={onStartInterestSurvey}>관심으로 트랙 추천받기 <ArrowRight aria-hidden="true" /></button>
    </footer>
  </section>;
}

function BenefitsSection({ onContinue }: { onContinue: () => void }) {
  const reasons = [
    { Icon: Target, title: "진로를 기준으로 과목 고르기", body: "어떤 분야를 배우고 싶은지 정하면 다음 수업을 선택하기 쉬워져요.", official: "공개 교육과정은 졸업 후 진로를 고려해 5개 트랙을 구성했다고 설명합니다.", service: "관심 설문에서는 배우고 싶은 내용과 활동을 기준으로 다섯 트랙을 비교할 수 있습니다.", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { Icon: Layers3, title: "과목을 묶어서 계획하기", body: "지금까지 들은 수업이 어느 모듈에 포함되는지 확인할 수 있어요.", official: "학교 학칙은 전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다고 규정합니다.", service: "자가진단으로 완료 과목과 앞으로 더 이수할 영역을 확인할 수 있습니다.", href: TRACK_REGULATION_URL },
    { Icon: Network, title: "자연과학까지 넓혀 보기", body: "푸드바이오경제 트랙에서 학과 전공과 자연과학을 어떻게 함께 배우는지 살펴보세요.", official: "푸드바이오경제는 자연과학과의 융합을 고려한 트랙으로 제시됩니다.", service: "학과 모듈과 바이오헬스·식품영양·식품공학 모듈의 구분과 조합을 살펴보세요.", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { Icon: FileCheck2, title: "어떤 분야를 배웠는지 기록으로 설명하기", body: "트랙 이수 기록은 학위명과 별개로 어떤 분야를 배웠는지 설명해 줘요.", official: "2024 학과 공식 영상은 이수 트랙명을 학위증·성적증명서 등에 기재하는 방식으로 설명했습니다.", service: "공식 학위명과 트랙명은 다릅니다. 트랙 이수 기록은 영상의 설명을 참고하되 현재 적용 여부는 학과 확인이 필요합니다.", href: TRACK_DEGREE_VIDEO_URL },
  ];
  return <section className="guide-reasons" data-track-guide-section="benefits" aria-labelledby="track-guide-benefits-heading">
    <div className="guide-reasons-intro"><span className="guide-eyebrow">트랙을 활용하는 네 가지 이유</span><h2 id="track-guide-benefits-heading">수업 선택에<br />배울 과목을 고르는 기준이 생겨요.</h2><p>트랙을 활용하면<br />어떤 분야를 배울지 구체적으로 정할 수 있어요.</p></div>
    <div className="guide-reason-list">{reasons.map(({ Icon, title, body, official, service, href }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p><details><summary>공식 설명과 활용 방법</summary><p><strong>학교·학과 안내</strong> {official}</p><p><strong>이렇게 활용하세요</strong> {service}</p><SourceLink href={href} label={`${title} — 근거 원문 확인`}>근거 원문 확인</SourceLink></details></div></article>)}</div>
    <footer className="guide-section-footer"><p className="guide-caution">졸업 단축·취업·자동 인정을 보장하는 제도는 아닙니다. 실제 인정과 2026년 트랙명 표기 매체·적용 학번은 학과 확인이 필요합니다.</p><NextAction onClick={onContinue}>학위·이수 결과 확인하기</NextAction></footer>
  </section>;
}

function OutcomesSection({ onContinue }: { onContinue: () => void }) {
  return <section className="guide-records" data-track-guide-section="outcomes" aria-labelledby="track-guide-outcomes-heading">
    <h2 id="track-guide-outcomes-heading" className="guide-section-title">학과의 학위명은 경제학사, 트랙은 이수한 세부 분야를 나타내요.</h2>
    <div className="guide-record-comparison">
      <article className="guide-degree"><span className="guide-eyebrow">현재 공식 명칭 · 2026 학칙 별표 2</span><GraduationCap aria-hidden="true" /><dl><div><dt>학위</dt><dd>경제학사</dd></div><div><dt>전공</dt><dd>식품자원경제학</dd></div></dl><SourceLink href={DEGREE_MAJOR_NAMES_URL}>학위·전공 명칭 원문</SourceLink></article>
      <article className="guide-track-record"><span className="guide-eyebrow">운영 설명 · 2024 학과 공식 영상</span><h3>트랙은 어떤 분야를 공부했는지 나타내요</h3><p>트랙명은 별도의 학위명이 아닙니다. 학과에서 이수한 세부 학습 분야를 뜻해요.</p><p>학과 안내 영상에서는 트랙을 ‘세부 전공’의 성격으로 설명하며 이수 트랙명을 <strong>학위증·성적증명서</strong> 등에 기재하는 방식으로 안내했습니다.</p><div className="guide-link-stack"><SourceLink href={TRACK_CERTIFICATE_VIDEO_URL}>2편 · 증명서 설명 06:50</SourceLink><SourceLink href={TRACK_DEGREE_VIDEO_URL}>3편 · 학위와 트랙 설명 14:20</SourceLink></div></article>
    </div>
    <EvidenceBand state="department-confirmation-required">2026년에 트랙명이 어떤 증명서에 표시되는지, 어떤 학번에 적용되는지와 신청 절차는 학과에 확인해 주세요. 이를 확정할 최신 공개 공지는 확인되지 않았습니다.</EvidenceBand>
    <details className="guide-support"><summary>학위·전공·트랙의 뜻과 중간 신청 안내</summary><dl className="guide-terms"><div><dt>학위</dt><dd>졸업요건을 충족한 뒤 수여되는 경제학사</dd></div><div><dt>전공</dt><dd>학칙에 기재된 식품자원경제학</dd></div><div><dt>트랙</dt><dd>푸드마케팅 등 선택한 세부 학습 방향</dd></div></dl><p>2024 공식 영상은 졸업 전 이수가 가능하면 2~4학년 학생도 신청할 수 있다고 설명합니다. 실제 신청 기간과 대상은 해당 연도 학과 공지를 확인해야 합니다.</p><SourceLink href={TRACK_LATE_ENTRY_VIDEO_URL}>2편 · 중간 신청 설명 04:19</SourceLink></details>
    <footer className="guide-section-footer"><span>트랙마다 배우는 모듈을 비교해 볼까요?</span><NextAction onClick={onContinue}>5개 트랙 구성 비교하기</NextAction></footer>
  </section>;
}

function trackModuleIds(track: Track): ModuleId[] {
  return track.rule.type === "major" ? track.rule.moduleIds : [...track.rule.baseModuleIds, ...track.rule.convergenceRequirements.flatMap((requirement) => requirement.moduleIds)];
}

function StructureSection({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  return <section className="guide-structure" data-track-guide-section="structure" aria-labelledby="track-guide-structure-heading">
    <header className="guide-comparison-intro"><div><span className="guide-eyebrow">공식 확인 · 5개 트랙 / 15개 모듈</span><h2 id="track-guide-structure-heading">학과전공 4개 + 융합전공 1개</h2></div><SourceLink href={OFFICIAL_CURRICULUM_SOURCE.url}>2026 구성 근거</SourceLink></header>
    <p className="guide-reading-key"><strong>트랙별 모듈 살펴보기</strong> 여러 트랙에서 공통으로 배우는 모듈과 트랙마다 다른 모듈을 비교해 보세요.</p>
    <div className="guide-track-comparison">{tracks.map((track) => <article key={track.id} data-track-guide-track={track.id}><header><TrackGlyph trackId={track.id} /><span>{track.kind}</span><h3>{track.name}</h3></header><p><small>배우는 내용</small>{track.description}</p><h4>구성 모듈</h4><ul>{trackModuleIds(track).map((id) => <li key={id}><span>{id}</span>{modules.find((module) => module.id === id)?.name ?? "모듈"}</li>)}</ul></article>)}</div>
    <footer className="guide-section-footer"><p className="guide-caution">모듈 목록으로 트랙별 구성을 비교할 수 있습니다. 세부 학점은 제공된 2026 트랙 교육과정 PDF를 참고해 계산합니다. 개인별 적용과 최종 인정은 학과에서 확인해 주세요.</p><NextAction onClick={onStartDiagnosis}>내 상황별 트랙 시뮬레이션 시작</NextAction></footer>
  </section>;
}

function ApplicationSection({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  return <section className="guide-application" data-track-guide-section="application" aria-labelledby="track-guide-application-heading">
    <div className="guide-application-start">
      <div><h2 id="track-guide-application-heading">들은 과목부터 정리해 두면 상담이 쉬워져요</h2><p>내 트랙 현황을 확인하는 것과 학과에 트랙을 신청하는 것은 별개예요. 여기서는 이수 현황을 정리할 수 있습니다.</p></div>
      <NextAction onClick={onStartDiagnosis}>내 이수 현황 정리하기</NextAction>
    </div>
    <div className="guide-application-context">
      <section aria-labelledby="application-known"><h3 id="application-known">자료에서 확인할 수 있는 내용</h3><p>제공된 2026 교육과정에는 모듈별 과목, 트랙 구성, 이수 경로별 학점 기준이 담겨 있어요. 과목표는 2쪽, 트랙은 3쪽, 이수 경로별 기준은 4–5쪽을 참고했습니다.</p><p><strong>{PROVIDED_TRACK_CURRICULUM.availabilityLabel}</strong><br />{PROVIDED_TRACK_CURRICULUM.sharingNotice}</p><SourceLink href={DEPARTMENT_CURRICULUM_URL}>학과 공개 교육과정 확인</SourceLink><p>2024년 안내 영상은 졸업 전 이수가 가능하면 2~4학년 학생도 신청할 수 있다고 설명합니다. 올해 신청 대상은 별도로 확인해야 해요.</p><SourceLink href={TRACK_LATE_ENTRY_VIDEO_URL}>2024년 안내 영상 · 중간 신청 04:19</SourceLink></section>
      <section className="guide-application-confirm" aria-labelledby="application-confirm"><h3 id="application-confirm">학과에 확인해야 하는 내용</h3><p><strong>2026년 신청 기간과 방법은 학과에 확인해 주세요.</strong> 신청하는 곳과 제출 자료, 승인 절차, 적용 학번, 증명서 표기 방식은 현재 확보한 자료만으로 확정할 수 없습니다.</p><p>안내가 확인되지 않았다는 뜻이며, 신청할 수 없다는 뜻은 아닙니다.</p><a className="guide-source-link" href={DEPARTMENT_SUPPORT.phoneUrl}><Phone aria-hidden="true" />학과 사무실 {DEPARTMENT_SUPPORT.phone}</a><SourceLink href={DEPARTMENT_SUPPORT.contactUrl}>학과 사무실 위치·연락처</SourceLink></section>
    </div>
    <section className="guide-application-checklist" aria-labelledby="application-checklist"><h3 id="application-checklist">상담할 때 함께 확인해 보세요</h3><ul>{DEPARTMENT_INQUIRY_CHECKLIST.map(item => <li key={item.id}><Check aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ul></section>
    <p className="guide-caution">로그인 없이 이 브라우저에 입력한 과목을 저장합니다. 이 페이지에서 학과로 신청서나 개인정보가 전송되지는 않습니다.</p>
  </section>;
}

function VideosSection({ videoId, onVideoChange }: { videoId: OfficialTrackVideoId; onVideoChange: (videoId: OfficialTrackVideoId) => void }) {
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const video = OFFICIAL_TRACK_VIDEOS.find((item) => item.id === videoId) ?? OFFICIAL_TRACK_VIDEOS[0];
  return <section className="guide-media" data-track-guide-section="videos" aria-labelledby="track-guide-videos-heading">
    <div className="guide-media-layout"><div className="guide-viewer"><div className="guide-screen">{youtubeLoaded ? <iframe src={privacyEnhancedEmbedUrl(video.id)} title={`${video.title} 공식 YouTube 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <div className="guide-consent"><PlayCircle aria-hidden="true" /><span>학과 공식 YouTube · 2024년 공식 설명</span><h2 id="track-guide-videos-heading">{video.title}</h2><p>재생을 누르면 개인정보 보호 강화 YouTube 플레이어에 연결됩니다.</p><button type="button" className="guide-next" onClick={() => setYoutubeLoaded(true)}>공식 영상 재생 <ArrowRight aria-hidden="true" /></button></div>}</div><div className="guide-viewer-caption">{youtubeLoaded ? <h2 id="track-guide-videos-heading">{video.shortTitle}</h2> : <h3>{video.shortTitle}</h3>}<span>{video.duration} · 게시 {video.publishedAt}</span><p><strong>영상 내용</strong> {video.focus}</p></div></div>
      <aside className="guide-playlist"><h3>공식 설명 영상 4편</h3><ol>{OFFICIAL_TRACK_VIDEOS.map((item) => <li key={item.id} data-official-track-video={item.id}><button type="button" aria-current={video.id === item.id ? "true" : undefined} onClick={() => { if (video.id !== item.id) onVideoChange(item.id as OfficialTrackVideoId); }}><PlayCircle aria-hidden="true" /><span><strong>{item.shortTitle}</strong><small>{item.title}</small></span></button><SourceLink href={item.watchUrl} label={`${item.title} — 유튜브에서 보기`}>유튜브에서 보기</SourceLink></li>)}</ol></aside></div>
    <div className="guide-media-footnote"><p>영상은 제도 취지에 관한 2024년 설명입니다. 2026 현재 신청·인정 기준은 공개본과 학과에서 우선 확인해야 합니다.</p><SourceLink href={TRACK_DEGREE_VIDEO_URL}>트랙명 표기 설명 14:20</SourceLink><SourceLink href={TRACK_QA_VIDEO_URL}>2024 교육과정 개편 Q&A</SourceLink><SourceLink href={DEPARTMENT_YOUTUBE_URL}>학과 공식 YouTube 채널</SourceLink></div>
  </section>;
}

function OfficialSourceLedger() {
  const sources = [
    { title: PROVIDED_TRACK_CURRICULUM.title, body: `6쪽 · 받은 날 ${PROVIDED_TRACK_CURRICULUM.receivedAt}. ${PROVIDED_TRACK_CURRICULUM.boundary}`, href: PROVIDED_TRACK_CURRICULUM.url },
    { title: "2026학년도 학사종합안내", body: "5개 트랙·15개 모듈과 트랙별 모듈 구성을 확인한 현재 공개본", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { title: "학칙 별표 2 · 학위와 전공 명칭", body: "공식 명칭: 경제학사 · 식품자원경제학", href: DEGREE_MAJOR_NAMES_URL },
    { title: "식품자원경제학과 학과장 인사말", body: "지속가능발전과 환경경제·식품자원·지역개발 교육 목표", href: DEPARTMENT_GREETING_URL },
    { title: "단국대학교 학칙 제28조의4", body: "전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다는 규정", href: TRACK_REGULATION_URL },
    { title: "학과 정규 교육과정", body: "학과 공식 교과과정 확인 경로", href: DEPARTMENT_CURRICULUM_URL },
    { title: "학과 사무실 안내", body: "천안캠퍼스 · 041-550-3610 · 개인 적용과 신청 시기 확인", href: DEPARTMENT_CONTACT_URL },
  ];
  return <section className="guide-source-ledger" data-guide-source-ledger aria-labelledby="track-guide-sources-title"><header><span className="guide-eyebrow">공개 원문·제공 자료와 확인 경로</span><h2 id="track-guide-sources-title">원문과 학과 답변이 우선합니다</h2></header><ul>{sources.map((source) => <li key={source.href ?? "provided-private-curriculum"}><div>{source.href ? <SourceLink href={source.href}>{source.title}</SourceLink> : <><span className="guide-eyebrow">{PROVIDED_TRACK_CURRICULUM.availabilityLabel}</span><strong>{source.title}</strong></>}<p>{source.body}</p>{source.href === null ? <><p>{PROVIDED_TRACK_CURRICULUM.sharingNotice}</p><details><summary>제공 자료에서 참고한 쪽수</summary><dl className="guide-terms">{PROVIDED_TRACK_CURRICULUM.pageGuide.map(item => <div key={item.pages}><dt>{item.pages}</dt><dd>{item.content}</dd></div>)}</dl><p>자료의 발행·승인일은 확인되지 않았습니다. 받은 날짜를 승인일로 사용하지 않습니다.</p></details></> : null}</div></li>)}</ul></section>;
}
