"""Render a readable, silent walkthrough from an adjacent storyboard and captures.

Python standard library + FFmpeg/FFprobe on PATH; no browser or external services.
  python render_video.py --validate
  python render_video.py --only 1
  python render_video.py

Scene numbers for --only are one-based storyboard positions, not chapter numbers.
Inputs are never changed. Existing outputs cause a new run directory to be used.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import html
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
import unicodedata


ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS = 1920, 1080, 25
SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H = 312, 90, 1296, 729
TRANSITION = 0.1
CAPTION_SIZE, CAPTION_LIMIT = 34, 48
CAPTION_Y = (842, 890)
CONTROLS_SAFE_HEIGHT = 156
TITLE_SIZE = 36
NAVY, MINT = "0x102f43", "0x8de6c2"
OUTPUT_STEM = "track-service-guide-20260912"
BODY_FONT = Path("C:/Windows/Fonts/malgun.ttf")
BOLD_FONT = Path("C:/Windows/Fonts/malgunbd.ttf")


class RenderError(Exception):
    """A useful, user-actionable validation or rendering failure."""


def validate_layout() -> dict:
    """Keep source UI, burned-in captions and native playback controls apart."""
    screen_bottom = SCREEN_Y + SCREEN_H
    caption_bottom = CAPTION_Y[-1] + CAPTION_SIZE
    controls_top = HEIGHT - CONTROLS_SAFE_HEIGHT
    if SCREEN_X < 0 or SCREEN_Y < 0 or SCREEN_X + SCREEN_W > WIDTH or screen_bottom > HEIGHT:
        raise RenderError("캡처 영역이 영상 화면을 벗어나요.")
    if SCREEN_Y < 30 + TITLE_SIZE + 12:
        raise RenderError("제목과 캡처 사이의 여백이 부족해요.")
    if screen_bottom + 2 + 12 > CAPTION_Y[0]:
        raise RenderError("캡처 테두리와 자막이 겹치거나 너무 가까워요.")
    if CAPTION_Y[0] + CAPTION_SIZE > CAPTION_Y[1]:
        raise RenderError("자막 두 줄이 겹쳐요.")
    if caption_bottom > controls_top:
        raise RenderError("자막이 브라우저 재생 조작부의 보호 영역에 들어가요.")
    return {
        "verified": True, "screen_caption_overlap": False,
        "screen_bottom": screen_bottom, "caption_top": CAPTION_Y[0],
        "caption_bottom": caption_bottom, "controls_top": controls_top,
        "controls_safe_height": CONTROLS_SAFE_HEIGHT,
    }


def command(args: list[str], *, cwd: Path | None = None, timeout: int = 600) -> str:
    try:
        result = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=timeout, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RenderError(f"실행하지 못했어요: {args[0]} ({exc})") from exc
    if result.returncode:
        raise RenderError(f"{args[0]} 실패 ({result.returncode}):\n{result.stderr[-7000:]}")
    return result.stdout


def probe(path: Path, ffprobe: str = "ffprobe") -> dict:
    raw = command([
        ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path),
    ], timeout=60)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RenderError(f"미디어 정보를 읽지 못했어요: {path}") from exc


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def estimated_text_width(text: str, size: int) -> float:
    # Conservative width guard: wide Hangul/CJK uses one em, Latin up to .75 em.
    # This does not truncate or reword the supplied copy.
    return sum(
        0.4 if char.isspace() else 1.0 if unicodedata.east_asian_width(char) in {"W", "F"} else 0.75
        for char in text
    ) * size


def validate_text(value: object, label: str, *, limit: int, max_width: int, size: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RenderError(f"{label}: 비어 있지 않은 글이 필요해요.")
    if any(unicodedata.category(char) in {"Cc", "Cf"} for char in value):
        raise RenderError(f"{label}: 줄바꿈·제어문자 없이 한 줄로 작성해 주세요.")
    if len(value) > limit:
        raise RenderError(f"{label}: {len(value)}자예요. 공백 포함 {limit}자 이내로 줄여 주세요.")
    if estimated_text_width(value, size) > max_width:
        raise RenderError(f"{label}: 화면의 글 영역보다 길어요. 문장을 조금 줄여 주세요.")
    return value


def capture_path(captures: Path, name: object) -> Path:
    if not isinstance(name, str) or not name or Path(name).name != name or "/" in name or "\\" in name:
        raise RenderError("capture는 captures 폴더 안의 파일 이름만 사용할 수 있어요.")
    if Path(name).suffix:
        candidates = [captures / name] if Path(name).suffix.lower() in {".jpg", ".jpeg", ".png"} else []
    else:
        candidates = [path for path in captures.glob(f"{name}.*") if path.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    candidates = [path.resolve() for path in candidates if path.is_file()]
    if len(candidates) != 1:
        raise RenderError(f"캡처 '{name}': 일치하는 JPG/PNG가 정확히 1개 필요해요. 현재 {len(candidates)}개예요.")
    if candidates[0].parent != captures.resolve():
        raise RenderError(f"캡처가 captures 폴더 밖을 가리켜요: {name}")
    return candidates[0]


def validate_storyboard(storyboard: Path, captures: Path, ffprobe: str = "ffprobe") -> tuple[list[dict], list[str], dict]:
    if not storyboard.is_file():
        raise RenderError(f"스토리보드가 아직 없어요: {storyboard}")
    try:
        data = json.loads(storyboard.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RenderError(f"스토리보드 JSON을 읽지 못했어요: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("scenes"), list) or not data["scenes"]:
        raise RenderError("스토리보드에는 비어 있지 않은 scenes 배열이 필요해요.")
    for font in (BODY_FONT, BOLD_FONT):
        if not font.is_file():
            raise RenderError(f"맑은 고딕 글꼴이 없어요: {font}")
    warnings: list[str] = []
    scenes: list[dict] = []
    source_cache: dict[Path, dict] = {}
    clock_frames = 0
    previous_chapter = 1
    for index, raw in enumerate(data["scenes"], 1):
        if not isinstance(raw, dict):
            raise RenderError(f"장면 {index}: JSON 객체가 필요해요.")
        duration = raw.get("duration")
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 0.2 <= duration <= 120:
            raise RenderError(f"장면 {index}: duration은 0.2~120초의 유한한 숫자여야 해요.")
        frames = round(duration * FPS)
        rendered_duration = frames / FPS
        if abs(rendered_duration - duration) > 0.00001:
            warnings.append(f"장면 {index}: 25fps 프레임에 맞춰 {duration}초를 {rendered_duration:.2f}초로 조정해요.")
        chapter = raw.get("chapter")
        if isinstance(chapter, bool) or not isinstance(chapter, int) or not 1 <= chapter <= 99:
            raise RenderError(f"장면 {index}: chapter는 1~99 정수여야 해요.")
        if (index == 1 and chapter != 1) or chapter not in {previous_chapter, previous_chapter + 1}:
            raise RenderError(f"장면 {index}: chapter는 1부터 순서대로 이어져야 해요. 같은 챕터는 반복할 수 있어요.")
        previous_chapter = chapter
        title = validate_text(raw.get("title"), f"장면 {index} 제목", limit=42, max_width=1190, size=TITLE_SIZE)
        caption = raw.get("caption")
        if not isinstance(caption, list) or not 1 <= len(caption) <= 2:
            raise RenderError(f"장면 {index}: caption은 1~2개의 짧은 문자열 배열이어야 해요.")
        caption = [validate_text(line, f"장면 {index} 자막 {line_index + 1}", limit=CAPTION_LIMIT, max_width=1776, size=CAPTION_SIZE) for line_index, line in enumerate(caption)]
        if sum(map(len, caption)) / rendered_duration > 8:
            warnings.append(f"장면 {index}: 자막을 읽는 시간이 짧을 수 있어요 ({sum(map(len, caption))}자/{rendered_duration:g}초).")
        source = capture_path(captures, raw.get("capture"))
        if source not in source_cache:
            streams = [stream for stream in probe(source, ffprobe).get("streams", []) if stream.get("codec_type") == "video"]
            if len(streams) != 1:
                raise RenderError(f"캡처 이미지 정보를 확인하지 못했어요: {source.name}")
            source_width, source_height = streams[0].get("width", 0), streams[0].get("height", 0)
            if source_width < 1200 or source_height < 675 or source_width <= source_height:
                raise RenderError(f"{source.name}: 캡처가 {source_width}×{source_height}예요. 가로 1200·세로 675 이상인 가로 화면이 필요해요.")
            if abs(source_width / source_height - 16 / 9) > 0.02:
                warnings.append(f"{source.name}: 16:9가 아니어서 화면 전체를 유지하고 여백을 넣어요.")
            source_cache[source] = {"width": source_width, "height": source_height, "sha256": digest(source)}
        source_info = source_cache[source]
        focus = raw.get("focus")
        if focus is not None:
            if not isinstance(focus, list) or len(focus) != 4 or any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in focus):
                raise RenderError(f"장면 {index}: focus는 원본 캡처 좌표 [x, y, width, height]여야 해요.")
            x, y, width, height = focus
            if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > source_info["width"] or y + height > source_info["height"]:
                raise RenderError(f"장면 {index}: focus가 캡처 범위를 벗어나요.")
        scenes.append({
            "number": index, "capture": raw["capture"], "source": str(source),
            "source_info": source_info, "chapter": chapter, "title": title, "caption": caption,
            "focus": focus, "requested_duration": duration, "frames": frames,
            "duration": rendered_duration, "start": clock_frames / FPS,
            "end": (clock_frames + frames) / FPS,
        })
        clock_frames += frames
    if clock_frames > 3600 * FPS:
        raise RenderError("전체 길이가 1시간을 넘어요. 스토리보드 duration을 확인해 주세요.")
    if "duration" in data:
        expected = data["duration"]
        if isinstance(expected, bool) or not isinstance(expected, (int, float)) or not math.isfinite(expected) or abs(expected - clock_frames / FPS) > 1 / FPS:
            raise RenderError(f"전체 duration과 장면 합계 {clock_frames / FPS:g}초가 달라요.")
    return scenes, warnings, {"scene_count": len(scenes), "chapters": scenes[-1]["chapter"], "duration": clock_frames / FPS, "frames": clock_frames, "unique_captures": len(source_cache)}


def stamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3600000)
    minutes, remainder = divmod(remainder, 60000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{whole_seconds:02}.{milliseconds:03}"


def write_text(path: Path, value: str) -> None:
    # Exclusive creation protects previous renders and intermediate files as well.
    with path.open("x", encoding="utf-8", newline="\n") as target:
        target.write(value)


def reserve_output(base: Path, stem: str) -> Path:
    base.mkdir(parents=True, exist_ok=True)
    conflicts = [base / f"{stem}{suffix}" for suffix in (".mp4", ".jpg", ".ko.vtt")]
    conflicts += [base / "render-manifest.json", base / "render-assets"]
    if not any(path.exists() for path in conflicts):
        return base
    suffix = datetime.now().strftime("%Y%m%d-%H%M%S")
    attempt = 0
    while True:
        name = f"run-{suffix}" + (f"-{attempt}" if attempt else "")
        candidate = base / name
        try:
            candidate.mkdir()
            print(f"기존 출력을 보존하고 새 폴더에 만들어요: {candidate}", flush=True)
            return candidate
        except FileExistsError:
            attempt += 1


def draw_text(filename: str, font: str, size: int, x: str | int, y: int, color: str = "white") -> str:
    return f"drawtext=fontfile=fonts/{font}.ttf:textfile=text/{filename}:expansion=none:fontcolor={color}:fontsize={size}:x={x}:y={y}"


def scene_filter(scene: dict, previous: dict | None, build: Path, chapter_count: int, scene_count: int) -> str:
    prefix = f"scene-{scene['number']:03}"
    for name, value in [
        ("title", scene["title"]),
        ("number", f"{scene['number']:02} / {scene_count:02}"),
        ("marker", "가상 이력 시연 · 2026.09"),
        *[(f"caption-{index}", text) for index, text in enumerate(scene["caption"])],
    ]:
        write_text(build / "text" / f"{prefix}-{name}.txt", value)
    # 'decrease' + pad preserves every source pixel. No crop or zoom is applied.
    # JPEG captures use full-range BT.601. Convert their pixel values (not just
    # their tags) to limited-range BT.709 before drawing and H.264 encoding.
    # Use 4:4:4 while composing the odd-height screenshot box; convert to 4:2:0
    # only after padding to the final even-sized canvas, so no source row is cut.
    fit = f"scale={SCREEN_W}:{SCREEN_H}:force_original_aspect_ratio=decrease:flags=lanczos:in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv444p,pad={SCREEN_W}:{SCREEN_H}:(ow-iw)/2:(oh-ih)/2:color={NAVY},setsar=1,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709"
    graph = [f"[0:v]{fit}[current]"]
    if previous:
        graph.append(f"[1:v]{fit}[previous]")
        graph.append(f"[current][previous]blend=all_expr='A*min(T/{TRANSITION},1)+B*(1-min(T/{TRANSITION},1))':enable='lt(t,{TRANSITION})'[screen]")
    else:
        graph.append("[current]null[screen]")
    filters = [
        f"pad={WIDTH}:{HEIGHT}:{SCREEN_X}:{SCREEN_Y}:color={NAVY}",
        f"drawbox=x={SCREEN_X - 2}:y={SCREEN_Y - 2}:w={SCREEN_W + 4}:h={SCREEN_H + 4}:color=0x406476:t=2",
        f"drawbox=x=198:y=29:w=4:h=42:color={MINT}:t=fill",
        draw_text(f"{prefix}-number.txt", "bold", 23, 72, 39, MINT),
        draw_text(f"{prefix}-title.txt", "bold", TITLE_SIZE, 224, 30),
        draw_text(f"{prefix}-marker.txt", "body", 20, "w-tw-72", 43, "0xbdd9d4"),
    ]
    if scene["focus"]:
        info = scene["source_info"]
        scale = min(SCREEN_W / info["width"], SCREEN_H / info["height"])
        x, y, width, height = scene["focus"]
        x = SCREEN_X + (SCREEN_W - info["width"] * scale) / 2 + x * scale
        y = SCREEN_Y + (SCREEN_H - info["height"] * scale) / 2 + y * scale
        width, height = width * scale, height * scale
        filters.append(f"drawbox=x={x:.2f}:y={y:.2f}:w={width:.2f}:h={height:.2f}:color={MINT}@0.85:t=3:enable='gte(t,{TRANSITION})'")
    for index in range(len(scene["caption"])):
        filters.append(draw_text(f"{prefix}-caption-{index}.txt", "body", CAPTION_SIZE, "(w-tw)/2", CAPTION_Y[index]))
    filters += ["format=yuv420p", "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "setsar=1"]
    graph.append("[screen]" + ",".join(filters) + "[out]")
    return ";".join(graph)


def verify_video(path: Path, expected_frames: int, ffprobe: str) -> dict:
    details = probe(path, ffprobe)
    videos = [stream for stream in details.get("streams", []) if stream.get("codec_type") == "video"]
    if len(videos) != 1 or any(stream.get("codec_type") == "audio" for stream in details.get("streams", [])):
        raise RenderError("출력은 영상 트랙 1개와 무음 구성이어야 해요.")
    video = videos[0]
    frame_count = int(video.get("nb_frames", 0))
    if (video.get("width"), video.get("height"), video.get("codec_name"), video.get("pix_fmt")) != (WIDTH, HEIGHT, "h264", "yuv420p") or Fraction(video.get("avg_frame_rate", "0/1")) != FPS or frame_count != expected_frames:
        raise RenderError(f"영상 규격 또는 프레임 수가 맞지 않아요: {video}")
    if video.get("color_range") != "tv" or video.get("color_space") != "bt709":
        raise RenderError(f"일반 영상 색 범위와 BT.709 변환을 확인하지 못했어요: {video}")
    duration = float(details.get("format", {}).get("duration", 0))
    if abs(duration - expected_frames / FPS) > 1 / FPS:
        raise RenderError(f"영상 길이가 예상과 달라요: {duration}초, 예상 {expected_frames / FPS}초")
    # Verify faststart from the top-level MP4 atom order without loading the media.
    atoms: list[str] = []
    with path.open("rb") as source:
        while source.tell() < path.stat().st_size:
            header = source.read(8)
            if len(header) != 8:
                break
            size, name = int.from_bytes(header[:4], "big"), header[4:].decode("ascii", errors="replace")
            header_size = 8
            if size == 1:
                size = int.from_bytes(source.read(8), "big")
                header_size = 16
            atoms.append(name)
            if size == 0:
                break
            if size < header_size:
                raise RenderError("출력 MP4의 atom 크기가 올바르지 않아요.")
            source.seek(size - header_size, 1)
    if "moov" not in atoms or "mdat" not in atoms or atoms.index("moov") > atoms.index("mdat"):
        raise RenderError("MP4 faststart 배치를 확인하지 못했어요.")
    return {"width": WIDTH, "height": HEIGHT, "fps": FPS, "codec": "h264", "pixel_format": "yuv420p", "color_range": "tv", "color_space": "bt709", "frames": frame_count, "duration": duration, "audio": False, "faststart": True, "bytes": path.stat().st_size, "sha256": digest(path)}


def render(scenes: list[dict], warnings: list[str], summary: dict, args: argparse.Namespace) -> Path:
    selected = scenes if args.only is None else [scenes[args.only - 1]]
    stem = OUTPUT_STEM if args.only is None else f"{OUTPUT_STEM}-scene-{args.only:03}"
    output = reserve_output(args.output_dir.resolve(), stem)
    build = output / "render-assets"
    for folder in (build / "fonts", build / "text", build / "segments"):
        folder.mkdir(parents=True, exist_ok=False)
    # shutil is deliberately limited to font copies. Inputs and previous outputs stay put.
    shutil.copyfile(BODY_FONT, build / "fonts" / "body.ttf")
    shutil.copyfile(BOLD_FONT, build / "fonts" / "bold.ttf")
    segment_paths: list[Path] = []
    records: list[dict] = []
    vtt = ["WEBVTT", "", "NOTE 실제 서비스 캡처를 사용한 무음 안내 영상 · 가상 이력 시연", ""]
    elapsed_frames = 0
    for scene in selected:
        # Include a brief real prior-screen dissolve for a partial scene preview too.
        previous = scenes[scene["number"] - 2] if scene["number"] > 1 else None
        if previous and previous["source"] == scene["source"]:
            previous = None
        graph = scene_filter(scene, previous, build, summary["chapters"], len(scenes))
        inputs = ["-loop", "1", "-framerate", str(FPS), "-i", scene["source"]]
        if previous:
            inputs += ["-loop", "1", "-framerate", str(FPS), "-i", previous["source"]]
        segment = build / "segments" / f"scene-{scene['number']:03}.mp4"
        command([
            args.ffmpeg, "-hide_banner", "-loglevel", "warning", "-nostdin", "-n",
            *inputs, "-filter_complex_threads", "1", "-filter_complex", graph, "-map", "[out]",
            "-frames:v", str(scene["frames"]), "-an", "-c:v", "libx264", "-preset", "veryfast",
            "-crf", str(args.crf), "-threads", str(args.threads), "-pix_fmt", "yuv420p",
            "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-r", str(FPS), "-fps_mode", "cfr", "-movflags", "+faststart", str(segment),
        ], cwd=build)
        verify_video(segment, scene["frames"], args.ffprobe)
        start, end = elapsed_frames / FPS, (elapsed_frames + scene["frames"]) / FPS
        vtt += [str(scene["number"]), f"{stamp(start)} --> {stamp(end)}", *[html.escape(line, quote=False) for line in scene["caption"]], ""]
        records.append({**scene, "output_start": start, "output_end": end, "transition_seconds": TRANSITION if previous else 0, "segment": str(segment)})
        segment_paths.append(segment)
        elapsed_frames += scene["frames"]
        print(f"장면 {scene['number']:02}/{len(scenes):02} 완료 · {scene['duration']:g}초 · {scene['title']}", flush=True)
    concat = build / "concat.txt"
    write_text(concat, "\n".join(f"file 'segments/{segment.name}'" for segment in segment_paths) + "\n")
    video_path = output / f"{stem}.mp4"
    command([
        args.ffmpeg, "-hide_banner", "-loglevel", "warning", "-nostdin", "-n",
        "-f", "concat", "-safe", "1", "-i", str(concat), "-map", "0:v:0", "-c", "copy",
        "-movflags", "+faststart", str(video_path),
    ], cwd=build)
    media = verify_video(video_path, elapsed_frames, args.ffprobe)
    poster = output / f"{stem}.jpg"
    command([
        args.ffmpeg, "-hide_banner", "-loglevel", "warning", "-nostdin", "-n",
        "-ss", str(min(1.0, selected[0]["duration"] / 2)), "-i", str(video_path),
        "-frames:v", "1", "-q:v", "2", "-update", "1", str(poster),
    ])
    captions = output / f"{stem}.ko.vtt"
    write_text(captions, "\n".join(vtt))
    chapters: list[dict] = []
    for record in records:
        if not chapters or chapters[-1]["chapter"] != record["chapter"]:
            chapters.append({"chapter": record["chapter"], "start": record["output_start"], "end": record["output_end"]})
        else:
            chapters[-1]["end"] = record["output_end"]
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(), "status": "verified",
        "storyboard": str(args.storyboard.resolve()), "storyboard_sha256": digest(args.storyboard),
        "ffmpeg": command([args.ffmpeg, "-version"]).splitlines()[0],
        "method": "Actual UI captures, full source retained, dedicated title and caption margins; silent; no fabricated clicks.",
        "layout": {"canvas": [WIDTH, HEIGHT], "screen": [SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H], "caption_font_px": CAPTION_SIZE, "caption_y": list(CAPTION_Y), "controls_safe_height": CONTROLS_SAFE_HEIGHT, "max_zoom": 1, "transition_seconds": TRANSITION},
        "layout_validation": validate_layout(),
        "only_scene": args.only, "full_storyboard": summary,
        "files": {"video": str(video_path), "poster": str(poster), "captions": str(captions)},
        "media": media, "chapters": chapters, "scenes": records, "warnings": warnings,
    }
    write_text(output / "render-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(output), "video": str(video_path), "duration": media["duration"], "bytes": media["bytes"], "verified": True}, ensure_ascii=False), flush=True)
    return output


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--storyboard", type=Path, default=ROOT / "storyboard.json")
    parser.add_argument("--captures", type=Path, default=ROOT / "captures")
    parser.add_argument("--output-dir", type=Path, default=ROOT.parent / "rendered")
    parser.add_argument("--validate", action="store_true", help="입력만 검사하며 폴더나 결과 파일을 만들지 않아요.")
    parser.add_argument("--only", type=int, metavar="SCENE", help="1부터 시작하는 장면 번호 하나만 렌더해요.")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--crf", type=int, default=19, help="H.264 품질 값 (낮을수록 고화질, 기본 19)")
    args = parser.parse_args(argv)
    try:
        validate_layout()
        if not 1 <= args.threads <= 32 or not 14 <= args.crf <= 28:
            raise RenderError("threads는 1~32, crf는 14~28 범위로 지정해 주세요.")
        scenes, warnings, summary = validate_storyboard(args.storyboard, args.captures, args.ffprobe)
        if args.only is not None and not 1 <= args.only <= len(scenes):
            raise RenderError(f"--only는 1~{len(scenes)} 범위의 장면 번호여야 해요.")
        print(json.dumps({"valid": True, **summary, "warnings": warnings}, ensure_ascii=False), flush=True)
        if args.validate:
            return 0
        render(scenes, warnings, summary, args)
        return 0
    except (RenderError, OSError) as exc:
        print(f"오류: {exc}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
