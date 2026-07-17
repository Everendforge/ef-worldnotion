import { hoverTooltip } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

/**
 * Hovering a markdown link shows its destination with a click-to-open
 * affordance, so hidden URLs are never a mystery and opening a link no
 * longer requires knowing the Cmd/Ctrl+click gesture.
 */
export function linkHoverTooltip(onOpenUrl: (url: string) => void): Extension {
  return hoverTooltip((view, pos) => {
    const tree = syntaxTree(view.state);
    let node = tree.resolveInner(pos, 1) as ReturnType<typeof tree.resolveInner> | null;
    while (node && node.name !== "Link") node = node.parent;
    if (!node) return null;
    const url = node.getChild("URL");
    if (!url) return null;

    const urlText = view.state.sliceDoc(url.from, url.to);
    return {
      pos: node.from,
      end: node.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-link-hover";
        const open = document.createElement("button");
        open.type = "button";
        open.className = "cm-link-hover-open";
        open.textContent = urlText;
        open.title = `Open ${urlText}`;
        open.addEventListener("mousedown", (event) => {
          event.preventDefault();
          onOpenUrl(urlText);
        });
        dom.appendChild(open);
        return { dom };
      },
    };
  });
}
