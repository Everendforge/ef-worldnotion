import { RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { BASE_VARIANT_ID, VARIANT_MARKER_CLOSE, VARIANT_MARKER_OPEN } from "../utils/noteVariants";

/** Hides non-selected Everend variant blocks in Write mode while retaining one source buffer. */
export function createVariantContentPlugin(activeVariantId: string) {
  return StateField.define({
    create(state) {
      return decorations(state.doc.toString(), activeVariantId);
    },
    update(value, transaction) {
      return transaction.docChanged
        ? decorations(transaction.state.doc.toString(), activeVariantId)
        : value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}

function decorations(text: string, activeVariantId: string) {
  const builder = new RangeSetBuilder<Decoration>();
  const open = new RegExp(VARIANT_MARKER_OPEN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = open.exec(text))) {
    const id = match[1] || match[2];
    const closePattern = new RegExp(VARIANT_MARKER_CLOSE.source, "g");
    closePattern.lastIndex = open.lastIndex;
    const close = closePattern.exec(text);
    if (!close) break; // Keep malformed blocks editable and visible.
    const end = close.index + close[0].length;
    if (activeVariantId === BASE_VARIANT_ID || id !== activeVariantId) {
      builder.add(match.index, end, Decoration.replace({}));
    } else {
      builder.add(match.index, open.lastIndex, Decoration.replace({}));
      builder.add(close.index, end, Decoration.replace({}));
    }
    open.lastIndex = end;
  }
  return builder.finish();
}
