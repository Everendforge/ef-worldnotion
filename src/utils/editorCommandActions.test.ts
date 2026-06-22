import { describe, expect, it } from "vitest";
import { EDITOR_COMMANDS } from "../editorTypes";
import { editorCommandAction, nativeMenuEditorCommand } from "./editorCommandActions";

describe("editor command actions", () => {
  it("maps formatting commands to declarative actions", () => {
    expect(editorCommandAction("bold")).toEqual({ type: "wrapSelection", before: "**" });
    expect(editorCommandAction("inlineCode")).toEqual({
      type: "wrapSelection",
      before: "`",
      after: "`",
      placeholder: "code",
    });
    expect(editorCommandAction("heading4")).toEqual({ type: "heading", level: 4 });
    expect(editorCommandAction("taskList")).toEqual({ type: "list", kind: "task" });
  });

  it("maps workspace and navigation commands", () => {
    expect(editorCommandAction("horizontalRule")).toEqual({ type: "insert", markdown: "\n\n---\n\n" });
    expect(editorCommandAction("quickSwitcher")).toEqual({ type: "openPanel", panel: "quickSwitcher" });
    expect(editorCommandAction("nextTab")).toEqual({ type: "activateAdjacentTab", direction: 1 });
    expect(editorCommandAction("previousTab")).toEqual({ type: "activateAdjacentTab", direction: -1 });
  });

  it("maps search and workspace commands that used to be menu-only", () => {
    expect(editorCommandAction("replace")).toEqual({ type: "search" });
    expect(editorCommandAction("findNext")).toEqual({ type: "find", direction: 1 });
    expect(editorCommandAction("findPrevious")).toEqual({ type: "find", direction: -1 });
    expect(editorCommandAction("toggleOutline")).toEqual({ type: "toggleOutline" });
  });

  it("has an action classification for every editor command id", () => {
    for (const command of EDITOR_COMMANDS) {
      expect(editorCommandAction(command.id)).toBeDefined();
    }
  });

  it("maps native menu ids to editor commands when possible", () => {
    expect(nativeMenuEditorCommand("wn:file:save")).toBe("save");
    expect(nativeMenuEditorCommand("wn:edit:replace")).toBe("replace");
    expect(nativeMenuEditorCommand("wn:edit:find-next")).toBe("findNext");
    expect(nativeMenuEditorCommand("wn:view:toggle-outline")).toBe("toggleOutline");
    expect(nativeMenuEditorCommand("wn:edit:wikilink")).toBe("wikilink");
    expect(nativeMenuEditorCommand("wn:view:quick-switcher")).toBe("quickSwitcher");
    expect(nativeMenuEditorCommand("wn:view:reload")).toBeUndefined();
  });
});
