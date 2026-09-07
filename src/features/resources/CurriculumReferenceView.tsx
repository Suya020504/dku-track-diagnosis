import { EvidenceBand } from "../../components/EvidenceBand";
import { courses } from "../../data/curriculumData";
import { REQUIRED_COURSE_VARIANTS } from "../../data/requirementRules2026";
import { CourseModuleTrackFigure } from "../education/CourseModuleTrackFigure";
import { ResourceConceptImage } from "./TrackSystemOverview";

const curriculumSlots = [
  { key: "1-1", label: "1학년 1학기" },
  { key: "1-2", label: "1학년 2학기" },
  { key: "2-1", label: "2학년 1학기" },
  { key: "2-2", label: "2학년 2학기" },
  { key: "3-1", label: "3학년 1학기" },
  { key: "3-2", label: "3학년 2학기" },
  { key: "4-1", label: "4학년 1학기" },
  { key: "4-2", label: "4학년 2학기" },
  { key: "unassigned", label: "학기 별도 확인" },
] as const;

export function CurriculumReferenceView() {
  const requiredVariant = REQUIRED_COURSE_VARIANTS["starred-six-2026"];

  return (
    <div className="planner-resource-stack">
      <ResourceConceptImage
        id="progress-next-semester"
        src="/illustrations/progress-next-semester-planner-v2.webp"
        alt="체크한 과목 카드와 선택 과목을 학기 플래너에 정리하는 개념 설명 이미지"
        fallback="이미지 없이도 아래 교육과정표에서 추천 시점과 과목을 확인하고 다음 학기 계획으로 이어갈 수 있습니다."
      />

      <CourseModuleTrackFigure />

      <section className="planner-resource-reading" aria-labelledby="curriculum-table-title">
        <div className="planner-resource-section-heading">
          <span>2026 교육과정 관계표</span>
          <h2 id="curriculum-table-title">추천 시점별 과목을 읽고 실제 개설 여부를 다시 확인하세요</h2>
          <p>이 표는 현재 작업트리의 교육과정 데이터를 읽기 쉽게 묶은 참고표입니다.</p>
        </div>

        <table className="planner-curriculum-table">
          <caption>추천 학년·학기별 과목과 모듈</caption>
          <thead>
            <tr>
              <th scope="col">추천 시점</th>
              <th scope="col">과목과 연결 모듈</th>
            </tr>
          </thead>
          <tbody>
            {curriculumSlots.map((slot) => {
              const slotCourses = courses.filter((course) => slot.key === "unassigned"
                ? !course.recommendedSemester
                : course.recommendedSemester === slot.key);
              return (
                <tr key={slot.key}>
                  <th scope="row">{slot.label}</th>
                  <td>
                    <ul>
                      {slotCourses.map((course) => (
                        <li key={course.id}>
                          <strong>{course.name}</strong>
                          <span>{course.code} · {course.moduleId} 모듈 · {course.credits}학점</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <EvidenceBand state="provided-final-plan-reference">
        필수 과목 참고안: {requiredVariant.courseIds.length}과목 · {requiredVariant.requiredCredits}학점.
        추천 학기는 제공된 2026 교육과정 최종안 참고값이며,
        {requiredVariant.allowsOfficialCompletion ? " 공식 완료 판정에 사용할 수 있습니다." : " 공식 완료 판정에 사용하지 않습니다."}
        실제 시간표·폐강·분반·인정 여부를 확정하지 않습니다.
      </EvidenceBand>
    </div>
  );
}
