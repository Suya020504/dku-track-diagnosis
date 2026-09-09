import { useState } from "react";
import { ExternalLink, Layers3 } from "lucide-react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { modules, tracks } from "../../data/curriculumData";
import { CHEONAN_ACADEMIC_GUIDE_URL } from "../../data/trackApplication2026";
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
    <div className="dku-resource-track-intro"><p><Layers3 size={20} aria-hidden="true" />트랙별 모듈 조합을 비교해 보세요.</p><a href={CHEONAN_ACADEMIC_GUIDE_URL} target="_blank" rel="noopener noreferrer">천안 학사종합안내 <ExternalLink size={16} aria-hidden="true" /></a></div>
    <ol className="dku-resource-track-list">{tracks.map((track) => <li key={track.id} data-track-id={track.id}><span className="dku-resource-track-icon"><TrackGlyph trackId={track.id} decorative /></span><div><small>{track.kind}</small><h2>{track.name}</h2><p>{track.description}</p><div className="dku-resource-module-tags">{trackModules(track).map((id) => <span key={id}>{id} · {modules.find((item) => item.id === id)?.name}</span>)}</div><details><summary>현재 참고 계산 기준</summary>{track.rule.type === "major" ? <p>{track.rule.moduleIds.length}개 모듈에서 각각 {track.rule.requiredCreditsPerModule}학점 · 합계 {track.rule.totalTrackCredits}학점</p> : <p>
            {track.rule.baseModuleIds.join("/")} 각각 {track.rule.requiredCreditsPerBaseModule}학점 이상,
            합산 {track.rule.requiredBaseCreditsTotal}학점
            {track.rule.convergenceRequirements.map((requirement) => (
              <span key={requirement.moduleIds.join("+")}>
                {" · "}{requirement.moduleIds.join("+")} {requirement.requiredCredits}학점
              </span>
            ))}
            {" · "}합계 {track.rule.totalTrackCredits}학점
          </p>}</details></div></li>)}</ol>
  </section>;
}
