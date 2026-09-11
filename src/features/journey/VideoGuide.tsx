import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Download, PlayCircle, RotateCcw } from "lucide-react";
import serviceGuideVideo from "../../data/serviceGuideVideo.json";
import "./video-guide.css";

export const VIDEO_GUIDE_SRC = "/videos/track-service-guide-20260912.mp4";
export const VIDEO_GUIDE_POSTER = "/videos/track-service-guide-20260912.jpg";
export const VIDEO_GUIDE_CAPTIONS = "/videos/track-service-guide-20260912.ko.vtt";

export type VideoGuideFeature = "home" | "guide" | "profile" | "known-tracks" | "interest-survey" | "courses" | "history-comparison" | "result" | "planning" | "records" | "modules" | "curriculum" | "timetable" | "resources" | "help";
type VideoGuideChapter = { id: string; title: string; start: number; end: number; description: string; feature: VideoGuideFeature };
export const VIDEO_GUIDE_CHAPTERS = serviceGuideVideo.chapters as readonly VideoGuideChapter[];
export const VIDEO_GUIDE_TRANSCRIPT = VIDEO_GUIDE_CHAPTERS.map(({ title, description }) => ({ title, description }));

function chapterAtTime(time: number) {
  return VIDEO_GUIDE_CHAPTERS.find(chapter => time >= chapter.start && time < chapter.end)
    ?? (time >= serviceGuideVideo.duration ? VIDEO_GUIDE_CHAPTERS[VIDEO_GUIDE_CHAPTERS.length - 1] : VIDEO_GUIDE_CHAPTERS[0]);
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return rounded < 60 ? `${rounded}초` : `${Math.floor(rounded / 60)}분 ${rounded % 60}초`;
}

type VideoGuideProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onHome: () => void;
  onStart: () => void;
  onOpenInteractive: () => void;
  onOpenFeature: (feature: VideoGuideFeature, invoker: HTMLButtonElement) => void;
};

/** A recorded explanation only: this page does not read or mutate student records. */
export function VideoGuide({ headingRef, onHome, onStart, onOpenInteractive, onOpenFeature }: VideoGuideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionsRef = useRef<HTMLTrackElement>(null);
  const metadataLoadedRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const [activeChapterId, setActiveChapterId] = useState(VIDEO_GUIDE_CHAPTERS[0].id);
  const [attempt, setAttempt] = useState(0);
  const [mediaState, setMediaState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [captionsFailed, setCaptionsFailed] = useState(false);
  const [duration, setDuration] = useState<number>();
  const activeChapter = VIDEO_GUIDE_CHAPTERS.find(chapter => chapter.id === activeChapterId) ?? VIDEO_GUIDE_CHAPTERS[0];

  useEffect(() => {
    const track = captionsRef.current;
    const handleError = () => setCaptionsFailed(true);
    track?.addEventListener("error", handleError);
    return () => track?.removeEventListener("error", handleError);
  }, [attempt]);

  function retry() {
    setMediaState("loading");
    setCaptionsFailed(false);
    pendingSeekRef.current ??= activeChapter.start;
    metadataLoadedRef.current = false;
    setDuration(undefined);
    setAttempt(current => current + 1);
  }

  function applyPendingSeek() {
    const video = videoRef.current;
    const requestedTime = pendingSeekRef.current;
    if (!video || !metadataLoadedRef.current || requestedTime === null || !Number.isFinite(video.duration) || video.duration <= 0) return;
    // Stay within the playable range, including when the delivered file is shorter.
    const time = Math.min(Math.max(0, requestedTime), Math.max(0, video.duration - 0.01));
    try {
      video.currentTime = time;
      pendingSeekRef.current = null;
      setActiveChapterId(chapterAtTime(time).id);
    } catch {
      // Some browsers accept a seek only after canplay; retain the request until then.
    }
  }

  function selectChapter(chapter: VideoGuideChapter) {
    pendingSeekRef.current = chapter.start;
    setActiveChapterId(chapter.id);
    applyPendingSeek();
  }

  return <main className="video-guide" aria-labelledby="video-guide-title">
    <header className="video-guide__heading">
      <button type="button" className="video-guide__back" onClick={onHome}><ArrowLeft size={17} aria-hidden="true" />홈으로</button>
      <span className="video-guide__eyebrow"><PlayCircle size={18} aria-hidden="true" />처음 사용하는 분을 위한 안내</span>
      <h1 id="video-guide-title" ref={headingRef} tabIndex={-1}>영상으로 사용 방법을 알아보세요</h1>
      <p>시작 방법 선택부터 과목 입력, 트랙 비교, 학기 계획과 기록까지 실제 화면으로 따라가 보세요. 필요한 장면부터 골라 볼 수도 있어요.</p>
    </header>

    <figure className="video-guide__player">
      <video
        key={attempt}
        ref={videoRef}
        src={VIDEO_GUIDE_SRC}
        poster={VIDEO_GUIDE_POSTER}
        controls
        playsInline
        preload="metadata"
        aria-label="트랙 안내 서비스 사용 방법 영상"
        aria-describedby="video-guide-media-note"
        onLoadStart={() => setMediaState("loading")}
        onLoadedMetadata={() => {
          metadataLoadedRef.current = true;
          const value = videoRef.current?.duration;
          if (value && Number.isFinite(value)) setDuration(value);
          applyPendingSeek();
          setMediaState("ready");
        }}
        onDurationChange={() => {
          const value = videoRef.current?.duration;
          if (value && Number.isFinite(value)) setDuration(value);
          applyPendingSeek();
        }}
        onCanPlay={() => { applyPendingSeek(); setMediaState("ready"); }}
        onTimeUpdate={event => {
          if (pendingSeekRef.current === null) setActiveChapterId(chapterAtTime(event.currentTarget.currentTime).id);
        }}
        onWaiting={() => setMediaState("loading")}
        onPlaying={() => setMediaState("ready")}
        onError={event => { if (event.target === event.currentTarget) setMediaState("error"); }}
      >
        <track ref={captionsRef} kind="captions" src={VIDEO_GUIDE_CAPTIONS} srcLang="ko" label="한국어 텍스트 자막" />
        이 브라우저에서는 영상을 재생하지 못해요. 아래 영상 파일 받기나 글로 읽는 사용 순서를 이용해 주세요.
      </video>
      <figcaption id="video-guide-media-note">
        <span>음성 없이 자막으로 안내해요{duration && ` · ${formatDuration(duration)}`}</span>
        <span>영상의 재생 버튼을 눌러 시작하세요. 전체 화면으로 확대할 수 있어요.</span>
      </figcaption>
    </figure>

    {mediaState === "loading" && <p className="video-guide__status" role="status">영상을 불러오고 있어요. 기다리는 동안 아래 사용 순서를 글로 읽을 수 있어요.</p>}
    {mediaState === "error" && <section className="video-guide__error" role="alert">
      <h2>영상을 불러오지 못했어요</h2>
      <p>연결 상태를 확인하고 다시 시도하거나 영상 파일을 받아 보세요. 아래에 같은 사용 순서를 글로 정리했어요.</p>
      <button type="button" onClick={retry}><RotateCcw size={17} aria-hidden="true" />영상 다시 불러오기</button>
      <a href={VIDEO_GUIDE_SRC} download="트랙서비스_사용방법.mp4"><Download size={16} aria-hidden="true" />영상 파일 받기</a>
    </section>}
    {captionsFailed && <p className="video-guide__status" role="status">한국어 자막을 불러오지 못했어요. 아래 ‘사용 순서 글로 읽기’에서 안내를 확인할 수 있어요.</p>}

    <div className="video-guide__context">
      <p>영상 속 수강 이력은 설명을 위한 가상 예시예요. 영상을 보거나 예시를 살펴봐도 내 입력과 저장 기록은 바뀌지 않아요.</p>
    </div>

    <details className="video-guide__chapters">
      <summary>기능별 장면 찾기<span>{VIDEO_GUIDE_CHAPTERS.length}개 장면</span></summary>
      <p className="video-guide__chapter-hint">장면을 누르면 해당 시간으로 이동해요. 일시정지 상태라면 재생 버튼을 눌러 이어 보세요.</p>
      <ol aria-label="영상의 기능별 장면">{VIDEO_GUIDE_CHAPTERS.map(chapter => <li key={chapter.id}>
        <button type="button" aria-current={chapter.id === activeChapterId ? "true" : undefined} onClick={() => selectChapter(chapter)}>
          <span className="video-guide__chapter-time">{formatTime(chapter.start)}</span><span>{chapter.title}</span>
        </button>
      </li>)}</ol>
      <div className="video-guide__chapter-action">
        <p aria-live="polite" aria-atomic="true"><strong>{activeChapter.title}</strong>{activeChapter.description}</p>
        <div><button type="button" onClick={event => onOpenFeature(activeChapter.feature, event.currentTarget)} aria-describedby="video-guide-open-feature-note">이 기능 직접 열기<ArrowRight size={15} aria-hidden="true" /></button><span id="video-guide-open-feature-note">내 기록으로 이용하는 화면이 열려요. 필요한 입력이 없으면 먼저 안내해요.</span></div>
      </div>
    </details>

    <details className="video-guide__transcript">
      <summary>사용 순서 글로 읽기</summary>
      <ol>{VIDEO_GUIDE_TRANSCRIPT.map(step => <li key={step.title}><h2>{step.title}</h2><p>{step.description}</p></li>)}</ol>
      <a href={VIDEO_GUIDE_SRC} download="트랙서비스_사용방법.mp4"><Download size={16} aria-hidden="true" />영상 파일 받기</a>
    </details>

    <footer className="video-guide__next">
      <div><h2>이제 내 수업으로 확인해 볼까요?</h2><p>홈에서 시작 방법을 고르면 내 정보부터 이어갈 수 있어요.</p></div>
      <button type="button" onClick={onStart}>내 수강 이력으로 시작하기<ArrowRight size={18} aria-hidden="true" /></button>
      <details className="video-guide__interactive"><summary>직접 예시를 살펴보고 싶다면</summary><a href="?view=example&mode=interactive" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpenInteractive(); } }}>가상 이력으로 예시 체험하기<ArrowRight size={15} aria-hidden="true" /></a></details>
    </footer>
  </main>;
}
