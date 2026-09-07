import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Keep content mounted so print media can include every condition. */
export function ResultDisclosure({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="dku-results-disclosure">
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      <strong>{title}</strong><ChevronDown size={18} aria-hidden="true" />
    </button>
    <div id={id} data-collapsed={!expanded} className="dku-results-disclosure-content">{children}</div>
  </section>;
}
