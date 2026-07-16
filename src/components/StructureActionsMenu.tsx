import { useEffect, useRef, useState } from "react";
import type { StructuredElement } from "../utils/structuredMarkdown";
import { wikilinkMarkdown } from "../utils/structuredMarkdown";
import { imageMarkdown } from "../utils/attachments";

export type StructureActionsMenuProps = {
  element: StructuredElement;
  x: number;
  y: number;
  onDismiss: () => void;
  onReplace: (element: StructuredElement, replacement: string) => void;
  onOpenSource: () => void;
  onOpenWikilink?: (target: string) => void;
  onOpenUrl?: (url: string) => void;
};

function plainBlockText(element: StructuredElement): string {
  switch (element.kind) {
    case "heading":
      return element.text.replace(/^#{1,6}\s+/, "");
    case "task":
      return element.text.replace(/^(\s*)- \[[ xX]\]\s+/, "$1");
    case "list":
      return element.text.replace(/^(\s*)(?:[-*]|\d+\.)\s+/, "$1");
    case "quote":
      return element.text.replace(/^(\s*)>\s?/, "$1");
    default:
      return element.label;
  }
}

export function StructureActionsMenu({
  element,
  x,
  y,
  onDismiss,
  onReplace,
  onOpenSource,
  onOpenWikilink,
  onOpenUrl,
}: StructureActionsMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [editingWikilink, setEditingWikilink] = useState(false);
  const [target, setTarget] = useState(element.target ?? "");
  const [alias, setAlias] = useState(element.alias ?? element.target ?? "");
  const [imageWidth, setImageWidth] = useState(element.imagePresentation?.width ?? 100);
  const [imageAlign, setImageAlign] = useState(element.imagePresentation?.align ?? "center");

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const replace = (text: string) => {
    onReplace(element, text);
    onDismiss();
  };

  const copyReference = async () => {
    await navigator.clipboard?.writeText(element.text);
    onDismiss();
  };

  return (
    <div
      ref={rootRef}
      className="structure-actions-menu"
      role="menu"
      aria-label={`${element.kind} actions`}
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="structure-actions-title">{element.label}</div>
      {element.kind === "wikilink" ? (
        editingWikilink ? (
          <form
            className="structure-actions-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (target.trim()) replace(wikilinkMarkdown(target, alias));
            }}
          >
            <label>
              Destination
              <input autoFocus value={target} onChange={(event) => setTarget(event.target.value)} />
            </label>
            <label>
              Visible text
              <input value={alias} onChange={(event) => setAlias(event.target.value)} />
            </label>
            <button type="submit">Save link</button>
          </form>
        ) : (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => element.target && onOpenWikilink?.(element.target)}
            >
              Open note
            </button>
            <button type="button" role="menuitem" onClick={() => setEditingWikilink(true)}>
              Edit destination and text
            </button>
            <button type="button" role="menuitem" onClick={() => void copyReference()}>
              Copy reference
            </button>
            <button type="button" role="menuitem" onClick={() => replace(element.label)}>
              Convert to text
            </button>
          </>
        )
      ) : null}
      {element.kind === "link" ? (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => element.url && onOpenUrl?.(element.url)}
          >
            Open link
          </button>
          <button type="button" role="menuitem" onClick={() => replace(element.label)}>
            Remove link
          </button>
        </>
      ) : null}
      {element.kind === "image" ? (
        <div className="structure-actions-image-controls">
          <label>
            Width <output>{imageWidth}%</output>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={imageWidth}
              onChange={(event) => setImageWidth(Number(event.target.value))}
            />
          </label>
          <div className="structure-actions-image-align" role="group" aria-label="Image alignment">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                className={imageAlign === align ? "active" : ""}
                aria-pressed={imageAlign === align}
                onClick={() => setImageAlign(align)}
              >
                {align[0].toUpperCase() + align.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (element.target) {
                let path = element.target;
                try {
                  path = decodeURI(path);
                } catch {
                  // Keep a malformed path intact; Source remains available for repair.
                }
                replace(
                  imageMarkdown(path, element.label, { width: imageWidth, align: imageAlign }),
                );
              }
            }}
          >
            Apply image layout
          </button>
        </div>
      ) : null}
      {element.kind === "bold" || element.kind === "italic" || element.kind === "inline-code" ? (
        <button type="button" role="menuitem" onClick={() => replace(element.label)}>
          Remove formatting
        </button>
      ) : null}
      {element.kind === "heading" ? (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              replace(`${"#".repeat(Math.min(6, (element.level ?? 1) + 1))} ${element.label}`)
            }
          >
            Make smaller heading
          </button>
          <button type="button" role="menuitem" onClick={() => replace(plainBlockText(element))}>
            Convert to text
          </button>
        </>
      ) : null}
      {element.kind === "task" ? (
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            replace(element.text.replace(/\[([ xX])\]/, element.checked ? "[ ]" : "[x]"))
          }
        >
          {element.checked ? "Mark incomplete" : "Mark complete"}
        </button>
      ) : null}
      {element.kind === "list" || element.kind === "quote" ? (
        <button type="button" role="menuitem" onClick={() => replace(plainBlockText(element))}>
          Convert to text
        </button>
      ) : null}
      <button type="button" role="menuitem" onClick={onOpenSource}>
        Open in Source
      </button>
    </div>
  );
}
