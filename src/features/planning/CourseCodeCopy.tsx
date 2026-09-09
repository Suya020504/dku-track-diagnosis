import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { courseOfferings2026 } from "../../data/courseOfferings2026";

export function CourseCodeCopy({ courseId, courseName }: { courseId: string; courseName: string }) {
  const record = courseOfferings2026[courseId];
  const code = record?.evidence !== "unknown" && /^\d{6}$/.test(record?.officialCourseCode ?? "")
    ? record.officialCourseCode : undefined;
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const fallbackRef = useRef<HTMLInputElement>(null);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  if (!code) return <span className="track-module-planner__course-meta">학사 과목코드 확인 필요</span>;
  return <div className="track-module-planner__course-code">
    <span>학사 과목코드 <strong>{code}</strong></span>
    <button type="button" onClick={() => { void copy(); }} aria-label={`${courseName} 과목코드 ${code} 복사`}>
      {status === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {status === "copied" ? "복사됨" : "코드 복사"}
    </button>
    <span className="track-module-planner__copy-status" role="status">
      {status === "copied" ? `${courseName} 과목코드를 복사했어요: ${code}` : status === "manual" ? "자동 복사가 안 돼요. 아래 코드를 선택해 직접 복사해 주세요." : ""}
    </span>
    {status === "manual" && <input ref={fallbackRef} type="text" readOnly value={code}
      aria-label={`${courseName} 직접 복사할 과목코드`} onFocus={event => event.target.select()}
      onClick={() => fallbackRef.current?.select()} />}
  </div>;
}
