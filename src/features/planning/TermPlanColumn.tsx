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
  extraTerm = false,
}: {
  termId: AcademicTermId;
  placements: PlannedCoursePlacement[];
  electiveCredits: number;
  extraTerm?: boolean;
}) {
  const [year, semester] = termId.split("-");

  return (
    <section className={extraTerm ? "term-plan-column extra-term" : "term-plan-column"}>
      <header>
        <div>
          <span>{extraTerm ? "추가 검토 학기" : "정규학기"}</span>
          <h2>{year}학년도 {semester}학기</h2>
        </div>
        <small>{placements.length + Math.ceil(electiveCredits / 3)}자리</small>
      </header>

      <div className="term-plan-items">
        {placements.map((placement) => {
          const course = courseById.get(placement.courseId);
          return (
            <article className="term-plan-course" key={`${placement.termId}-${placement.courseId}`}>
              <div>
                <strong>{course ? `${course.code} ${course.name}` : placement.courseId}</strong>
                <span>{course ? `${course.credits}학점` : "학점 공식 확인 필요"}</span>
              </div>
              {placement.offeringEvidence === "historical-2026-snapshot" && (
                <small className="historical-pattern-badge">최근 개설 패턴 기준</small>
              )}
            </article>
          );
        })}

        {electiveCredits > 0 && (
          <article
            className="term-plan-course elective-reservation"
            data-elective-allocation-term={termId}
            data-elective-credits={electiveCredits}
          >
            <div>
              <strong>전공 선택 과목 {electiveCredits}학점 자리</strong>
              <span>과목명은 공식 확인 뒤 정해 주세요.</span>
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
