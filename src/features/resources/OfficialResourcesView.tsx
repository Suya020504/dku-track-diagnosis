import { OFFICIAL_2026_SOURCE } from "../../data/officialTimetable2026";
import { BookOpen, CalendarDays, ExternalLink, GraduationCap, MapPin, PlayCircle } from "lucide-react";
import { DEPARTMENT_HOME_URL, DEPARTMENT_CONTACT_URL, DEPARTMENT_YOUTUBE_URL, OFFICIAL_TRACK_VIDEOS } from "../../data/officialResources";
const source = OFFICIAL_2026_SOURCE;
const sources = [
  { title: "학과 정규 교과과정", Icon: BookOpen, href: source.departmentCurriculumUrl, text: "학년·학기별 과목 구성을 확인하세요." },
  { title: "수강 시간표 조회", Icon: CalendarDays, href: source.timetableUrl, text: "학기와 학과를 선택해 강좌 시간과 강의실을 확인하세요." },
  { title: "학사종합안내", Icon: GraduationCap, href: "https://www.dankook.ac.kr/web/kor/%ED%95%99%EC%82%AC%EC%A2%85%ED%95%A9%EC%95%88%EB%82%B4-%EC%B2%9C%EC%95%88-", text: "수강신청과 전공 이수에 필요한 학교 안내를 찾아보세요." },
];
export function OfficialResourcesView() {
  return <section aria-label="학교 공식 자료 바로가기">
    <ul className="dku-resource-source-list">{sources.map((item) => <li key={item.href}><span className="dku-resource-source-icon"><item.Icon size={24} aria-hidden="true" /></span><div><h2>{item.title}</h2><p>{item.text}</p></div><a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 바로가기`}>바로가기 <ExternalLink size={16} aria-hidden="true" /></a></li>)}</ul>
    <div className="dku-resource-official-columns"><section><h2><PlayCircle size={22} aria-hidden="true" />영상으로 이해하기</h2><ul className="dku-resource-video-links">{OFFICIAL_TRACK_VIDEOS.map((video) => <li key={video.id}><a href={video.watchUrl} target="_blank" rel="noopener noreferrer">{video.shortTitle} <ExternalLink size={16} aria-hidden="true" /></a><small>{video.duration}</small></li>)}</ul><a href={DEPARTMENT_YOUTUBE_URL} target="_blank" rel="noopener noreferrer">학과 YouTube 전체 영상 <ExternalLink size={16} aria-hidden="true" /></a></section>
    <aside className="dku-resource-contact"><span>수강·이수 상담</span><h2><MapPin size={22} aria-hidden="true" />학과에 문의하기</h2><p>개인별 이수 인정은 학번과 과목코드를 준비해 학과에 문의하세요.</p><a href={DEPARTMENT_CONTACT_URL} target="_blank" rel="noopener noreferrer">학과 연락처·위치 <ExternalLink size={16} aria-hidden="true" /></a><a href={DEPARTMENT_HOME_URL} target="_blank" rel="noopener noreferrer">학과 홈페이지와 공지 <ExternalLink size={16} aria-hidden="true" /></a></aside></div>
  </section>;
}
