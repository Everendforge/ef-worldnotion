import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDismissableMenu } from "./useDismissableMenu";

interface MenuState {
  x: number;
  y: number;
  path: string;
}

describe("useDismissableMenu", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    expect(result.current.menu).toBeNull();
  });

  it("opens with the given state", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    act(() => {
      result.current.setMenu({ x: 10, y: 20, path: "Characters/Mara.md" });
    });
    expect(result.current.menu).toEqual({ x: 10, y: 20, path: "Characters/Mara.md" });
  });

  it("closes on document mousedown", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    act(() => {
      result.current.setMenu({ x: 10, y: 20, path: "a.md" });
    });
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"));
    });
    expect(result.current.menu).toBeNull();
  });

  it("closes on Escape but not on other keys", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    act(() => {
      result.current.setMenu({ x: 10, y: 20, path: "a.md" });
    });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    expect(result.current.menu).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.menu).toBeNull();
  });

  it("close() dismisses the menu", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    act(() => {
      result.current.setMenu({ x: 10, y: 20, path: "a.md" });
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.menu).toBeNull();
  });

  it("does not listen when closed", () => {
    const { result } = renderHook(() => useDismissableMenu<MenuState>());
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"));
    });
    expect(result.current.menu).toBeNull();
    act(() => {
      result.current.setMenu({ x: 1, y: 2, path: "b.md" });
    });
    expect(result.current.menu).not.toBeNull();
  });
});
