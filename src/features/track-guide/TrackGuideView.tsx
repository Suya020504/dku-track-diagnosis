import { useState, type RefObject } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  GraduationCap,
  Layers3,
  Network,
  Phone,
  PlayCircle,
  Sparkles,
  Target,
  Youtube,
} from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { TrackGlyph } from "../../components/TrackGlyph";
import { modules, OFFICIAL_CURRICULUM_SOURCE, tracks } from "../../data/curriculumData";
import {
  DEPARTMENT_CONTACT_URL,
  DEPARTMENT_CURRICULUM_URL,
  DEPARTMENT_GREETING_URL,
  DEPARTMENT_YOUTUBE_URL,
  DEGREE_MAJOR_NAMES_URL,
  OFFICIAL_TRACK_VIDEOS,
  TRACK_CERTIFICATE_VIDEO_URL,
  TRACK_DEGREE_VIDEO_URL,
  TRACK_LATE_ENTRY_VIDEO_URL,
  TRACK_QA_VIDEO_URL,
  TRACK_REGULATION_URL,
  privacyEnhancedEmbedUrl,
  type OfficialTrackVideo,
  type OfficialTrackVideoId,
} from "../../data/officialResources";
import type { TrackGuideSection } from "../../lib/appRouting";
import type { ModuleId, Track } from "../../types";

const GUIDE_SECTIONS: readonly {
  id: TrackGuideSection;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "트랙제란?",
    title: "트랙제 알아보기",
    description: "관심 분야에 맞는 과목을 모듈로 묶어 이수하고, 전공 안에서 나의 전문 분야를 정하는 제도예요.",
  },
  {
    id: "benefits",
    label: "트랙제의 장점",
    title: "트랙을 이수하면 좋은 점",
    description: "진로에 맞춰 과목을 선택하고, 배운 내용을 하나의 전문 분야로 연결할 수 있어요.",
  },
  {
    id: "outcomes",
    label: "학위·이수 결과",
    title: "학위와 트랙 이수 기록",
    description: "공식 학위·전공 명칭과 트랙 이수 뒤 남는 기록을 근거별로 나누어 설명합니다.",
  },
  {
    id: "structure",
    label: "5개 트랙 구성",
    title: "다섯 트랙 비교하기",
    description: "2026학년도 학교 공개본의 트랙·모듈 구성을 한 화면에서 비교합니다.",
  },
  {
    id: "videos",
    label: "공식 영상·자료",
    title: "공식 영상과 자료",
    description: "2024년 공식 설명 영상은 바로 재생하고, 현재 이수 기준은 2026 공개본과 학과 답변을 우선합니다.",
  },
] as const;

export const TRACK_GUIDE_SECTION_TITLES: Record<TrackGuideSection, string> = {
  overview: "트랙제란?",
  benefits: "트랙제의 장점",
  outcomes: "학위·이수 결과",
  structure: "5개 트랙 구성",
  videos: "공식 영상·자료",
};

export function TrackGuideView({
  section,
  headingRef,
  onSectionChange,
  onStartInterestSurvey,
  onStartDiagnosis,
  videoId,
  onVideoChange,
}: {
  section: TrackGuideSection;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSectionChange: (section: TrackGuideSection) => void;
  onStartInterestSurvey: () => void;
  onStartDiagnosis: () => void;
  videoId: OfficialTrackVideoId;
  onVideoChange: (videoId: OfficialTrackVideoId) => void;
}) {
  const sectionMeta = GUIDE_SECTIONS.find((item) => item.id === section) ?? GUIDE_SECTIONS[0];

  return (
    <article className="planner-track-guide">
      <header className="planner-track-guide__header">
        <div>
          <span>2026 공개 교육과정 · 학생용 트랙 가이드</span>
          <h1 id="track-guide-title" ref={headingRef} tabIndex={-1}>{sectionMeta.title}</h1>
          <p>{sectionMeta.description}</p>
        </div>
        {section === "overview" || section === "structure" ? <dl aria-label="공식 공개본 핵심 수치">
          <div><dt>개설</dt><dd>2024</dd></div>
          <div><dt>트랙</dt><dd>5개</dd></div>
          <div><dt>모듈</dt><dd>15개</dd></div>
        </dl> : null}
      </header>

      <nav className="planner-track-guide__tabs" aria-label="트랙 가이드 목차">
        {GUIDE_SECTIONS.map((item, index) => (
          <button
            className="planner-focusable"
            type="button"
            key={item.id}
            aria-current={item.id === section ? "page" : undefined}
            onClick={() => {
              if (item.id !== section) onSectionChange(item.id);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {section === "overview" ? (
        <OverviewSection
          onStartInterestSurvey={onStartInterestSurvey}
          onStartDiagnosis={onStartDiagnosis}
        />
      ) : null}
      {section === "benefits" ? (
        <BenefitsSection
          onContinue={() => onSectionChange("outcomes")}
          onStartInterestSurvey={onStartInterestSurvey}
        />
      ) : null}
      {section === "outcomes" ? (
        <DegreeOutcomesSection
          onContinue={() => onSectionChange("structure")}
          onStartDiagnosis={onStartDiagnosis}
        />
      ) : null}
      {section === "structure" ? <StructureSection onStartDiagnosis={onStartDiagnosis} /> : null}
      {section === "videos" ? <VideosSection videoId={videoId} onVideoChange={onVideoChange} /> : null}

      {section === "videos" ? <OfficialSourceLedger /> : null}
    </article>
  );
}

function OverviewSection({
  onStartInterestSurvey,
  onStartDiagnosis,
}: {
  onStartInterestSurvey: () => void;
  onStartDiagnosis: () => void;
}) {
  return (
    <section className="planner-track-guide__section" data-track-guide-section="overview" aria-labelledby="track-guide-overview-heading">
      <div className="planner-track-guide__flow" aria-label="과목에서 진로 방향으로 이어지는 구조">
        <div><BookOpenCheck aria-hidden="true" /><span>과목</span><strong>배우는 단위</strong></div>
        <ArrowRight aria-hidden="true" />
        <div><Layers3 aria-hidden="true" /><span>모듈</span><strong>비슷한 과목 묶음</strong></div>
        <ArrowRight aria-hidden="true" />
        <div><Network aria-hidden="true" /><span>트랙</span><strong>모듈의 조합</strong></div>
        <ArrowRight aria-hidden="true" />
        <div><Target aria-hidden="true" /><span>진로 방향</span><strong>나의 전공 이야기</strong></div>
      </div>

      <div className="planner-track-guide__split">
        <section className="planner-track-guide__fact" aria-labelledby="track-guide-overview-heading">
          <span>공식 확인</span>
          <h2 id="track-guide-overview-heading">졸업 후 진로를 고려한 5개 트랙</h2>
          <p>
            학교 2026 공개본은 식품자원경제학과 트랙제를 2024학년도 개설 교육과정으로 안내하며,
            학과전공 4개와 자연과학 융합전공 1개를 제시합니다.
          </p>
          <ul>
            <li><CheckCircle2 aria-hidden="true" /> 학과전공 4개</li>
            <li><CheckCircle2 aria-hidden="true" /> 융합전공 1개</li>
            <li><CheckCircle2 aria-hidden="true" /> 총 15개 모듈</li>
          </ul>
        </section>
        <section className="planner-track-guide__interpretation" aria-labelledby="track-guide-service-meaning">
          <span>서비스에서 이렇게 이해해요</span>
          <h2 id="track-guide-service-meaning">내 이수 과목으로 확인해 보세요</h2>
          <p>
            들은 과목을 체크하면 트랙별 진행도와 남은 과목을 확인할 수 있어요.
            관심 분야가 아직 정해지지 않았다면 관심 설문부터 시작해도 됩니다.
          </p>
        </section>
      </div>

      <div className="planner-track-guide__actions">
        <button className="planner-track-guide__primary planner-focusable" type="button" onClick={onStartDiagnosis}>
          내 트랙 현황 확인하기 <ArrowRight aria-hidden="true" />
        </button>
        <button className="planner-track-guide__secondary planner-focusable" type="button" onClick={onStartInterestSurvey}>
          관심으로 트랙 추천받기
        </button>
      </div>
    </section>
  );
}

function BenefitsSection({
  onContinue,
  onStartInterestSurvey,
}: {
  onContinue: () => void;
  onStartInterestSurvey: () => void;
}) {
  const benefits = [
    {
      Icon: Target,
      title: "진로와 연결해 과목을 읽기",
      official: "공개 교육과정은 졸업 후 진로를 고려해 5개 트랙을 구성했다고 설명합니다.",
      service: "관심 설문은 배우고 싶은 내용과 활동을 기준으로 다섯 방향을 비교합니다.",
    },
    {
      Icon: Layers3,
      title: "낱개 과목 대신 모듈로 계획하기",
      official: "학교 학칙은 전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다고 규정합니다.",
      service: "자가진단은 완료 과목이 어떤 모듈에 쌓였는지와 남은 영역을 나눠 보여줍니다.",
    },
    {
      Icon: Network,
      title: "학과와 자연과학을 함께 탐색하기",
      official: "5개 중 푸드바이오경제는 자연과학과의 융합을 고려한 트랙으로 제시됩니다.",
      service: "학과 모듈과 바이오헬스·식품영양·식품공학 모듈을 한 화면에서 구분합니다.",
    },
    {
      Icon: GraduationCap,
      title: "배운 방향을 학위·증명 기록으로 설명하기",
      official: "2024 학과 공식 영상은 이수 트랙명을 학위증·성적증명서 등에 기재하는 방식으로 설명했습니다.",
      service: "공식 학위명과 트랙명을 섞지 않고, 실제로 확인된 기록과 학과 확인이 필요한 부분을 나눠 보여줍니다.",
    },
  ] as const;

  return (
    <section className="planner-track-guide__section" data-track-guide-section="benefits" aria-labelledby="track-guide-benefits-heading">
      <header className="planner-track-guide__section-heading">
        <span>공식 구조에서 읽는 세 가지 의미</span>
        <h2 id="track-guide-benefits-heading">장점은 ‘자동 인정’이 아니라 선택의 근거가 생긴다는 점입니다</h2>
      </header>
      <ol className="planner-track-guide__benefits">
        {benefits.map(({ Icon, title, official, service }, index) => (
          <li key={title}>
            <div className="planner-track-guide__benefit-index">{String(index + 1).padStart(2, "0")}</div>
            <Icon aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p><strong>공식 확인</strong>{official}</p>
              <p><strong>서비스 역할</strong>{service}</p>
            </div>
          </li>
        ))}
      </ol>
      <EvidenceBand state="department-confirmation-required">
        트랙 선택이 졸업 단축·취업·자동 인정을 보장한다는 공식 근거는 확인되지 않았습니다.
        2026년 실제 트랙명 표기 매체와 적용 학번은 학과에 확인해 주세요.
      </EvidenceBand>
      <div className="planner-track-guide__actions">
        <button className="planner-track-guide__primary planner-focusable" type="button" onClick={onContinue}>
          학위·이수 결과 확인하기 <ArrowRight aria-hidden="true" />
        </button>
        <button className="planner-track-guide__secondary planner-focusable" type="button" onClick={onStartInterestSurvey}>
          내 관심 방향부터 확인하기
        </button>
      </div>
    </section>
  );
}

function DegreeOutcomesSection({
  onContinue,
  onStartDiagnosis,
}: {
  onContinue: () => void;
  onStartDiagnosis: () => void;
}) {
  return (
    <section className="planner-track-guide__section" data-track-guide-section="outcomes" aria-labelledby="track-guide-outcomes-heading">
      <header className="planner-track-guide__section-heading">
        <span>2026 학칙과 2024 학과 공식 영상을 함께 확인</span>
        <h2 id="track-guide-outcomes-heading">경제학사 안에서, 내가 이수한 트랙 방향을 더 구체적으로 남깁니다</h2>
        <p>‘세부학위’라는 한 단어로 묶지 않고 학위, 전공, 트랙 기록을 각각 구분했습니다.</p>
      </header>

      <div className="planner-track-guide__degree-grid">
        <article className="planner-track-guide__degree-card is-current">
          <span>현재 공식 명칭 · 2026 학칙 별표 2</span>
          <GraduationCap aria-hidden="true" />
          <h3>학위는 경제학사, 전공은 식품자원경제학</h3>
          <dl>
            <div><dt>학위</dt><dd>경제학사</dd></div>
            <div><dt>전공</dt><dd>식품자원경제학</dd></div>
          </dl>
          <p>트랙은 별도의 학위명이 아니라, 경제학사 안에서 이수한 세부 학습 방향을 설명하는 기록입니다.</p>
          <a href={DEGREE_MAJOR_NAMES_URL} target="_blank" rel="noopener noreferrer">
            학위·전공 명칭 원문 <ExternalLink aria-hidden="true" />
          </a>
        </article>

        <article className="planner-track-guide__degree-card is-guidance">
          <span>운영 설명 · 2024 학과 공식 영상</span>
          <FileCheck2 aria-hidden="true" />
          <h3>트랙명은 세부 학습 방향을 보여주는 기록으로 안내됐습니다</h3>
          <p>
            공식 영상에서는 트랙을 ‘세부 전공’의 성격으로 설명하고,
            이수 트랙명을 학위증·성적증명서 등에 기재하는 방식으로 안내합니다.
          </p>
          <div className="planner-track-guide__degree-links">
            <a href={TRACK_CERTIFICATE_VIDEO_URL} target="_blank" rel="noopener noreferrer">
              2편 · 증명서 설명 06:50 <ExternalLink aria-hidden="true" />
            </a>
            <a href={TRACK_DEGREE_VIDEO_URL} target="_blank" rel="noopener noreferrer">
              3편 · 학위와 트랙 설명 14:20 <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </article>
      </div>

      <dl className="planner-track-guide__degree-terms" aria-label="학위와 트랙 용어 구분">
        <div><dt>학위</dt><dd>졸업요건을 충족한 뒤 수여되는 <strong>경제학사</strong></dd></div>
        <div><dt>전공</dt><dd>학칙에 기재된 <strong>식품자원경제학</strong></dd></div>
        <div><dt>트랙</dt><dd>푸드마케팅 등 선택한 <strong>세부 학습 방향</strong></dd></div>
      </dl>

      <div className="planner-track-guide__entry-note">
        <Clock3 aria-hidden="true" />
        <div>
          <strong>2·3학년도 중간 진입을 검토할 수 있어요</strong>
          <p>2024 공식 영상은 졸업 전 이수가 가능하면 2~4학년 학생도 신청할 수 있다고 설명합니다. 실제 신청 기간과 대상은 해당 연도 학과 공지를 확인해야 합니다.</p>
          <a href={TRACK_LATE_ENTRY_VIDEO_URL} target="_blank" rel="noopener noreferrer">
            2편 · 중간 신청 설명 04:19 <ExternalLink aria-hidden="true" />
          </a>
        </div>
      </div>

      <EvidenceBand state="department-confirmation-required">
        2026 학칙 별표에서 학위·전공 명칭은 확인했지만, 트랙명의 실제 학위증·성적증명서 표기 매체와
        2026 적용 학번·신청 절차를 확정하는 최신 공개 공지는 찾지 못했습니다. 2026 운영 여부는 학과 확인 필요 항목입니다.
      </EvidenceBand>

      <div className="planner-track-guide__actions">
        <button className="planner-track-guide__primary planner-focusable" type="button" onClick={onContinue}>
          5개 트랙 구성 비교하기 <ArrowRight aria-hidden="true" />
        </button>
        <button className="planner-track-guide__secondary planner-focusable" type="button" onClick={onStartDiagnosis}>
          내 현황 바로 확인하기
        </button>
      </div>
    </section>
  );
}

function StructureSection({ onStartDiagnosis }: { onStartDiagnosis: () => void }) {
  return (
    <section className="planner-track-guide__section" data-track-guide-section="structure" aria-labelledby="track-guide-structure-heading">
      <div className="planner-track-guide__structure-intro">
        <div>
          <span>공식 확인</span>
          <h2 id="track-guide-structure-heading">학과전공 4개 + 융합전공 1개</h2>
          <p>각 트랙은 서로 다른 모듈 조합으로 방향을 구분합니다.</p>
        </div>
        <div className="planner-track-guide__interpretation-stamp">
          <Sparkles aria-hidden="true" />
          <span>서비스에서 이렇게 이해해요</span>
          <strong>공통 모듈은 연결점, 다른 모듈은 트랙의 개성</strong>
        </div>
      </div>

      <ol className="planner-track-guide__track-list">
        {tracks.map((track, index) => (
          <li key={track.id} data-track-guide-track={track.id}>
            <div className="planner-track-guide__track-index">{String(index + 1).padStart(2, "0")}</div>
            <TrackGlyph trackId={track.id} />
            <div className="planner-track-guide__track-copy">
              <p>{track.kind}</p>
              <h3>{track.name}</h3>
              <span><em>서비스 요약</em>{track.description}</span>
            </div>
            <div className="planner-track-guide__module-list">
              {trackModuleIds(track).map((moduleId) => (
                <span key={moduleId}>{moduleId} · {moduleName(moduleId)}</span>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="planner-track-guide__structure-summary">
        <span><strong>5개 트랙</strong> 진로 방향 비교</span>
        <span><strong>15개 모듈</strong> 과목 묶음</span>
        <span><strong>2026 공개본</strong> 구성 근거</span>
      </div>
      <EvidenceBand state="provided-final-plan-reference">
        앱의 세부 학점 계산은 사용자가 제공한 2026 최종안 기준 참고 계산입니다.
        개인별 적용과 최종 인정은 학과 공식 확인이 필요합니다.
      </EvidenceBand>
      <button className="planner-track-guide__primary planner-focusable" type="button" onClick={onStartDiagnosis}>
        내 상황별 트랙 시뮬레이션 시작 <ArrowRight aria-hidden="true" />
      </button>
    </section>
  );
}

function VideosSection({
  videoId,
  onVideoChange,
}: {
  videoId: OfficialTrackVideoId;
  onVideoChange: (videoId: OfficialTrackVideoId) => void;
}) {
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const selectedVideo = OFFICIAL_TRACK_VIDEOS.find((video) => video.id === videoId)
    ?? OFFICIAL_TRACK_VIDEOS[0];

  function chooseVideo(video: OfficialTrackVideo) {
    if (video.id !== selectedVideo.id) onVideoChange(video.id as OfficialTrackVideoId);
  }

  return (
    <section className="planner-track-guide__section" data-track-guide-section="videos" aria-labelledby="track-guide-videos-heading">
      <header className="planner-track-guide__section-heading">
        <span>학과 공식 YouTube · 2024년 공식 설명</span>
        <h2 id="track-guide-videos-heading">한 편씩 골라 바로 볼 수 있어요</h2>
        <p>영상은 제도의 취지를 이해하는 자료이며, 2026 현재 신청·인정 기준은 학과 확인이 우선합니다.</p>
      </header>

      <div className="planner-track-guide__video-layout">
        <div className="planner-track-guide__player">
          {youtubeLoaded ? (
            <iframe
              src={privacyEnhancedEmbedUrl(selectedVideo.id)}
              title={`${selectedVideo.title} 공식 YouTube 영상`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="planner-track-guide__video-consent">
              <PlayCircle aria-hidden="true" />
              <span>선택한 영상</span>
              <h3>{selectedVideo.title}</h3>
              <p>재생을 누르면 개인정보 보호 강화 YouTube 플레이어에 연결됩니다.</p>
              <button className="planner-focusable" type="button" onClick={() => setYoutubeLoaded(true)}>
                공식 영상 재생
              </button>
            </div>
          )}
          <div className="planner-track-guide__player-meta">
            <strong>{selectedVideo.shortTitle}</strong>
            <span>{selectedVideo.duration} · 게시 {selectedVideo.publishedAt}</span>
            <p><em>서비스 요약</em>{selectedVideo.focus}</p>
          </div>
        </div>

        <ol className="planner-track-guide__video-list">
          {OFFICIAL_TRACK_VIDEOS.map((video) => (
            <li key={video.id} data-official-track-video={video.id}>
              <button
                className="planner-focusable"
                type="button"
                aria-current={selectedVideo.id === video.id ? "true" : undefined}
                onClick={() => chooseVideo(video)}
              >
                <PlayCircle aria-hidden="true" />
                <span><strong>{video.shortTitle}</strong><small>{video.title}</small></span>
              </button>
              <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                유튜브에서 보기 <ExternalLink aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="planner-track-guide__video-links">
        <a href={TRACK_DEGREE_VIDEO_URL} target="_blank" rel="noopener noreferrer">
          <GraduationCap aria-hidden="true" /> 트랙명 표기 설명 14:20 <ExternalLink aria-hidden="true" />
        </a>
        <a href={DEPARTMENT_YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
          <Youtube aria-hidden="true" /> 학과 공식 YouTube 채널 <ExternalLink aria-hidden="true" />
        </a>
        <a href={TRACK_QA_VIDEO_URL} target="_blank" rel="noopener noreferrer">
          2024 교육과정 개편 Q&A <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

function OfficialSourceLedger() {
  const sources = [
    {
      Icon: FileCheck2,
      title: "2026학년도 학사종합안내",
      body: "5개 트랙·15개 모듈과 트랙별 모듈 구성을 확인한 현재 공개본",
      href: OFFICIAL_CURRICULUM_SOURCE.url,
    },
    {
      Icon: GraduationCap,
      title: "학칙 별표 2 · 학위와 전공 명칭",
      body: "식품자원경제학과의 공식 명칭: 경제학사 · 식품자원경제학",
      href: DEGREE_MAJOR_NAMES_URL,
    },
    {
      Icon: GraduationCap,
      title: "식품자원경제학과 학과장 인사말",
      body: "지속가능발전과 환경경제·식품자원·지역개발 교육 목표",
      href: DEPARTMENT_GREETING_URL,
    },
    {
      Icon: Layers3,
      title: "단국대학교 학칙 제28조의4",
      body: "전공교육과정 안에서 분야별 특화 모듈을 운영할 수 있다는 규정",
      href: TRACK_REGULATION_URL,
    },
    {
      Icon: BookOpenCheck,
      title: "학과 정규 교육과정",
      body: "학과 공식 교과과정 확인 경로",
      href: DEPARTMENT_CURRICULUM_URL,
    },
    {
      Icon: Phone,
      title: "학과 사무실 안내",
      body: "천안캠퍼스 · 041-550-3610 · 개인 적용과 신청 시기 확인",
      href: DEPARTMENT_CONTACT_URL,
    },
  ] as const;

  return (
    <section className="planner-track-guide__sources" aria-labelledby="track-guide-sources-title">
      <header>
        <span>공식 근거와 확인 경로</span>
        <h2 id="track-guide-sources-title">설명보다 원문과 학과 답변이 우선합니다</h2>
      </header>
      <ul>
        {sources.map(({ Icon, title, body, href }) => (
          <li key={href}>
            <Icon aria-hidden="true" />
            <div><strong>{title}</strong><span>{body}</span></div>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${title} 외부 링크`}>
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <a className="planner-track-guide__channel-link" href={DEPARTMENT_YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
        <Youtube aria-hidden="true" /> 단국대학교 식품자원경제학과 공식 YouTube <ExternalLink aria-hidden="true" />
      </a>
    </section>
  );
}

function trackModuleIds(track: Track): ModuleId[] {
  if (track.rule.type === "major") return track.rule.moduleIds;
  return [
    ...track.rule.baseModuleIds,
    ...track.rule.convergenceRequirements.flatMap((requirement) => requirement.moduleIds),
  ];
}

function moduleName(moduleId: ModuleId): string {
  return modules.find((module) => module.id === moduleId)?.name ?? "모듈";
}
