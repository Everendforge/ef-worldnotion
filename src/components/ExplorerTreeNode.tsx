import type { MouseEvent } from "react";
import { ChevronDown, ChevronRight, FileEdit, FileText, Folder, FolderOpen, Star, StarOff } from "lucide-react";
import type { VaultTreeNode } from "../domain";

export type ExplorerTreeNodeProps = {
  node: VaultTreeNode;
  selectedPath?: string;
  openTabPaths: Set<string>;
  dirtyTabPaths: Set<string>;
  favoritePaths: Set<string>;
  onSelectPath: (path: string) => void;
  onSelectFolder: (path: string) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onContextMenu: (event: MouseEvent, path: string, kind: "file" | "folder" | "empty") => void;
  onToggleFavorite: (path: string, kind: "file" | "folder") => void;
  onDragMove: (fromPath: string, toFolderPath: string, kind?: "file" | "folder") => void;
  onPointerDragStart: (path: string, kind: "file" | "folder", x: number, y: number) => void;
  isPointerClickSuppressed: () => boolean;
  entityTagColors?: Map<string, string>;
};

export function ExplorerTreeNode({
  node,
  selectedPath,
  openTabPaths,
  dirtyTabPaths,
  favoritePaths,
  onSelectPath,
  onSelectFolder,
  expandedPaths,
  onToggleExpand,
  onContextMenu,
  onToggleFavorite,
  onDragMove,
  onPointerDragStart,
  isPointerClickSuppressed,
  entityTagColors,
}: ExplorerTreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const hasChildren = node.children.length > 0;
  const isFavorite = favoritePaths.has(node.path);
  const isOpen = openTabPaths.has(node.path);
  const isDirty = dirtyTabPaths.has(node.path);
  const tagColor = entityTagColors?.get(node.path);

  const activateNode = () => {
    if (isPointerClickSuppressed()) return;
    if (node.kind === "folder") {
      onSelectFolder(node.path);
      if (hasChildren) {
        onToggleExpand(node.path);
      }
    } else if (node.kind === "file") {
      onSelectPath(node.path);
    }
  };

  return (
    <div className="tree-node">
      <div
        role="button"
        tabIndex={0}
        draggable={false}
        data-tree-node="true"
        data-tree-drop-path={node.kind === "folder" ? node.path : undefined}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", node.path);
          event.dataTransfer.setData("application/worldnotion-kind", node.kind);
          event.dataTransfer.effectAllowed = "move";
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          onPointerDragStart(node.path, node.kind, event.clientX, event.clientY);
        }}
        onDragOver={(event) => {
          if (node.kind === "folder") {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (node.kind !== "folder") return;
          const fromPath = event.dataTransfer.getData("text/plain");
          const fromKind = event.dataTransfer.getData("application/worldnotion-kind") as "file" | "folder" | "";
          if (fromPath && fromPath !== node.path && !node.path.startsWith(`${fromPath}/`)) {
            onDragMove(fromPath, node.path, fromKind || undefined);
          }
        }}
        className={`tree-button ${selectedPath === node.path ? "active" : ""} ${node.hasDescription ? "has-description" : ""} ${isOpen ? "is-open" : ""}`}
        onClick={activateNode}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activateNode();
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event, node.path, node.kind);
        }}
        title={node.path}
      >
        {node.kind === "folder" && hasChildren && (
          <span className="tree-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {tagColor && node.kind === "file" && (
          <span className="tree-tag-indicator" style={{ backgroundColor: tagColor }} title="Tag color" />
        )}
        {node.kind === "folder" ? (
          isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
        ) : (
          <FileText size={14} />
        )}
        <span>{node.name}</span>
        {isDirty ? <strong className="tree-dirty">*</strong> : null}
        {isFavorite ? <Star size={12} className="tree-favorite" /> : null}
        {node.kind === "folder" && node.hasDescription && (
          <button
            type="button"
            className="folder-description-button"
            onClick={(event) => {
              event.stopPropagation();
              if (node.descriptionPath) {
                onSelectPath(node.descriptionPath);
              }
            }}
            title={`Edit ${node.name} description`}
          >
            <FileEdit size={12} />
          </button>
        )}
        <button
          type="button"
          className="folder-description-button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(node.path, node.kind);
          }}
          title={isFavorite ? "Remove favorite" : "Add favorite"}
        >
          {isFavorite ? <StarOff size={12} /> : <Star size={12} />}
        </button>
      </div>
      {node.kind === "folder" && hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child) => (
            <ExplorerTreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              openTabPaths={openTabPaths}
              dirtyTabPaths={dirtyTabPaths}
              favoritePaths={favoritePaths}
              onSelectPath={onSelectPath}
              onSelectFolder={onSelectFolder}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onContextMenu={onContextMenu}
              onToggleFavorite={onToggleFavorite}
              onDragMove={onDragMove}
              onPointerDragStart={onPointerDragStart}
              isPointerClickSuppressed={isPointerClickSuppressed}
              entityTagColors={entityTagColors}
            />
          ))}
        </div>
      )}
    </div>
  );
}
