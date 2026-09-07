import { useState } from "react";
import { modules, tracks, OFFICIAL_CURRICULUM_SOURCE } from "../../data/curriculumData";
import type { Track } from "../../types";

export type ResourceConceptImageProps = { id: "course-module-track" | "progress-next-semester"; src: string; alt: string; fallback: string };
export function ResourceConceptImage({ id, src, alt, fallback }: ResourceConceptImageProps) {
  const [failed, setFailed] = useState(false);
  return <figure className="dku-resource-illustration">{failed ? <p role="status" data-concept-fallback={id}>{fallback}</p> : <img src={src} alt={alt} width="960" height="640" loading="lazy" data-concept-image={id} onError={() => setFailed(true)} />}<figcaption>구조를 설명하는 생성 이미지 · 공식 학사 자료 아님</figcaption></figure>;
}
function trackModules(track: Track) {
  return track.rule.type === "major" ? track.rule.moduleIds : [...track.rule.baseModuleIds, ...track.rule.convergenceRequirements.flatMap((item) => item.moduleIds)];
}
export function TrackSystemOverview() {
  return <section aria-label="다섯 트랙의 구성">
    <div className="dku-resource-track-intro"><div><h2>과목을 묶으면 모듈,<br />모듈을 연결하면 트랙</h2><p>전공의 기초를 쌓고 관심 분야로 넓혀가는 구조입니다. 트랙별 모듈 조합을 비교해 보세요.</p><a href={OFFICIAL_CURRICULUM_SOURCE.url} target="_blank" rel="noopener noreferrer">2026 학사종합안내 · 파일 72쪽 ↗</a></div><ResourceConceptImage id="course-module-track" src="/illustrations/course-module-track-structure-v2.webp" alt="과목 카드가 모듈 폴더로 분류되고 다섯 트랙으로 연결되는 개념" fallback="아래 목록에서 과목·모듈·트랙의 관계를 확인할 수 있습니다." /></div>
    <ol className="dku-resource-track-list">{tracks.map((track, index) => <li key={track.id} data-track-id={track.id}><span className="dku-resource-track-number">0{index + 1}</span><div><small>{track.kind}</small><h2>{track.name}</h2><p>{track.description}</p><div className="dku-resource-module-tags">{trackModules(track).map((id) => <span key={id}>{id} · {modules.find((item) => item.id === id)?.name}</span>)}</div><details><summary>현재 참고 계산 기준</summary>{track.rule.type === "major" ? <p>{track.rule.moduleIds.length}개 모듈에서 각각 {track.rule.requiredCreditsPerModule}학점 · 합계 {track.rule.totalTrackCredits}학점</p> : <p>
            {track.rule.baseModuleIds.join("/")} 각각 {track.rule.requiredCreditsPerBaseModule}학점 이상,
            합산 {track.rule.requiredBaseCreditsTotal}학점
            {track.rule.convergenceRequirements.map((requirement) => (
              <span key={requirement.moduleIds.join("+")}>
                {" · "}{requirement.moduleIds.join("+")} {requirement.requiredCredits}학점
              </span>
            ))}
            {" · "}합계 {track.rule.totalTrackCredits}학점
          </p>}<p>제공된 최종안에 따른 참고 계산입니다. 개별 학생의 적용·공식 승인을 뜻하지 않습니다.</p></details></div></li>)}</ol>
  </section>;
}
