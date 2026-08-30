import { ArrowRight, LockKeyhole } from "lucide-react";
import { CourseModuleTrackFigure } from "../education/CourseModuleTrackFigure";
import { CompassPathRibbon, type CompassPathItem } from "../journey/CompassPathRibbon";
import { TrackPreviewStrip } from "./TrackPreviewStrip";

export type PlannerLandingProps = {
  onFindTrack: () => void;
  onStartDiagnosis: () => void;
  journeyItems: readonly CompassPathItem[];
};

const lockedPlannerTerms = [
  {
    title: "다음 학기",
    rows: [
      ["전공 과목 후보", "관심 트랙 선택 후 표시"],
      ["확인할 모듈", "이수 과목 입력 후 표시"],
    ],
  },
  {
    title: "그다음 학기",
    rows: [
      ["이어 들을 과목", "계획 단계에서 표시"],
      ["개설 이력 확인", "계획 단계에서 함께 확인"],
    ],
  },
] as const;

export function PlannerLanding({ onFindTrack, onStartDiagnosis, journeyItems }: PlannerLandingProps) {
  return (
    <main className="planner-landing" aria-labelledby="planner-landing-title">
      <section className="planner-landing__first-view">
        <div className="planner-landing__hero">
          <div className="planner-landing__copy">
            <h1 id="planner-landing-title">내 관심을 따라,{" "}<br />전공 로드맵을 완성해요</h1>
            <p>
              관심 질문으로 트랙을 찾고, 완료 과목을 다음 학기 계획까지 연결해 보세요.
            </p>
            <div className="planner-landing__actions">
              <button
                className="planner-landing__primary-action planner-focusable"
                data-action-priority="primary"
                type="button"
                onClick={onFindTrack}
              >
                내 관심 트랙 찾기
                <ArrowRight aria-hidden="true" size={18} />
              </button>
              <button
                className="planner-landing__secondary-action planner-focusable"
                data-action-priority="secondary"
                type="button"
                onClick={onStartDiagnosis}
              >
                이수 과목 바로 진단
              </button>
            </div>
          </div>

          <figure className="planner-landing__compass-plane">
            <img
              src="/campus-compass-illustration.webp"
              alt="전공 학습 경로와 다음 학기를 가리키는 캠퍼스 컴퍼스 일러스트"
              width="2048"
              height="1024"
              fetchPriority="high"
            />
            <figcaption>전공 학습 경로를 표현한 개념 설명 이미지</figcaption>
          </figure>
        </div>

        <div className="planner-landing__journey">
          <CompassPathRibbon items={journeyItems} />
        </div>

        <section className="planner-landing__locked-planner" aria-labelledby="locked-planner-title">
          <header>
            <div>
              <h2 id="locked-planner-title">관심을 찾으면 계획표가 펼쳐져요</h2>
              <p>트랙과 완료 과목을 확인하기 전에는 계획을 계산하지 않습니다.</p>
            </div>
            <span className="planner-landing__lock-state" role="status">
              <LockKeyhole aria-hidden="true" size={17} />
              입력 전 잠김
            </span>
          </header>
          <ol className="planner-landing__planner-ledger" aria-label="잠긴 학기 플래너 미리보기">
            {lockedPlannerTerms.map((term) => (
              <li key={term.title}>
                <h3>{term.title}</h3>
                <dl>
                  {term.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <section className="planner-landing__tracks" aria-labelledby="track-preview-title">
        <div className="planner-landing__section-copy">
          <h2 id="track-preview-title">다섯 방향을 먼저 펼쳐 보세요</h2>
          <p>현재 교육과정의 트랙 이름과 표식을 그대로 사용합니다.</p>
        </div>
        <TrackPreviewStrip />
      </section>

      <CourseModuleTrackFigure />
    </main>
  );
}
