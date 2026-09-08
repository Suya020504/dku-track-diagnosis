// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { createEmptyAppState, STORAGE_KEY_V2 } from "./lib/storage";

let root: Root | undefined;
let originalStorage: PropertyDescriptor | undefined;

async function mountAt(href: string, storage?: Storage) {
  history.replaceState({}, "", href);
  root = createRoot(document.querySelector("#root")!);
  await act(async () => root!.render(<App storage={storage} />));
}

async function click(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  await act(async () => element.click());
}

async function clickButton(label: string) {
  const element = [...document.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.trim().startsWith(label));
  if (!element) throw new Error(`Missing button ${label}`);
  await act(async () => element.click());
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
  document.body.innerHTML = '<div id="root"></div>';
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
  vi.restoreAllMocks();
});

function blockStorageGetter() {
  const getter = vi.fn(() => { throw new DOMException("Storage access denied", "SecurityError"); });
  Object.defineProperty(window, "localStorage", { configurable: true, get: getter });
  return getter;
}

describe("browser storage acquisition failure", () => {
  it.each(["/", "/?view=diagnosis&step=courses", "/?view=track-guide&section=overview", "/?view=records"])("keeps a usable page at %s when the localStorage getter throws", async href => {
    blockStorageGetter();
    await mountAt(href);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector(".planner-local-save--error")?.textContent).toContain("저장하지 못함");
  });

  it("keeps selections in React memory without claiming a durable save or reacquiring storage", async () => {
    const getter = blockStorageGetter();
    await mountAt("/?view=diagnosis&step=profile");
    await click('input[name="affiliation"][value="external-student"]');
    await clickButton("이수 경로 선택");
    await click('input[name="studyPath"][value="minor"]');
    await clickButton("이수 과목 선택으로 이동");
    await click('input[type="checkbox"][aria-label*="경제원론"]');
    expect(document.querySelector<HTMLInputElement>('input[type="checkbox"][aria-label*="경제원론"]')?.checked).toBe(true);
    await clickButton("진단 결과 확인");
    expect(document.querySelector("h1")?.textContent).toBeTruthy();
    expect(document.body.textContent).toContain("부전공");
    expect(document.body.textContent).toContain("3 / 21학점");
    expect(document.querySelector(".planner-local-save--error")?.textContent).toContain("저장하지 못함");
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("uses an injected Storage without accessing the unavailable browser getter", async () => {
    const getter = blockStorageGetter();
    const values = new Map([[STORAGE_KEY_V2, JSON.stringify(createEmptyAppState())]]);
    const injected: Storage = { get length() { return values.size; }, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); }, clear: () => values.clear(), key: index => [...values.keys()][index] ?? null };
    await mountAt("/", injected);
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelector(".planner-local-save--error")).toBeNull();
    expect(getter).not.toHaveBeenCalled();
  });
  it("shows an unavailable state rather than a successful empty read when getItem throws", async () => {
    const getItem = vi.fn(() => { throw new DOMException("Read denied", "SecurityError"); });
    const setItem = vi.fn();
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem, setItem } });
    await mountAt("/");
    expect(document.querySelectorAll("main")).toHaveLength(1);
    expect(document.querySelector(".planner-local-save--error")?.textContent).toContain("저장하지 못함");
    expect(getItem).toHaveBeenCalledWith("track-sim:v2");
    expect(setItem).not.toHaveBeenCalled();
  });
});
