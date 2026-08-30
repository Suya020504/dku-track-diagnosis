import {
  getEvidenceSource,
  type EvidenceState,
} from "../data/evidenceSources";

export type CourseStickerProps = {
  courseName: string;
  moduleLabel?: string;
  creditsLabel?: string;
  termLabel?: string;
  evidenceState: EvidenceState;
};

export function CourseSticker({
  courseName,
  moduleLabel,
  creditsLabel,
  termLabel,
  evidenceState,
}: CourseStickerProps) {
  const evidence = getEvidenceSource(evidenceState);

  return (
    <article className="planner-course-sticker" aria-label={`${courseName} 과목 정보`}>
      <div className="planner-course-sticker__main">
        <strong>{courseName}</strong>
        {moduleLabel ? <span>{moduleLabel}</span> : null}
      </div>
      {creditsLabel || termLabel ? (
        <div className="planner-course-sticker__meta">
          {creditsLabel ? <span>{creditsLabel}</span> : null}
          {termLabel ? <span>{termLabel}</span> : null}
        </div>
      ) : null}
      <small className="planner-course-sticker__evidence">근거: {evidence.label}</small>
    </article>
  );
}
