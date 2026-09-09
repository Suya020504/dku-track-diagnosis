// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoGuide } from "./VideoGuide";

let root: Root | undefined;
async function mount() {
  root = createRoot(document.querySelector("#root")!);
  const props = { onHome: vi.fn(), onStart: vi.fn(), onOpenInteractive: vi.fn() };
  await act(async () => root?.render(<VideoGuide {...props} />));
  return props;
}
function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(node => node.textContent?.includes(label))!;
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = '<div id="root"></div>';
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
    expect(video.querySelector("track")?.getAttribute("srcLang")).toBe("ko");
    expect(video.querySelector("track")?.hasAttribute("default")).toBe(false);
    expect(document.body.textContent).toContain("음성 없이 자막으로 안내해요");
    expect(document.querySelector(".video-guide__transcript ol")?.children.length).toBeGreaterThanOrEqual(6);
    expect(document.querySelector(".video-guide__interactive")?.hasAttribute("open")).toBe(false);
    expect(document.body.textContent).toContain("내 입력과 저장 기록은 바뀌지 않아요");
  });

  it("explains a failed video and retries without autoplay or changes to records", async () => {
    await mount();
    const originalVideo = document.querySelector("video")!;
    await act(async () => originalVideo.dispatchEvent(new Event("error")));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("영상을 불러오지 못했어요");
    expect(document.querySelector<HTMLAnchorElement>('[role="alert"] a[download]')?.href).toContain("track-service-guide.mp4");
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
    expect(document.querySelector("figcaption")?.textContent).toContain("78초");
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
});
