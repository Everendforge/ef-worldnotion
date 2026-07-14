import { Range } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { isStructuralChange, selectionTouches } from "./pluginUtils";

// Standard Markdown image: ![alt](path). Path stops at the first ")".
// Inline image syntax cannot span lines. Keeping the match single-line is
// required because the live-preview widget is a Decoration.replace range.
const IMAGE_MD_REGEX = /!\[([^\]\n]*)\]\(([^)\s\n]+)(?:\s+"[^"\n]*")?\)/g;

export type ImageResolver = (rawPath: string) => Promise<string | null>;

/**
 * Renders standard Markdown images inline in the editor (Obsidian-style live
 * preview): the `![alt](path)` markup is replaced by the actual image unless
 * the cursor is on that span, in which case the raw markup stays editable.
 */
class ImageWidget extends WidgetType {
  constructor(
    readonly rawPath: string,
    readonly alt: string,
    private readonly resolve: ImageResolver,
  ) {
    super();
  }

  // Reuse the existing DOM across rebuilds while the source is unchanged, so
  // the image is not reloaded (and does not flicker) on every keystroke.
  eq(other: ImageWidget) {
    return other.rawPath === this.rawPath && other.alt === this.alt;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("span");
    container.className = "cm-image-widget cm-image-loading";
    container.setAttribute("data-image-path", this.rawPath);

    const img = document.createElement("img");
    img.alt = this.alt || this.rawPath;
    img.addEventListener("load", () => {
      container.classList.remove("cm-image-loading");
      // The image changed the widget height; let CodeMirror re-measure.
      view.requestMeasure();
    });
    img.addEventListener("error", () => {
      container.classList.remove("cm-image-loading");
      container.classList.add("cm-image-error");
      container.textContent = `⚠ Image not found: ${this.rawPath}`;
    });

    this.resolve(this.rawPath)
      .then((url) => {
        if (url) {
          img.src = url;
          container.appendChild(img);
        } else {
          container.classList.remove("cm-image-loading");
          container.classList.add("cm-image-error");
          container.textContent = `⚠ Image not found: ${this.rawPath}`;
        }
      })
      .catch(() => {
        container.classList.remove("cm-image-loading");
        container.classList.add("cm-image-error");
        container.textContent = `⚠ Image not found: ${this.rawPath}`;
      });

    return container;
  }

  ignoreEvent() {
    return false;
  }
}

export function imagePlugin(options: { resolve: ImageResolver }) {
  function getDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const selectionFrom = view.state.selection.main.from;
    const selectionTo = view.state.selection.main.to;

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match: RegExpExecArray | null;

      IMAGE_MD_REGEX.lastIndex = 0;
      while ((match = IMAGE_MD_REGEX.exec(text)) !== null) {
        const rawPath = match[2]?.trim();
        if (!rawPath) continue;
        const start = from + match.index;
        const end = start + match[0].length;

        // Keep the raw markup visible while editing that span.
        if (selectionTouches(selectionFrom, selectionTo, start, end)) continue;

        const alt = match[1]?.trim() ?? "";
        decorations.push(
          Decoration.replace({
            widget: new ImageWidget(rawPath, alt, options.resolve),
          }).range(start, end),
        );
      }
    }

    return Decoration.set(decorations, true);
  }

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = getDecorations(view);
      }

      update(update: ViewUpdate) {
        if (isStructuralChange(update) || update.selectionSet) {
          this.decorations = getDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}
