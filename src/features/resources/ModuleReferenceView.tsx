import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { COURSE_OFFERING_SNAPSHOT_META, courseOfferings2026 } from "../../data/courseOfferings2026";
import { courses, modules } from "../../data/curriculumData";

const moduleGroups = [
  { id: "foundation", label: "학문·경제 기초", categories: ["liberal", "foundation"] },
  { id: "major", label: "학과전공 모듈", categories: ["major"] },
  { id: "convergence", label: "융합전공 모듈", categories: ["convergence"] },
] as const;

export function ModuleReferenceView() {
  const [openModuleId, setOpenModuleId] = useState<string | undefined>("A");

  return (
    <div className="planner-resource-stack">
      <section className="planner-resource-reading" aria-labelledby="module-reference-title">
        <div className="planner-resource-section-heading">
          <span>15개 모듈</span>
          <h2 id="module-reference-title">모듈 이름과 포함 과목을 기준 자료 그대로 확인하세요</h2>
          <p>모듈별 과목과 2026년에 확인된 개설 이력을 함께 읽되, 이력은 다음 학기 개설 보장이 아닙니다.</p>
        </div>

        {moduleGroups.map((group) => (
          <section className="planner-module-group" aria-labelledby={`module-group-${group.id}`} key={group.id}>
            <h3 id={`module-group-${group.id}`}>{group.label}</h3>
            <ol>
              {modules
                .filter((curriculumModule) => group.categories.includes(curriculumModule.category as never))
                .map((curriculumModule) => {
                  const moduleCourses = courses.filter((course) => course.moduleId === curriculumModule.id);
                  const expanded = openModuleId === curriculumModule.id;
                  return (
                    <li key={curriculumModule.id} data-module-id={curriculumModule.id}>
                      <details
                        data-module-disclosure={curriculumModule.id}
                        open={expanded}
                      >
                        <summary
                          className="planner-focusable"
                          onClick={(event) => {
                            event.preventDefault();
                            setOpenModuleId(expanded ? undefined : curriculumModule.id);
                          }}
                        >
                          <span className="planner-module-letter">{curriculumModule.id}</span>
                          <h4>{curriculumModule.id}. {curriculumModule.name}</h4>
                          <span>{moduleCourses.length}과목</span>
                          <ChevronDown aria-hidden="true" size={21} />
                        </summary>
                        <div className="planner-module-detail">
                          <ul className="planner-module-course-list">
                            {moduleCourses.map((course) => {
                              const offering = courseOfferings2026[course.id];
                              return (
                                <li key={course.id}>
                                  <strong>{course.code} · {course.name}</strong>
                                  <span>{course.credits}학점</span>
                                  <small>
                                    {offering
                                      ? `2026 확인 학기 ${offering.observedProgramSemesters.join(", ")}`
                                      : "2026 개설 이력 없음"}
                                  </small>
                                </li>
                              );
                            })}
                          </ul>
                          {curriculumModule.sourceNote ? (
                            <p className="planner-resource-source-note">{curriculumModule.sourceNote}</p>
                          ) : null}
                        </div>
                      </details>
                    </li>
                  );
                })}
            </ol>
          </section>
        ))}
      </section>

      <EvidenceBand state="historical-2026-snapshot">
        {COURSE_OFFERING_SNAPSHOT_META.observedAt} 관찰 자료를 {COURSE_OFFERING_SNAPSHOT_META.recheckedAt}에 다시 점검했습니다.
        2026년에 확인한 개설 이력이며, 이후 개설을 보장하지 않습니다.
      </EvidenceBand>
      <EvidenceBand state="department-confirmation-required">
        M/N/O 모듈의 코드 정규화와 과목 수 차이는 원자료 주석을 함께 표시했습니다. 개인별 인정 여부는 학과에 확인하세요.
      </EvidenceBand>
    </div>
  );
}
