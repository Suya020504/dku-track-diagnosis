// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoGuide, VIDEO_GUIDE_CHAPTERS, VIDEO_GUIDE_SRC, VIDEO_GUIDE_TRANSCRIPT } from "./VideoGuide";
import serviceGuideVideo from "../../data/serviceGuideVideo.json";

let root: Root | undefined;
async function mount() {
  root = createRoot(document.querySelector("#root")!);
  const props = { onHome: vi.fn(), onStart: vi.fn(), onOpenInteractive: vi.fn(), onOpenFeature: vi.fn() };
  await act(async () => root?.render(<VideoGuide {...props} />));
  return props;
}
function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent?.includes(label))!;
}
async function loadMetadata(video: HTMLVideoElement, duration = serviceGuideVideo.duration) {
  Object.defineProperty(video, "duration", { configurable: true, value: duration });
  await act(async () => video.dispatchEvent(new Event("loadedmetadata")));
}
function currentChapter() {
  return document.querySelector<HTMLButtonElement>('.video-guide__chapters button[aria-current="true"]');
}
function chapter(id: string) {
  return VIDEO_GUIDE_CHAPTERS.find(item => item.id === id)!;
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
  localStorage.clear();
});
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  vi.restoreAllMocks();
});

describe("VideoGuide", () => {
  it("waits for explicit playback and supplies native controls, captions and text instructions", async () => {
    await mount();
    const video = document.querySelector("video")!;
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe("metadata");
    expect(video.getAttribute("src")).toBe(VIDEO_GUIDE_SRC);
    expect(video.querySelector("track")?.getAttribute("srcLang")).toBe("ko");
    expect(video.querySelector("track")?.hasAttribute("default")).toBe(false);
    expect(document.body.textContent).toContain("음성 없이 자막으로 안내해요");
    expect(document.querySelector(".video-guide__transcript ol")?.children.length).toBe(VIDEO_GUIDE_CHAPTERS.length);
    expect(document.querySelector(".video-guide__interactive")?.hasAttribute("open")).toBe(false);
    expect(document.querySelector(".video-guide__chapters")?.hasAttribute("open")).toBe(false);
    expect(document.querySelectorAll(".video-guide__chapters li>button")).toHaveLength(VIDEO_GUIDE_CHAPTERS.length);
    expect(document.body.textContent).toContain("내 입력과 저장 기록은 바뀌지 않아요");
  });

  it("explains a failed video and retries without autoplay or changes to records", async () => {
    await mount();
    const originalVideo = document.querySelector("video")!;
    await act(async () => originalVideo.dispatchEvent(new Event("error")));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("영상을 불러오지 못했어요");
    expect(document.querySelector<HTMLAnchorElement>('[role="alert"] a[download]')?.href).toContain(VIDEO_GUIDE_SRC);
    await act(async () => button("영상 다시 불러오기").click());
    const retriedVideo = document.querySelector("video")!;
    expect(retriedVideo).not.toBe(originalVideo);
    expect(retriedVideo.autoplay).toBe(false);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await act(async () => retriedVideo.dispatchEvent(new Event("canplay")));
    expect(document.querySelector('[role="status"]')).toBeNull();
  });

  it("offers text instructions if captions cannot load", async () => {
    await mount();
    await act(async () => document.querySelector("track")!.dispatchEvent(new Event("error")));
    expect(document.querySelector('[role="status"]')?.textContent).toContain("한국어 자막을 불러오지 못했어요");
    expect(document.querySelector(".video-guide__transcript summary")?.textContent).toBe("사용 순서 글로 읽기");
  });

  it("only shows a duration after media metadata provides one", async () => {
    await mount();
    expect(document.querySelector("figcaption")?.textContent).not.toMatch(/\d+초/);
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "duration", { configurable: true, value: 78.1 });
    await act(async () => video.dispatchEvent(new Event("loadedmetadata")));
    expect(document.querySelector("figcaption")?.textContent).toContain("1분 18초");
  });

  it("connects the primary start action and explicit optional example without submitting data", async () => {
    const props = await mount();
    await act(async () => button("내 수강 이력으로 시작하기").click());
    expect(props.onStart).toHaveBeenCalledOnce();
    await act(async () => button("홈으로").click());
    expect(props.onHome).toHaveBeenCalledOnce();
    await act(async () => document.querySelector<HTMLAnchorElement>('.video-guide__interactive a')!.click());
    expect(props.onOpenInteractive).toHaveBeenCalledOnce();
    expect(document.querySelector("form")).toBeNull();
  });

  it("keeps all chapters contiguous and derives readable instructions from the same manifest", () => {
    expect(serviceGuideVideo.version).toBe("2026-09-12");
    expect(VIDEO_GUIDE_CHAPTERS[0].start).toBe(0);
    expect(VIDEO_GUIDE_CHAPTERS.at(-1)?.end).toBe(serviceGuideVideo.duration);
    const supportedFeatures = new Set(["home", "guide", "profile", "known-tracks", "interest-survey", "courses", "history-comparison", "result", "planning", "records", "modules", "curriculum", "timetable", "resources", "help"]);
    expect(new Set(VIDEO_GUIDE_CHAPTERS.map(chapter => chapter.id)).size).toBe(VIDEO_GUIDE_CHAPTERS.length);
    VIDEO_GUIDE_CHAPTERS.forEach((chapter, index) => {
      expect(chapter.end).toBeGreaterThan(chapter.start);
      expect(supportedFeatures.has(chapter.feature)).toBe(true);
      if (index) expect(chapter.start).toBe(VIDEO_GUIDE_CHAPTERS[index - 1].end);
      expect(VIDEO_GUIDE_TRANSCRIPT[index]).toEqual({ title: chapter.title, description: chapter.description });
    });
  });

  it("queues the latest chosen chapter until metadata loads without starting playback", async () => {
    const props = await mount();
    const video = document.querySelector("video")!;
    const play = vi.spyOn(video, "play").mockResolvedValue();
    const pause = vi.spyOn(video, "pause").mockImplementation(() => {});
    await act(async () => button(chapter("interest").title).click());
    await act(async () => button(chapter("planner").title).click());
    expect(video.currentTime).toBe(0);
    expect(currentChapter()?.textContent).toContain(chapter("planner").title);
    await act(async () => video.dispatchEvent(new Event("timeupdate")));
    expect(currentChapter()?.textContent).toContain(chapter("planner").title);
    await loadMetadata(video);
    expect(video.currentTime).toBe(chapter("planner").start);
    expect(video.paused).toBe(true);
    expect(play).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
    expect(props.onOpenFeature).not.toHaveBeenCalled();
  });

  it.each([true, false])("seeks without changing a paused=%s playback state", async paused => {
    await mount();
    const video = document.querySelector("video")!;
    await loadMetadata(video);
    Object.defineProperty(video, "paused", { configurable: true, value: paused });
    const play = vi.spyOn(video, "play").mockResolvedValue();
    const pause = vi.spyOn(video, "pause").mockImplementation(() => {});
    await act(async () => button(chapter("course-status").title).click());
    expect(video.currentTime).toBe(chapter("course-status").start);
    expect(video.paused).toBe(paused);
    expect(play).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });

  it("updates the active chapter on native timeline changes, including chapter boundaries and the end", async () => {
    const props = await mount();
    const video = document.querySelector("video")!;
    await loadMetadata(video);
    video.currentTime = chapter("alternatives").start - 0.1;
    await act(async () => video.dispatchEvent(new Event("timeupdate")));
    expect(currentChapter()?.textContent).toContain(chapter("result-preview").title);
    video.currentTime = chapter("alternatives").start;
    await act(async () => video.dispatchEvent(new Event("timeupdate")));
    expect(currentChapter()?.textContent).toContain(chapter("alternatives").title);
    video.currentTime = serviceGuideVideo.duration;
    await act(async () => video.dispatchEvent(new Event("timeupdate")));
    expect(currentChapter()?.textContent).toContain(VIDEO_GUIDE_CHAPTERS.at(-1)!.title);
    await act(async () => button("이 기능 직접 열기").click());
    expect(props.onOpenFeature).toHaveBeenCalledExactlyOnceWith(VIDEO_GUIDE_CHAPTERS.at(-1)!.feature, button("이 기능 직접 열기"));
  });

  it("clamps a pending chapter to a shorter delivered media file and updates the matching chapter", async () => {
    await mount();
    const video = document.querySelector("video")!;
    await act(async () => button(chapter("records").title).click());
    await loadMetadata(video, chapter("extra-input").end);
    expect(video.currentTime).toBeCloseTo(chapter("extra-input").end - 0.01);
    expect(video.currentTime).toBeLessThan(video.duration);
    expect(currentChapter()?.textContent).toContain(chapter("extra-input").title);
  });

  it("waits for a finite playable duration and retries a temporarily rejected seek on canplay", async () => {
    await mount();
    const video = document.querySelector("video")!;
    await act(async () => button(chapter("multi-track").title).click());
    await loadMetadata(video, Number.NaN);
    expect(video.currentTime).toBe(0);
    let currentTime = 0;
    const seek = vi.fn().mockImplementationOnce(() => { throw new DOMException("Metadata not ready", "InvalidStateError"); }).mockImplementation(time => { currentTime = time; });
    Object.defineProperty(video, "currentTime", { configurable: true, get: () => currentTime, set: seek });
    await loadMetadata(video);
    expect(currentTime).toBe(0);
    await act(async () => video.dispatchEvent(new Event("canplay")));
    expect(currentTime).toBe(chapter("multi-track").start);
    expect(seek).toHaveBeenCalledTimes(2);
  });

  it("preserves the selected chapter across a failed media reload", async () => {
    await mount();
    const video = document.querySelector("video")!;
    await loadMetadata(video);
    await act(async () => button(chapter("history").title).click());
    await act(async () => video.dispatchEvent(new Event("error")));
    await act(async () => button("영상 다시 불러오기").click());
    const replacement = document.querySelector("video")!;
    expect(replacement.currentTime).toBe(0);
    await loadMetadata(replacement);
    expect(replacement.currentTime).toBe(chapter("history").start);
    expect(replacement.paused).toBe(true);
  });

  it("uses one explicit feature action and leaves personal data untouched while browsing scenes", async () => {
    const original = JSON.stringify({ courseSelections: [{ courseId: "my-course", status: "completed" }] });
    localStorage.setItem("student-records", original);
    const write = vi.spyOn(Storage.prototype, "setItem");
    const remove = vi.spyOn(Storage.prototype, "removeItem");
    const props = await mount();
    const video = document.querySelector("video")!;
    await loadMetadata(video);
    await act(async () => button(chapter("alternatives").title).click());
    expect(props.onOpenFeature).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".video-guide__chapter-action button")).toHaveLength(1);
    expect(document.querySelector("#video-guide-open-feature-note")?.textContent).toContain("내 기록으로 이용하는 화면이 열려요");
    await act(async () => button("이 기능 직접 열기").click());
    expect(props.onOpenFeature).toHaveBeenCalledExactlyOnceWith("result", button("이 기능 직접 열기"));
    expect(props.onStart).not.toHaveBeenCalled();
    expect(props.onOpenInteractive).not.toHaveBeenCalled();
    expect(localStorage.getItem("student-records")).toBe(original);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
