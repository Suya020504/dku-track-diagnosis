import { courses } from "../../data/curriculumData";
import { CourseSticker } from "../../components/CourseSticker";
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
      className={extraTerm ? "term-plan-column extra-term" : "term-plan-column"}
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

      <div className="term-plan-items">
        {placements.map((placement) => {
          const course = courseById.get(placement.courseId);
          return (
            <div
              className="term-plan-course named-course"
              data-plan-item-kind="named-course"
              key={`${placement.termId}-${placement.courseId}`}
            >
              <CourseSticker
                courseName={course ? `${course.code} ${course.name}` : placement.courseId}
                creditsLabel={course ? `${course.credits}학점` : "학점 공식 확인 필요"}
                evidenceState={placement.offeringEvidence === "historical-2026-snapshot"
                  ? "historical-2026-snapshot"
                  : "department-confirmation-required"}
              />
              {placement.offeringEvidence === "historical-2026-snapshot" && (
                <small className="historical-pattern-badge">최근 개설 패턴 기준</small>
              )}
            </div>
          );
        })}

        {electiveCredits > 0 && (
          <article
            className="term-plan-course elective-reservation"
            data-elective-allocation-term={termId}
            data-elective-credits={electiveCredits}
            data-elective-slots={electiveSlots}
            data-plan-item-kind="elective-reservation"
          >
            <div>
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
