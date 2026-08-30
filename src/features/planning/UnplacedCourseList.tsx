import type { RefObject } from "react";
import { courses } from "../../data/curriculumData";
import type { UnplacedCourse } from "../../types";

const courseById = new Map(courses.map((course) => [course.id, course]));

const reasonLabels: Record<UnplacedCourse["reason"], string> = {
  "offering-unknown": "개설 근거 확인 필요",
  "user-plan-conflict": "지정 학기와 개설 패턴 충돌",
  "capacity-before-target": "수강 한도 초과",
  "after-target": "목표 학기 이후 배치 필요",
};

export function UnplacedCourseList({
  items,
  headingRef,
}: {
  items: UnplacedCourse[];
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="plan-check-section" aria-labelledby="unplaced-course-title">
      <div className="plan-check-heading">
        <span>배치 결과 점검</span>
        <h1 id="unplaced-course-title" ref={headingRef} tabIndex={-1}>배치하지 못한 과목</h1>
      </div>
      {items.length === 0 ? (
        <p className="plan-check-empty">현재 계획에서 따로 남은 과목은 없습니다.</p>
      ) : (
        <ul className="unplaced-course-list">
          {items.map((item) => {
            const course = courseById.get(item.courseId);
            return (
              <li
                key={`${item.courseId}-${item.reason}`}
                data-unplaced-reason={item.reason}
              >
                <div>
                  <strong>{course ? `${course.code} ${course.name}` : item.courseId}</strong>
                  <span>{reasonLabels[item.reason]}</span>
                </div>
                <p>{item.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
