import type { CourseSelectionRecord, StudentProfile } from "../../types";
import { courses } from "../../data/curriculumData";
import { getAcademicMajorRequirements } from "../../lib/academicMajorRequirements";
import { ResultDisclosure } from "./ResultDisclosure";
import "./academic-major-requirements.css";

const courseById = new Map(courses.map((course) => [course.id, course]));

export function AcademicMajorRequirements({ profile, courseSelections }: {
  profile: StudentProfile;
  courseSelections: readonly CourseSelectionRecord[];
}) {
  const result = getAcademicMajorRequirements(profile, courseSelections);

  if (result.status === "external") {
    return <p className="dku-academic-required__guidance">타 학과생의 전공필수 적용은 복수·부전공 기준으로 학과에 확인하세요.</p>;
  }
  if (result.status === "year-needed") {
    return <p className="dku-academic-required__guidance">입학연도를 입력하면 학번별 전공필수를 따로 확인할 수 있어요.</p>;
  }

  const summary = result.requiredCredits === 0
    ? "전공필수 없음"
    : `${result.completedCredits} / ${result.requiredCredits}학점`;

  return <div className="dku-academic-required">
    <ResultDisclosure id="result-academic-required-detail" title={`입학연도별 전공필수 · ${summary}`}>
      <p className="dku-academic-required__cohort">{result.cohortLabel} 기준 · 모듈 내 필수는 별도입니다.</p>
      {result.missingCourseIds.length > 0 ? (
        <ul className="dku-academic-required__missing" aria-label="남은 전공필수">
          {result.missingCourseIds.map((courseId) => {
            const course = courseById.get(courseId);
            return <li key={courseId}>
              <span>{course?.name ?? courseId}</span>
              <small>3학점 · 미완료</small>
            </li>;
          })}
        </ul>
      ) : result.requiredCredits > 0 ? (
        <p className="dku-academic-required__complete">입력한 완료 과목으로 전공필수 과목을 모두 채웠어요.</p>
      ) : null}
      {result.conditionalNote ? <p className="dku-academic-required__conditional">{result.conditionalNote}</p> : null}
    </ResultDisclosure>
  </div>;
}
