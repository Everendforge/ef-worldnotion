import { RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { BASE_VARIANT_ID, VARIANT_MARKER_CLOSE, VARIANT_MARKER_OPEN } from "../utils/noteVariants";

class VariantBlockLabelWidget extends WidgetType {
  constructor(
    private readonly variantId: string,
    private readonly label: string,
  ) {
    super();
  }

  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-variant-block-marker";
    element.setAttribute("aria-label", `${this.label} variant section`);
    element.dataset.variantId = this.variantId;

    const icon = document.createElement("span");
    icon.className = "cm-variant-block-marker-icon";
    icon.textContent = "✦";

    const text = document.createElement("span");
    text.textContent = `${this.label} section`;

    element.append(icon, text);
    return element;
  }

  ignoreEvent() {
    return true;
  }

  eq(other: VariantBlockLabelWidget) {
    return this.variantId === other.variantId && this.label === other.label;
  }
}

/** Hides non-selected Everend variant blocks in Write mode while framing the active section. */
export function createVariantContentPlugin(
  activeVariantId: string,
  activeVariantLabel?: string,
  presentation: "visible" | "processed" = "processed",
) {
  return StateField.define({
    create(state) {
      return decorations(state.doc.toString(), activeVariantId, activeVariantLabel, presentation);
    },
    update(value, transaction) {
      return transaction.docChanged
        ? decorations(
            transaction.state.doc.toString(),
            activeVariantId,
            activeVariantLabel,
            presentation,
          )
        : value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}

function decorations(
  text: string,
  activeVariantId: string,
  activeVariantLabel: string | undefined,
  presentation: "visible" | "processed",
) {
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
    if (id !== activeVariantId) {
      builder.add(match.index, end, Decoration.replace({}));
    } else if (presentation === "processed") {
      builder.add(
        match.index,
        open.lastIndex,
        Decoration.replace({
          widget: new VariantBlockLabelWidget(
            id,
            activeVariantLabel || (id === BASE_VARIANT_ID ? "Base" : id),
          ),
        }),
      );
      addActiveBlockLineDecorations(builder, text, open.lastIndex, close.index);
      builder.add(close.index, end, Decoration.replace({}));
    }
    open.lastIndex = end;
  }
  return builder.finish();
}

function addActiveBlockLineDecorations(
  builder: RangeSetBuilder<Decoration>,
  text: string,
  from: number,
  to: number,
) {
  let lineStart = from;
  if (text[lineStart] === "\n") lineStart += 1;

  while (lineStart < to) {
    builder.add(lineStart, lineStart, Decoration.line({ class: "cm-variant-block-line" }));
    const nextLine = text.indexOf("\n", lineStart);
    if (nextLine === -1 || nextLine >= to) break;
    lineStart = nextLine + 1;
  }
}
