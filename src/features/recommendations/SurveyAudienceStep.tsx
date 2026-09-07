import type { RefObject } from "react";
import { AlertTriangle, ArrowRight, Building2, GraduationCap, UsersRound } from "lucide-react";
import type { InterestSurveyAudience } from "../../types";

const audienceOptions: Array<{
  value: InterestSurveyAudience;
  title: string;
  description: string;
  detail: string;
  Icon: typeof GraduationCap;
}> = [
  {
    value: "department-student",
    title: "식품자원경제학과 학생",
    description: "전공 안에서 더 깊게 공부할 방향을 찾아볼게요.",
    detail: "심화전공 · 트랙형전공 · 다전공 이수 중인 학생",
    Icon: GraduationCap,
  },
  {
    value: "external-student",
    title: "타 학과 학생",
    description: "현재 전공과 식품자원경제를 연결할 방향을 찾아볼게요.",
    detail: "복수전공 · 부전공 · 트랙형전공을 알아보는 학생",
    Icon: Building2,
  },
];

export function SurveyAudienceStep({
  onSelect,
  headingRef,
  storageError = false,
  onSkip,
}: {
  onSelect: (audience: InterestSurveyAudience) => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  storageError?: boolean;
  onSkip?: () => void;
}) {
  return (
    <main
      className="dku-survey-page dku-survey-entry"
      data-survey-audience-step
      aria-labelledby="survey-audience-title"
    >
      <header className="ds-audience-heading">
        <div className="ds-audience-icon"><UsersRound aria-hidden="true" /></div>
        <div>
          <span>관심 트랙 추천 · 1단계</span>
          <h1 id="survey-audience-title" ref={headingRef} tabIndex={-1}>
            먼저 현재 소속을 알려주세요
          </h1>
          <p>선택한 소속에 따라 관심 질문과 이수 안내가 달라집니다.</p>
        </div>
      </header>

      {storageError ? (
        <p className="dc-storage-error" role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          저장하지 못했어요. 현재 화면을 닫기 전에 선택 내용을 확인해 주세요.
        </p>
      ) : null}

      <section className="ds-audience-options" aria-label="설문 대상 선택">
        {audienceOptions.map(({ value, title, description, detail, Icon }) => (
          <button
            className="ds-audience-option planner-focusable"
            data-survey-audience={value}
            type="button"
            key={value}
            onClick={() => onSelect(value)}
          >
            <span className="ds-audience-option-icon"><Icon aria-hidden="true" /></span>
            <span>
              <strong>{title}</strong>
              <b>{description}</b>
              <small>{detail}</small>
            </span>
            <ArrowRight aria-hidden="true" size={22} />
          </button>
        ))}
      </section>

      <p className="ds-audience-note">
        소속을 바꾸면 관심 설문 답변만 새로 시작하며, 입력한 과목과 저장한 진단·계획은 유지됩니다.
      </p>
      {onSkip ? (
        <button className="ds-skip-button" type="button" onClick={onSkip}>
          설문을 건너뛰고 자가진단 바로가기
          <ArrowRight aria-hidden="true" size={17} />
        </button>
      ) : null}
    </main>
  );
}
