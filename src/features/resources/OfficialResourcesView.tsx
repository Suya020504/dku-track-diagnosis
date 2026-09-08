import { COURSE_OFFERING_SNAPSHOT_META } from "../../data/courseOfferings2026";
import { OFFICIAL_2026_SOURCE } from "../../data/officialTimetable2026";
import { DEPARTMENT_HOME_URL, DEPARTMENT_CONTACT_URL, DEPARTMENT_YOUTUBE_URL, OFFICIAL_TRACK_VIDEOS } from "../../data/officialResources";
const source = OFFICIAL_2026_SOURCE;
const sources = [
  { title: "학과 정규 교과과정", href: source.departmentCurriculumUrl, text: "현재 공개 47과목 · 2026-09-08 확인 · 게시·개정연도 미표기. 원문에서 ‘교과과정’을 선택하세요." },
  { title: "2026-2 실제 개설 시간표", href: source.timetableUrl, text: "2026 / 2학기 / 천안 · 학과 전공·학문기초와 코드 대조한 융합 과목 37분반 · 2026-09-08 공개조회." },
  { title: "2026학년도 학사종합안내", href: source.pdfUrl + "#page=72", text: "트랙 구성 파일 72쪽 / 인쇄 60쪽 · 교시표 파일 138쪽 / 인쇄 4쪽. 2026-09-08 확인." },
];
export function OfficialResourcesView() {
  return <section aria-label="공식 근거와 확인 경로">
    <ul className="dku-resource-source-list">{sources.map((item, index) => <li key={item.href}><span>0{index + 1}</span><div><h2>{item.title}</h2><p>{item.text}</p></div><a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} 원문 열기`}>원문 열기 ↗</a></li>)}</ul>
    <div className="dku-resource-official-columns"><section><h2>영상으로 이해하기</h2><ul className="dku-resource-video-links">{OFFICIAL_TRACK_VIDEOS.map((video) => <li key={video.id}><a href={video.watchUrl} target="_blank" rel="noopener noreferrer">{video.shortTitle} ↗</a><small>{video.publishedAt} · {video.duration}</small></li>)}</ul><a href={DEPARTMENT_YOUTUBE_URL} target="_blank" rel="noopener noreferrer">학과 YouTube 전체 영상 ↗</a></section>
    <aside className="dku-resource-contact"><span>개인별 이수 인정 확인</span><h2>학과에 물어볼 내용</h2><p>입학연도와 이수 유형, 과목코드, 적용 교육과정을 준비하세요. 트랙 인정·복수전공 최소학점·타학과 수강 가능 여부는 개인별 확인이 필요합니다.</p><a href={DEPARTMENT_CONTACT_URL} target="_blank" rel="noopener noreferrer">공식 학과 연락·위치 안내 ↗</a><a href={DEPARTMENT_HOME_URL} target="_blank" rel="noopener noreferrer">학과 홈페이지와 공지 ↗</a></aside></div>
    <details className="dku-resource-method"><summary>자료 검증 기록과 남은 한계</summary><p>PDF 139쪽 · 4,040,380 bytes · SHA-256 <code>{source.pdfSha256}</code></p><p>서버 파일 수정 시각 {source.pdfServerModifiedAt}은 공식 발행일이 아닙니다.</p><p>기존 2026 개설 패턴은 {COURSE_OFFERING_SNAPSHOT_META.observedAt} 관찰, {COURSE_OFFERING_SNAPSHOT_META.recheckedAt} 재점검 기록을 보존합니다. 이번 2026-2 분반 확인으로 과거 2026-1 개설 이력을 소급 검증하지 않았습니다.</p><p>PDF의 M/N/O 코드 밀림, 식품영양학 과목 수 표기 차이는 남아 있습니다. 제공된 최종안의 세부 30학점 기준이 새로 공식 승인됐다고 판정할 수 없습니다. 개설 확인은 여석·인정·향후 반복 개설의 보장이 아닙니다.</p></details>
  </section>;
}
