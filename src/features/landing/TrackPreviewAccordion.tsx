import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Track, TrackId } from "../../types";

export function TrackPreviewAccordion({
  tracks,
  onOpenStructure,
}: {
  tracks: readonly Track[];
  onOpenStructure: () => void;
}) {
  const [openTrackId, setOpenTrackId] = useState<TrackId | undefined>(tracks[0]?.id);

  return (
    <div className="track-home__track-browser">
      <div className="track-home__track-list">
        {tracks.map((track) => {
          const expanded = track.id === openTrackId;
          const panelId = `track-preview-${track.id}`;
          return (
            <article
              className="track-home__track-item"
              data-track-preview={track.id}
              data-expanded={expanded || undefined}
              key={track.id}
            >
              <button
                className="track-home__track-trigger planner-focusable"
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenTrackId(expanded ? undefined : track.id)}
              >
                <span className="track-home__track-title">
                  <strong>{track.name}</strong>
                  <small>{track.kind}</small>
                </span>
                <ChevronDown aria-hidden="true" size={20} />
              </button>
              {expanded ? (
                <div className="track-home__track-detail" id={panelId}>
                  <p>{track.description}</p>
                  <ul aria-label={`${track.name} 관련 분야`}>
                    {track.careerKeywords.map((keyword) => <li key={keyword}>{keyword}</li>)}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <button
        className="track-home__guide-link planner-focusable"
        type="button"
        onClick={onOpenStructure}
      >
        5개 트랙 자세히 보기
        <ArrowRight aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
