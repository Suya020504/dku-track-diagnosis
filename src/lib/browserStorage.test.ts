import { describe, expect, it, vi } from "vitest";
import { acquireBrowserStorage } from "./browserStorage";

describe("acquireBrowserStorage", () => {
  it("returns the supplied browser Storage when acquisition succeeds", () => {
    const storage = { getItem: vi.fn() } as unknown as Storage;
    const getter = vi.fn(() => storage);
    expect(acquireBrowserStorage(undefined, getter)).toEqual({ storage, unavailable: false });
    expect(getter).toHaveBeenCalledTimes(1);
  });
  it("does not access window storage when an explicit Storage is provided", () => {
    const storage = { getItem: vi.fn() } as unknown as Storage;
    const getter = vi.fn(() => { throw new Error("must not be called"); });
    expect(acquireBrowserStorage(storage, getter)).toEqual({ storage, unavailable: false });
    expect(getter).not.toHaveBeenCalled();
  });
  it("returns empty reads and rejected writes when the storage getter throws", () => {
    const access = acquireBrowserStorage(undefined, () => { throw new DOMException("Denied", "SecurityError"); });
    expect(access.unavailable).toBe(true);
    expect(access.storage.length).toBe(0);
    expect(access.storage.getItem("any")).toBeNull();
    expect(access.storage.key(0)).toBeNull();
    expect(() => access.storage.setItem("key", "value")).toThrow();
    expect(() => access.storage.removeItem("key")).toThrow();
    expect(() => access.storage.clear()).toThrow();
    expect(access.storage.getItem("key")).toBeNull();
  });
  it("distinguishes a denied initial read from an empty browser record", () => {
    const storage = { getItem: vi.fn(() => { throw new DOMException("Read denied", "SecurityError"); }), setItem: vi.fn(), removeItem: vi.fn() } as unknown as Storage;
    const access = acquireBrowserStorage(undefined, () => storage);
    expect(storage.getItem).toHaveBeenCalledWith("track-sim:v2");
    expect(access.unavailable).toBe(true);
    expect(access.storage).not.toBe(storage);
    expect(access.storage.getItem("track-sim:v2")).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
