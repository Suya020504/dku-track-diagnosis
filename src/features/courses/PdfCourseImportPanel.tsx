import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { PdfImportDraft } from "../../types";

export type AnalyzePdfCourseFile = (
  file: File,
  signal: AbortSignal,
) => Promise<PdfImportDraft>;

type PdfCourseImportPanelProps = {
  onAnalyzed: (draft: PdfImportDraft) => void;
  analyzeFile?: AnalyzePdfCourseFile;
};

async function analyzeWithLazyRuntime(
  file: File,
  signal: AbortSignal,
): Promise<PdfImportDraft> {
  const { analyzePdfCourseFile } = await import("../../lib/pdfCourseImport");
  return analyzePdfCourseFile(file, signal);
}

export function PdfCourseImportPanel({
  onAnalyzed,
  analyzeFile = analyzeWithLazyRuntime,
}: PdfCourseImportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "analyzing" | "failed">("idle");
  const activeControllerRef = useRef<AbortController | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);

  function clearInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startAnalysis(file: File) {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setStatus("analyzing");

    try {
      const draft = await analyzeFile(file, controller.signal);
      if (!mountedRef.current || controller.signal.aborted || activeControllerRef.current !== controller) {
        return;
      }
      activeControllerRef.current = undefined;
      clearInput();
      setStatus("idle");
      onAnalyzed(draft);
    } catch {
      if (!mountedRef.current || activeControllerRef.current !== controller) return;
      activeControllerRef.current = undefined;
      clearInput();
      setStatus("failed");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (file) void startAnalysis(file);
  }

  function cancelAnalysis() {
    activeControllerRef.current?.abort();
    activeControllerRef.current = undefined;
    clearInput();
    setStatus("failed");
  }

  return (
    <section className="pdf-import-panel" aria-labelledby="pdf-import-title">
      <button
        className="pdf-import-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls="pdf-import-content"
        onClick={() => setExpanded((current) => !current)}
      >
        <span id="pdf-import-title">PDF로 선택값 채우기 beta</span>
      </button>

      {expanded && (
        <div id="pdf-import-content" className="pdf-import-content">
          <p className="pdf-import-summary">
            10MB 이하·50쪽 이하의 텍스트가 포함된 PDF만 사용할 수 있어요.
          </p>
          <p className="pdf-import-privacy">
            PDF는 이 브라우저 안에서만 분석하며, 파일·파일명·읽은 내용을 저장하거나 업로드하지 않습니다.
          </p>

          <label className="pdf-file-picker">
            <span>PDF 선택</span>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
          </label>

          {status === "analyzing" && (
            <div className="pdf-import-progress" role="status" aria-live="polite">
              <span>PDF를 분석 중이에요. 잠시만 기다려 주세요.</span>
              <button type="button" onClick={cancelAnalysis}>분석 취소</button>
            </div>
          )}

          {status === "failed" && (
            <div className="pdf-import-failure" role="alert">
              <strong>PDF를 분석하지 못했어요.</strong>
              <span>직접 선택은 그대로 유지됩니다. 다시 시도하거나 직접 선택해 주세요.</span>
              <button type="button" onClick={() => setStatus("idle")}>직접 선택 계속하기</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
