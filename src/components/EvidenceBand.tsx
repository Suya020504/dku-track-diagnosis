import type { ReactNode } from "react";
import {
  getEvidenceSource,
  type EvidenceState,
} from "../data/evidenceSources";

export type EvidenceBandProps = {
  state: EvidenceState;
  children?: ReactNode;
};

export function EvidenceBand({ state, children }: EvidenceBandProps) {
  const evidence = getEvidenceSource(state);

  return (
    <aside className={`planner-evidence-band planner-evidence-band--${state}`} data-evidence-state={state}>
      <div>
        <strong>{evidence.label}</strong>
        <p>{children ?? evidence.description}</p>
      </div>
    </aside>
  );
}
