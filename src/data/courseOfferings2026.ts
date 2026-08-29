import type {
  AcademicSemesterNumber,
  CourseOfferingRecord,
  PlanningSemester,
} from "../types";

export const COURSE_OFFERING_SNAPSHOT_META = {
  observedAt: "2026-08-11",
  recheckedAt: "2026-08-30",
  currentPublicVerification: "blocked-by-public-access",
  allowsFutureOfferingGuarantee: false,
  timetableSearchUrl:
    "https://webinfo.dankook.ac.kr/tiac/univ/lssn/lpci/views/lssnPopup/tmtbl2.do",
} as const;

export const courseOfferings2026: Record<string, CourseOfferingRecord> = {
  "a-1": offering("a-1", "553090", ["1-1"]),
  "a-2": offering("a-2", "439340", ["1-1"]),
  "a-3": offering("a-3", "534850", ["1-2"]),
  "a-4": offering("a-4", "446310", ["1-2"]),
  "b-1": offering("b-1", "306860", ["1-1"]),
  "b-2": offering("b-2", "446440", ["1-2"]),
  "c-1": offering("c-1", "345790", ["2-2"]),
  "c-2": offering("c-2", "553100", ["2-1"]),
  "c-3": offering("c-3", "303540", ["3-1"]),
  "d-1": offering("d-1", "438630", ["3-2"]),
  "d-2": offering("d-2", "553140", ["4-1"]),
  "d-3": offering("d-3", "411210", ["3-2"]),
  "e-1": offering("e-1", "479170", ["2-1"]),
  "e-2": offering("e-2", "411880", ["2-2"]),
  "e-3": offering("e-3", "534870", ["4-1"]),
  "e-4": offering("e-4", "459750", ["4-2"]),
  "f-1": offering("f-1", "553110", ["2-2"]),
  "f-2": offering("f-2", "446410", ["3-1"]),
  "f-3": offering("f-3", "553150", ["3-2"]),
  "g-1": offering("g-1", "328370", ["4-2"]),
  "g-2": offering("g-2", "565690", ["4-2"]),
  "g-3": offering("g-3", "554680", ["2-1"]),
  "h-1": offering("h-1", "534890", ["2-2"]),
  "h-2": offering("h-2", "321330", ["4-1"]),
  "h-3": offering("h-3", "553780", ["2-1"]),
  "i-1": offering("i-1", "553130", ["4-2"]),
  "i-2": offering("i-2", "534900", ["4-1"]),
  "i-3": offering("i-3", "553770", ["3-1"]),
  "j-1": offering("j-1", "553730", ["2-2"]),
  "j-2": offering("j-2", "553760", ["3-2"]),
  "j-3": offering("j-3", "553790", ["4-1"]),
  "k-1": offering("k-1", "436280", ["2-1"]),
  "k-2": offering("k-2", "553740", ["3-2"]),
  "k-3": offering("k-3", "553750", ["3-1"]),
  "l-1": offering("l-1", "553120", ["3-1"]),
  "l-2": offering("l-2", "553800", ["3-2"]),
  "l-3": offering("l-3", "307260", ["3-1"]),
  "m-1": offering("m-1", "541980", ["1-1", "1-2"], "바이오헬스인체의신비"),
  "m-2": offering("m-2", "548150", ["1-1", "1-2"], "바이오헬스인간과질병"),
  "m-3": offering("m-3", "548750", ["1-1", "1-2"], "미래식품과다이어트"),
  "m-4": offering("m-4", "541990", ["1-1", "1-2"], "바이오헬스기초의학"),
  "m-5": offering("m-5", "545080", ["1-1"], "바이오헬스약과건강"),
  "n-1": offering("n-1", "519780", ["3-2"]),
  "n-2": offering("n-2", "378800", ["2-1"]),
  "n-3": offering("n-3", "369710", ["2-1"]),
  "n-4": offering("n-4", "322150", ["4-1"]),
  "o-1": offering("o-1", "369590", ["4-1"]),
  "o-2": offering("o-2", "312930", ["3-2"]),
  "o-3": offering("o-3", "369690", ["2-2"]),
};

export function getObservedSemesterNumbers(
  courseId: string,
): AcademicSemesterNumber[] {
  const record = courseOfferings2026[courseId];
  if (!record) return [];
  return [
    ...new Set(
      record.observedProgramSemesters.map(
        (value) => Number(value.split("-")[1]) as AcademicSemesterNumber,
      ),
    ),
  ].sort();
}

function offering(
  courseId: string,
  officialCourseCode: string,
  observedProgramSemesters: PlanningSemester[],
  timetableName?: string,
): CourseOfferingRecord {
  return {
    courseId,
    officialCourseCode,
    observedProgramSemesters,
    timetableName,
    evidence: "historical-2026-snapshot",
  };
}
