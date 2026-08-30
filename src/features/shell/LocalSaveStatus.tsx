import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type LocalSaveState = "saved" | "error";

export function LocalSaveStatus({ state }: { state: LocalSaveState }) {
  if (state === "error") {
    return (
      <span className="planner-local-save planner-local-save--error" role="alert">
        <AlertTriangle aria-hidden="true" size={16} />
        저장하지 못함
      </span>
    );
  }

  return (
    <span className="planner-local-save" role="status">
      <CheckCircle2 aria-hidden="true" size={16} />
      이 브라우저에 저장됨
    </span>
  );
}
