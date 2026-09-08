import { useState } from "react";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import { courses, modules } from "../../data/curriculumData";
import { normalizeCourseSearch } from "../../data/officialTimetable2026";

export function ModuleReferenceView() {
  const [query, setQuery] = useState("");
  const [openModuleId, setOpenModuleId] = useState<string | undefined>("A");
  const needle = normalizeCourseSearch(query);
  const visible = courses.filter((course) => normalizeCourseSearch(`${course.code} ${course.name} ${courseOfferings2026[course.id]?.officialCourseCode} ${courseOfferings2026[course.id]?.timetableName ?? ""} ${modules.find((item) => item.id === course.moduleId)?.name}`).includes(needle));
  return <section className="dku-resource-modules" aria-label="모듈별 과목 자료">
    <div className="dku-resource-toolbar"><label>모듈·과목 검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="과목명, 모듈명, 학사 과목코드" /></label><span role="status">{visible.length} / 49과목</span></div>
    <p className="dku-resource-note">A 학문기초 4과목을 포함한 트랙 구성 전체입니다. 직접 진단의 전공 입력 목록은 A를 제외한 45과목입니다.</p>
    {visible.length === 0 && <p className="dku-resource-empty" role="status">조건에 맞는 과목이 없습니다. 검색어를 바꿔 보세요.</p>}
    <div className="dku-resource-module-grid">{modules.map((module) => {
      const rows = visible.filter((course) => course.moduleId === module.id);
      if (!rows.length) return null;
      return <details key={`${module.id}-${Boolean(needle)}`} data-module-disclosure={module.id} data-module-id={module.id} open={Boolean(needle) || module.id === openModuleId}>
        <summary onClick={(event) => { if (!needle) { event.preventDefault(); setOpenModuleId(openModuleId === module.id ? undefined : module.id); } }}><span className="dku-resource-letter" aria-hidden="true">{module.id}</span><strong>{module.id}. {module.name}</strong><span>{rows.length}과목</span></summary>
        <ul>{rows.map((course) => <li key={course.id}><strong>{course.name}</strong><span>{course.credits}학점</span><small>학사 과목코드 {courseOfferings2026[course.id]?.officialCourseCode} · 트랙 자료 코드 {course.code}</small></li>)}</ul>
        {module.sourceNote && <p className="dku-resource-note">{module.sourceNote}</p>}
      </details>;
    })}</div>
    <details className="dku-resource-method"><summary>자료 범위와 주의 사항</summary><p>2026 학사종합안내의 트랙 구성과 제공된 최종안은 서로 다른 자료입니다. M/N/O 코드를 맞추는 문제와 과목 수 차이는 원자료에도 남아 있습니다. 이 과목 목록은 이번 학기 실제 개설 목록이 아닙니다.</p></details>
  </section>;
}
