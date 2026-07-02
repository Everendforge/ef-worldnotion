/**
 * Tree view editor for hierarchical property structures.
 * Allows users to:
 * - View properties as a tree (root → children)
 * - Drag-drop to reorder properties
 * - Add/delete properties
 * - Click to select and edit
 */

import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Settings } from "lucide-react";
import type { PropertyDefinition } from "../editorTypes";
import { removePropertyFromTree } from "../utils/propertyTreeUtils";

type PropertyHierarchyEditorProps = {
  properties: PropertyDefinition[];
  onChange: (properties: PropertyDefinition[]) => void;
  onSelectProperty: (property: PropertyDefinition, path: string[]) => void;
  selectedPropertyId?: string;
  onAddChild?: (parentId: string) => void;
};

interface TreeNodeState {
  [propertyId: string]: {
    expanded: boolean;
    dragging?: boolean;
  };
}

export function PropertyHierarchyEditor({
  properties,
  onChange,
  onSelectProperty,
  selectedPropertyId,
  onAddChild,
}: PropertyHierarchyEditorProps) {
  const [nodeState, setNodeState] = useState<TreeNodeState>({});

  const toggleExpanded = useCallback((propertyId: string) => {
    setNodeState((prev) => ({
      ...prev,
      [propertyId]: {
        ...prev[propertyId],
        expanded: !prev[propertyId]?.expanded,
      },
    }));
  }, []);

  const handleSelectProperty = useCallback(
    (property: PropertyDefinition, path: string[] = []) => {
      onSelectProperty({ ...property }, [...path, property.id]);
    },
    [onSelectProperty],
  );

  const handleDeleteProperty = useCallback(
    (propertyId: string) => {
      if (confirm("Delete this property? This will also delete all child properties.")) {
        const updated = removePropertyFromTree(properties, propertyId);
        onChange(updated);
      }
    },
    [properties, onChange],
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      if (onAddChild) {
        onAddChild(parentId);
      } else {
        // Expand parent to show new child
        setNodeState((prev) => ({
          ...prev,
          [parentId]: { ...prev[parentId], expanded: true },
        }));
      }
    },
    [onAddChild],
  );

  const renderTreeNode = (
    property: PropertyDefinition,
    depth: number = 0,
    path: string[] = [],
  ): React.ReactNode => {
    const currentPath = [...path, property.id];
    const isExpanded = nodeState[property.id]?.expanded ?? true;
    const hasChildren = property.children && property.children.length > 0;
    const isSelected = selectedPropertyId === property.id;

    return (
      <div key={property.id} className="property-tree-node">
        <div
          className={`property-tree-node-row ${isSelected ? "selected" : ""}`}
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {/* Expander */}
          {hasChildren ? (
            <button
              className="property-tree-expander"
              onClick={() => toggleExpanded(property.id)}
              aria-label="Toggle children"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div className="property-tree-expander-placeholder" />
          )}

          {/* Label and select */}
          <div className="property-tree-label" onClick={() => handleSelectProperty(property, path)}>
            <span className="property-tree-type">{property.type}</span>
            <span className="property-tree-name">{property.label || property.id}</span>
            {property.visibleWhen && Object.keys(property.visibleWhen).length > 0 && (
              <span className="property-tree-conditional" title="Has conditional visibility">
                ●
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="property-tree-actions">
            <button
              className="property-tree-action-btn"
              onClick={() => handleAddChild(property.id)}
              title="Add child property"
            >
              <Plus size={14} />
            </button>
            <button
              className="property-tree-action-btn"
              onClick={() => handleSelectProperty(property, path)}
              title="Edit property"
            >
              <Settings size={14} />
            </button>
            <button
              className="property-tree-action-btn delete"
              onClick={() => handleDeleteProperty(property.id)}
              title="Delete property"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="property-tree-children">
            {property.children!.map((child) => renderTreeNode(child, depth + 1, currentPath))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="property-hierarchy-editor">
      <div className="property-tree">
        {properties.length === 0 ? (
          <div className="property-tree-empty">
            <p>No properties yet.</p>
            <p className="text-muted">Add properties from the controls above.</p>
          </div>
        ) : (
          properties.map((prop) => renderTreeNode(prop))
        )}
      </div>
    </div>
  );
}
