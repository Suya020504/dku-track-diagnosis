import type { ReactNode } from "react";
import "./service-glyphs.css";

export type ServiceGlyphKind = "tracks" | "interest" | "courses" | "guide" | "plan" | "records" | "profile";
const drawings: Record<ServiceGlyphKind, ReactNode> = {
  tracks: <><path className="service-glyph__wash" d="M7 4h11v17H7z"/><path d="M7 3h10a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  interest: <><circle className="service-glyph__wash" cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M8 8.5c.8-1.3 2-1.8 3.5-1.3"/></>,
  courses: <><path className="service-glyph__wash" d="M12 5c3-2 6-2 9-1v15c-3-1-6-1-9 1Z"/><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/><path d="M6 8h3M15 8h3M6 11h3M15 11h3"/></>,
  guide: <><path className="service-glyph__wash" d="M3 5h18v15H3z"/><path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/><path d="M16 8v4l1.5-1 1.5 1V8"/></>,
  plan: <><path className="service-glyph__wash" d="M3 8h18v4H3z"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M7 17h2M16 17h2"/></>,
  records: <><path className="service-glyph__wash" d="M3 8h18v12H3z"/><path d="M3 8V5h6l2 3h10v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm0 3h18M9 15h6"/></>,
  profile: <><circle className="service-glyph__wash" cx="12" cy="7" r="5"/><circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 17l3 2 3-2"/></>,
};

/** Simple duotone marks; visible text remains the accessible action name. */
export function ServiceGlyph({ kind, size = 40, label }: { kind: ServiceGlyphKind; size?: number; label?: string }) {
  return <svg className="service-glyph" data-glyph={kind} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" focusable="false" {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>{drawings[kind]}</svg>;
}
