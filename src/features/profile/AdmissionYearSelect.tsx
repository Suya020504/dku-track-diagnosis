import { useState } from "react";
import "./AdmissionYearSelect.css";

const RECENT_ENTRY_YEARS = Array.from({ length: 10 }, (_, index) => 2026 - index);

export function AdmissionYearSelect({
  entryYear,
  valid,
  onChange,
}: {
  entryYear?: number;
  valid: boolean;
  onChange: (entryYear: number | undefined) => void;
}) {
  const requiresDirectInput = entryYear !== undefined && !RECENT_ENTRY_YEARS.includes(entryYear);
  const [directInputChosen, setDirectInputChosen] = useState(requiresDirectInput);
  const showDirectInput = directInputChosen || requiresDirectInput;
  const errorId = valid ? undefined : "dku-profile-year-error";

  return (
    <div className="dku-profile-year">
      <label htmlFor="dku-profile-year-select">
        입학연도 <small>(선택)</small>
      </label>
      <select
        id="dku-profile-year-select"
        className="dku-profile-year__select planner-focusable"
        value={showDirectInput ? "custom" : entryYear ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          setDirectInputChosen(value === "custom");
          if (value !== "custom") onChange(value ? Number(value) : undefined);
        }}
      >
        <option value="">미선택</option>
        {RECENT_ENTRY_YEARS.map((year) => <option key={year} value={year}>{year}년</option>)}
        <option value="custom">이전 연도 직접 입력</option>
      </select>
      {showDirectInput ? (
        <label className="dku-profile-year__direct" htmlFor="dku-profile-year-input">
          <span>입학연도 직접 입력</span>
          <input
            id="dku-profile-year-input"
            className="planner-focusable"
            type="number"
            min="2000"
            max="2026"
            inputMode="numeric"
            aria-invalid={valid ? undefined : true}
            aria-describedby={errorId}
            value={entryYear ?? ""}
            onChange={(event) => onChange(
              event.target.value ? Number(event.target.value) : undefined,
            )}
          />
        </label>
      ) : null}
      {!valid ? (
        <small id="dku-profile-year-error" role="alert">
          입학연도는 2000년부터 2026년 사이로 입력해 주세요.
        </small>
      ) : null}
    </div>
  );
}
