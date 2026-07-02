import { describe, expect, it } from "vitest";
import {
  canUseBrowserDirectoryPicker,
  isTauriRuntime,
  platformLabelsFor,
  shortcutMatches,
} from "./appEnvironment";

describe("app environment helpers", () => {
  it("derives platform labels for Windows, macOS, and generic file managers", () => {
    expect(platformLabelsFor("Win32", "Mozilla/5.0")).toMatchObject({
      revealItem: "Reveal in Explorer",
      revealUniverse: "Reveal universe folder in Explorer",
      trashAction: "Move to Recycle Bin",
      trashDone: "Moved to Recycle Bin.",
    });

    expect(platformLabelsFor("MacIntel", "Mozilla/5.0")).toMatchObject({
      revealItem: "Reveal in Finder",
      revealUniverse: "Reveal universe folder in Finder",
      trashAction: "Move to Trash",
    });

    expect(platformLabelsFor("Linux x86_64", "Mozilla/5.0")).toMatchObject({
      revealItem: "Reveal in Files",
      revealUniverse: "Reveal universe folder",
      trashAction: "Move to Trash",
    });
  });

  it("checks browser/Tauri runtime capabilities from window", () => {
    expect(isTauriRuntime()).toBe(false);
    expect(canUseBrowserDirectoryPicker()).toBe(false);
  });

  it("matches keyboard shortcuts with Mod, Alt, Shift, and normalized single-letter keys", () => {
    expect(
      shortcutMatches(new KeyboardEvent("keydown", { key: "s", ctrlKey: true }), "Mod+S"),
    ).toBe(true);
    expect(
      shortcutMatches(
        new KeyboardEvent("keydown", { key: "P", metaKey: true, shiftKey: true }),
        "Mod+Shift+P",
      ),
    ).toBe(true);
    expect(
      shortcutMatches(
        new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }),
        "Alt+ArrowRight",
      ),
    ).toBe(true);
    expect(shortcutMatches(new KeyboardEvent("keydown", { key: "s" }), "Mod+S")).toBe(false);
    expect(
      shortcutMatches(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true, altKey: true }),
        "Mod+S",
      ),
    ).toBe(false);
  });
});
