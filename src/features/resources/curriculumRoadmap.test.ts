import { describe, expect, it } from "vitest";
import { departmentCurriculum, type DepartmentCourse } from "../../data/officialTimetable2026";
import { buildCurriculumRoadmap } from "./curriculumRoadmap";

describe("curriculum roadmap placement", () => {
  it("preserves all 47 original records exactly once across eight semester columns", () => {
    const roadmap = buildCurriculumRoadmap(departmentCurriculum);
    const placed = roadmap.rows.flatMap((row) => row.cells.flatMap((cell) => cell.courses));
    expect(roadmap.columns.map((column) => column.id)).toEqual(["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"]);
    expect(placed).toHaveLength(47);
    expect(roadmap.courseCount).toBe(47);
    expect(new Set(placed.map((course) => course.officialCourseCode)).size).toBe(47);
    for (const course of departmentCurriculum) expect(placed).toContain(course);
    expect(roadmap.rows.map((row) => [row.id, row.cells.reduce((sum, cell) => sum + cell.courses.length, 0)])).toEqual([
      ["common", 4], ["economics", 7], ["distribution", 9], ["marketing", 8], ["regional", 9], ["practice", 10],
    ]);
  });

  it("uses individual course IDs rather than assigning a whole shared module to one learning area", () => {
    const roadmap = buildCurriculumRoadmap(departmentCurriculum);
    const areaFor = (code: string) => roadmap.rows.find((row) => row.cells.some((cell) => cell.courses.some((course) => course.officialCourseCode === code)))?.id;
    expect(areaFor("438630")).toBe("economics"); // D1
    expect(areaFor("553140")).toBe("regional"); // D2
    expect(areaFor("553130")).toBe("regional"); // I1
    expect(areaFor("534900")).toBe("distribution"); // I2
    expect(areaFor("553770")).toBe("marketing"); // I3
    expect(areaFor("307260")).toBe("economics"); // L3
  });

  it("preserves an unrecognized course mapping in a visible other area", () => {
    const unknown: DepartmentCourse = { officialCourseCode: "999999", courseName: "새 학과 과목", credits: 3, grade: 2, semester: 1, projectCourseId: "z-1" };
    const roadmap = buildCurriculumRoadmap([unknown]);
    expect(roadmap.courseCount).toBe(1);
    expect(roadmap.rows[0]?.id).toBe("other");
    expect(roadmap.rows[0]?.label).toBe("기타 과목");
    expect(roadmap.rows[0]?.cells.find((cell) => cell.columnId === "2-1")?.courses).toEqual([unknown]);
  });

  it("intersects grade and normalized course search while keeping the requested semester columns", () => {
    const roadmap = buildCurriculumRoadmap(departmentCurriculum, { grade: "4", query: " 479 330 " });
    expect(roadmap.columns.map((column) => column.id)).toEqual(["4-1", "4-2"]);
    expect(roadmap.courseCount).toBe(1);
    expect(roadmap.rows[0]?.cells[0]?.courses[0]).toMatchObject({ courseName: "국내인턴십1(환경자원경제)", credits: 18 });
    expect(buildCurriculumRoadmap(departmentCurriculum, { grade: "1", query: "479330" }).courseCount).toBe(0);
    expect(buildCurriculumRoadmap(departmentCurriculum, { query: "식품 유통 경제학" }).courseCount).toBe(1);
    expect(buildCurriculumRoadmap([], { grade: "2" })).toMatchObject({ courseCount: 0, rows: [] });
  });
});
