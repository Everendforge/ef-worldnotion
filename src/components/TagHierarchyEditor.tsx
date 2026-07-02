import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from "lucide-react";
import type { TagHierarchyNode } from "../editorTypes";

type TagHierarchyEditorProps = {
  nodes: TagHierarchyNode[];
  onChange: (nodes: TagHierarchyNode[]) => void;
};

type TagNodeItemProps = {
  node: TagHierarchyNode;
  depth: number;
  onUpdate: (node: TagHierarchyNode) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
};

function TagNodeItem({ node, depth, onUpdate, onDelete, onAddChild }: TagNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const [color, setColor] = useState(node.color ?? "");

  const handleSave = () => {
    onUpdate({
      ...node,
      label: label.trim() || node.label,
      color: color.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLabel(node.label);
    setColor(node.color ?? "");
    setIsEditing(false);
  };

  return (
    <div className="tag-node-item" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="tag-node-header">
        {node.children.length > 0 && (
          <button
            type="button"
            className="tag-node-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {isEditing ? (
          <div className="tag-node-edit">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Tag label"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <input
              type="color"
              value={color || "#6b7280"}
              onChange={(e) => setColor(e.target.value)}
              title="Tag color"
            />
            <button type="button" onClick={handleSave}>
              Save
            </button>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="tag-node-info">
              {node.color && (
                <span className="tag-color-indicator" style={{ backgroundColor: node.color }} />
              )}
              <span className="tag-node-label">{node.label}</span>
              <span className="tag-node-path">{node.fullPath}</span>
            </div>
            <div className="tag-node-actions">
              <button type="button" onClick={() => onAddChild(node.id)} title="Add child tag">
                <Plus size={14} />
              </button>
              <button type="button" onClick={() => setIsEditing(true)} title="Edit tag">
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                title="Delete tag"
                className="danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="tag-node-children">
          {node.children.map((child) => (
            <TagNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagHierarchyEditor({ nodes, onChange }: TagHierarchyEditorProps) {
  const [newTagLabel, setNewTagLabel] = useState("");

  const findNodeById = (nodes: TagHierarchyNode[], id: string): TagHierarchyNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const updateNodeInTree = (
    nodes: TagHierarchyNode[],
    nodeId: string,
    updater: (node: TagHierarchyNode) => TagHierarchyNode,
  ): TagHierarchyNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return updater(node);
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, nodeId, updater),
        };
      }
      return node;
    });
  };

  const deleteNodeFromTree = (nodes: TagHierarchyNode[], nodeId: string): TagHierarchyNode[] => {
    return nodes
      .filter((node) => node.id !== nodeId)
      .map((node) => ({
        ...node,
        children: deleteNodeFromTree(node.children, nodeId),
      }));
  };

  const handleUpdateNode = (updatedNode: TagHierarchyNode) => {
    onChange(updateNodeInTree(nodes, updatedNode.id, () => updatedNode));
  };

  const handleDeleteNode = (nodeId: string) => {
    if (confirm("Delete this tag and all its children?")) {
      onChange(deleteNodeFromTree(nodes, nodeId));
    }
  };

  const handleAddChild = (parentId: string) => {
    const parent = findNodeById(nodes, parentId);
    if (!parent) return;

    const childLabel = prompt("Enter new tag label:");
    if (!childLabel?.trim()) return;

    const newChild: TagHierarchyNode = {
      id: `${parentId}-${childLabel.toLowerCase().replace(/\s+/g, "-")}`,
      label: childLabel.trim(),
      fullPath: `${parent.fullPath}/${childLabel.trim()}`,
      children: [],
      parentId: parentId,
    };

    onChange(
      updateNodeInTree(nodes, parentId, (node) => ({
        ...node,
        children: [...node.children, newChild],
      })),
    );
  };

  const handleAddRoot = () => {
    if (!newTagLabel.trim()) return;

    const newRoot: TagHierarchyNode = {
      id: newTagLabel.toLowerCase().replace(/\s+/g, "-"),
      label: newTagLabel.trim(),
      fullPath: newTagLabel.trim(),
      children: [],
    };

    onChange([...nodes, newRoot]);
    setNewTagLabel("");
  };

  return (
    <div className="tag-hierarchy-editor">
      <div className="tag-hierarchy-add-root">
        <input
          type="text"
          value={newTagLabel}
          onChange={(e) => setNewTagLabel(e.target.value)}
          placeholder="New root tag..."
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddRoot();
          }}
        />
        <button type="button" onClick={handleAddRoot} disabled={!newTagLabel.trim()}>
          <Plus size={14} />
          Add Root Tag
        </button>
      </div>

      {nodes.length === 0 ? (
        <p className="taxonomy-placeholder">
          No tags defined yet. Add a root tag to get started, or enable auto-detection to generate
          from existing tags.
        </p>
      ) : (
        <div className="tag-hierarchy-tree">
          {nodes.map((node) => (
            <TagNodeItem
              key={node.id}
              node={node}
              depth={0}
              onUpdate={handleUpdateNode}
              onDelete={handleDeleteNode}
              onAddChild={handleAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
