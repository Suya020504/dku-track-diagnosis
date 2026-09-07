export const OFFICIAL_2026_SOURCE = {
  observedAt: "2026-09-08",
  academicYear: 2026,
  semester: 2,
  campus: "천안",
  timetableUrl: "https://webinfo.dankook.ac.kr/tiac/univ/lssn/lpci/views/lssnPopup/tmtbl2.do",
  departmentCurriculumUrl: "https://cms.dankook.ac.kr/ko/web/ere/%EC%A0%95%EA%B7%9C-%EA%B5%90%EC%9C%A1%EA%B3%BC%EC%A0%95",
  departmentRevisionYear: null,
  pdfUrl: "https://www.dankook.ac.kr/documents/d/kor/2026-1-_-260119-pdf?download=true",
  pdfSha256: "2daf5d0e046b7182c243a30e49cafe08c90f347d8c9ce3b17eec12d5cef31207",
  pdfTrackPage: 72,
  pdfTrackPrintedPage: 60,
  pdfPeriodPage: 138,
  pdfPeriodPrintedPage: 4,
  pdfServerModifiedAt: "2026-08-27T11:19:56+09:00",
  evidence: "live-public-query",
} as const;

export const TIMETABLE_QUERY_SCOPES = {
  "D-MAJOR": "전공검색 → 공공인재대학 → 식품자원경제학과",
  "D-FOUNDATION": "학문기초검색 → 공공인재대학 → 식품자원경제학과",
  CONVERGENCE: "전공검색 → 단과대/학과 제한 해제 → 기능성식품학·관능검사·식품품질학·바이오헬스·미래식품과다이어트 검색 후 과목코드 대조",
} as const;
export type TimetableScope = keyof typeof TIMETABLE_QUERY_SCOPES;
export type TeachingDay = "월" | "화" | "수" | "목" | "금" | "토";
export type DayPeriod = { day: TeachingDay; first: number; last: number; room: string | null };
export type OfficialClassSection = {
  academicYear: 2026; semester: 2; campus: "천안"; observedAt: "2026-09-08";
  evidence: "live-public-query"; scope: TimetableScope; projectCourseId: string | null;
  officialCourseCode: string; courseName: string; grade: number; section: string;
  credits: number; instructor: string | null; scheduleRaw: string; dayPeriods: DayPeriod[];
  room: string | null; delivery: "대면수업" | "원격수업";
  remoteTiming: "not-applicable" | "asynchronous" | "unknown";
  notes: string | null; changeNote: string | null;
};

// Transcribed verbatim from the verified public-query handoff. A null means not printed.
const sectionRows = `D-MAJOR	k-2	553740	경영계획법	3	1	3	양성범	월5~7(사회113) | 화10~12(사회122)	사회113 | 사회122	대면수업	not-applicable	null	null
D-MAJOR	i-1	553130	농식품정책론	4	1	3	김종필	화2~7(사회304)	사회304	대면수업	not-applicable	null	null
D-MAJOR	g-1	328370	농업경제학	4	1	3	문수희	수9~14(사회402)	사회402	대면수업	not-applicable	null	null
D-MAJOR	h-1	534890	마케팅조사분석	2	1	3	정다은	월5~7(사회122) | 목2~4(사회122)	사회122 | 사회122	대면수업	not-applicable	null	null
D-MAJOR	h-1	534890	마케팅조사분석	2	2	3	정은진	월5~10(사회219-01)	사회219-01	대면수업	not-applicable	null	null
D-MAJOR	h-1	534890	마케팅조사분석	2	3	3	정은진	월12~17(사회219-01)	사회219-01	대면수업	not-applicable	null	null
D-MAJOR	c-1	345790	미시경제학	2	1	3	정다은	월9~11(사회416) | 화5~7(사회416)	사회416 | 사회416	대면수업	not-applicable	null	null
D-MAJOR	c-1	345790	미시경제학	2	2	3	정다은	월12~14(사회416) | 화2~4(사회416)	사회416 | 사회416	대면수업	not-applicable	null	null
D-MAJOR	g-2	565690	사회적경제론	4	1	3	안병일	화10~15(사회308)	사회308	대면수업	not-applicable	null	null
D-MAJOR	j-2	553760	상품선물및옵션	3	1	3	김태훈	화13~18(사회215)	사회215	대면수업	not-applicable	null	null
D-MAJOR	j-1	553730	식품가격분석	2	1	3	양성범	월2~4(사회113) | 목5~7(사회113)	사회113 | 사회113	대면수업	not-applicable	null	null
D-MAJOR	f-1	553110	식품유통경제학	2	1	3	변동훈	금2~7(사회401)	사회401	대면수업	not-applicable	null	null
D-MAJOR	f-1	553110	식품유통경제학	2	2	3	정소영	금2~7(사회423)	사회423	대면수업	not-applicable	null	null
D-MAJOR	d-3	411210	지속가능발전론	3	1	3	신원상	월10~15(사회309)	사회309	대면수업	not-applicable	null	null
D-MAJOR	e-2	411880	지역산업론	2	1	3	임청룡	목11~16(사회316)	사회316	대면수업	not-applicable	null	null
D-MAJOR	e-4	459750	지역정책	4	1	3	이혜원	수2~7(사회304)	사회304	대면수업	not-applicable	null	null
D-MAJOR	b-2	446440	통계학기초	1	1	3	양성범	월9~11(사회113) | 화2~4(사회122)	사회113 | 사회122	대면수업	not-applicable	null	null
D-MAJOR	b-2	446440	통계학기초	1	2	3	양성범	월12~14(사회113) | 화5~7(사회122)	사회113 | 사회122	대면수업	not-applicable	null	null
D-MAJOR	l-2	553800	푸드테크와경제	3	1	3	정다은	수2~7(사회113)	사회113	대면수업	not-applicable	null	강사변경
D-MAJOR	d-1	438630	환경경제학	3	3	3	이혜원	목2~7(사회310)	사회310	대면수업	not-applicable	null	null
D-MAJOR	d-1	438630	환경경제학	3	4	3	이혜원	목10~15(사회310)	사회310	대면수업	not-applicable	null	null
D-MAJOR	f-3	553150	환경식품과무역	3	1	3	원종설	수9~14(사회404)	사회404	대면수업	not-applicable	null	null
D-FOUNDATION	a-4	446310	경제학이야기	1	1	3	이제윤	수2~7(사회308)	사회308	대면수업	not-applicable	null	null
D-FOUNDATION	a-4	446310	경제학이야기	1	2	3	이제윤	수10~15(사회308)	사회308	대면수업	not-applicable	null	null
D-FOUNDATION	a-3	534850	지역과경제	1	1	3	신원상	수10~15(사회310)	사회310	대면수업	not-applicable	null	null
D-FOUNDATION	a-3	534850	지역과경제	1	2	3	신원상	수2~7(사회310)	사회310	대면수업	not-applicable	null	교시변경
CONVERGENCE	n-1	519780	기능성식품학	3	1	2	안예진	수6~9(자연1관215)	자연1관215	대면수업	not-applicable	null	강사변경
CONVERGENCE	o-2	312930	관능검사	3	1	2	유영상	월11~14(공학515)	공학515	대면수업	not-applicable	null	null
CONVERGENCE	o-3	369690	식품품질학	2	1	3	조명수	수2~4(공학515) | 목14~16(공학516)	공학515 | 공학516	원격수업	asynchronous	사전녹화온라인강의	null
CONVERGENCE	m-4	541990	바이오헬스기초의학	1	1	2	이영일	금21~22	null	원격수업	unknown	null	null
CONVERGENCE	m-4	541990	바이오헬스기초의학	1	2	2	이영일	금19~20	null	원격수업	unknown	null	null
CONVERGENCE	m-2	548150	바이오헬스인간과질병	1	1	2	장태수	금7~10	null	원격수업	unknown	null	null
CONVERGENCE	m-2	548150	바이오헬스인간과질병	1	2	2	장태수	토7~10	null	원격수업	unknown	null	null
CONVERGENCE	m-1	541980	바이오헬스인체의신비	1	1	2	박종태	금11~14	null	원격수업	unknown	null	null
CONVERGENCE	m-3	548750	미래식품과다이어트	1	1	2	null	금11~14	null	원격수업	unknown	null	null
D-MAJOR	null	541270	취창업ㆍ진로세미나2	3	95	2	양성범	수15~18(사회215)	사회215	대면수업	not-applicable	주전공자(1전공자) 2~4학년만 이수 가능함	null
D-MAJOR	null	541590	캡스톤디자인2(환경자원경제)	3	1	3	김태연	화2~7(사회214)	사회214	대면수업	not-applicable	null	null`;

const nullable = (value: string) => value === "null" ? null : value;
export function parseDayPeriods(raw: string): DayPeriod[] {
  return raw.split(" | ").map((part) => {
    const match = /^([월화수목금토])(\d+)~(\d+)(?:\(([^)]+)\))?$/.exec(part);
    if (!match) throw new Error(`Invalid official period: ${part}`);
    return { day: match[1] as TeachingDay, first: Number(match[2]), last: Number(match[3]), room: match[4] ?? null };
  });
}
export const officialTimetable2026: OfficialClassSection[] = sectionRows.split("\n").map((line) => {
  const [scope, projectId, code, name, grade, section, credits, instructor, scheduleRaw, room, delivery, remoteTiming, notes, changeNote] = line.split("\t");
  return {
    academicYear: 2026, semester: 2, campus: "천안", observedAt: "2026-09-08", evidence: "live-public-query",
    scope: scope as TimetableScope, projectCourseId: nullable(projectId), officialCourseCode: code,
    courseName: name, grade: Number(grade), section, credits: Number(credits), instructor: nullable(instructor),
    scheduleRaw, dayPeriods: parseDayPeriods(scheduleRaw), room: nullable(room), delivery: delivery as OfficialClassSection["delivery"],
    remoteTiming: remoteTiming as OfficialClassSection["remoteTiming"], notes: nullable(notes), changeNote: nullable(changeNote),
  };
});

const nightPeriods = [["18:00", "18:50"], ["18:55", "19:45"], ["19:50", "20:40"], ["20:45", "21:35"], ["21:40", "22:30"], ["22:35", "23:25"]];
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export function periodTime(period: number): { start: string; end: string } | null {
  if (!Number.isInteger(period) || period < 1 || period > 24) return null;
  if (period <= 18) return { start: clock(540 + (period - 1) * 30), end: clock(540 + period * 30) };
  const [start, end] = nightPeriods[period - 19];
  return { start, end };
}
export function formatDayPeriod(period: DayPeriod): string {
  return `${period.day} ${period.first}~${period.last}교시 · ${periodTime(period.first)?.start ?? "미표기"}–${periodTime(period.last)?.end ?? "미표기"}`;
}
export const normalizeCourseSearch = (value: string) => value.replace(/\s+/g, "").toLocaleLowerCase("ko");
export function filterOfficialSections(query: string, day = "all", delivery = "all", scope = "all") {
  const needle = normalizeCourseSearch(query);
  return officialTimetable2026.filter((row) => (!needle || normalizeCourseSearch([
    row.courseName, row.officialCourseCode, row.instructor ?? "미표기", row.projectCourseId ?? "", row.room ?? "미표기",
  ].join(" ")).includes(needle)) && (day === "all" || row.dayPeriods.some((period) => period.day === day))
    && (delivery === "all" || row.delivery === delivery) && (scope === "all" || row.scope === scope));
}

export type DepartmentCourse = { officialCourseCode: string; courseName: string; credits: number; grade: number; semester: number; projectCourseId: string | null };
// Official department names and curriculum placement, transcribed independently of track labels.
const departmentTrackRows = `a-1	553090	식품자원과경제	3	1	1
a-2	439340	환경자원과경제	3	1	1
a-3	534850	지역과경제	3	1	2
a-4	446310	경제학이야기	3	1	2
b-1	306860	경제원론	3	1	1
b-2	446440	통계학기초	3	1	2
c-1	345790	미시경제학	3	2	2
c-2	553100	소비자경제학	3	2	1
c-3	303540	거시경제학	3	3	1
d-1	438630	환경경제학	3	3	2
d-2	553140	환경영향및전과정평가	3	4	1
d-3	411210	지속가능발전론	3	3	2
e-1	479170	지역발전론	3	2	1
e-2	411880	지역산업론	3	2	2
e-3	534870	커뮤니티발전론	3	4	1
e-4	459750	지역정책	3	4	2
f-1	553110	식품유통경제학	3	2	2
f-2	446410	유통관리론	3	3	1
f-3	553150	환경식품과무역	3	3	2
g-1	328370	농업경제학	3	4	2
g-2	565690	사회적경제론	3	4	2
g-3	554680	한국경제사	3	2	1
h-1	534890	마케팅조사분석	3	2	2
h-2	321330	그린마케팅	3	4	1
h-3	553780	신제품개발프로세스	3	2	1
i-1	553130	농식품정책론	3	4	2
i-2	534900	식품안전경제학	3	4	1
i-3	553770	식품위생법사례분석	3	3	1
j-1	553730	식품가격분석	3	2	2
j-2	553760	상품선물및옵션	3	3	2
j-3	553790	온라인유통및물류	3	4	1
k-1	436280	협동조합론	3	2	1
k-2	553740	경영계획법	3	3	2
k-3	553750	농식품창업론	3	3	1
l-1	553120	경제가치분석	3	3	1
l-2	553800	푸드테크와경제	3	3	2
l-3	307260	계량경제학	3	3	1`;
const additionalRows = `541260|취창업ㆍ진로세미나1|2|3|1
541270|취창업ㆍ진로세미나2|2|3|2
541580|캡스톤디자인1(환경자원경제)|3|3|1
541590|캡스톤디자인2(환경자원경제)|3|3|2
479330|국내인턴십1(환경자원경제)|18|4|1
479340|국내인턴십2(환경자원경제)|12|4|1
512570|국외인턴십1(환경자원경제)|18|4|1
512580|국외인턴십2(환경자원경제)|12|4|1
518540|산업체현장실습1(환경자원경제)|2|4|1
518550|산업체현장실습2(환경자원경제)|4|4|1`;
// Curriculum placement is not evidence of an actual class offering. No new module assignment.
export const departmentCurriculum: DepartmentCourse[] = [
  ...departmentTrackRows.split("\n").map((line) => {
    const [projectCourseId, officialCourseCode, courseName, credits, grade, semester] = line.split("\t");
    return { projectCourseId, officialCourseCode, courseName, credits: Number(credits), grade: Number(grade), semester: Number(semester) };
  }),
  ...additionalRows.split("\n").map((line) => {
    const [officialCourseCode, courseName, credits, grade, semester] = line.split("|");
    return { officialCourseCode, courseName, credits: Number(credits), grade: Number(grade), semester: Number(semester), projectCourseId: null };
  }),
];
