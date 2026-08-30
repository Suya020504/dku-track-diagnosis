import { CalendarDays, ExternalLink, FileCheck2, Landmark, School } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { COURSE_OFFERING_SNAPSHOT_META } from "../../data/courseOfferings2026";
import { OFFICIAL_CURRICULUM_SOURCE } from "../../data/curriculumData";

const DEPARTMENT_URL = "https://cms.dankook.ac.kr/web/ere";
const CAMPUS_GALLERY_URL = "https://www.dankook.ac.kr/ko/-565";

const officialLinks = [
  {
    title: OFFICIAL_CURRICULUM_SOURCE.title,
    body: `단국대학교 · ${OFFICIAL_CURRICULUM_SOURCE.referenceYear}년 · 현재 공개본 ${OFFICIAL_CURRICULUM_SOURCE.currentPage}쪽`,
    href: OFFICIAL_CURRICULUM_SOURCE.url,
    label: "현재 공개 교육과정 PDF",
    Icon: FileCheck2,
  },
  {
    title: "교과목 시간표 검색",
    body: `개설 이력 관찰 ${COURSE_OFFERING_SNAPSHOT_META.observedAt} · 재점검 ${COURSE_OFFERING_SNAPSHOT_META.recheckedAt}`,
    href: COURSE_OFFERING_SNAPSHOT_META.timetableSearchUrl,
    label: "실제 개설 여부 확인",
    Icon: CalendarDays,
  },
  {
    title: "식품자원경제학과 홈페이지",
    body: "학과 공지와 개별 이수 문의는 공식 학과 채널에서 확인합니다.",
    href: DEPARTMENT_URL,
    label: "학과 홈페이지 확인",
    Icon: School,
  },
] as const;

export function OfficialResourcesView() {
  return (
    <div className="planner-resource-stack">
      <EvidenceBand state="official-public-confirmed">
        교육과정 공개본은 {OFFICIAL_CURRICULUM_SOURCE.currentVerifiedAt}에 확인했으며, 서버 수정 시각은
        {` ${OFFICIAL_CURRICULUM_SOURCE.currentServerModifiedAt}`}입니다.
      </EvidenceBand>

      <section className="planner-resource-reading" aria-labelledby="official-links-title">
        <div className="planner-resource-section-heading">
          <span>공식 확인 경로</span>
          <h2 id="official-links-title">계산 결과와 별개로 원문을 다시 확인하세요</h2>
          <p>각 링크는 외부 공식 사이트에서 열립니다. 이 앱 안의 설명보다 원문과 학과 답변이 우선합니다.</p>
        </div>

        <ul className="planner-official-link-list">
          {officialLinks.map(({ title, body, href, label, Icon }) => (
            <li key={href}>
              <Icon aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <a href={href} target="_blank" rel="noopener noreferrer">
                {label} · 외부 링크 <ExternalLink aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="planner-campus-source" data-official-campus-source aria-labelledby="campus-source-title">
        <Landmark aria-hidden="true" />
        <div>
          <span>공식 캠퍼스 갤러리 출처 카드</span>
          <h2 id="campus-source-title">천안캠퍼스 항공사진(2022)</h2>
          <p>정보기획팀 · 2023-04-05</p>
          <p>외부 재사용 허가가 확인되기 전까지 앱 안에 사진을 재현하지 않습니다.</p>
        </div>
        <a href={CAMPUS_GALLERY_URL} target="_blank" rel="noopener noreferrer">
          공식 캠퍼스 갤러리에서 보기 · 외부 링크 <ExternalLink aria-hidden="true" />
        </a>
      </section>

      <EvidenceBand state="historical-2026-snapshot">
        공개 재검증 상태: {COURSE_OFFERING_SNAPSHOT_META.currentPublicVerification}. 향후 개설 보장:
        {COURSE_OFFERING_SNAPSHOT_META.allowsFutureOfferingGuarantee ? " 있음" : " 없음"}.
      </EvidenceBand>
      <EvidenceBand state="department-confirmation-required">
        이 서비스는 학생이 만든 학업 계획 보조 도구이며, 단국대학교의 공식 판정·승인 시스템이 아닙니다.
      </EvidenceBand>
    </div>
  );
}
