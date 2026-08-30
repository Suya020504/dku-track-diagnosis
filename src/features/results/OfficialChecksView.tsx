import type { RefObject } from "react";
import { ExternalLink } from "lucide-react";
import { EvidenceBand } from "../../components/EvidenceBand";
import { COURSE_OFFERING_SNAPSHOT_META } from "../../data/courseOfferings2026";
import { OFFICIAL_CURRICULUM_SOURCE } from "../../data/curriculumData";
import { DEPARTMENT_HOME_URL, OFFICIAL_TRACK_VIDEOS } from "../../data/officialResources";
import type {
  DiagnosisResult,
  PathProgressResult,
  StudentProfile,
} from "../../types";
import { getPathLabel } from "./PathProgressSummary";

const TRACK_VIDEO_URL = OFFICIAL_TRACK_VIDEOS[2].watchUrl;

const REVIEW_LABELS: Record<PathProgressResult["reviewItems"][number]["code"], string> = {
  "rule-source": "적용 규정 근거",
  "unknown-course": "확인되지 않은 과목",
  "additional-credit": "추가 전공학점",
  "document-conflict": "문서 충돌",
  "future-offering": "향후 개설",
  "seasonal-term": "계절학기",
  "plan-input": "계획 입력",
  "elective-placeholder": "선택 과목 자리",
};

export function OfficialChecksView({
  result,
  profile,
  pathProgress,
  headingRef,
}: {
  result: DiagnosisResult;
  profile: StudentProfile;
  pathProgress: PathProgressResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const pathLabel = getPathLabel(profile);
  const conflictItems = pathProgress.reviewItems.filter((item) => (
    item.code === "document-conflict" || item.code === "unknown-course"
  ));
  const otherReviewItems = pathProgress.reviewItems.filter((item) => (
    item.code !== "document-conflict" && item.code !== "unknown-course"
  ));
  const trackNames = result.trackResults.map((track) => track.trackName);

  return (
    <div className="planner-result-section planner-official-checks">
      <header className="planner-result-heading">
        <span>확인 · 공식 안내와 개인 적용</span>
        <h1 id="result-confirm-title" ref={headingRef} tabIndex={-1}>
          학과에 확인할 질문을 정리했어요
        </h1>
        <p>
          자가진단은 입력한 자료를 기준으로 한 참고 계산입니다. 문서 간 차이, 향후 개설,
          개인별 인정 범위는 아래 질문과 링크로 확인해 주세요.
        </p>
      </header>

      <EvidenceBand state="department-confirmation-required">
        {pathLabel}{trackNames.length > 0 ? ` · ${trackNames.join(", ")}` : ""}의 개인별 적용과
        최종 인정 범위는 학과 확인이 필요합니다.
      </EvidenceBand>

      {pathProgress.requiredProgress === "not-applicable" ? (
        <p className="planner-directed-empty">
          이 이수 경로에는 별도 필수 과목 확인 항목이 없습니다. 전체 전공학점과 개인 적용 질문을 중심으로 확인하세요.
        </p>
      ) : null}

      <section className="planner-check-ledger" aria-labelledby="document-conflict-title">
        <header>
          <span>문서 대조</span>
          <h2 id="document-conflict-title">입력·문서에서 발견한 확인 항목</h2>
        </header>
        {conflictItems.length > 0 ? (
          <ul>
            {conflictItems.map((item, index) => (
              <li key={`${item.code}-${index}`}>
                <strong>{REVIEW_LABELS[item.code]}</strong>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="planner-directed-empty">
            현재 입력에는 문서 충돌이나 알 수 없는 과목이 기록되지 않았습니다.
            원본 성적표와 교육과정표를 대조하지 않았다면 학과 상담 때 함께 확인해 주세요.
          </p>
        )}
      </section>

      <section className="planner-official-questions" aria-labelledby="official-question-title">
        <header>
          <span>학과에 물어볼 질문</span>
          <h2 id="official-question-title">그대로 저장해 가져갈 수 있는 점검 목록</h2>
        </header>
        <ol>
          <li>
            <strong>향후 개설</strong>
            <span>추천된 과목이 내가 실제 수강 학기에 개설되는가?</span>
          </li>
          <li>
            <strong>추가 전공학점</strong>
            <span>타학과·편입·교류 학점 등 추가 전공학점이 내 전체 전공학점에 포함되는가?</span>
          </li>
          <li>
            <strong>개인 적용</strong>
            <span>내 입학연도와 이수 경로({pathLabel})에 이 계산 기준이 적용되는가?</span>
          </li>
          <li>
            <strong>트랙·필수 인정</strong>
            <span>겹치는 모듈과 필수과목이 내 경로에서 각각 어떻게 인정되는가?</span>
          </li>
        </ol>
      </section>

      {otherReviewItems.length > 0 ? (
        <section className="planner-check-ledger" aria-labelledby="additional-review-title">
          <header>
            <span>계산에서 남은 항목</span>
            <h2 id="additional-review-title">추가로 확인할 근거</h2>
          </header>
          <ul>
            {otherReviewItems.map((item, index) => (
              <li key={`${item.code}-${index}`}>
                <strong>{REVIEW_LABELS[item.code]}</strong>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="planner-official-links" aria-labelledby="official-links-title">
        <header>
          <span>공식 확인 링크</span>
          <h2 id="official-links-title">원문과 수강 정보로 이동</h2>
        </header>
        <ul>
          <li>
            <a href={OFFICIAL_CURRICULUM_SOURCE.url} target="_blank" rel="noreferrer">
              <span><strong>2026 공식 교육과정</strong><small>학교 공개 학사종합안내</small></span>
              <ExternalLink aria-hidden="true" size={18} />
            </a>
          </li>
          <li>
            <a href={COURSE_OFFERING_SNAPSHOT_META.timetableSearchUrl} target="_blank" rel="noreferrer">
              <span><strong>강의시간표 조회</strong><small>실제 개설 학기 확인</small></span>
              <ExternalLink aria-hidden="true" size={18} />
            </a>
          </li>
          <li>
            <a href={DEPARTMENT_HOME_URL} target="_blank" rel="noopener noreferrer">
              <span><strong>학과 홈페이지</strong><small>개인 적용 및 최신 공지 확인</small></span>
              <ExternalLink aria-hidden="true" size={18} />
            </a>
          </li>
          <li>
            <a href={TRACK_VIDEO_URL} target="_blank" rel="noreferrer">
              <span><strong>학과 공식 트랙제 영상</strong><small>트랙 제도 안내</small></span>
              <ExternalLink aria-hidden="true" size={18} />
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
