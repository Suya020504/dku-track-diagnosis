import {
  ChartNoAxesCombined,
  Dna,
  MapPinned,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { TrackId } from "../types";

type TrackGlyphDefinition = {
  Icon: LucideIcon;
  label: string;
};

const trackGlyphs: Record<TrackId, TrackGlyphDefinition> = {
  "food-marketing": { Icon: ShoppingCart, label: "푸드마케팅 트랙" },
  "regional-development-consulting": { Icon: MapPinned, label: "지역개발 및 컨설팅 트랙" },
  "agri-food-distribution": { Icon: Truck, label: "농식품유통 트랙" },
  economics: { Icon: ChartNoAxesCombined, label: "경제학 트랙" },
  "food-bio-economy": { Icon: Dna, label: "푸드바이오경제 트랙" },
};

export type TrackGlyphProps = {
  trackId: TrackId;
  decorative?: boolean;
  className?: string;
};

export function TrackGlyph({ trackId, decorative = false, className }: TrackGlyphProps) {
  const { Icon, label } = trackGlyphs[trackId];
  const classes = ["planner-track-glyph", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      <Icon aria-hidden="true" focusable="false" strokeWidth={1.8} />
    </span>
  );
}
