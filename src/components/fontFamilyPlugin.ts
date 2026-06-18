import { Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

function marker(from: number, to: number, className: string) {
  return Decoration.mark({ class: className }).range(from, to);
}

function addFontFamilyMatches(
  text: string,
  from: number,
  decorations: Range<Decoration>[],
) {
  // Match <!--font:FONTNAME-->content<!--/font-->
  // This pattern allows font specifications without breaking markdown portability
  const fontPattern = /<!--font:\s*([^-]+?)\s*-->([\s\S]*?)<!--\/font-->/g;
  let match: RegExpExecArray | null;
  
  while ((match = fontPattern.exec(text)) !== null) {
    const fullFrom = from + match.index;
    const fullTo = fullFrom + match[0].length;
    const fontFamily = match[1];
    const content = match[2];
    
    // Find where the content starts and ends
    const openTagLen = `<!--font:${fontFamily}-->`.length;
    const contentFrom = fullFrom + openTagLen;
    const contentTo = contentFrom + content.length;
    
    // Hide opening tag
    decorations.push(marker(fullFrom, contentFrom, "cm-markdown-syntax-hidden"));
    
    // Apply font family to content
    decorations.push(
      Decoration.mark({
        attributes: { style: `font-family: ${fontFamily}` },
      }).range(contentFrom, contentTo)
    );
    
    // Hide closing tag
    decorations.push(marker(contentTo, fullTo, "cm-markdown-syntax-hidden"));
  }
}

function getDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    let position = from;
    while (position <= to) {
      const line = view.state.doc.lineAt(position);
      const text = line.text;
      
      addFontFamilyMatches(text, line.from, decorations);
      
      position = line.to + 1;
    }
  }

  return Decoration.set(decorations, true);
}

export const fontFamilyPlugin = ViewPlugin.fromClass(
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
    decorations: (instance) => instance.decorations,
  }
);
