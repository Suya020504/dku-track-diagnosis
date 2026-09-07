import { Check, ChevronDown, CircleDot, Clock3, Info } from "lucide-react";
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
  showTerm: boolean;
  onToggleCourse: (courseId: string) => void;
};

export function CourseLedgerRow({
  course,
  selection,
  moduleLabel,
  evidenceText,
  trackModule,
  requiredForEnrollment,
  showTerm,
  onToggleCourse,
}: CourseLedgerRowProps) {
  const status = selection?.status;
  const checked = status === "completed" || status === "in-progress";
  const statusLabel = selectionStatusLabel(selection);
  const rowClassName = [
    "dku-check-row",
    status ? `dku-check-row--${status}` : "dku-check-row--unselected",
    trackModule ? "dku-check-row--track" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={rowClassName} data-course-status={status ?? "unselected"}>
      <label className="dku-check-row-primary">
        <span className="dku-check-check-target" data-touch-target="44">
          <input
            className="dku-check-check-input"
            type="checkbox"
            checked={checked}
            aria-label={`${course.name} ${statusLabel}`}
            onChange={() => onToggleCourse(course.id)}
          />
          <span className="dku-check-check-box" aria-hidden="true">
            {checked ? <Check size={18} /> : null}
          </span>
        </span>

        <span className="dku-check-course">
          <span>
            <strong>{course.name}</strong>
            {requiredForEnrollment ? <em>필수</em> : null}
          </span>
          {showTerm ? <small>{formatSemester(course.recommendedSemester)}</small> : null}
        </span>

        <span className="dku-check-credit">{course.credits}학점</span>
        {status ? (
          <span className={`dku-check-status dku-check-status--${status}`}>
            <SelectionStatusIcon status={status} />
            {statusLabel}
          </span>
        ) : <span className="sr-only">미선택</span>}
      </label>

      <details className="dku-check-row-details">
        <summary>
          <Info aria-hidden="true" size={15} />
          <span className="dku-check-info-label" aria-hidden="true">과목 정보</span>
          <span className="sr-only">{course.name} 과목 정보</span>
          <ChevronDown aria-hidden="true" size={15} />
        </summary>
        <div>
          <span><small>과목 코드</small><strong>{course.code}</strong></span>
          <span data-module-marker={course.moduleId}><small>모듈</small><strong>{moduleLabel}</strong></span>
          <span><small>권장 학기</small><strong>{formatSemester(course.recommendedSemester)}</strong></span>
        </div>
        <p>근거: {evidenceText}</p>
        {trackModule ? <em>선택 트랙 관련 모듈</em> : null}
      </details>
    </article>
  );
}
