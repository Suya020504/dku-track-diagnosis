import { periodTime, type DayPeriod, type OfficialClassSection, type TeachingDay } from "../../data/officialTimetable2026";

export const TEACHING_DAYS: TeachingDay[] = ["월", "화", "수", "목", "금", "토"];

export function meetingMinutes(period: DayPeriod) {
  const first = periodTime(period.first);
  const last = periodTime(period.last);
  if (!first || !last || period.first > period.last) return null;
  const minutes = (clock: string) => {
    const [hours, minute] = clock.split(":").map(Number);
    return hours * 60 + minute;
  };
  return { start: minutes(first.start), end: minutes(last.end), startLabel: first.start, endLabel: last.end };
}

export type WeeklyMeeting = NonNullable<ReturnType<typeof meetingMinutes>> & {
  key: string;
  sectionKey: string;
  day: TeachingDay;
  period: DayPeriod;
  section: OfficialClassSection;
};

// Rows show exact start times, not duration-sized blocks or a personal conflict check.
export function createWeeklyTimetable(sections: OfficialClassSection[], selectedDay = "all") {
  const days = TEACHING_DAYS.filter((day) => selectedDay === "all" || day === selectedDay);
  const meetings: WeeklyMeeting[] = [];
  const unscheduled: OfficialClassSection[] = [];
  const seenMeetings = new Set<string>();
  const starts = new Map<number, string>();
  for (const section of sections) {
    if (section.remoteTiming === "asynchronous" || !section.dayPeriods.length) {
      unscheduled.push(section);
      continue;
    }
    let hasUnassignedTime = false;
    for (const period of section.dayPeriods) {
      const timing = meetingMinutes(period);
      if (!timing) { hasUnassignedTime = true; continue; }
      if (!days.includes(period.day)) continue;
      const sectionKey = `${section.officialCourseCode}-${section.section}`;
      const key = `${sectionKey}-${period.day}-${period.first}-${period.last}`;
      if (seenMeetings.has(key)) continue;
      seenMeetings.add(key);
      meetings.push({ ...timing, key, sectionKey, day: period.day, period, section });
      starts.set(timing.start, timing.startLabel);
    }
    if (hasUnassignedTime) unscheduled.push(section);
  }
  return { days, meetings, unscheduled, starts: Array.from(starts, ([minutes, label]) => ({ minutes, label })).sort((a, b) => a.minutes - b.minutes) };
}
