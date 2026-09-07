import { describe, expect, it } from "vitest";
import { courses } from "./curriculumData";
import { courseOfferings2026 } from "./courseOfferings2026";
import { departmentCurriculum, filterOfficialSections, formatDayPeriod, OFFICIAL_2026_SOURCE, officialTimetable2026, parseDayPeriods, periodTime } from "./officialTimetable2026";

describe("verified 2026-2 public snapshot", () => {
  it("keeps 37 unique sections, 35 mapped sections from 25 track courses, and two outside", () => {
    expect(officialTimetable2026).toHaveLength(37);
    expect(new Set(officialTimetable2026.map((row) => `${row.officialCourseCode}-${row.section}`)).size).toBe(37);
    const mapped = officialTimetable2026.filter((row) => row.projectCourseId);
    expect(mapped).toHaveLength(35);
    expect(new Set(mapped.map((row) => row.projectCourseId)).size).toBe(25);
    expect(officialTimetable2026.filter((row) => row.scope === "D-MAJOR")).toHaveLength(24);
    expect(officialTimetable2026.filter((row) => row.scope === "D-FOUNDATION")).toHaveLength(4);
    expect(officialTimetable2026.filter((row) => row.scope === "CONVERGENCE")).toHaveLength(9);
    for (const row of mapped) {
      expect(courseOfferings2026[row.projectCourseId!].officialCourseCode).toBe(row.officialCourseCode);
      expect(courses.find((course) => course.id === row.projectCourseId)?.credits).toBe(row.credits);
    }
    expect(officialTimetable2026.every((row) => row.observedAt === "2026-09-08" && row.semester === 2 && row.campus === "천안")).toBe(true);
  });
  it("preserves instructor, changed notes, exceptional sections and unknown remote timing", () => {
    expect(filterOfficialSections("534890").map((row) => [row.section, row.instructor])).toEqual([["1", "정다은"], ["2", "정은진"], ["3", "정은진"]]);
    expect(filterOfficialSections("438630").map((row) => row.section)).toEqual(["3", "4"]);
    expect(filterOfficialSections("541270")[0]).toMatchObject({ section: "95", credits: 2, projectCourseId: null, notes: "주전공자(1전공자) 2~4학년만 이수 가능함" });
    expect(filterOfficialSections("548750")[0]).toMatchObject({ instructor: null, room: null, remoteTiming: "unknown" });
    expect(filterOfficialSections("369690")[0]).toMatchObject({ remoteTiming: "asynchronous", notes: "사전녹화온라인강의", room: "공학515 | 공학516" });
    expect(officialTimetable2026.filter((row) => row.remoteTiming === "unknown")).toHaveLength(6);
    expect(filterOfficialSections("553800")[0].changeNote).toBe("강사변경");
    expect(filterOfficialSections("534850")[1].changeNote).toBe("교시변경");
  });
  it("converts daytime and every nighttime period without treating remote rows as conflicts", () => {
    expect(periodTime(1)).toEqual({ start: "09:00", end: "09:30" });
    expect(periodTime(18)).toEqual({ start: "17:30", end: "18:00" });
    expect([19, 20, 21, 22, 23, 24].map(periodTime)).toEqual([
      { start: "18:00", end: "18:50" }, { start: "18:55", end: "19:45" }, { start: "19:50", end: "20:40" },
      { start: "20:45", end: "21:35" }, { start: "21:40", end: "22:30" }, { start: "22:35", end: "23:25" },
    ]);
    expect(formatDayPeriod(parseDayPeriods("금21~22")[0])).toContain("19:50–21:35");
    expect(filterOfficialSections("", "토")).toHaveLength(1);
    expect(filterOfficialSections("", "토")[0].section).toBe("2");
    expect(periodTime(25)).toBeNull(); expect(periodTime(1.5)).toBeNull();
  });
  it("searches normalized official codes/names and combines filters with honest empty state", () => {
    expect(filterOfficialSections(" 541 990 ")).toHaveLength(2);
    expect(filterOfficialSections("바이오 헬스 인간과 질병", "토", "원격수업", "CONVERGENCE")).toHaveLength(1);
    expect(filterOfficialSections("바이오 헬스 인간과 질병", "월")).toHaveLength(0);
    expect(filterOfficialSections("관능검사")[0].credits).toBe(2);
    expect(filterOfficialSections("312970")).toHaveLength(0);
  });
  it("keeps department 47 separate from track 49 and high-credit outside subjects unmapped", () => {
    expect(departmentCurriculum).toHaveLength(47);
    expect(courses).toHaveLength(49);
    expect(new Set(departmentCurriculum.map((row) => row.officialCourseCode)).size).toBe(47);
    const outside = departmentCurriculum.filter((row) => !row.projectCourseId);
    expect(outside).toHaveLength(10);
    const mapped = departmentCurriculum.filter((row) => row.projectCourseId);
    expect(mapped).toHaveLength(37);
    expect(mapped.map((row) => row.courseName)).toEqual([
      "식품자원과경제", "환경자원과경제", "지역과경제", "경제학이야기", "경제원론", "통계학기초",
      "미시경제학", "소비자경제학", "거시경제학", "환경경제학", "환경영향및전과정평가", "지속가능발전론",
      "지역발전론", "지역산업론", "커뮤니티발전론", "지역정책", "식품유통경제학", "유통관리론", "환경식품과무역",
      "농업경제학", "사회적경제론", "한국경제사", "마케팅조사분석", "그린마케팅", "신제품개발프로세스",
      "농식품정책론", "식품안전경제학", "식품위생법사례분석", "식품가격분석", "상품선물및옵션", "온라인유통및물류",
      "협동조합론", "경영계획법", "농식품창업론", "경제가치분석", "푸드테크와경제", "계량경제학",
    ]);
    for (const row of mapped) {
      const trackCourse = courses.find((course) => course.id === row.projectCourseId)!;
      expect(row.officialCourseCode).toBe(courseOfferings2026[row.projectCourseId!].officialCourseCode);
      expect(row.credits).toBe(trackCourse.credits);
      expect(`${row.grade}-${row.semester}`).toBe(trackCourse.recommendedSemester);
    }
    expect(outside.map((row) => row.credits)).toEqual([2, 2, 3, 3, 18, 12, 18, 12, 2, 4]);
    expect(OFFICIAL_2026_SOURCE.departmentRevisionYear).toBeNull();
    expect(OFFICIAL_2026_SOURCE.pdfTrackPrintedPage).toBe(60);
    for (const url of [OFFICIAL_2026_SOURCE.timetableUrl, OFFICIAL_2026_SOURCE.departmentCurriculumUrl, OFFICIAL_2026_SOURCE.pdfUrl]) expect(new URL(url).hostname).toMatch(/dankook\.ac\.kr$/);
  });
});
