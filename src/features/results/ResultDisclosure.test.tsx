// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ResultDisclosure } from "./ResultDisclosure";

it("toggles disclosure state without unmounting printable condition facts", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<ResultDisclosure id="missing" title="부족 조건">F. 유통무역 3학점</ResultDisclosure>));
  const button = container.querySelector("button")!;
  const content = container.querySelector("#missing")!;
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(content.textContent).toBe("F. 유통무역 3학점");
  await act(async () => button.click());
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(content.getAttribute("data-collapsed")).toBe("false");
  await act(async () => button.click());
  expect(content.getAttribute("data-collapsed")).toBe("true");
  expect(content.textContent).toBe("F. 유통무역 3학점");
  await act(async () => root.unmount());
});
