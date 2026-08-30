import { Check, CircleDot, Clock3, Layers3 } from "lucide-react";
import type {
  Course,
  CourseSelectionRecord,
  CourseSelectionStatus,
} from "../../types";

const planTermLabels = {
  next: "다음 학기",
  following: "다다음 학기",
  later: "나중",
} as const;

function selectionStatusLabel(selection?: CourseSelectionRecord): string {
  if (!selection) return "미선택";
  if (selection.status === "completed") return "이수 완료";
  if (selection.status === "in-progress") return "수강 중";
  return selection.plannedTerm
    ? `수강 계획 · ${planTermLabels[selection.plannedTerm]}`
    : "수강 계획";
}

function SelectionStatusIcon({ status }: { status?: CourseSelectionStatus }) {
  if (status === "completed") return <Check aria-hidden="true" size={15} />;
  if (status === "in-progress") return <CircleDot aria-hidden="true" size={15} />;
  if (status === "planned") return <Clock3 aria-hidden="true" size={15} />;
  return null;
}

function formatSemester(semester?: string): string {
  if (!semester) return "학기 미정";
  const [grade, term] = semester.split("-");
  return `${grade}학년 ${term}학기`;
}

export type CourseLedgerRowProps = {
  course: Course;
  selection?: CourseSelectionRecord;
  moduleLabel: string;
  evidenceText: string;
  trackModule: boolean;
  requiredForEnrollment: boolean;
  onToggleCourse: (courseId: string) => void;
};

export function CourseLedgerRow({
  course,
  selection,
  moduleLabel,
  evidenceText,
  trackModule,
  requiredForEnrollment,
  onToggleCourse,
}: CourseLedgerRowProps) {
  const status = selection?.status;
  const checked = status === "completed" || status === "in-progress";
  const statusLabel = selectionStatusLabel(selection);
  const rowClassName = [
    "course-ledger-row",
    status ? `course-ledger-row--${status}` : "course-ledger-row--unselected",
    trackModule ? "course-ledger-row--track" : "",
  ].filter(Boolean).join(" ");

  return (
    <label className={rowClassName} data-course-status={status ?? "unselected"}>
      <span className="course-ledger-check-target" data-touch-target="44">
        <input
          className="course-ledger-check-input"
          type="checkbox"
          checked={checked}
          aria-label={`${course.name} ${statusLabel}`}
          onChange={() => onToggleCourse(course.id)}
        />
        <span className="course-ledger-check-box" aria-hidden="true">
          {checked ? <Check size={18} /> : null}
        </span>
      </span>

      <span
        className="course-ledger-module"
        data-module-marker={course.moduleId}
        aria-label={`${course.moduleId} 모듈`}
        title={moduleLabel}
      >
        <Layers3 aria-hidden="true" size={15} />
        <b>{course.moduleId}</b>
      </span>

      <span className="course-ledger-course">
        <strong>{course.name}</strong>
        <small>{course.code} · {moduleLabel}</small>
        <small className="course-ledger-evidence">근거: {evidenceText}</small>
      </span>

      <span className="course-ledger-term">{formatSemester(course.recommendedSemester)}</span>
      <span className="course-ledger-credit">{course.credits}학점</span>
      <span className={`course-ledger-status course-ledger-status--${status ?? "unselected"}`}>
        <SelectionStatusIcon status={status} />
        {statusLabel}
      </span>

      <span className="course-ledger-flags">
        {requiredForEnrollment ? <em>필수</em> : null}
        {trackModule ? <em>선택 트랙 모듈</em> : null}
      </span>
    </label>
  );
}
