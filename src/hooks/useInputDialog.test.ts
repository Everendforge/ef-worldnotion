import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useInputDialog } from "./useInputDialog";

describe("useInputDialog", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useInputDialog());
    expect(result.current.inputDialog.isOpen).toBe(false);
  });

  it("opens the dialog with the given options when promptUser is called", () => {
    const { result } = renderHook(() => useInputDialog());
    act(() => {
      void result.current.promptUser("Enter page name:", "page name", "Untitled");
    });
    expect(result.current.inputDialog).toMatchObject({
      isOpen: true,
      title: "Enter page name:",
      placeholder: "page name",
      defaultValue: "Untitled",
    });
  });

  it("resolves with the confirmed value and closes", async () => {
    const { result } = renderHook(() => useInputDialog());
    let promise: Promise<string | null>;
    act(() => {
      promise = result.current.promptUser("Enter page name:");
    });
    await act(async () => {
      await result.current.inputDialog.onConfirm?.("Mara");
    });
    await expect(promise!).resolves.toBe("Mara");
    expect(result.current.inputDialog.isOpen).toBe(false);
  });

  it("resolves with null when cancelled and closes", async () => {
    const { result } = renderHook(() => useInputDialog());
    let promise: Promise<string | null>;
    act(() => {
      promise = result.current.promptUser("Enter page name:");
    });
    act(() => {
      result.current.inputDialog.onCancel?.();
    });
    await expect(promise!).resolves.toBeNull();
    expect(result.current.inputDialog.isOpen).toBe(false);
  });

  it("closeInputDialog closes without resolving confirm state", () => {
    const { result } = renderHook(() => useInputDialog());
    act(() => {
      void result.current.promptUser("Enter page name:");
    });
    act(() => {
      result.current.closeInputDialog();
    });
    expect(result.current.inputDialog.isOpen).toBe(false);
  });
});
