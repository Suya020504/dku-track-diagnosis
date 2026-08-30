import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Flag,
  LocateFixed,
  LockKeyhole,
  MapPinned,
  Route,
  Search,
  Target,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { TrackGlyph } from "../../components/TrackGlyph";
import { tracks } from "../../data/curriculumData";

export type CampusJourneyStopId =
  | "interest"
  | "tracks"
  | "diagnosis"
  | "current"
  | "gaps"
  | "next"
  | "plan";

export type CampusJourneyStopState = "complete" | "current" | "next" | "optional" | "locked";

export type CampusJourneyStop = {
  id: CampusJourneyStopId;
  state: CampusJourneyStopState;
  available: boolean;
  unavailableReason?: string;
  onSelect: () => void;
};

type StopMeta = {
  label: string;
  detail: string;
  route: "interest" | "diagnosis" | "shared" | "optional";
  x: number;
  y: number;
  Icon: LucideIcon;
};

const STOP_META: Record<CampusJourneyStopId, StopMeta> = {
  interest: {
    label: "내 관심 트랙 찾기",
    detail: "질문으로 출발",
    route: "interest",
    x: 11,
    y: 52,
    Icon: MapPinned,
  },
  tracks: {
    label: "트랙 탐색",
    detail: "다섯 방향 비교",
    route: "interest",
    x: 31,
    y: 52,
    Icon: Search,
  },
  diagnosis: {
    label: "이수 과목 바로 진단",
    detail: "2·3학년도 바로 시작",
    route: "diagnosis",
    x: 12,
    y: 76,
    Icon: ClipboardCheck,
  },
  current: {
    label: "현재 위치 확인",
    detail: "두 경로가 합류",
    route: "shared",
    x: 51,
    y: 52,
    Icon: Compass,
  },
  gaps: {
    label: "부족 영역 파악",
    detail: "모듈·학점 확인",
    route: "shared",
    x: 69,
    y: 52,
    Icon: Target,
  },
  next: {
    label: "다음 과목 추천",
    detail: "바로 할 일",
    route: "shared",
    x: 86,
    y: 52,
    Icon: Flag,
  },
  plan: {
    label: "학기 플래너",
    detail: "선택 서비스",
    route: "optional",
    x: 86,
    y: 76,
    Icon: CalendarDays,
  },
};

const STATE_LABELS: Record<CampusJourneyStopState, string> = {
  complete: "완료",
  current: "현재 위치",
  next: "다음",
  optional: "선택",
  locked: "잠김",
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export function CampusJourneyMap({
  stops,
  onOpenTrackGuide,
  headingRef,
}: {
  stops: readonly CampusJourneyStop[];
  onOpenTrackGuide: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | undefined>(undefined);
  const mapRef = useRef<HTMLDivElement>(null);
  const currentStop = stops.find((stop) => stop.state === "current") ?? stops[0];
  const stopById = useMemo(
    () => new Map(stops.map((stop) => [stop.id, stop])),
    [stops],
  );

  function setNextZoom(nextZoom: number) {
    const clamped = clampZoom(nextZoom);
    setZoom(clamped);
    if (clamped === MIN_ZOOM) setOffset({ x: 0, y: 0 });
  }

  function resetMap() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    requestAnimationFrame(() => {
      mapRef.current
        ?.querySelector<HTMLButtonElement>(`[data-map-stop="${currentStop?.id}"]`)
        ?.focus();
    });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom <= 1 || (event.target as HTMLElement).closest("button, a")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const maxOffset = Math.round((zoom - 1) * 230);
    setOffset({
      x: Math.max(-maxOffset, Math.min(maxOffset, drag.originX + event.clientX - drag.startX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, drag.originY + event.clientY - drag.startY)),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="campus-journey" aria-labelledby="campus-journey-title">
      <header className="campus-journey__intro">
        <span>2026 교육과정 기준 · 전공 여정 개념 지도</span>
        <h1 id="campus-journey-title" ref={headingRef} tabIndex={-1}>내 전공 여정을 지도처럼 펼쳐보세요</h1>
        <p>
          관심 트랙을 탐색하거나 이수 과목부터 바로 진단하세요. 두 경로는 현재 진단에서 만나고,
          학기 플래너는 필요할 때만 선택할 수 있습니다.
        </p>
        <div className="campus-journey__primary-actions">
          <button
            className="campus-journey__primary planner-focusable"
            type="button"
            onClick={stopById.get("interest")?.onSelect}
          >
            <MapPinned aria-hidden="true" size={19} />
            내 관심 트랙 찾기
            <ArrowRight aria-hidden="true" size={18} />
          </button>
          <button
            className="campus-journey__secondary planner-focusable"
            type="button"
            onClick={stopById.get("diagnosis")?.onSelect}
          >
            <ClipboardCheck aria-hidden="true" size={18} />
            이수 과목 바로 진단
          </button>
        </div>
        <p className="campus-journey__midyear-note">
          2·3학년도 현재 이수 과목으로 참고 진단할 수 있습니다. 실제 트랙 신청 가능 시기,
          적용 학번과 최종 인정 범위는 학과 확인이 필요합니다.
        </p>
      </header>

      <div className="campus-journey__map-shell">
        <div
          className={zoom > 1 ? "campus-journey__viewport is-zoomed" : "campus-journey__viewport"}
          ref={mapRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="전공 여정 지도. 확대 후 끌어서 이동할 수 있습니다."
        >
          <div
            className="campus-journey__canvas"
            style={{
              "--campus-map-x": `${offset.x}px`,
              "--campus-map-y": `${offset.y}px`,
              "--campus-map-zoom": zoom,
            } as CSSProperties}
          >
            <img
              className="campus-journey__background"
              src="/illustrations/academic-journey-campus-map-flat-v2.webp"
              alt=""
              width="1600"
              height="900"
              aria-hidden="true"
              draggable={false}
            />
            <svg
              className="campus-journey__routes"
              viewBox="0 0 1000 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path className="campus-journey__route campus-journey__route--interest" d="M 110 312 H 510" />
              <path className="campus-journey__route campus-journey__route--diagnosis" d="M 120 456 H 430 V 312 H 510" />
              <path className="campus-journey__route campus-journey__route--shared" d="M 510 312 H 860" />
              <path className="campus-journey__route campus-journey__route--optional" d="M 860 312 V 456" />
              <circle className="campus-journey__merge" cx="510" cy="312" r="13" />
            </svg>

            {stops.map((stop) => {
              const meta = STOP_META[stop.id];
              const Icon = meta.Icon;
              const reasonId = `campus-map-${stop.id}-reason`;
              return (
                <div
                  className={`campus-journey__stop campus-journey__stop--${meta.route}`}
                  data-map-stop-wrap={stop.id}
                  data-state={stop.state}
                  key={stop.id}
                  style={{ left: `${meta.x}%`, top: `${meta.y}%` }}
                >
                  <button
                    className="campus-journey__pin planner-focusable"
                    data-map-stop={stop.id}
                    data-current-position={stop.state === "current" ? "true" : undefined}
                    type="button"
                    aria-label={`${meta.label} · ${meta.detail} · ${STATE_LABELS[stop.state]}`}
                    aria-current={stop.state === "current" ? "step" : undefined}
                    aria-disabled={!stop.available || undefined}
                    aria-describedby={!stop.available && stop.unavailableReason ? reasonId : undefined}
                    onClick={() => {
                      if (stop.available) stop.onSelect();
                    }}
                  >
                    <span className="campus-journey__pin-icon" aria-hidden="true">
                      {stop.state === "complete" ? <CheckCircle2 size={18} /> : stop.state === "locked" ? <LockKeyhole size={18} /> : <Icon size={18} />}
                    </span>
                    <span>
                      <strong>{meta.label}</strong>
                      <small>{meta.detail} · {STATE_LABELS[stop.state]}</small>
                    </span>
                  </button>
                  {!stop.available && stop.unavailableReason ? <small id={reasonId}>{stop.unavailableReason}</small> : null}
                </div>
              );
            })}
          </div>

          <div className="campus-journey__map-controls" aria-label="지도 조절">
            <button
              className="planner-focusable"
              type="button"
              aria-label="지도 확대"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setNextZoom(zoom + ZOOM_STEP)}
            >
              <ZoomIn aria-hidden="true" />
              확대
            </button>
            <button
              className="planner-focusable"
              type="button"
              aria-label="지도 축소"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setNextZoom(zoom - ZOOM_STEP)}
            >
              <ZoomOut aria-hidden="true" />
              축소
            </button>
            <button className="planner-focusable" type="button" onClick={resetMap}>
              <LocateFixed aria-hidden="true" />
              현재 위치
            </button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
          </div>
        </div>

        <aside className="campus-journey__legend" aria-label="지도 범례와 트랙 미리보기">
          <div>
            <h2>지도 범례</h2>
            <ul>
              <li><span className="legend-dot legend-dot--current" />현재 위치</li>
              <li><span className="legend-line legend-line--interest" />관심 트랙 경로</li>
              <li><span className="legend-line legend-line--diagnosis" />자가진단 지름길</li>
              <li><span className="legend-dot legend-dot--optional" />선택 서비스</li>
            </ul>
          </div>
          <div>
            <h2>다섯 트랙</h2>
            <ul className="campus-journey__track-list">
              {tracks.map((track) => (
                <li key={track.id}>
                  <TrackGlyph trackId={track.id} decorative />
                  <span>{track.name}</span>
                </li>
              ))}
            </ul>
            <button className="campus-journey__track-action planner-focusable" type="button" onClick={onOpenTrackGuide}>
              트랙 상세 가이드
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </div>
        </aside>
      </div>

      <details className="campus-journey__route-list">
        <summary>지도 경로를 목록으로 보기</summary>
        <ol>
          {stops.map((stop) => {
            const meta = STOP_META[stop.id];
            const listReasonId = `campus-route-list-${stop.id}-reason`;
            return (
              <li key={stop.id} data-state={stop.state}>
                <button
                  className="planner-focusable"
                  type="button"
                  aria-disabled={!stop.available || undefined}
                  aria-describedby={!stop.available && stop.unavailableReason ? listReasonId : undefined}
                  onClick={() => {
                    if (stop.available) stop.onSelect();
                  }}
                >
                  <span>{meta.label}</span>
                  <small>{meta.detail} · {STATE_LABELS[stop.state]}</small>
                </button>
                {!stop.available && stop.unavailableReason ? <p id={listReasonId}>{stop.unavailableReason}</p> : null}
              </li>
            );
          })}
        </ol>
      </details>

      <footer className="campus-journey__disclaimer">
        <Route aria-hidden="true" size={18} />
        이 지도는 전공 선택 흐름을 설명하는 개념 지도이며 실제 캠퍼스 지리 안내가 아닙니다.
        학기 플래너는 진단 후 필요할 때만 사용합니다.
      </footer>
    </section>
  );
}
