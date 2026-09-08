import { compareAcademicTerms } from "../../lib/graduationPlanner";
import { EvidenceBand } from "../../components/EvidenceBand";
import type {
  AcademicTermId,
  GraduationPlanPreferences,
} from "../../types";

export function GraduationPlanSetup({
  value,
  onChange,
  onSubmit,
}: {
  value: Partial<GraduationPlanPreferences>;
  onChange: (value: Partial<GraduationPlanPreferences>) => void;
  onSubmit: (value: GraduationPlanPreferences) => void;
}) {
  const isNewEmptyForm = Object.keys(value).length === 0;
  const currentValue: Partial<GraduationPlanPreferences> = isNewEmptyForm
    ? { currentTerm: "2026-2", considerSeasonalTerm: false }
    : value;
  const academicTermPattern = /^\d{4}-(1|2)$/;
  const currentValid = academicTermPattern.test(currentValue.currentTerm ?? "");
  const targetTermValid = academicTermPattern.test(currentValue.targetGraduationTerm ?? "");
  const targetValid = Boolean(
    currentValid
    && targetTermValid
    && compareAcademicTerms(
      currentValue.targetGraduationTerm as AcademicTermId,
      currentValue.currentTerm as AcademicTermId,
    ) >= 0,
  );
  const loadValid = Number.isInteger(currentValue.maxMajorCoursesPerTerm)
    && Number(currentValue.maxMajorCoursesPerTerm) >= 1
    && Number(currentValue.maxMajorCoursesPerTerm) <= 6;
  const valid = targetValid
    && loadValid
    && currentValue.considerSeasonalTerm !== undefined;
  const reversedTarget = currentValid && targetTermValid && !targetValid;

  return (
    <form
      className="dku-plan-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit(currentValue as GraduationPlanPreferences);
      }}
    >
      <fieldset className="dku-plan-date-fields">
        <legend>계획할 기간</legend>
          <label>
            <span>현재 학기</span>
            <input
              aria-describedby="current-term-help"
              aria-invalid={!currentValid}
              inputMode="text"
              pattern="[0-9]{4}-[12]"
              placeholder="2026-2"
              value={currentValue.currentTerm ?? ""}
              onChange={(event) => onChange({
                ...currentValue,
                currentTerm: event.target.value as AcademicTermId,
              })}
            />
            <small id="current-term-help">연도-학기 형식으로 입력해 주세요. 예: 2026-2</small>
          </label>
          <label>
            <span>목표 졸업 학기</span>
            <input
              aria-describedby={reversedTarget ? "target-term-error" : undefined}
              aria-invalid={!targetValid}
              inputMode="text"
              pattern="[0-9]{4}-[12]"
              placeholder="2028-1"
              value={currentValue.targetGraduationTerm ?? ""}
              onChange={(event) => onChange({
                ...currentValue,
                targetGraduationTerm: event.target.value as AcademicTermId,
              })}
            />
            {reversedTarget && (
              <small className="field-error" id="target-term-error">
                목표 졸업 학기는 현재 학기와 같거나 이후여야 합니다.
              </small>
            )}
          </label>
      </fieldset>
      <fieldset className="dku-plan-load-fields">
        <legend>수강 여유</legend>
          <label>
            <span>학기당 최대 전공과목 수</span>
            <input
              aria-describedby="major-load-help"
              aria-invalid={!loadValid}
              type="number"
              min="1"
              max="6"
              step="1"
              value={currentValue.maxMajorCoursesPerTerm ?? ""}
              onChange={(event) => onChange({
                ...currentValue,
                maxMajorCoursesPerTerm: Number(event.target.value),
              })}
            />
            <small id="major-load-help">한 학기에 1~6과목 사이의 정수로 입력해 주세요.</small>
          </label>
          <label className="dku-plan-seasonal">
            <input
              type="checkbox"
              checked={currentValue.considerSeasonalTerm ?? false}
              onChange={(event) => onChange({
                ...currentValue,
                considerSeasonalTerm: event.target.checked,
              })}
            />
            <span>계절학기 고려 여부</span>
          </label>
      </fieldset>

      <EvidenceBand state="historical-2026-snapshot">
        2026학년도 개설 이력을 최근 개설 패턴으로 참고합니다. 이후 반복 개설은 보장하지 않습니다. 실제 개설·폐강·인정 여부는 <a href="?view=resources">공식 자료 화면</a>에서 다시 확인해 주세요.
      </EvidenceBand>
      <p className="seasonal-term-notice">
        계절학기는 자동 가능성 계산에 포함하지 않고 확인할 항목으로만 남겨요.
      </p>

      <button className="primary-button" type="submit" disabled={!valid}>
        학기별 참고 계획 만들기
      </button>
    </form>
  );
}
