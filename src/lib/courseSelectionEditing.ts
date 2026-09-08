import { courses } from "../data/curriculumData";
import type { CourseSelectionRecord, CourseSelectionStatus, PlanTerm } from "../types";

const selectableIds = new Set(courses.filter(course => course.moduleId !== "A").map(course => course.id));

export function updateCourseSelection(
  selections: readonly CourseSelectionRecord[],
  courseId: string,
  status: CourseSelectionStatus | null,
  plannedTerm?: PlanTerm,
): CourseSelectionRecord[] {
  if (!selectableIds.has(courseId)) return [...selections];
  const others = selections.filter(selection => selection.courseId !== courseId);
  if (!status) return others;
  return [...others, status === "planned"
    ? { courseId, status, plannedTerm: plannedTerm ?? "next" }
    : { courseId, status }];
}
