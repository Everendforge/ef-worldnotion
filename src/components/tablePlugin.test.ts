import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { lineCellSegments, serializeMarkdownTable, tablePlugin } from "./tablePlugin";

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

function createView(doc: string) {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [tablePlugin()],
    }),
    parent: document.body,
  });
  views.push(view);
  return view;
}

describe("lineCellSegments", () => {
  it("computes document ranges for each cell", () => {
    const segments = lineCellSegments("| a | bee |", 100);
    expect(segments).toEqual([
      { from: 101, to: 104, text: "a" },
      { from: 105, to: 110, text: "bee" },
    ]);
  });

  it("handles rows without outer pipes", () => {
    const segments = lineCellSegments("a | bee", 0);
    expect(segments.map((segment) => segment.text)).toEqual(["a", "bee"]);
  });
});

describe("tablePlugin", () => {
  it("renders wide GFM tables as a processed grid and preserves column alignment", () => {
    const view = createView(MILITIA_TABLE);

    const widget = view.dom.querySelector<HTMLElement>(".cm-table-widget");
    expect(widget).not.toBeNull();
    expect(widget?.querySelectorAll("th")).toHaveLength(6);
    expect(widget?.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(widget?.querySelector("th")?.style.textAlign).toBe("center");
    expect(widget?.textContent).toContain("Virithiana");
  });

  it("makes every cell editable in place and commits edits on blur", () => {
    const view = createView(MILITIA_TABLE);
    const cell = view.dom.querySelector<HTMLElement>('td[data-row="0"][data-col="0"]');

    expect(cell?.getAttribute("contenteditable")).toBe("true");

    cell!.textContent = "Renombrada";
    cell!.dispatchEvent(new FocusEvent("blur"));

    expect(view.state.doc.toString()).toContain("| Renombrada | Vi-na |");
    // The widget rebuilt from the committed document.
    expect(view.dom.querySelector<HTMLElement>('td[data-row="0"][data-col="0"]')?.textContent).toBe(
      "Renombrada",
    );
  });

  it("adds rows and columns from the hover buttons", () => {
    const view = createView(MILITIA_TABLE);

    view.dom
      .querySelector<HTMLElement>(".cm-table-add-row")
      ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(view.state.doc.toString().split("\n")).toHaveLength(5);

    view.dom
      .querySelector<HTMLElement>(".cm-table-add-col")
      ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    const firstLine = view.state.doc.toString().split("\n")[0];
    expect(firstLine.trim().endsWith("MODERNA |  |")).toBe(true);
  });

  it("serializes tables with alignment markers", () => {
    expect(serializeMarkdownTable(["a", "b"], ["center", "right"], [["1", "2"]])).toBe(
      "| a | b |\n| :---: | ---: |\n| 1 | 2 |",
    );
  });
});
