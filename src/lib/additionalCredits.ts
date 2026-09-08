import { courses } from "../data/curriculumData";
import { departmentCurriculum } from "../data/officialTimetable2026";
import type { AdditionalMajorCredit } from "../types";

export const extraDepartmentCourses = departmentCurriculum.filter(course => !course.projectCourseId);
const normalize = (value: string) => value.normalize("NFKC").replace(/[\s·ㆍ._()-]/g, "").toLowerCase();
const knownCourseLabels = new Set([
  ...courses.flatMap(course => [course.id, course.code, course.name]),
  ...departmentCurriculum.flatMap(course => [course.officialCourseCode, course.courseName]),
].map(normalize));

export function findDepartmentCredit(current: readonly AdditionalMajorCredit[], code: string): AdditionalMajorCredit | undefined {
  const course = extraDepartmentCourses.find(item => item.officialCourseCode === code);
  return course ? current.find(item => item.id === `department:${code}` || normalize(item.label) === normalize(course.courseName)) : undefined;
}

export function toggleDepartmentCredit(current: readonly AdditionalMajorCredit[], code: string): AdditionalMajorCredit[] {
  const course = extraDepartmentCourses.find(item => item.officialCourseCode === code);
  if (!course) return [...current];
  const id = `department:${code}`;
  const existing = findDepartmentCredit(current, code);
  if (existing) return current.filter(item => item.id !== existing.id);
  return [...current, { id, label: course.courseName, credits: course.credits, status: "student-entered", note: `이수 완료로 직접 입력 · 학과 교육과정 과목코드 ${code}. 개인별 전공 인정 확인 필요.` }];
}

export function addManualMajorCredit(
  current: readonly AdditionalMajorCredit[],
  input: { id: string; label: string; credits: number },
): { credits: AdditionalMajorCredit[]; error?: string } {
  const label = input.label.trim();
  const reject = (error: string) => ({ credits: [...current], error });
  if (!label || label.length > 100) return reject("학점의 내용을 1~100자로 적어 주세요.");
  if (!Number.isFinite(input.credits) || input.credits < 0.5 || input.credits > 300 || !Number.isInteger(input.credits * 2)) {
    return reject("학점은 0.5~300 사이에서 0.5학점 단위로 입력해 주세요.");
  }
  if (knownCourseLabels.has(normalize(label))) return reject("목록에 있는 과목입니다. 위 과목 목록에서 선택해 중복 합산을 피해주세요.");
  if (!input.id || current.some(item => item.id === input.id || normalize(item.label) === normalize(label))) {
    return reject("이미 입력한 내용입니다. 기존 항목을 확인해 주세요.");
  }
  return { credits: [...current, { id: input.id, label, credits: input.credits, status: "student-entered", note: "이수 완료한 기타 전공학점으로 직접 입력. 개인별 전공 인정 확인 필요." }] };
}
