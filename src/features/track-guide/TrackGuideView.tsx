import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, BookOpenCheck, ExternalLink, FileCheck2, GraduationCap, Layers3, Network, PlayCircle, Target } from "lucide-react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { modules, tracks } from "../../data/curriculumData";
import { DEPARTMENT_CONTACT_URL, DEPARTMENT_CURRICULUM_URL, DEPARTMENT_YOUTUBE_URL, OFFICIAL_TRACK_VIDEOS, TRACK_CERTIFICATE_VIDEO_URL, TRACK_DEGREE_VIDEO_URL, TRACK_LATE_ENTRY_VIDEO_URL, TRACK_QA_VIDEO_URL, privacyEnhancedEmbedUrl, type OfficialTrackVideoId } from "../../data/officialResources";
import { ACADEMIC_MAJOR_REQUIREMENTS_NOTICE_URL, CHEONAN_ACADEMIC_GUIDE_URL, TRACK_APPLICATION_2026 } from "../../data/trackApplication2026";
import type { TrackGuideSection } from "../../lib/appRouting";
import type { ModuleId, Track } from "../../types";
import { GuideOutcomes } from "./GuideOutcomes";
import { GuideApplication } from "./GuideApplication";

const GUIDE_SECTIONS = [
  { id: "overview", label: "트랙제란?", Icon: BookOpenCheck, title: "트랙제 알아보기", description: "관심 분야에 맞는 과목을 모듈로 묶고 모듈을 조합해 이수하는 전공 제도예요." },
  { id: "benefits", label: "트랙제의 장점", Icon: Target, title: "관심 분야에 맞춰 수업을 고르는 방법", description: "과목을 고르고 배운 내용을 설명할 때 트랙을 활용하는 네 가지 이유를 살펴보세요." },
  { id: "outcomes", label: "학위·이수 결과", Icon: GraduationCap, title: "학위와 트랙 이수 기록은 어떻게 다른가요?", description: "졸업할 때 받는 학위·전공명과 트랙 이수 기록의 차이를 알아보세요." },
  { id: "structure", label: "5개 트랙 구성", Icon: Layers3, title: "다섯 트랙, 어떤 모듈을 배우나요?", description: "트랙마다 함께 배우는 과목과 분야를 비교해 보세요." },
  { id: "application", label: "신청·상담 준비", Icon: FileCheck2, title: "트랙 신청은 이렇게 준비하세요", description: "신청 대상과 서식 작성, 학과 사무실 제출 순서를 확인하세요." },
  { id: "videos", label: "공식 영상·자료", Icon: PlayCircle, title: "학과의 설명을 직접 확인하세요", description: "궁금한 주제의 영상을 골라 보거나 학교 안내로 바로 이동하세요." },
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
      <h1 id="track-guide-title" ref={headingRef} tabIndex={-1}>{meta.title}</h1>
      <p>{meta.description}</p>
    </header>
    <nav ref={chaptersRef} className="guide-chapters" aria-label="트랙 가이드 목차">
      {GUIDE_SECTIONS.map((item) => <button type="button" key={item.id} aria-current={item.id === section ? "page" : undefined} onClick={() => { if (item.id !== section) onSectionChange(item.id); }}><item.Icon aria-hidden="true" /><span>{item.label}</span></button>)}
    </nav>
    {section === "overview" ? <OverviewSection onStartDiagnosis={onStartDiagnosis} onStartInterestSurvey={onStartInterestSurvey} /> : null}
    {section === "benefits" ? <BenefitsSection onContinue={() => onSectionChange("outcomes")} /> : null}
    {section === "outcomes" ? <GuideOutcomes onContinue={() => onSectionChange("structure")} /> : null}
    {section === "structure" ? <StructureSection onStartDiagnosis={onStartDiagnosis} /> : null}
    {section === "application" ? <GuideApplication onStartDiagnosis={onStartDiagnosis} /> : null}
    {section === "videos" ? <><VideosSection videoId={videoId} onVideoChange={onVideoChange} /><OfficialSourceLedger /></> : null}
    {section !== "videos" ? <footer className="guide-materials-entry" data-guide-materials-entry>
      <span>설명에 참고한 자료가 궁금하다면</span>
      <button className="guide-text-action" type="button" onClick={() => onSectionChange("videos")}>공식 영상·자료 보기 <ArrowRight aria-hidden="true" /></button>
    </footer> : null}
  </article>;
}

function OverviewSection({ onStartDiagnosis, onStartInterestSurvey }: { onStartDiagnosis: () => void; onStartInterestSurvey: () => void }) {
  return <section className="guide-overview" data-track-guide-section="overview" aria-labelledby="track-guide-overview-heading">
    <div className="guide-concept-layout">
      <figure className="guide-concept">
        <img src="/illustrations/track-module-studio.webp" alt="개별 과목 종이가 모듈 폴더에 모이고 하나의 트랙 포트폴리오로 연결되는 구조" width="1400" height="700" loading="eager" decoding="async" />
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
    { Icon: Target, title: "진로를 기준으로 과목 고르기", body: "어떤 분야를 배우고 싶은지 정하면 다음 수업을 선택하기 쉬워져요. 아직 관심 분야가 뚜렷하지 않다면 관심 설문으로 다섯 트랙을 비교해 보세요." },
    { Icon: Layers3, title: "과목을 묶어서 계획하기", body: "지금까지 들은 수업이 어느 모듈에 포함되는지 확인하고, 앞으로 더 들어야 할 과목을 함께 정리할 수 있어요." },
    { Icon: Network, title: "자연과학까지 넓혀 보기", body: "푸드바이오경제 트랙에서는 학과 전공에 바이오헬스·식품영양·식품공학 분야를 더해 배울 수 있어요." },
    { Icon: FileCheck2, title: "어떤 분야를 배웠는지 기록으로 설명하기", body: "트랙 이수 기록으로 어떤 분야를 집중해서 배웠는지 설명할 수 있어요. 졸업할 때 받는 학위명과는 구분됩니다." },
  ];
  return <section className="guide-reasons" data-track-guide-section="benefits" aria-labelledby="track-guide-benefits-heading">
    <div className="guide-reasons-intro"><h2 id="track-guide-benefits-heading">배울 과목을 고르는 기준이 생겨요.</h2><p>어떤 분야를 배울지 구체적으로 정할 수 있어요.</p></div>
    <div className="guide-reason-list">{reasons.map(({ Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
    <footer className="guide-section-footer"><NextAction onClick={onContinue}>학위·이수 결과 확인하기</NextAction></footer>
  </section>;
}

function trackModuleIds(track: Track): ModuleId[] {
  return track.rule.type === "major" ? track.rule.moduleIds : [...track.rule.baseModuleIds, ...track.rule.convergenceRequirements.flatMap((requirement) => requirement.moduleIds)];
}

function StructureSection({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  return <section className="guide-structure" data-track-guide-section="structure" aria-labelledby="track-guide-structure-heading">
    <header className="guide-comparison-intro"><div><span className="guide-eyebrow">공식 확인 · 5개 트랙 / 15개 모듈</span><h2 id="track-guide-structure-heading">학과전공 4개 + 융합전공 1개</h2></div></header>
    <p className="guide-reading-key"><strong>트랙별 모듈 살펴보기</strong> 여러 트랙에서 공통으로 배우는 모듈과 트랙마다 다른 모듈을 비교해 보세요.</p>
    <div className="guide-track-comparison">{tracks.map((track) => <article key={track.id} data-track-guide-track={track.id}><header><TrackGlyph trackId={track.id} /><span>{track.kind}</span><h3>{track.name}</h3></header><p><small>배우는 내용</small>{track.description}</p><h4>구성 모듈</h4><ul>{trackModuleIds(track).map((id) => <li key={id}><span>{id}</span>{modules.find((module) => module.id === id)?.name ?? "모듈"}</li>)}</ul></article>)}</div>
    <footer className="guide-section-footer"><span>들은 과목을 체크해 트랙별 진행도를 확인해 보세요.</span><NextAction onClick={onStartDiagnosis}>내 상황별 트랙 시뮬레이션 시작</NextAction></footer>
  </section>;
}

function VideosSection({ videoId, onVideoChange }: { videoId: OfficialTrackVideoId; onVideoChange: (videoId: OfficialTrackVideoId) => void }) {
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const video = OFFICIAL_TRACK_VIDEOS.find((item) => item.id === videoId) ?? OFFICIAL_TRACK_VIDEOS[0];
  return <section className="guide-media" data-track-guide-section="videos" aria-labelledby="track-guide-videos-heading">
    <div className="guide-media-layout"><div className="guide-viewer"><div className="guide-screen">{youtubeLoaded ? <iframe src={privacyEnhancedEmbedUrl(video.id)} title={`${video.title} 공식 YouTube 영상`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" /> : <div className="guide-consent"><PlayCircle aria-hidden="true" /><span>학과 공식 YouTube · {video.duration}</span><h2 id="track-guide-videos-heading">{video.shortTitle}</h2><p>재생을 누르면 YouTube 플레이어에 연결됩니다.</p><button type="button" className="guide-next" onClick={() => setYoutubeLoaded(true)}>공식 영상 재생 <ArrowRight aria-hidden="true" /></button></div>}</div>{youtubeLoaded ? <div className="guide-viewer-caption"><h2 id="track-guide-videos-heading">{video.shortTitle}</h2></div> : null}</div>
      <aside className="guide-playlist"><h3>궁금한 주제를 골라 보세요</h3><ol>{OFFICIAL_TRACK_VIDEOS.map((item) => <li key={item.id} data-official-track-video={item.id}><button type="button" aria-current={video.id === item.id ? "true" : undefined} onClick={() => { if (video.id !== item.id) onVideoChange(item.id as OfficialTrackVideoId); }}><PlayCircle aria-hidden="true" /><span><strong>{item.shortTitle}</strong></span></button><SourceLink href={item.watchUrl} label={`${item.title} — 유튜브에서 보기`}>유튜브에서 보기</SourceLink></li>)}</ol></aside></div>
    <p>2024년 제작된 제도 소개 영상입니다. 현재 신청 절차는 ‘신청·상담 준비’에서 확인하세요.</p>
    <details className="guide-video-moments"><summary>필요한 구간부터 보기</summary><div><SourceLink href={TRACK_LATE_ENTRY_VIDEO_URL}>중간 학년 신청 · 04:19</SourceLink><SourceLink href={TRACK_CERTIFICATE_VIDEO_URL}>트랙명 표기 · 06:50</SourceLink><SourceLink href={TRACK_DEGREE_VIDEO_URL}>학위와 트랙 · 14:20</SourceLink><SourceLink href={TRACK_QA_VIDEO_URL}>교육과정 Q&A</SourceLink><SourceLink href={DEPARTMENT_YOUTUBE_URL}>학과 YouTube 채널</SourceLink></div></details>
  </section>;
}

function OfficialSourceLedger() {
  const sources = [
    { title: "트랙 신청 공지·서식", body: "신청 일정과 제출할 서식을 확인하세요.", href: TRACK_APPLICATION_2026.noticeUrl },
    { title: "학번별 전공필수 안내", body: "입학연도에 따른 전공필수 과목을 확인하세요.", href: ACADEMIC_MAJOR_REQUIREMENTS_NOTICE_URL },
    { title: "학과 정규 교육과정", body: "전공 과목과 모듈 구성을 살펴보세요.", href: DEPARTMENT_CURRICULUM_URL },
    { title: "천안캠퍼스 학사종합안내", body: "전공학점과 졸업·학위 기준을 확인하세요.", href: CHEONAN_ACADEMIC_GUIDE_URL },
    { title: "학과 사무실 안내", body: "위치와 연락처를 확인하세요.", href: DEPARTMENT_CONTACT_URL },
  ];
  return <section className="guide-source-ledger" data-guide-source-ledger aria-labelledby="track-guide-sources-title"><header><h2 id="track-guide-sources-title">학교 바로가기</h2></header><ul>{sources.map((source) => <li key={source.href}><SourceLink href={source.href}>{source.title}</SourceLink><p>{source.body}</p></li>)}</ul></section>;
}
