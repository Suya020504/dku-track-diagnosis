import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, BookOpenCheck, ExternalLink, FileCheck2, GraduationCap, Layers3, Network, PlayCircle, Target } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { TrackGlyph } from "../../components/TrackGlyph";
import { modules, OFFICIAL_CURRICULUM_SOURCE, tracks } from "../../data/curriculumData";
import { DEPARTMENT_CONTACT_URL, DEPARTMENT_CURRICULUM_URL, DEPARTMENT_GREETING_URL, DEPARTMENT_YOUTUBE_URL, DEGREE_MAJOR_NAMES_URL, OFFICIAL_TRACK_VIDEOS, TRACK_CERTIFICATE_VIDEO_URL, TRACK_DEGREE_VIDEO_URL, TRACK_LATE_ENTRY_VIDEO_URL, TRACK_QA_VIDEO_URL, TRACK_REGULATION_URL, privacyEnhancedEmbedUrl, type OfficialTrackVideoId } from "../../data/officialResources";
import type { TrackGuideSection } from "../../lib/appRouting";
import type { ModuleId, Track } from "../../types";

const GUIDE_SECTIONS = [
  { id: "overview", label: "트랙제란?", title: "트랙제 알아보기", description: "관심 분야에 맞는 과목을 모듈로 묶어 이수하는 전공 제도예요." },
  { id: "benefits", label: "트랙제의 장점", title: "내 수업에 방향을 더하는 방법", description: "과목 선택부터 배운 내용의 설명까지, 트랙을 활용하는 네 가지 이유예요." },
  { id: "outcomes", label: "학위·이수 결과", title: "학위와 트랙 기록은 달라요", description: "공식 학위·전공 명칭과 트랙 이수 뒤 남는 기록을 구분해 보세요." },
  { id: "structure", label: "5개 트랙 구성", title: "다섯 트랙, 어떤 모듈을 배우나요?", description: "2026학년도 학교 공개본의 트랙·모듈 구성을 비교해 보세요." },
  { id: "videos", label: "공식 영상·자료", title: "학과의 설명을 직접 확인하세요", description: "영상으로 제도를 이해하고, 원문과 학과 답변으로 현재 기준을 확인하세요." },
] as const;

export const TRACK_GUIDE_SECTION_TITLES: Record<TrackGuideSection, string> = {
  overview: "트랙제란?", benefits: "트랙제의 장점", outcomes: "학위·이수 결과", structure: "5개 트랙 구성", videos: "공식 영상·자료",
};

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="guide-source-link" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
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
      <span className="guide-eyebrow">2026 공개 교육과정 · 학생용 트랙 가이드</span>
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
    {section === "videos" ? <><VideosSection videoId={videoId} onVideoChange={onVideoChange} /><OfficialSourceLedger /></> : null}
  </article>;
}

function OverviewSection({ onStartDiagnosis, onStartInterestSurvey }: { onStartDiagnosis: () => void; onStartInterestSurvey: () => void }) {
  return <section className="guide-overview" data-track-guide-section="overview" aria-labelledby="track-guide-overview-heading">
    <div className="guide-concept-layout">
      <figure className="guide-concept">
        <img src="/illustrations/course-module-track-structure-v2.webp" alt="개별 수업 카드가 모듈 폴더에 모이고, 여러 트랙 방향으로 이어지는 구조" />
        <figcaption className="guide-concept-captions" aria-label="과목에서 진로 방향으로 이어지는 구조">
          <div><BookOpenCheck aria-hidden="true" /><div><strong>과목 — 하나의 수업</strong><p>개별 과목을 배우며 기초 지식과 역량을 쌓아요.</p></div></div>
          <div><Layers3 aria-hidden="true" /><div><strong>모듈 — 관련 과목의 묶음</strong><p>공통 주제의 과목을 모아 더 깊이 배워요.</p></div></div>
          <div><Network aria-hidden="true" /><div><strong>트랙 — 모듈의 조합</strong><p>관심 진로에 맞는 모듈을 함께 이수해요.</p></div></div>
        </figcaption>
      </figure>
      <aside className="guide-fact-rail" aria-label="공식 공개본 핵심 수치">
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
    { Icon: Target, title: "진로를 기준으로 과목 고르기", body: "어떤 분야를 배우고 싶은지 정하면 다음 수업을 선택하기 쉬워져요.", official: "공개 교육과정은 졸업 후 진로를 고려해 5개 트랙을 구성했다고 설명합니다.", service: "관심 설문은 배우고 싶은 내용과 활동을 기준으로 다섯 방향을 비교합니다.", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { Icon: Layers3, title: "과목을 묶어서 계획하기", body: "하나씩 들었던 수업이 어느 모듈에 쌓였는지 확인할 수 있어요.", official: "학교 학칙은 전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다고 규정합니다.", service: "자가진단은 완료 과목과 남은 영역을 나눠 보여줍니다.", href: TRACK_REGULATION_URL },
    { Icon: Network, title: "자연과학까지 넓혀 보기", body: "푸드바이오경제 트랙에서 학과와 자연과학의 연결을 살펴보세요.", official: "푸드바이오경제는 자연과학과의 융합을 고려한 트랙으로 제시됩니다.", service: "학과 모듈과 바이오헬스·식품영양·식품공학 모듈을 구분합니다.", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { Icon: FileCheck2, title: "배운 방향을 기록으로 설명하기", body: "학위명과 구별되는 트랙 이수 기록의 의미를 이해할 수 있어요.", official: "2024 학과 공식 영상은 이수 트랙명을 학위증·성적증명서 등에 기재하는 방식으로 설명했습니다.", service: "공식 학위명과 트랙명을 섞지 않고, 확인된 기록과 학과 확인이 필요한 부분을 구분합니다.", href: TRACK_DEGREE_VIDEO_URL },
  ];
  return <section className="guide-reasons" data-track-guide-section="benefits" aria-labelledby="track-guide-benefits-heading">
    <div className="guide-reasons-intro"><span className="guide-eyebrow">트랙을 활용하는 네 가지 이유</span><h2 id="track-guide-benefits-heading">수업 선택에<br />나만의 기준이 생겨요.</h2><p>트랙의 장점은 자동 인정이 아니라,<br />배울 방향을 구체적으로 정하는 데 있어요.</p></div>
    <div className="guide-reason-list">{reasons.map(({ Icon, title, body, official, service, href }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p><details><summary>공식 근거와 서비스 역할</summary><p><strong>공식 확인</strong> {official}</p><p><strong>서비스 역할</strong> {service}</p><SourceLink href={href}>근거 원문 확인</SourceLink></details></div></article>)}</div>
    <footer className="guide-section-footer"><p className="guide-caution">졸업 단축·취업·자동 인정을 보장하는 제도는 아닙니다. 실제 인정과 2026년 트랙명 표기 매체·적용 학번은 학과 확인이 필요합니다.</p><NextAction onClick={onContinue}>학위·이수 결과 확인하기</NextAction></footer>
  </section>;
}

function OutcomesSection({ onContinue }: { onContinue: () => void }) {
  return <section className="guide-records" data-track-guide-section="outcomes" aria-labelledby="track-guide-outcomes-heading">
    <h2 id="track-guide-outcomes-heading" className="guide-section-title">공식 명칭과 이수 기록, 두 가지로 나눠 보세요.</h2>
    <div className="guide-record-comparison">
      <article className="guide-degree"><span className="guide-eyebrow">현재 공식 명칭 · 2026 학칙 별표 2</span><GraduationCap aria-hidden="true" /><dl><div><dt>학위</dt><dd>경제학사</dd></div><div><dt>전공</dt><dd>식품자원경제학</dd></div></dl><SourceLink href={DEGREE_MAJOR_NAMES_URL}>학위·전공 명칭 원문</SourceLink></article>
      <article className="guide-track-record"><span className="guide-eyebrow">운영 설명 · 2024 학과 공식 영상</span><h3>트랙은 세부 학습 방향의 기록</h3><p>별도의 학위명이 아니라, 경제학사 안에서 이수한 학습 방향을 설명합니다.</p><p>공식 영상에서는 트랙을 ‘세부 전공’의 성격으로 설명하며, 이수 트랙명을 <strong>학위증·성적증명서</strong> 등에 기재하는 방식으로 안내했습니다.</p><div className="guide-link-stack"><SourceLink href={TRACK_CERTIFICATE_VIDEO_URL}>2편 · 증명서 설명 06:50</SourceLink><SourceLink href={TRACK_DEGREE_VIDEO_URL}>3편 · 학위와 트랙 설명 14:20</SourceLink></div></article>
    </div>
    <EvidenceBand state="department-confirmation-required">2026 운영 여부는 학과 확인 필요 항목입니다. 트랙명의 실제 표기 매체, 적용 학번·신청 절차를 확정하는 최신 공개 공지는 확인되지 않았습니다.</EvidenceBand>
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
    <p className="guide-reading-key"><strong>서비스에서 이렇게 이해해요</strong> 공통 모듈은 연결점, 다른 모듈은 트랙의 개성이에요.</p>
    <div className="guide-track-comparison">{tracks.map((track) => <article key={track.id} data-track-guide-track={track.id}><header><TrackGlyph trackId={track.id} /><span>{track.kind}</span><h3>{track.name}</h3></header><p><small>서비스 요약</small>{track.description}</p><h4>구성 모듈</h4><ul>{trackModuleIds(track).map((id) => <li key={id}><span>{id}</span>{modules.find((module) => module.id === id)?.name ?? "모듈"}</li>)}</ul></article>)}</div>
    <footer className="guide-section-footer"><p className="guide-caution">모듈 목록은 구성 비교용입니다. 앱의 세부 학점 계산은 사용자가 제공한 2026 최종안 기준 참고 계산이며, 개인별 적용과 최종 인정은 학과 공식 확인이 필요합니다.</p><NextAction onClick={onStartDiagnosis}>내 상황별 트랙 시뮬레이션 시작</NextAction></footer>
  </section>;
}

function VideosSection({ videoId, onVideoChange }: { videoId: OfficialTrackVideoId; onVideoChange: (videoId: OfficialTrackVideoId) => void }) {
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const video = OFFICIAL_TRACK_VIDEOS.find((item) => item.id === videoId) ?? OFFICIAL_TRACK_VIDEOS[0];
  return <section className="guide-media" data-track-guide-section="videos" aria-labelledby="track-guide-videos-heading">
    <div className="guide-media-layout"><div className="guide-viewer"><div className="guide-screen">{youtubeLoaded ? <iframe src={privacyEnhancedEmbedUrl(video.id)} title={`${video.title} 공식 YouTube 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <div className="guide-consent"><PlayCircle aria-hidden="true" /><span>학과 공식 YouTube · 2024년 공식 설명</span><h2 id="track-guide-videos-heading">{video.title}</h2><p>재생을 누르면 개인정보 보호 강화 YouTube 플레이어에 연결됩니다.</p><button type="button" className="guide-next" onClick={() => setYoutubeLoaded(true)}>공식 영상 재생 <ArrowRight aria-hidden="true" /></button></div>}</div><div className="guide-viewer-caption">{youtubeLoaded ? <h2 id="track-guide-videos-heading">{video.shortTitle}</h2> : <h3>{video.shortTitle}</h3>}<span>{video.duration} · 게시 {video.publishedAt}</span><p><strong>서비스 요약</strong> {video.focus}</p></div></div>
      <aside className="guide-playlist"><h3>공식 설명 영상 4편</h3><ol>{OFFICIAL_TRACK_VIDEOS.map((item) => <li key={item.id} data-official-track-video={item.id}><button type="button" aria-current={video.id === item.id ? "true" : undefined} onClick={() => { if (video.id !== item.id) onVideoChange(item.id as OfficialTrackVideoId); }}><PlayCircle aria-hidden="true" /><span><strong>{item.shortTitle}</strong><small>{item.title}</small></span></button><SourceLink href={item.watchUrl}>유튜브에서 보기</SourceLink></li>)}</ol></aside></div>
    <div className="guide-media-footnote"><p>영상은 제도 취지에 관한 2024년 설명입니다. 2026 현재 신청·인정 기준은 공개본과 학과 확인이 우선합니다.</p><SourceLink href={TRACK_DEGREE_VIDEO_URL}>트랙명 표기 설명 14:20</SourceLink><SourceLink href={TRACK_QA_VIDEO_URL}>2024 교육과정 개편 Q&A</SourceLink><SourceLink href={DEPARTMENT_YOUTUBE_URL}>학과 공식 YouTube 채널</SourceLink></div>
  </section>;
}

function OfficialSourceLedger() {
  const sources = [
    { title: "2026학년도 학사종합안내", body: "5개 트랙·15개 모듈과 트랙별 모듈 구성을 확인한 현재 공개본", href: OFFICIAL_CURRICULUM_SOURCE.url },
    { title: "학칙 별표 2 · 학위와 전공 명칭", body: "공식 명칭: 경제학사 · 식품자원경제학", href: DEGREE_MAJOR_NAMES_URL },
    { title: "식품자원경제학과 학과장 인사말", body: "지속가능발전과 환경경제·식품자원·지역개발 교육 목표", href: DEPARTMENT_GREETING_URL },
    { title: "단국대학교 학칙 제28조의4", body: "전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다는 규정", href: TRACK_REGULATION_URL },
    { title: "학과 정규 교육과정", body: "학과 공식 교과과정 확인 경로", href: DEPARTMENT_CURRICULUM_URL },
    { title: "학과 사무실 안내", body: "천안캠퍼스 · 041-550-3610 · 개인 적용과 신청 시기 확인", href: DEPARTMENT_CONTACT_URL },
  ];
  return <section className="guide-source-ledger" data-guide-source-ledger aria-labelledby="track-guide-sources-title"><header><span className="guide-eyebrow">공식 근거와 확인 경로</span><h2 id="track-guide-sources-title">원문과 학과 답변이 우선합니다</h2></header><ul>{sources.map((source) => <li key={source.href}><div><SourceLink href={source.href}>{source.title}</SourceLink><p>{source.body}</p></div></li>)}</ul></section>;
}
