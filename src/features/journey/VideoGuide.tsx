import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Download, PlayCircle, RotateCcw } from "lucide-react";
import "./video-guide.css";

export const VIDEO_GUIDE_SRC = "/videos/track-service-guide.mp4";
export const VIDEO_GUIDE_POSTER = "/videos/track-service-guide-poster.jpg";
export const VIDEO_GUIDE_CAPTIONS = "/videos/track-service-guide.ko.vtt";

export const VIDEO_GUIDE_TRANSCRIPT = [
  { title: "진단은 결과 확인에서 끝나요", description: "실제 화면을 보며 시작부터 결과 확인까지 따라가 보세요. 계획은 필요한 사람만 따로 이용하는 도구예요." },
  { title: "트랙제부터 알아보기", description: "트랙 가이드에서 과목, 모듈, 트랙의 관계와 5개 트랙을 살펴보세요." },
  { title: "나에게 맞는 시작 방법 고르기", description: "트랙을 정했다면 바로 선택하세요. 아직 정하지 못했다면 관심 설문이나 지금까지 들은 과목으로 후보를 찾을 수 있어요." },
  { title: "내 정보와 수강 이력 입력하기", description: "소속과 입학연도 등을 확인하고 들은 과목을 입력하세요. 이수 완료와 수강 중을 구분하며, 다른 시작 방법으로 옮겨도 같은 이력을 사용해요." },
  { title: "남은 조건과 대체 과목 확인하기", description: "선택한 트랙에 필요한 추가 이수를 확인하세요. 추천 과목은 조건을 채우는 조합이며, 전부 반드시 들어야 하는 목록은 아니에요. 바꿔 들을 수 있는 과목도 확인하세요." },
  { title: "필요한 도구만 따로 열기", description: "더 진행하지 않아도 진단은 완료된 상태예요. 계획이나 다른 트랙 탐색이 필요할 때만 ‘필요할 때 더 해보기’를 펼쳐 보세요." },
  { title: "원할 때 학기 계획까지", description: "목표 학기와 수강량에 맞춰 남은 과목을 배치할 수 있어요. 예상 계획은 과거 개설 정보를 참고하므로 학교 시간표에서 실제 개설 여부를 확인해 주세요." },
  { title: "내 기록으로 시작하기", description: "입력은 이 브라우저에 저장돼요. 트랙 신청과 이수 인정은 학교 안내에 따라 별도로 확인해야 해요." },
] as const;

type VideoGuideProps = {
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onHome: () => void;
  onStart: () => void;
  onOpenInteractive: () => void;
};

/** A recorded explanation only: this page does not read or mutate student records. */
export function VideoGuide({ headingRef, onHome, onStart, onOpenInteractive }: VideoGuideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionsRef = useRef<HTMLTrackElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [mediaState, setMediaState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [captionsFailed, setCaptionsFailed] = useState(false);
  const [duration, setDuration] = useState<number>();

  useEffect(() => {
    const track = captionsRef.current;
    const handleError = () => setCaptionsFailed(true);
    track?.addEventListener("error", handleError);
    return () => track?.removeEventListener("error", handleError);
  }, [attempt]);

  function retry() {
    setMediaState("loading");
    setCaptionsFailed(false);
    setAttempt(current => current + 1);
  }

  return <main className="video-guide" aria-labelledby="video-guide-title">
    <header className="video-guide__heading">
      <button type="button" className="video-guide__back" onClick={onHome}><ArrowLeft size={17} aria-hidden="true" />홈으로</button>
      <span className="video-guide__eyebrow"><PlayCircle size={18} aria-hidden="true" />처음 사용하는 분을 위한 안내</span>
      <h1 id="video-guide-title" ref={headingRef} tabIndex={-1}>영상으로 사용 방법을 알아보세요</h1>
      <p>시작부터 진단 완료까지 실제 화면으로 따라가 보세요. 계획이 필요할 때 추가 도구를 여는 방법도 안내해요.</p>
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
          const value = videoRef.current?.duration;
          if (value && Number.isFinite(value)) setDuration(value);
          setMediaState("ready");
        }}
        onCanPlay={() => setMediaState("ready")}
        onWaiting={() => setMediaState("loading")}
        onPlaying={() => setMediaState("ready")}
        onError={event => { if (event.target === event.currentTarget) setMediaState("error"); }}
      >
        <track ref={captionsRef} kind="captions" src={VIDEO_GUIDE_CAPTIONS} srcLang="ko" label="한국어 텍스트 자막" />
        이 브라우저에서는 영상을 재생하지 못해요. 아래 영상 파일 받기나 글로 읽는 사용 순서를 이용해 주세요.
      </video>
      <figcaption id="video-guide-media-note">
        <span>음성 없이 자막으로 안내해요{duration && ` · ${Math.round(duration)}초`}</span>
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
