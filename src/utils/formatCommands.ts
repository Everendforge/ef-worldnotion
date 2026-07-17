import type { EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

/**
 * Syntax-aware formatting commands for processed Write mode. Every toggle
 * reads the Lezer markdown tree, so applying a format inside an existing
 * element unwraps it instead of nesting delimiters — the same command is
 * shared by keyboard shortcuts and both toolbars so behavior never diverges.
 */

export type InlineFormat = "bold" | "italic" | "code" | "strike";

export type ListKind = "bullet" | "ordered" | "task";

export type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  quote: boolean;
  list?: ListKind;
};

const INLINE_NODES: Record<InlineFormat, { node: string; mark: string; delimiter: string }> = {
  bold: { node: "StrongEmphasis", mark: "EmphasisMark", delimiter: "**" },
  italic: { node: "Emphasis", mark: "EmphasisMark", delimiter: "*" },
  code: { node: "InlineCode", mark: "CodeMark", delimiter: "`" },
  strike: { node: "Strikethrough", mark: "StrikethroughMark", delimiter: "~~" },
};

/** Innermost node of the given kind that fully contains [from, to]. */
function enclosingFormatNode(
  state: EditorState,
  format: InlineFormat,
  from: number,
  to: number,
): SyntaxNode | undefined {
  const tree = syntaxTree(state);
  for (const side of [-1, 1] as const) {
    let node: SyntaxNode | null = tree.resolveInner(from, side);
    while (node) {
      if (node.name === INLINE_NODES[format].node && node.from <= from && node.to >= to) {
        return node;
      }
      node = node.parent;
    }
  }
  return undefined;
}

/** Trims whitespace off the edges of a selection before wrapping it. */
function trimmedRange(state: EditorState, from: number, to: number) {
  let start = from;
  let end = to;
  while (start < end && /\s/.test(state.doc.sliceString(start, start + 1))) start += 1;
  while (end > start && /\s/.test(state.doc.sliceString(end - 1, end))) end -= 1;
  return start < end ? { from: start, to: end } : { from, to };
}

/**
 * Toggles an inline format at the current selection:
 * - inside an existing element → removes its delimiters (unwrap);
 * - non-empty selection → wraps the trimmed selection;
 * - empty selection → inserts an empty delimiter pair and leaves the cursor
 *   in the middle ("start typing bold" mode); invoking again removes it.
 */
export function toggleInlineFormat(view: EditorView, format: InlineFormat): boolean {
  const { state } = view;
  const selection = state.selection.main;
  const { mark, delimiter } = INLINE_NODES[format];

  const enclosing = enclosingFormatNode(state, format, selection.from, selection.to);
  if (enclosing) {
    const delimiters = enclosing.getChildren(mark);
    if (delimiters.length >= 2) {
      const changes = state.changes(
        delimiters.map((node) => ({ from: node.from, to: node.to, insert: "" })),
      );
      view.dispatch({
        changes,
        selection: {
          anchor: changes.mapPos(selection.anchor),
          head: changes.mapPos(selection.head),
        },
        userEvent: "format",
      });
      view.focus();
      return true;
    }
  }

  if (selection.empty) {
    const head = selection.head;
    const before = state.doc.sliceString(Math.max(0, head - delimiter.length), head);
    const after = state.doc.sliceString(head, head + delimiter.length);
    if (before === delimiter && after === delimiter) {
      // An empty pair from a previous toggle: invoking again cancels it.
      view.dispatch({
        changes: { from: head - delimiter.length, to: head + delimiter.length, insert: "" },
        userEvent: "format",
      });
      view.focus();
      return true;
    }
    view.dispatch({
      changes: { from: head, insert: delimiter + delimiter },
      selection: { anchor: head + delimiter.length },
      userEvent: "format",
    });
    view.focus();
    return true;
  }

  const range = trimmedRange(state, selection.from, selection.to);
  const changes = state.changes([
    { from: range.from, insert: delimiter },
    { from: range.to, insert: delimiter },
  ]);
  view.dispatch({
    changes,
    selection: {
      anchor: range.from + delimiter.length,
      head: range.to + delimiter.length,
    },
    userEvent: "format",
  });
  view.focus();
  return true;
}

const HEADING_PREFIX = /^(#{1,6})\s/;
const QUOTE_PREFIX = /^(\s*)>\s?/;
const TASK_PREFIX = /^(\s*)- \[[ xX]\]\s/;
const ORDERED_PREFIX = /^(\s*)\d+[.)]\s/;
const BULLET_PREFIX = /^(\s*)[-*]\s(?!\[)/;

export function lineListKind(line: string): ListKind | undefined {
  if (TASK_PREFIX.test(line)) return "task";
  if (ORDERED_PREFIX.test(line)) return "ordered";
  if (BULLET_PREFIX.test(line)) return "bullet";
  return undefined;
}

/** Formats active at the main selection, for toolbar state highlighting. */
export function activeFormats(state: EditorState): ActiveFormats {
  const selection = state.selection.main;
  const line = state.doc.lineAt(selection.head).text;
  const heading = HEADING_PREFIX.exec(line);
  return {
    bold: Boolean(enclosingFormatNode(state, "bold", selection.from, selection.to)),
    italic: Boolean(enclosingFormatNode(state, "italic", selection.from, selection.to)),
    code: Boolean(enclosingFormatNode(state, "code", selection.from, selection.to)),
    strike: Boolean(enclosingFormatNode(state, "strike", selection.from, selection.to)),
    headingLevel: heading ? (heading[1].length as 1 | 2 | 3 | 4 | 5 | 6) : undefined,
    quote: QUOTE_PREFIX.test(line),
    list: lineListKind(line),
  };
}

function stripLinePrefixes(line: string): string {
  return line
    .replace(HEADING_PREFIX, "")
    .replace(TASK_PREFIX, "$1")
    .replace(ORDERED_PREFIX, "$1")
    .replace(BULLET_PREFIX, "$1");
}

/** Sets the heading level, or removes the heading when it already matches. */
export function toggleHeadingLine(line: string, level: 1 | 2 | 3 | 4 | 5 | 6): string {
  const current = HEADING_PREFIX.exec(line);
  const clean = stripLinePrefixes(line);
  if (current && current[1].length === level) return clean;
  return `${"#".repeat(level)} ${clean || `Heading ${level}`}`;
}

/** Adds the quote prefix, or removes it when every toggled line has one. */
export function toggleQuoteLine(line: string, removing: boolean): string {
  if (removing) return line.replace(QUOTE_PREFIX, "$1");
  return QUOTE_PREFIX.test(line) ? line : `> ${line}`;
}

const EMPTY_BLOCK_LINE = /^(\s*)(?:- \[[ xX]\]|\d+[.)]|[-*]|>)\s*$/;

/**
 * Pressing Enter on a list item or quote line that has no content clears the
 * marker instead of continuing the block (Notion-style "double Enter exits").
 */
export function exitEmptyBlockLine(view: EditorView): boolean {
  const selection = view.state.selection.main;
  if (!selection.empty) return false;
  const line = view.state.doc.lineAt(selection.head);
  if (!EMPTY_BLOCK_LINE.test(line.text)) return false;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: "" },
    selection: { anchor: line.from },
    userEvent: "delete",
  });
  return true;
}

/** Converts to the list kind, or back to plain text when it already matches. */
export function toggleListLine(line: string, index: number, kind: ListKind): string {
  const indent = /^(\s*)/.exec(line)?.[1] ?? "";
  const clean = stripLinePrefixes(line).trimStart();
  if (lineListKind(line) === kind) return `${indent}${clean}`;
  const content = clean || "List item";
  if (kind === "ordered") return `${indent}${index + 1}. ${content}`;
  if (kind === "task") return `${indent}- [ ] ${content}`;
  return `${indent}- ${content}`;
}
