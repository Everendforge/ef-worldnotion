import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { ensureSyntaxTree } from "@codemirror/language";
import { afterEach, describe, expect, it } from "vitest";
import {
  activeFormats,
  exitEmptyBlockLine,
  toggleHeadingLine,
  toggleInlineFormat,
  toggleListLine,
  toggleQuoteLine,
} from "./formatCommands";

const views: EditorView[] = [];

afterEach(() => {
  views.splice(0).forEach((view) => view.destroy());
  document.body.replaceChildren();
});

function createView(doc: string, anchor: number, head = anchor) {
  const state = EditorState.create({
    doc,
    selection: { anchor, head },
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(state, doc.length, 5000);
  const view = new EditorView({ state, parent: document.body });
  views.push(view);
  return view;
}

describe("toggleInlineFormat", () => {
  it("unwraps when the cursor is inside an existing element", () => {
    const doc = "plain **bold** text";
    const view = createView(doc, doc.indexOf("bold") + 2);

    toggleInlineFormat(view, "bold");

    expect(view.state.doc.toString()).toBe("plain bold text");
  });

  it("unwraps when only the inner content is selected", () => {
    const doc = "plain **bold** text";
    const view = createView(doc, doc.indexOf("bold"), doc.indexOf("bold") + 4);

    toggleInlineFormat(view, "bold");

    expect(view.state.doc.toString()).toBe("plain bold text");
  });

  it("wraps a selection, trimming edge whitespace", () => {
    const doc = "plain word here";
    const view = createView(doc, doc.indexOf("word"), doc.indexOf("word") + 5);

    toggleInlineFormat(view, "bold");

    expect(view.state.doc.toString()).toBe("plain **word** here");
    const selection = view.state.selection.main;
    expect(view.state.sliceDoc(selection.from, selection.to)).toBe("word");
  });

  it("inserts an empty pair on empty selection and cancels on repeat", () => {
    const doc = "plain ";
    const view = createView(doc, doc.length);

    toggleInlineFormat(view, "bold");
    expect(view.state.doc.toString()).toBe("plain ****");
    expect(view.state.selection.main.head).toBe(doc.length + 2);

    toggleInlineFormat(view, "bold");
    expect(view.state.doc.toString()).toBe("plain ");
  });

  it("toggles inline code without affecting markdown inside it", () => {
    const doc = "a `co**de**` b";
    const view = createView(doc, doc.indexOf("co") + 1);

    toggleInlineFormat(view, "code");

    expect(view.state.doc.toString()).toBe("a co**de** b");
  });
});

describe("activeFormats", () => {
  it("reports the formats at the cursor", () => {
    const doc = "## Title\n\n> quoted **bold**\n\n1. item";
    const view = createView(doc, doc.indexOf("bold") + 1);
    const formats = activeFormats(view.state);

    expect(formats.bold).toBe(true);
    expect(formats.italic).toBe(false);
    expect(formats.quote).toBe(true);
    expect(formats.headingLevel).toBeUndefined();

    const headingView = createView(doc, doc.indexOf("Title"));
    expect(activeFormats(headingView.state).headingLevel).toBe(2);

    const listView = createView(doc, doc.indexOf("item"));
    expect(activeFormats(listView.state).list).toBe("ordered");
  });
});

describe("exitEmptyBlockLine", () => {
  it("clears an empty list item instead of continuing the list", () => {
    const doc = "- item\n- ";
    const view = createView(doc, doc.length);

    expect(exitEmptyBlockLine(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("- item\n");
  });

  it("clears an empty quote line", () => {
    const doc = "> quoted\n> ";
    const view = createView(doc, doc.length);

    expect(exitEmptyBlockLine(view)).toBe(true);
    expect(view.state.doc.toString()).toBe("> quoted\n");
  });

  it("does nothing on a list item that has content", () => {
    const doc = "- item";
    const view = createView(doc, doc.length);

    expect(exitEmptyBlockLine(view)).toBe(false);
    expect(view.state.doc.toString()).toBe(doc);
  });
});

describe("line toggles", () => {
  it("toggles heading level on and off", () => {
    expect(toggleHeadingLine("Title", 2)).toBe("## Title");
    expect(toggleHeadingLine("## Title", 2)).toBe("Title");
    expect(toggleHeadingLine("## Title", 3)).toBe("### Title");
  });

  it("toggles quote prefix", () => {
    expect(toggleQuoteLine("text", false)).toBe("> text");
    expect(toggleQuoteLine("> text", true)).toBe("text");
    expect(toggleQuoteLine("> text", false)).toBe("> text");
  });

  it("toggles list kinds, preserving indentation", () => {
    expect(toggleListLine("item", 0, "bullet")).toBe("- item");
    expect(toggleListLine("- item", 0, "bullet")).toBe("item");
    expect(toggleListLine("- item", 1, "ordered")).toBe("2. item");
    expect(toggleListLine("  - item", 0, "task")).toBe("  - [ ] item");
    expect(toggleListLine("  - [x] item", 0, "task")).toBe("  item");
  });
});
