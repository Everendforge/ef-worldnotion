import { Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";

class ListMarkerWidget extends WidgetType {
  constructor(private readonly label: string, private readonly kind: "bullet" | "ordered" | "task") {
    super();
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = `cm-rendered-list-marker cm-rendered-list-marker-${this.kind}`;
    element.textContent = this.label;
    return element;
  }

  ignoreEvent() {
    return false;
  }
}

function marker(from: number, to: number, className = "cm-markdown-syntax-muted"): Range<Decoration> | null {
  if (from >= to) return null;
  return Decoration.mark({ class: className }).range(from, to);
}

function syntaxMarker(from: number, to: number, active: boolean): Range<Decoration> | null {
  if (from >= to) return null;
  return marker(from, to, active ? "cm-markdown-syntax-muted" : "cm-markdown-syntax-hidden");
}

function lineClass(className: string, from: number) {
  return Decoration.line({ class: className }).range(from);
}

function selectionTouches(selectionFrom: number, selectionTo: number, from: number, to: number) {
  if (selectionFrom === selectionTo) {
    return selectionFrom >= from && selectionFrom <= to;
  }
  return selectionFrom <= to && selectionTo >= from;
}

function addInlineMatches(
  text: string,
  from: number,
  selectionFrom: number,
  selectionTo: number,
  decorations: Range<Decoration>[],
) {
  let boldMatch: RegExpExecArray | null;
  const boldPattern = /(\*\*|__)([^*_`\n]+?)\1/g;
  while ((boldMatch = boldPattern.exec(text)) !== null) {
    const openFrom = from + boldMatch.index;
    const contentFrom = openFrom + boldMatch[1].length;
    const contentTo = contentFrom + boldMatch[2].length;
    const active = selectionTouches(selectionFrom, selectionTo, openFrom, contentTo + boldMatch[1].length);
    const m1 = syntaxMarker(openFrom, contentFrom, active);
    if (m1) decorations.push(m1);
    const m2 = marker(contentFrom, contentTo, "cm-md-bold");
    if (m2) decorations.push(m2);
    const m3 = syntaxMarker(contentTo, contentTo + boldMatch[1].length, active);
    if (m3) decorations.push(m3);
  }

  let italicMatch: RegExpExecArray | null;
  const italicPattern = /(^|[^\*_\w])(\*|_)([^*_`\n]+?)\2(?![\*_\w])/g;
  while ((italicMatch = italicPattern.exec(text)) !== null) {
    const openFrom = from + italicMatch.index + italicMatch[1].length;
    const contentFrom = openFrom + italicMatch[2].length;
    const contentTo = contentFrom + italicMatch[3].length;
    const active = selectionTouches(selectionFrom, selectionTo, openFrom, contentTo + italicMatch[2].length);
    const m1 = syntaxMarker(openFrom, contentFrom, active);
    if (m1) decorations.push(m1);
    const m2 = marker(contentFrom, contentTo, "cm-md-italic");
    if (m2) decorations.push(m2);
    const m3 = syntaxMarker(contentTo, contentTo + italicMatch[2].length, active);
    if (m3) decorations.push(m3);
  }

  let codeMatch: RegExpExecArray | null;
  const codePattern = /`([^`\n]+?)`/g;
  while ((codeMatch = codePattern.exec(text)) !== null) {
    const openFrom = from + codeMatch.index;
    const contentFrom = openFrom + 1;
    const contentTo = contentFrom + codeMatch[1].length;
    const active = selectionTouches(selectionFrom, selectionTo, openFrom, contentTo + 1);
    const m1 = syntaxMarker(openFrom, contentFrom, active);
    if (m1) decorations.push(m1);
    const m2 = marker(contentFrom, contentTo, "cm-md-inline-code");
    if (m2) decorations.push(m2);
    const m3 = syntaxMarker(contentTo, contentTo + 1, active);
    if (m3) decorations.push(m3);
  }

  let linkMatch: RegExpExecArray | null;
  const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((linkMatch = markdownLinkPattern.exec(text)) !== null) {
    const linkFrom = from + linkMatch.index;
    const linkTo = linkFrom + linkMatch[0].length;
    const active = selectionTouches(selectionFrom, selectionTo, linkFrom, linkTo);
    const m1 = syntaxMarker(linkFrom, linkFrom + 1, active);
    if (m1) decorations.push(m1);
    const m2 = marker(from + linkMatch.index + 1, from + linkMatch.index + 1 + linkMatch[1].length, "cm-md-link-label");
    if (m2) decorations.push(m2);
    const labelEnd = from + linkMatch.index + 1 + linkMatch[1].length;
    const m3 = syntaxMarker(labelEnd, linkTo, active);
    if (m3) decorations.push(m3);
  }

  let wikilinkMatch: RegExpExecArray | null;
  const wikilinkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
  while ((wikilinkMatch = wikilinkPattern.exec(text)) !== null) {
    const start = from + wikilinkMatch.index;
    const targetFrom = start + 2;
    const targetTo = targetFrom + wikilinkMatch[1].length;
    const end = start + wikilinkMatch[0].length;
    const active = selectionTouches(selectionFrom, selectionTo, start, end);
    const m1 = syntaxMarker(start, targetFrom, active);
    if (m1) decorations.push(m1);
    if (wikilinkMatch[2]) {
      const aliasFrom = start + wikilinkMatch[0].lastIndexOf("|") + 1;
      const aliasTo = end - 2;
      const m2 = marker(targetFrom, aliasFrom, active ? "cm-md-wikilink-target" : "cm-markdown-syntax-hidden");
      if (m2) decorations.push(m2);
      const m3 = marker(aliasFrom, aliasTo, "cm-md-wikilink-alias");
      if (m3) decorations.push(m3);
    } else {
      const m2 = marker(targetFrom, targetTo, "cm-md-wikilink-alias");
      if (m2) decorations.push(m2);
    }
    const m4 = syntaxMarker(end - 2, end, active);
    if (m4) decorations.push(m4);
  }
}

function getDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const selectionFrom = view.state.selection.main.from;
  const selectionTo = view.state.selection.main.to;

  for (const { from, to } of view.visibleRanges) {
    let position = from;
    while (position <= to) {
      const line = view.state.doc.lineAt(position);
      const text = line.text;
      const heading = /^(#{1,6})\s/.exec(text);
      if (heading) {
        const level = Math.min(heading[1].length, 6);
        const markerFrom = line.from;
        const markerTo = line.from + heading[0].length;
        const markerActive = selectionTouches(selectionFrom, selectionTo, markerFrom, markerTo);
        decorations.push(lineClass(`cm-md-heading-line cm-md-heading-${level}`, line.from));
        const m1 = syntaxMarker(markerFrom, markerTo, markerActive);
        if (m1) decorations.push(m1);
        const m2 = marker(markerTo, line.to, `cm-md-heading-text cm-md-heading-text-${level}`);
        if (m2) decorations.push(m2);
      }
      const list = /^(\s*)(- \[[ xX]\]|\d+\.|[-*])\s/.exec(text);
      if (list) {
        decorations.push(lineClass("cm-md-list-line", line.from));
        const markerFrom = line.from + list[1].length;
        const markerTo = line.from + list[0].length;
        const markerActive = selectionTouches(selectionFrom, selectionTo, markerFrom, markerTo);
        if (!markerActive) {
          const kind = /^\d+\./.test(list[2]) ? "ordered" : list[2].startsWith("- [") ? "task" : "bullet";
          const label = kind === "bullet" ? "•" : kind === "task" ? (/[xX]/.test(list[2]) ? "☑" : "☐") : list[2];
          decorations.push(
            Decoration.widget({
              widget: new ListMarkerWidget(label, kind),
              side: 1,
            }).range(markerFrom),
          );
        }
        const m1 = marker(markerFrom, markerTo, markerActive ? "cm-list-marker" : "cm-markdown-syntax-hidden");
        if (m1) decorations.push(m1);
      }
      const quote = /^>\s/.exec(text);
      if (quote) {
        const markerActive = selectionTouches(selectionFrom, selectionTo, line.from, line.from + quote[0].length);
        decorations.push(lineClass("cm-md-quote-line", line.from));
        const m1 = syntaxMarker(line.from, line.from + quote[0].length, markerActive);
        if (m1) decorations.push(m1);
      }

      addInlineMatches(text, line.from, selectionFrom, selectionTo, decorations);
      if (line.to + 1 > to) break;
      position = line.to + 1;
    }
  }

  return Decoration.set(decorations, true);
}

export const markdownSyntaxPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);
