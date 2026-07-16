import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { markdownSyntaxPlugin } from "./markdownSyntaxPlugin";

const views: EditorView[] = [];

afterEach(() => {
  views.splice(0).forEach((view) => view.destroy());
  document.body.replaceChildren();
});

describe("markdownSyntaxPlugin", () => {
  it("keeps Markdown delimiters hidden while the structure is selected", () => {
    const source = "# Heading\n\n**Strong text**";
    const view = new EditorView({
      state: EditorState.create({
        doc: source,
        selection: { anchor: source.indexOf("Strong"), head: source.indexOf("Strong") + 6 },
        extensions: [markdownSyntaxPlugin],
      }),
      parent: document.body,
    });
    views.push(view);

    expect(view.dom.textContent).toContain("Heading");
    expect(view.dom.textContent).toContain("Strong text");
    expect(view.dom.textContent).not.toContain("# ");
    expect(view.dom.textContent).not.toContain("**");
  });
});
