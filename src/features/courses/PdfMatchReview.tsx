import { useMemo, useState, type RefObject } from "react";
import { courses } from "../../data/curriculumData";
import type {
  PdfImportApproval,
  PdfImportDraft,
  PdfMergeConflict,
} from "../../types";

type PdfMatchReviewProps = {
  draft: PdfImportDraft;
  conflicts: PdfMergeConflict[];
  saveError?: boolean;
  existingSelectionCount?: number;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  onApprove: (approvals: PdfImportApproval[]) => void;
  onBack: () => void;
  onCancel: () => void;
  onSearchCourse: (pageNumbers: number[]) => void;
};

const courseById = new Map(courses.map((course) => [course.id, course]));

function canonicalCourseName(courseId: string): string {
  return courseById.get(courseId)?.name ?? "확인할 수 없는 교과목";
}

function pageLabel(pageNumbers: readonly number[]): string {
  return pageNumbers.length === 1
    ? `PDF ${pageNumbers[0]}쪽`
    : `PDF ${pageNumbers.join(", ")}쪽`;
}

export function PdfMatchReview({
  draft,
  conflicts,
  saveError = false,
  existingSelectionCount = 0,
  headingRef,
  onApprove,
  onBack,
  onCancel,
  onSearchCourse,
}: PdfMatchReviewProps) {
  const [approvedMatched, setApprovedMatched] = useState<Set<string>>(() => new Set());
  const [ambiguousChoices, setAmbiguousChoices] = useState<Record<string, string>>({});
  const [approvedAmbiguous, setApprovedAmbiguous] = useState<Set<string>>(() => new Set());

  const approvals = useMemo<PdfImportApproval[]>(() => [
    ...draft.matched
      .filter((candidate) => approvedMatched.has(candidate.sourceId))
      .map((candidate) => ({ sourceId: candidate.sourceId, courseId: candidate.courseId })),
    ...draft.ambiguous
      .filter((candidate) => approvedAmbiguous.has(candidate.sourceId))
      .flatMap((candidate) => {
        const courseId = ambiguousChoices[candidate.sourceId];
        return courseId ? [{ sourceId: candidate.sourceId, courseId }] : [];
      }),
  ], [approvedAmbiguous, approvedMatched, ambiguousChoices, draft]);

  function toggleSet(
    setter: (value: Set<string> | ((current: Set<string>) => Set<string>)) => void,
    sourceId: string,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  return (
    <section className="pdf-match-review" aria-labelledby="pdf-review-title">
      <header className="pdf-review-header">
        <span>선택 사항 · PDF 과목 확인 beta</span>
        <h1 id="pdf-review-title" ref={headingRef} tabIndex={-1}>
          추가할 과목을 직접 확인해 주세요
        </h1>
        <p>{existingSelectionCount > 0
          ? `기존에 직접 선택한 ${existingSelectionCount}개는 그대로 유지됩니다. PDF에서 찾은 후보 중 승인한 과목만 새로 추가해 주세요.`
          : "아직 어떤 과목도 선택되지 않았어요. 정식 교과목명을 확인하고 필요한 항목만 승인해 주세요."}</p>
        <small className="pdf-review-privacy-note">
          PDF에서 찾은 과목 후보는 임시로 보관하며 원문·파일명은 저장하지 않습니다. 승인 전에는 직접 선택 내역에 합치지 않아요.
        </small>
      </header>

      <div className="pdf-review-counts" aria-label="PDF 분석 결과 요약">
        <span>자동 일치 {draft.matched.length}개</span>
        <span>선택 필요 {draft.ambiguous.length}개</span>
        <span>직접 확인 {draft.unmatched.length}개</span>
      </div>

      {saveError && (
        <p className="pdf-review-save-error" role="alert">
          이 브라우저에 승인한 과목을 저장하지 못했습니다. 선택은 그대로이니 다시 적용해 주세요.
        </p>
      )}

      {conflicts.length > 0 && (
        <div className="pdf-review-conflicts" role="status" aria-live="polite">
          <strong>기존 입력 상태를 유지한 과목</strong>
          <ul>
            {conflicts.map((conflict) => (
              <li key={conflict.courseId}>
                <span>{canonicalCourseName(conflict.courseId)}</span>
                <small>{conflict.message}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pdf-review-groups">
        <section className="pdf-review-group" aria-labelledby="pdf-matched-title">
          <h2 id="pdf-matched-title">자동으로 찾은 과목</h2>
          {draft.matched.length === 0 ? <p>자동으로 찾은 과목이 없어요.</p> : draft.matched.map((candidate) => (
            <label className="pdf-review-row" key={candidate.sourceId}>
              <input
                type="checkbox"
                checked={approvedMatched.has(candidate.sourceId)}
                onChange={() => toggleSet(setApprovedMatched, candidate.sourceId)}
              />
              <span>
                <strong>{canonicalCourseName(candidate.courseId)}</strong>
                <small>{pageLabel(candidate.pageNumbers)}에서 확인</small>
              </span>
            </label>
          ))}
        </section>

        <section className="pdf-review-group" aria-labelledby="pdf-ambiguous-title">
          <h2 id="pdf-ambiguous-title">직접 고를 과목 후보</h2>
          {draft.ambiguous.length === 0 ? <p>선택이 필요한 후보가 없어요.</p> : draft.ambiguous.map((candidate) => {
            const selectedCourseId = ambiguousChoices[candidate.sourceId];
            return (
              <fieldset className="pdf-ambiguous-row" key={candidate.sourceId}>
                <legend>{pageLabel(candidate.pageNumbers)}의 과목 후보</legend>
                {candidate.candidateCourseIds.map((courseId) => (
                  <label key={courseId}>
                    <input
                      type="radio"
                      name={`pdf-candidate-${candidate.sourceId}`}
                      value={courseId}
                      checked={selectedCourseId === courseId}
                      onChange={() => setAmbiguousChoices((current) => ({
                        ...current,
                        [candidate.sourceId]: courseId,
                      }))}
                    />
                    <span>{canonicalCourseName(courseId)}</span>
                  </label>
                ))}
                <label className="pdf-ambiguous-approval">
                  <input
                    type="checkbox"
                    checked={approvedAmbiguous.has(candidate.sourceId)}
                    disabled={!selectedCourseId}
                    onChange={() => toggleSet(setApprovedAmbiguous, candidate.sourceId)}
                  />
                  <span>선택한 후보 승인</span>
                </label>
              </fieldset>
            );
          })}
        </section>

        <section className="pdf-review-group" aria-labelledby="pdf-unmatched-title">
          <h2 id="pdf-unmatched-title">직접 확인할 항목</h2>
          {draft.unmatched.length === 0 ? <p>직접 확인할 항목이 없어요.</p> : draft.unmatched.map((candidate) => (
            <div className="pdf-unmatched-row" key={candidate.sourceId}>
              <span>{pageLabel(candidate.pageNumbers)}에서 확인이 필요한 항목</span>
              <button type="button" onClick={() => onSearchCourse([...candidate.pageNumbers])}>
                직접 검색하기
              </button>
            </div>
          ))}
        </section>
      </div>

      <div className="pdf-review-actions">
        <button className="primary-button" type="button" onClick={() => onApprove(approvals)}>
          승인한 새 과목 {approvals.length}개 적용
        </button>
        <button type="button" onClick={onBack}>과목 선택으로 돌아가기</button>
        <button type="button" onClick={onCancel}>검수 취소</button>
      </div>
    </section>
  );
}
