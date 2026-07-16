import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { tablePlugin } from "./tablePlugin";

const MILITIA_TABLE = [
  "| CARGO | USO | POSICIÓN RELATIVA | CONCEPCIONES ANTIGUAS | INVASIÓN | MODERNA |",
  "| :---: | :---: | :---: | :---: | :---: | :---: |",
  "| Virithiana | Vi-na | General | Primer regente | Líder máximo | Caudillo |",
  "| Viritha | Vi-[Nombre] | General de sección | Mano derecha | Sección | Administración |",
].join("\n");

const views: EditorView[] = [];

afterEach(() => {
  views.splice(0).forEach((view) => view.destroy());
  document.body.replaceChildren();
});

describe("tablePlugin", () => {
  it("renders wide GFM tables as a processed grid and preserves column alignment", () => {
    const view = new EditorView({
      state: EditorState.create({
        doc: MILITIA_TABLE,
        selection: { anchor: MILITIA_TABLE.length },
        extensions: [tablePlugin()],
      }),
      parent: document.body,
    });
    views.push(view);

    const widget = view.dom.querySelector<HTMLElement>(".cm-table-widget");
    expect(widget).not.toBeNull();
    expect(widget?.querySelectorAll("th")).toHaveLength(6);
    expect(widget?.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(widget?.querySelector("th")?.style.textAlign).toBe("center");
    expect(widget?.textContent).toContain("Virithiana");

    widget?.click();

    expect(view.dom.querySelector(".cm-table-widget")).not.toBeNull();
    expect(view.state.selection.main.head).toBe(0);
  });
});
