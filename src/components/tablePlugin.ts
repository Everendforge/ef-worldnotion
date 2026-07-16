import { EditorState, Range, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";

type TableAlignment = "left" | "center" | "right";

type MarkdownTable = {
  from: number;
  to: number;
  header: string[];
  alignments: TableAlignment[];
  rows: string[][];
};

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function isTableRow(line: string): boolean {
  return line.includes("|") && !TABLE_SEPARATOR.test(line);
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableAlignment(cell: string): TableAlignment {
  const trimmed = cell.trim();
  if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
  if (trimmed.endsWith(":")) return "right";
  return "left";
}

function tablesInDocument(state: EditorState): MarkdownTable[] {
  const tables: MarkdownTable[] = [];
  const { doc } = state;
  let lineNumber = 1;

  while (lineNumber < doc.lines) {
    const headerLine = doc.line(lineNumber);
    const separatorLine = doc.line(lineNumber + 1);
    if (!isTableRow(headerLine.text) || !TABLE_SEPARATOR.test(separatorLine.text)) {
      lineNumber += 1;
      continue;
    }

    const header = tableCells(headerLine.text);
    const alignmentCells = tableCells(separatorLine.text);
    if (header.length !== alignmentCells.length) {
      lineNumber += 1;
      continue;
    }

    const rows: string[][] = [];
    let lastLine = separatorLine;
    let bodyLineNumber = lineNumber + 2;
    while (bodyLineNumber <= doc.lines) {
      const bodyLine = doc.line(bodyLineNumber);
      if (!isTableRow(bodyLine.text)) break;
      const cells = tableCells(bodyLine.text);
      if (cells.length !== header.length) break;
      rows.push(cells);
      lastLine = bodyLine;
      bodyLineNumber += 1;
    }

    tables.push({
      from: headerLine.from,
      to: lastLine.to,
      header,
      alignments: alignmentCells.map(tableAlignment),
      rows,
    });
    lineNumber = bodyLineNumber;
  }

  return tables;
}

class TableWidget extends WidgetType {
  constructor(private readonly tableData: MarkdownTable) {
    super();
  }

  eq(other: TableWidget) {
    return JSON.stringify(other.tableData) === JSON.stringify(this.tableData);
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("div");
    container.className = "cm-table-widget";
    container.setAttribute("role", "button");
    container.setAttribute("tabindex", "0");
    container.setAttribute("aria-label", "Markdown table. Click to edit.");

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    this.tableData.header.forEach((value, index) => {
      const cell = document.createElement("th");
      cell.textContent = value;
      cell.style.textAlign = this.tableData.alignments[index] ?? "left";
      headerRow.appendChild(cell);
    });
    const thead = document.createElement("thead");
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    this.tableData.rows.forEach((row) => {
      const tableRow = document.createElement("tr");
      row.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        cell.style.textAlign = this.tableData.alignments[index] ?? "left";
        tableRow.appendChild(cell);
      });
      tbody.appendChild(tableRow);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    const edit = () => {
      view.dispatch({ selection: { anchor: this.tableData.from } });
      view.focus();
    };
    container.addEventListener("click", edit);
    container.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        edit();
      }
    });

    return container;
  }

  ignoreEvent() {
    return false;
  }
}

function tableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (const tableData of tablesInDocument(state)) {
    decorations.push(
      Decoration.replace({
        block: true,
        widget: new TableWidget(tableData),
      }).range(tableData.from, tableData.to),
    );
  }

  return Decoration.set(decorations, true);
}

const tableDecorationField = StateField.define<DecorationSet>({
  create: tableDecorations,
  update(decorations, transaction) {
    if (transaction.docChanged || transaction.selection) return tableDecorations(transaction.state);
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Renders GFM tables as an editable live preview in Write mode. */
export function tablePlugin() {
  return tableDecorationField;
}
