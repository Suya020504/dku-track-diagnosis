import { TrackGlyph } from "../../components/TrackGlyph";
import { tracks } from "../../data/curriculumData";

export function TrackPreviewStrip() {
  return (
    <ul className="planner-track-preview" aria-label="2026 교육과정의 다섯 트랙">
      {tracks.map((track) => (
        <li key={track.id} data-track-id={track.id}>
          <TrackGlyph trackId={track.id} />
          <div>
            <strong>{track.name}</strong>
            <span>{track.kind}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
