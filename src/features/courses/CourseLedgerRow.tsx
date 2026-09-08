import { Check, Info } from "lucide-react";
import { courseOfferings2026 } from "../../data/courseOfferings2026";
import type {
  Course,
  CourseSelectionRecord,
  CourseSelectionStatus,
  PlanTerm,
} from "../../types";

const planTermLabels = {
  next: "계획 시작 학기",
  following: "그다음 학기",
  later: "이후 학기",
} as const;

function selectionStatusLabel(selection?: CourseSelectionRecord): string {
  if (!selection) return "미선택";
  if (selection.status === "completed") return "이수 완료";
  if (selection.status === "in-progress") return "수강 중";
  return selection.plannedTerm
    ? `수강 계획 · ${planTermLabels[selection.plannedTerm]}`
    : "수강 계획";
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
  onCourseStatusChange: (courseId: string, status: CourseSelectionStatus | null, plannedTerm?: PlanTerm) => void;
};

export function CourseLedgerRow({
  course,
  selection,
  moduleLabel,
  evidenceText,
  trackModule,
  requiredForEnrollment,
  onToggleCourse,
  onCourseStatusChange,
}: CourseLedgerRowProps) {
  const status = selection?.status;
  const checked = Boolean(selection);
  const statusLabel = selectionStatusLabel(selection);
  const rowClassName = [
    "dku-check-row",
    status ? `dku-check-row--${status}` : "dku-check-row--unselected",
    trackModule ? "dku-check-row--track" : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={rowClassName} data-course-id={course.id} data-course-status={status ?? "unselected"}>
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
          <small>{formatSemester(course.recommendedSemester)} · {moduleLabel}</small>
        </span>

        <span className="dku-check-row-meta">
        <span className="dku-check-credit">{course.credits}학점</span>
        </span>
      </label>

      <div className="dku-check-state-controls">
        <select className="dku-check-status-select" aria-label={`${course.name} 이수 상태`} value={status ?? ""}
          onChange={(event) => {
            const nextStatus = event.currentTarget.value as CourseSelectionStatus | "";
            onCourseStatusChange(course.id, nextStatus || null,
              nextStatus === "planned" ? selection?.plannedTerm ?? "later" : undefined);
          }}>
          <option value="">{selection ? "선택 해제" : "선택하세요"}</option>
          <option value="completed">이수 완료</option>
          <option value="in-progress">수강 중</option>
          <option value="planned">수강 계획</option>
        </select>
        {status === "planned" ? (
          <div className="dku-check-plan-term">
            <select aria-label={`${course.name} 계획 학기`} aria-describedby={`plan-term-help-${course.id}`}
              value={selection?.plannedTerm ?? "later"}
              onChange={(event) => onCourseStatusChange(course.id, "planned", event.currentTarget.value as PlanTerm)}>
              {Object.entries(planTermLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small id={`plan-term-help-${course.id}`}>플래너에서 정한 시작 학기 기준</small>
          </div>
        ) : null}
      </div>

      <details className="dku-check-row-details">
        <summary>
          <Info aria-hidden="true" size={15} />
          <span className="dku-check-info-label" aria-hidden="true">과목 정보</span>
          <span className="sr-only">{course.name} 과목 정보</span>
        </summary>
        <div>
          <span><small>학사 과목코드</small><strong>{courseOfferings2026[course.id]?.officialCourseCode ?? "미표기"}</strong></span>
          <span><small>트랙 자료 코드</small><strong>{course.code}</strong></span>
          <span data-module-marker={course.moduleId}><small>모듈</small><strong>{moduleLabel}</strong></span>
          <span><small>권장 학기</small><strong>{formatSemester(course.recommendedSemester)}</strong></span>
        </div>
        <p>근거: {evidenceText}</p>
        {trackModule ? <em>선택 트랙 관련 모듈</em> : null}
      </details>
    </article>
  );
}
