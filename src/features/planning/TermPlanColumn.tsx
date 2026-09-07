import { courses } from "../../data/curriculumData";
import type {
  AcademicTermId,
  PlannedCoursePlacement,
} from "../../types";

const courseById = new Map(courses.map((course) => [course.id, course]));

export function TermPlanColumn({
  termId,
  placements,
  electiveCredits,
  electiveSlots,
  extraTerm = false,
}: {
  termId: AcademicTermId;
  placements: PlannedCoursePlacement[];
  electiveCredits: number;
  electiveSlots: number;
  extraTerm?: boolean;
}) {
  const [year, semester] = termId.split("-");

  return (
    <section
      className={extraTerm ? "dku-plan-term extra-term" : "dku-plan-term"}
      data-term-plan={termId}
      data-extra-term={extraTerm ? "true" : "false"}
    >
      <header>
        <div>
          <span>{extraTerm ? "추가 검토 학기" : "정규학기"}</span>
          <h2>{year}학년도 {semester}학기</h2>
        </div>
        <small>{placements.length + electiveSlots}자리</small>
      </header>

      <div className="dku-plan-term-items">
        {placements.map((placement) => {
          const course = courseById.get(placement.courseId);
          return (
            <div
              className="dku-plan-course"
              data-plan-item-kind="named-course"
              key={`${placement.termId}-${placement.courseId}`}
            >
              <article aria-label={`${course ? `${course.code} ${course.name}` : placement.courseId} 과목 정보`}>
                <strong>{course ? `${course.code} ${course.name}` : placement.courseId}</strong>
                <div className="dku-plan-course-meta"><span>{course ? `${course.credits}학점` : "학점 공식 확인 필요"}</span><span>{placement.origin === "user-planned" ? "직접 지정" : "참고 배치"}</span></div>
                {placement.offeringEvidence !== "historical-2026-snapshot" && <small>개설 여부 학과 확인 필요</small>}
              </article>
            </div>
          );
        })}

        {electiveCredits > 0 && (
          <article
            className="dku-plan-reservation"
            data-elective-allocation-term={termId}
            data-elective-credits={electiveCredits}
            data-elective-slots={electiveSlots}
            data-plan-item-kind="elective-reservation"
          >
            <div>
              <small>과목 미정 · 학점 예약</small>
              <strong>전공 선택 과목 {electiveCredits}학점 자리</strong>
              <span>{electiveSlots}자리 · 과목명은 공식 확인 뒤 정해 주세요.</span>
            </div>
          </article>
        )}

        {placements.length === 0 && electiveCredits === 0 && (
          <p className="term-plan-empty">현재 입력으로 배치된 전공과목이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
