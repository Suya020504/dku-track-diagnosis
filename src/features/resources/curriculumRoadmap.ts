import { normalizeCourseSearch, type DepartmentCourse } from "../../data/officialTimetable2026";

export type CurriculumRoadmapColumn = { id: string; grade: number; semester: number };
export type CurriculumRoadmapRow = {
  id: string;
  label: string;
  cells: { columnId: string; courses: DepartmentCourse[] }[];
};

// Presentation-only areas following the requested roadmap layout. These are
// deliberately independent of track rules, module completion, and diagnosis.
const learningAreas = [
  { id: "common", label: "공통", courseIds: ["a-1", "a-2", "a-3", "a-4"] },
  { id: "economics", label: "경제학", courseIds: ["b-1", "b-2", "c-1", "c-2", "c-3", "d-1", "l-3"] },
  { id: "distribution", label: "농식품유통", courseIds: ["f-1", "f-2", "f-3", "g-1", "g-2", "g-3", "i-2", "j-3", "k-2"] },
  { id: "marketing", label: "푸드마케팅", courseIds: ["h-1", "h-2", "h-3", "i-3", "j-1", "j-2", "l-1", "l-2"] },
  { id: "regional", label: "지역개발·컨설팅", courseIds: ["d-2", "d-3", "e-1", "e-2", "e-3", "e-4", "i-1", "k-1", "k-3"] },
  { id: "practice", label: "진로·실습", courseIds: [] },
  { id: "other", label: "기타 과목", courseIds: [] },
];

const areaByCourseId = new Map(learningAreas.flatMap((area) => area.courseIds.map((id) => [id, area.id] as const)));
const semesterColumns: CurriculumRoadmapColumn[] = [1, 2, 3, 4].flatMap((grade) =>
  [1, 2].map((semester) => ({ id: `${grade}-${semester}`, grade, semester })),
);

export function buildCurriculumRoadmap(
  courses: readonly DepartmentCourse[],
  filters: { query?: string; grade?: string } = {},
): { columns: CurriculumRoadmapColumn[]; rows: CurriculumRoadmapRow[]; courseCount: number } {
  const grade = filters.grade ?? "all";
  const needle = normalizeCourseSearch(filters.query ?? "");
  const columns = semesterColumns.filter((column) => grade === "all" || String(column.grade) === grade);
  const visibleCourses = courses.filter((course) =>
    (grade === "all" || String(course.grade) === grade)
    && normalizeCourseSearch(`${course.courseName} ${course.officialCourseCode}`).includes(needle),
  );
  const rows = learningAreas.map((area) => ({
    id: area.id,
    label: area.label,
    cells: columns.map((column) => ({ columnId: column.id, courses: [] as DepartmentCourse[] })),
  }));
  const rowByArea = new Map(rows.map((row) => [row.id, row]));

  for (const course of visibleCourses) {
    const areaId = course.projectCourseId === null ? "practice" : areaByCourseId.get(course.projectCourseId) ?? "other";
    const cell = rowByArea.get(areaId)?.cells.find((candidate) => candidate.columnId === `${course.grade}-${course.semester}`);
    cell?.courses.push(course);
  }

  return {
    columns,
    rows: rows.filter((row) => row.cells.some((cell) => cell.courses.length > 0)),
    courseCount: visibleCourses.length,
  };
}
