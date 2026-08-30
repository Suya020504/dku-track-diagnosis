import { useState } from "react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { TrackGlyph } from "../../components/TrackGlyph";
import { OFFICIAL_CURRICULUM_SOURCE, modules, tracks } from "../../data/curriculumData";
import type { ModuleId, Track } from "../../types";

export type ResourceConceptImageProps = {
  id: "course-module-track" | "progress-next-semester";
  src: string;
  alt: string;
  fallback: string;
};

export function ResourceConceptImage({ id, src, alt, fallback }: ResourceConceptImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="planner-resource-concept">
      <figcaption>개념 설명 이미지</figcaption>
      {failed ? (
        <p className="planner-resource-concept__fallback" data-concept-fallback={id} role="status">
          {fallback}
        </p>
      ) : (
        <img
          alt={alt}
          data-concept-image={id}
          decoding="async"
          height="640"
          loading="lazy"
          onError={() => setFailed(true)}
          src={src}
          width="960"
        />
      )}
    </figure>
  );
}

export function TrackSystemOverview() {
  return (
    <div className="planner-resource-stack">
      <ResourceConceptImage
        id="course-module-track"
        src="/illustrations/course-module-track-compass-v1.webp"
        alt="여러 과목이 모듈로 묶이고 다섯 갈래 트랙으로 이어지는 개념 설명 이미지"
        fallback="이미지 없이도 아래 트랙 목록에서 과목이 모듈로 묶이고 트랙으로 연결되는 구조를 확인할 수 있습니다."
      />

      <section className="planner-resource-reading" aria-labelledby="track-system-title">
        <div className="planner-resource-section-heading">
          <span>5개 트랙</span>
          <h2 id="track-system-title">트랙마다 배우는 방향과 모듈을 먼저 읽어보세요</h2>
          <p>트랙은 과목을 직접 나열한 이름이 아니라, 여러 모듈을 하나의 학습 방향으로 묶은 구조입니다.</p>
        </div>

        <ol className="planner-track-reading-list">
          {tracks.map((track, index) => {
            const moduleIds = getTrackModuleIds(track);
            return (
              <li key={track.id} data-track-id={track.id}>
                <div className="planner-track-reading-list__index">{String(index + 1).padStart(2, "0")}</div>
                <TrackGlyph trackId={track.id} />
                <div className="planner-track-reading-list__copy">
                  <p>{track.kind}</p>
                  <h3>{track.name}</h3>
                  <p>{track.description}</p>
                  <dl>
                    <div>
                      <dt>연결 모듈</dt>
                      <dd>{moduleIds.map(moduleLabel).join(" · ")}</dd>
                    </div>
                    <div>
                      <dt>현재 자료의 기준</dt>
                      <dd>{trackRequirementSummary(track)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <EvidenceBand state="official-public-confirmed">
        {OFFICIAL_CURRICULUM_SOURCE.title}의 현재 공개본 {OFFICIAL_CURRICULUM_SOURCE.currentPage}쪽에서
        트랙과 모듈 구성을 확인했습니다. 최종 개인 적용 여부는 학과 확인이 필요합니다.
      </EvidenceBand>
    </div>
  );
}

function getTrackModuleIds(track: Track): ModuleId[] {
  if (track.rule.type === "major") return track.rule.moduleIds;
  return [
    ...track.rule.baseModuleIds,
    ...track.rule.convergenceRequirements.flatMap((requirement) => requirement.moduleIds),
  ];
}

function moduleLabel(moduleId: ModuleId): string {
  const curriculumModule = modules.find((item) => item.id === moduleId);
  return `${moduleId}. ${curriculumModule?.name ?? "모듈"}`;
}

function trackRequirementSummary(track: Track): string {
  if (track.rule.type === "major") {
    return `5개 모듈에서 모듈별 ${track.rule.requiredCreditsPerModule}학점 · 합계 ${track.rule.totalTrackCredits}학점`;
  }
  const baseGroup = track.rule.baseModuleIds.join("/");
  const convergenceGroups = track.rule.convergenceRequirements
    .map((requirement) => `${requirement.moduleIds.join("+")} ${requirement.requiredCredits}학점`)
    .join(" · ");
  return `${baseGroup} 각각 ${track.rule.requiredCreditsPerBaseModule}학점 이상 · ${baseGroup} 합산 ${track.rule.requiredBaseCreditsTotal}학점 · ${convergenceGroups} · 합계 ${track.rule.totalTrackCredits}학점`;
}
