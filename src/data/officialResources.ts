export const DEPARTMENT_HOME_URL = "https://cms.dankook.ac.kr/web/ere";
export const DEPARTMENT_GREETING_URL = "https://cms.dankook.ac.kr/web/ere/-6";
export const DEPARTMENT_CURRICULUM_URL = "https://cms.dankook.ac.kr/ko/web/ere/%EC%A0%95%EA%B7%9C-%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95";
export const DEPARTMENT_CONTACT_URL = "https://cms.dankook.ac.kr/web/ere/%EC%B0%BE%EC%95%84%EC%98%A4%EC%8B%9C%EB%8A%94-%EA%B8%B8";
export const DEPARTMENT_YOUTUBE_URL = "https://www.youtube.com/@FoodandResourcesEconomics_dku/videos";
export const TRACK_REGULATION_URL = "https://rule.dankook.ac.kr/service/law/lawFullScreenContent.do?historySeq=3506&seq=7";
export const DEGREE_MAJOR_NAMES_URL = "https://rule.dankook.ac.kr/download.do?gubun=102&seq=9926";
export const TRACK_CERTIFICATE_VIDEO_URL = "https://www.youtube.com/watch?v=iuXHSSuc0UQ&t=410s";
export const TRACK_DEGREE_VIDEO_URL = "https://www.youtube.com/watch?v=osc9yOuq0IU&t=860s";
export const TRACK_LATE_ENTRY_VIDEO_URL = "https://www.youtube.com/watch?v=iuXHSSuc0UQ&t=259s";
export const TRACK_QA_VIDEO_URL = "https://www.youtube.com/watch?v=rp4ZW6QAOZY";

export type OfficialTrackVideo = {
  id: string;
  title: string;
  shortTitle: string;
  publishedAt: string;
  duration: string;
  focus: string;
  watchUrl: string;
};

export const OFFICIAL_TRACK_VIDEOS = [
  {
    id: "nhELHq51gdY",
    title: "모듈형 교육과정 트랙제_1편(날개단대 영상)",
    shortTitle: "1편 · 트랙제 첫 안내",
    publishedAt: "2024-02-02",
    duration: "2:15",
    focus: "모듈과 트랙의 관계를 짧게 훑는 공식 입문 영상",
    watchUrl: "https://www.youtube.com/watch?v=nhELHq51gdY",
  },
  {
    id: "iuXHSSuc0UQ",
    title: "모듈형 교육과정 트랙제_2편(모듈형 교육과정)",
    shortTitle: "2편 · 모듈형 교육과정",
    publishedAt: "2024-02-02",
    duration: "16:02",
    focus: "과목을 모듈로 묶어 이해하는 교육과정 설명",
    watchUrl: "https://www.youtube.com/watch?v=iuXHSSuc0UQ",
  },
  {
    id: "osc9yOuq0IU",
    title: "모듈형 교육과정 트랙제_3편(트랙제)",
    shortTitle: "3편 · 트랙제",
    publishedAt: "2024-02-02",
    duration: "16:32",
    focus: "5개 트랙과 모듈 조합을 설명하는 핵심 영상",
    watchUrl: "https://www.youtube.com/watch?v=osc9yOuq0IU",
  },
  {
    id: "Vx9HdOxKEiU",
    title: "모듈형 교육과정 트랙제_4편(푸드바이오경제)",
    shortTitle: "4편 · 푸드바이오경제",
    publishedAt: "2024-02-08",
    duration: "6:33",
    focus: "자연과학 융합 트랙의 구성과 학습 방향 설명",
    watchUrl: "https://www.youtube.com/watch?v=Vx9HdOxKEiU",
  },
] as const satisfies readonly OfficialTrackVideo[];

export type OfficialTrackVideoId = typeof OFFICIAL_TRACK_VIDEOS[number]["id"];

const officialTrackVideoIds = new Set<OfficialTrackVideoId>(
  OFFICIAL_TRACK_VIDEOS.map((video) => video.id),
);

export function isOfficialTrackVideoId(value: string | null): value is OfficialTrackVideoId {
  return Boolean(value && officialTrackVideoIds.has(value as OfficialTrackVideoId));
}

export function privacyEnhancedEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`;
}
