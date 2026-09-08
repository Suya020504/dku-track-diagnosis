export type BrowserStorageAccess = { storage: Storage; unavailable: boolean };

function unavailableStorage(): Storage {
  const rejectWrite = (): never => { throw new DOMException("Browser storage is unavailable.", "SecurityError"); };
  return {
    length: 0,
    getItem: () => null,
    key: () => null,
    setItem: rejectWrite,
    removeItem: rejectWrite,
    clear: rejectWrite,
  };
}

/** Storage itself can be inaccessible before getItem/setItem can handle errors. */
export function acquireBrowserStorage(
  provided?: Storage,
  readBrowserStorage: () => Storage = () => window.localStorage,
): BrowserStorageAccess {
  try {
    const storage = provided ?? readBrowserStorage();
    storage.getItem(STORAGE_KEY_V2);
    return { storage, unavailable: false };
  } catch {
    // React retains the in-session input; durable writes must still report failure.
    return { storage: unavailableStorage(), unavailable: true };
  }
}
import { STORAGE_KEY_V2 } from "./storage";
