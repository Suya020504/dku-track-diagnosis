import { describe, expect, it } from "vitest";
import { filterOfficialSections, officialTimetable2026 } from "../../data/officialTimetable2026";
import { createWeeklyTimetable, meetingMinutes } from "./timetableStudent";

describe("student weekly timetable", () => {
  it("uses actual daylight and nighttime minutes, including the 5 minute night break", () => {
    expect(meetingMinutes({ day: "월", first: 1, last: 2, room: null })).toEqual({ start: 540, end: 600, startLabel: "09:00", endLabel: "10:00" });
    expect(meetingMinutes({ day: "금", first: 21, last: 22, room: null })).toEqual({ start: 1190, end: 1295, startLabel: "19:50", endLabel: "21:35" });
    expect(meetingMinutes({ day: "금", first: 19, last: 20, room: null })).toEqual({ start: 1080, end: 1185, startLabel: "18:00", endLabel: "19:45" });
    expect(meetingMinutes({ day: "월", first: 25, last: 26, room: null })).toBeNull();
    expect(meetingMinutes({ day: "월", first: 3, last: 2, room: null })).toBeNull();
  });

  it("keeps all 37 unique sections reachable without converting asynchronous meetings into fixed cells", () => {
    const table = createWeeklyTimetable(officialTimetable2026);
    const keys = new Set([...table.meetings.map((meeting) => meeting.sectionKey), ...table.unscheduled.map((row) => `${row.officialCourseCode}-${row.section}`)]);
    expect(keys.size).toBe(37);
    expect(table.unscheduled.map((row) => row.courseName)).toEqual(["식품품질학"]);
    expect(table.meetings.some((meeting) => meeting.section.officialCourseCode === "369690")).toBe(false);
    expect(table.meetings.filter((meeting) => meeting.section.officialCourseCode === "553740")).toHaveLength(2);
    expect(table.meetings.filter((meeting) => meeting.day === "금" && meeting.start === 570).map((meeting) => meeting.sectionKey)).toEqual(["553110-1", "553110-2"]);
  });

  it("limits meetings to the selected day while retaining Saturday and exact evening start rows", () => {
    const saturday = createWeeklyTimetable(filterOfficialSections("", "토"), "토");
    expect(saturday.days).toEqual(["토"]);
    expect(saturday.meetings).toHaveLength(1);
    expect(saturday.meetings[0]).toMatchObject({ sectionKey: "548150-2", start: 720, end: 840 });
    const night = createWeeklyTimetable(filterOfficialSections("541990"));
    expect(night.starts).toEqual([{ minutes: 1080, label: "18:00" }, { minutes: 1190, label: "19:50" }]);
    const multiDay = createWeeklyTimetable(filterOfficialSections("553740", "월"), "월");
    expect(multiDay.meetings.map((meeting) => meeting.day)).toEqual(["월"]);
  });

  it("does not repeat an identical meeting and leaves unassigned time outside the weekly cells", () => {
    const row = officialTimetable2026[0];
    const duplicate = { ...row, dayPeriods: [row.dayPeriods[0], row.dayPeriods[0]] };
    expect(createWeeklyTimetable([duplicate]).meetings).toHaveLength(1);
    const unassigned = { ...row, dayPeriods: [] };
    const table = createWeeklyTimetable([unassigned]);
    expect(table.meetings).toHaveLength(0);
    expect(table.starts).toHaveLength(0);
    expect(table.unscheduled).toEqual([unassigned]);
  });
});
