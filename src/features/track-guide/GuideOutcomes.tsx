import { ArrowRight, GraduationCap, Phone } from "lucide-react";
import { DEPARTMENT_SUPPORT } from "../../data/departmentService";
import { getAcademicMajorRequirements } from "../../lib/academicMajorRequirements";
import type { StudentProfile } from "../../types";
import "./guide-student-details.css";

const cohortYears = [2024, 2020, 2019] as const;
const departmentProfile: StudentProfile = {
  goal: "learn-track-system",
  affiliation: "department-student",
  studyPath: "advanced-major",
  curriculumRuleVersion: "2026-provided-final-plan",
  ruleApplicability: "reference-only",
};

export function GuideOutcomes({ onContinue }: { onContinue: () => void }) {
  return <section className="guide-records" data-track-guide-section="outcomes" aria-labelledby="track-guide-outcomes-heading">
    <h2 id="track-guide-outcomes-heading" className="guide-section-title">내 전공 유형부터 확인하세요</h2>
    <div className="guide-study-paths">
      <article data-guide-study-path="primary">
        <span className="guide-eyebrow">학과 학생</span><h3>주전공</h3>
        <strong className="guide-study-credits">63학점</strong><small>다전공 병행 시 42학점</small>
        <p>학과 졸업요건을 채우면 <strong>경제학사</strong>를 받아요.</p>
        <span className="guide-study-module">모듈 내 필수 18학점</span>
      </article>
      <article data-guide-study-path="double-major">
        <span className="guide-eyebrow">타 학과 학생</span><h3>복수전공</h3>
        <strong className="guide-study-credits">42학점</strong><small>식품자원경제학과 전공학점</small>
        <p>복수전공 요건을 채우면 해당 전공의 학위명이 함께 표기돼요.</p>
        <span className="guide-study-module">모듈 내 필수 18학점</span>
      </article>
      <article data-guide-study-path="minor">
        <span className="guide-eyebrow">타 학과 학생</span><h3>부전공</h3>
        <strong className="guide-study-credits">21학점</strong><small>식품자원경제학과 전공학점</small>
        <p><strong>부전공 표기</strong>가 남아요. 경제학사가 추가되지는 않아요.</p>
        <span className="guide-study-module">모듈 내 필수 조건 없음</span>
      </article>
    </div>
    <details className="guide-cohort-detail" data-guide-cohort-requirements>
      <summary>학과 입학생의 학번별 전공필수</summary>
      <dl>{cohortYears.map((entryYear) => {
        const rule = getAcademicMajorRequirements({ ...departmentProfile, entryYear }, []);
        return <div key={entryYear} data-guide-cohort={entryYear}>
          <dt>{rule.cohortLabel}</dt>
          <dd>{rule.requiredCredits === 0 ? "전공필수 없음" : `${rule.requiredCredits}학점 · ${rule.courseIds.length}과목`}</dd>
        </div>;
      })}</dl>
      <p>전공필수와 모듈 내 필수는 따로 확인해요. 타 학과생의 복수·부전공에는 이 기준을 적용하지 않아요.</p>
    </details>

    <div className="guide-notation-heading">
      <GraduationCap aria-hidden="true" />
      <div><h2>트랙명은 배운 세부 분야를 나타내요</h2><p>학위증·성적증명서에 트랙명이 적히는 모습을 예시로 살펴보세요.</p></div>
    </div>
    <div className="guide-notation-examples">
      <figure data-guide-notation-example="primary">
        <figcaption><span>표기 예시</span>학과 주전공 · 두 트랙 이수</figcaption>
        <div><small>학위명</small><strong>경제학사</strong></div>
        <div><small>이수 트랙명</small><p>푸드마케팅 트랙<br />농식품유통 트랙</p></div>
      </figure>
      <figure data-guide-notation-example="external">
        <figcaption><span>표기 예시</span>타 학과 학생 · 트랙 이수</figcaption>
        <div><small>이수 트랙명</small><strong className="guide-notation-external">식품자원경제학과 푸드마케팅 트랙</strong></div>
        <p className="guide-notation-note">트랙 기록은 주전공·복수전공·부전공의 학위 표기와 별도로 확인해요.</p>
      </figure>
    </div>
    <p className="guide-notation-condition">부전공 21학점과 트랙 30학점은 다른 조건이에요. 트랙명을 기록하려면 해당 트랙의 모듈 조건도 채워야 해요.</p>
    <div className="guide-notation-contact"><p>실제 증명서 표기와 발급은 학과 사무실에 문의해 주세요.</p><a className="guide-source-link" href={DEPARTMENT_SUPPORT.phoneUrl}><Phone aria-hidden="true" />{DEPARTMENT_SUPPORT.phone}</a></div>
    <footer className="guide-section-footer"><span>트랙마다 배우는 모듈을 비교해 볼까요?</span><button className="guide-next" type="button" onClick={onContinue}>5개 트랙 구성 비교하기<ArrowRight aria-hidden="true" /></button></footer>
  </section>;
}
