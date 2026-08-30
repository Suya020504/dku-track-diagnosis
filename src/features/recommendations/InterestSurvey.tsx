import { useMemo, useState, type RefObject } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  CLOSE_INTEREST_SCORE_GAP,
  compareInterestSurveyResults,
  interestSurveyQuestions,
  isInterestSurveyComplete,
  scoreInterestSurvey,
} from "../../lib/interestSurvey";
import { TrackGlyph } from "../../components/TrackGlyph";
import type {
  InterestSurveyAnswer,
  InterestSurveyState,
  TrackId,
} from "../../types";

export type InterestSurveyProps = {
  value: InterestSurveyState;
  storageError: boolean;
  onChange: (value: InterestSurveyState) => void;
  onChooseTrack: (trackId: TrackId) => void;
  onSkipToDiagnosis: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

const answerOptions: Array<{ value: InterestSurveyAnswer; label: string }> = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

export function InterestSurvey({
  value,
  storageError,
  onChange,
  onChooseTrack,
  onSkipToDiagnosis,
  headingRef,
}: InterestSurveyProps) {
  const [showAllResults, setShowAllResults] = useState(false);
  const currentIndex = Math.min(
    Math.max(value.currentIndex, 0),
    interestSurveyQuestions.length - 1,
  );
  const currentQuestion = interestSurveyQuestions[currentIndex];
  const completed = isInterestSurveyComplete(value.answers);
  const showResult = completed && Boolean(value.completedAt);
  const results = useMemo(
    () => showResult ? scoreInterestSurvey(value.answers) : [],
    [showResult, value.answers],
  );

  function updateAnswer(answer: InterestSurveyAnswer) {
    onChange({
      ...value,
      answers: { ...value.answers, [currentQuestion.id]: answer },
      currentIndex,
      completedAt: undefined,
      selectedTrackId: undefined,
    });
  }

  function moveQuestion(nextIndex: number) {
    onChange({
      ...value,
      currentIndex: Math.min(
        Math.max(nextIndex, 0),
        interestSurveyQuestions.length - 1,
      ),
    });
  }

  function showSurveyResult() {
    if (!completed) return;
    onChange({ ...value, currentIndex, completedAt: new Date().toISOString() });
  }

  function restartSurvey() {
    onChange({ answers: {}, currentIndex: 0 });
    setShowAllResults(false);
  }

  if (showResult) {
    const comparison = compareInterestSurveyResults(results);
    const topResult = results[0];
    const visibleResults = showAllResults ? results : results.slice(0, 3);
    const selectedResult = results.find((result) => result.trackId === value.selectedTrackId);

    return (
      <main className="interest-survey interest-result" aria-labelledby="interest-result-title">
        <header className="interest-result-hero">
          <div>
            <span>관심 적합도 결과</span>
            {comparison.isCloseMatch ? (
              <>
                <h1 id="interest-result-title" ref={headingRef} tabIndex={-1}>
                  여러 관심 방향이 비슷하게 나타났어요
                </h1>
                <p>
                  상위 점수 차이가 가까워요. 상위 두 결과의 차이는 {comparison.scoreGap}점으로
                  {" "}{CLOSE_INTEREST_SCORE_GAP}점 이내입니다. 관심 방향을 비교한 뒤 직접 선택해 주세요.
                </p>
              </>
            ) : (
              <>
                <h1 id="interest-result-title" ref={headingRef} tabIndex={-1}>
                  {topResult.trackName} 관심 점수가 높게 나타났어요
                </h1>
                <p>과목 이수 여부가 아닌 지금의 관심 방향만 비교한 결과입니다.</p>
              </>
            )}
          </div>
          <Heart aria-hidden="true" size={52} />
        </header>

        {storageError && (
          <p className="recommendation-storage-error" role="alert">
            <AlertTriangle aria-hidden="true" size={18} />
            저장하지 못했어요. 현재 화면을 닫거나 새로고침하면 답변이 사라질 수 있습니다.
          </p>
        )}

        <section className="interest-result-grid" aria-label="관심 트랙 비교 결과">
          <div className="interest-result-list">
            <div className="interest-result-section-head">
              <span>관심 기준 안에서 비교</span>
              <h2>상위 관심 트랙을 직접 골라 주세요</h2>
            </div>
            <ol>
              {visibleResults.map((result) => {
                const selected = result.trackId === value.selectedTrackId;
                const topTie = result.score === topResult.score && comparison.scoreGap === 0;
                const closeLeader = topResult.score - result.score <= CLOSE_INTEREST_SCORE_GAP;
                return (
                  <li className={selected ? "selected" : ""} key={result.trackId}>
                    <article>
                      <div className="interest-result-title-row">
                        <div>
                          <TrackGlyph trackId={result.trackId} />
                          <strong>{result.trackName}</strong>
                        </div>
                        <span>
                          {topTie ? <small>공동 상위</small> : closeLeader ? <small>상위권</small> : null}
                          {result.score}%
                        </span>
                      </div>
                      <div
                        className="interest-score-bar"
                        role="img"
                        aria-label={`${result.trackName} 관심 점수 ${result.score}%`}
                      >
                        <span style={{ width: `${result.score}%` }} />
                      </div>
                      <p>{result.summary}</p>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange({ ...value, selectedTrackId: result.trackId })}
                      >
                        {selected && <Check aria-hidden="true" size={17} />}
                        {selected ? "선택됨" : `${result.trackName} 선택`}
                      </button>
                    </article>
                  </li>
                );
              })}
            </ol>
            <button
              className="recommendation-text-button"
              type="button"
              onClick={() => setShowAllResults((current) => !current)}
            >
              {showAllResults ? "상위 3개만 보기" : "다른 트랙도 보기"}
            </button>
          </div>

          <aside className="interest-choice-summary">
            {selectedResult ? (
              <>
                <span>내가 고른 방향</span>
                <h2>
                  <TrackGlyph trackId={selectedResult.trackId} />
                  {selectedResult.trackName}을 선택했어요
                </h2>
                <p>{selectedResult.summary}</p>
                <ul>
                  {selectedResult.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </>
            ) : (
              <>
                <span>선택 전 확인</span>
                <h2>점수만으로 자동 결정하지 않아요</h2>
                <p>배우고 싶은 내용과 해 보고 싶은 활동에 가까운 트랙을 직접 선택해 주세요.</p>
              </>
            )}
          </aside>
        </section>

        <p className="interest-result-note">
          관심 점수는 흥미 방향을 보여주는 참고 결과이며, 현재 이수 가능도나 졸업 계획과는 별도 기준입니다.
        </p>
        <div className="interest-result-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!selectedResult}
            onClick={() => selectedResult && onChooseTrack(selectedResult.trackId)}
          >
            {selectedResult ? "선택한 트랙으로 자가진단 이어가기" : "트랙을 먼저 선택해 주세요"}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button className="icon-button" type="button" onClick={restartSurvey}>
            <RotateCcw aria-hidden="true" size={17} />
            다시 답하기
          </button>
        </div>
      </main>
    );
  }

  const selectedAnswer = value.answers[currentQuestion.id];
  const answeredCount = Object.keys(value.answers).length;

  return (
    <main className="interest-survey" aria-labelledby="interest-survey-title">
      <header className="interest-survey-head">
        <div>
          <span>내 관심 트랙 찾기</span>
          <h1 id="interest-survey-title" ref={headingRef} tabIndex={-1}>
            내가 중요하게 생각하는 전공 방향을 골라 주세요
          </h1>
          <p>한 화면에 한 문항씩, 지금의 생각과 가장 가까운 답을 선택하면 됩니다.</p>
        </div>
        <div className={storageError ? "interest-save-state error" : "interest-save-state"} role="status">
          {storageError
            ? <AlertTriangle aria-hidden="true" size={17} />
            : <Save aria-hidden="true" size={17} />}
          <span>{storageError ? "저장하지 못했어요" : "이 브라우저에 저장됨"}</span>
        </div>
      </header>

      {storageError && (
        <p className="recommendation-storage-error" role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          저장하지 못했어요. 현재 화면을 닫기 전에 답변을 확인해 주세요.
        </p>
      )}

      <section className="interest-question-panel">
        <div className="interest-progress-row">
          <strong>{currentIndex + 1} / {interestSurveyQuestions.length}</strong>
          <span>{answeredCount}개 답변 완료</span>
        </div>
        <progress
          aria-label="관심 트랙 설문 진행률"
          value={currentIndex + 1}
          max={interestSurveyQuestions.length}
        />

        <fieldset className="interest-question-card" aria-describedby="interest-scale-hint">
          <legend>{currentQuestion.statement}</legend>
          <div className="interest-planner-scale">
            {answerOptions.map((option) => {
              const selected = selectedAnswer === option.value;
              return (
                <label
                  className={selected ? "selected" : ""}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="interest-consumer-scale"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateAnswer(option.value)}
                  />
                  <span aria-hidden="true">{option.value}</span>
                  <small>{option.label}</small>
                </label>
              );
            })}
          </div>
          <p id="interest-scale-hint">숫자키 또는 방향키로도 선택할 수 있어요. 정답은 없습니다.</p>
        </fieldset>

        <div className="interest-question-actions">
          <button
            className="icon-button"
            type="button"
            disabled={currentIndex === 0}
            onClick={() => moveQuestion(currentIndex - 1)}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            이전
          </button>
          {currentIndex < interestSurveyQuestions.length - 1 ? (
            <button
              className="primary-button"
              type="button"
              disabled={selectedAnswer === undefined}
              onClick={() => moveQuestion(currentIndex + 1)}
            >
              다음
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={!completed}
              onClick={showSurveyResult}
            >
              결과 보기
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          )}
        </div>
      </section>

      <button className="interest-skip-button" type="button" onClick={onSkipToDiagnosis}>
        설문을 건너뛰고 자가진단 바로가기
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </main>
  );
}
