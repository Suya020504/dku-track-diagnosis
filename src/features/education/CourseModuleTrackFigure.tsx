import { ArrowRight } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { TrackGlyph } from "../../components/TrackGlyph";
import { courses, modules, tracks } from "../../data/curriculumData";
import { isCourseInTrack } from "../../lib/diagnosis";

export function CourseModuleTrackFigure() {
  const course = courses.find((item) => item.id === "f-1");
  const curriculumModule = course
    ? modules.find((item) => item.id === course.moduleId)
    : undefined;

  if (!course || !curriculumModule) return null;

  const relatedTracks = tracks.filter((track) => isCourseInTrack(track, course));

  return (
    <figure className="planner-course-track-figure" aria-labelledby="course-track-figure-title">
      <figcaption>
        <h2 id="course-track-figure-title">과목에서 트랙까지 이렇게 이어져요</h2>
        <p>2026 교육과정에서 확인한 연결 관계를 설명하는 예시입니다.</p>
      </figcaption>

      <div className="planner-course-track-figure__flow">
        <div className="planner-course-track-figure__node" data-figure-node="course">
          <span>과목</span>
          <strong>{course.name}</strong>
        </div>
        <ArrowRight className="planner-course-track-figure__arrow" aria-hidden="true" size={22} />
        <div className="planner-course-track-figure__node" data-figure-node="module">
          <span>모듈</span>
          <strong>{curriculumModule.id}. {curriculumModule.name}</strong>
        </div>
        <ArrowRight className="planner-course-track-figure__arrow" aria-hidden="true" size={22} />
        <section className="planner-course-track-figure__tracks" aria-labelledby="related-tracks-title">
          <h3 id="related-tracks-title">연결되는 트랙</h3>
          <ul>
            {relatedTracks.map((track) => (
              <li key={track.id}>
                <TrackGlyph trackId={track.id} />
                <strong>{track.name}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <EvidenceBand state="provided-final-plan-reference">
        이 그림은 과목과 모듈, 트랙의 연결을 설명합니다. 공식 이수 완료 판정이 아닙니다.
      </EvidenceBand>
    </figure>
  );
}
