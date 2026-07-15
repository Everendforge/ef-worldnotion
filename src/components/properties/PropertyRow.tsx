import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  RotateCcw,
  Wand2,
} from "lucide-react";
import type { BasePropertyDefinition, CustomFieldDefinition } from "../../editorTypes";
import type { InspectorPropertyTreeNode } from "../../utils/propertiesConfig";
import { PropertyFieldRenderer } from "../PropertyFieldRenderer";
import type { PropertyFieldRendererProps } from "../PropertyFieldRenderer";
import { propertyTypeIcon } from "./propertyTypeIcons";

type PropertyLike = BasePropertyDefinition | CustomFieldDefinition;

export type PropertyRowHandlers = {
  getValue: (property: PropertyLike) => unknown;
  getOptions: (property: PropertyLike) => PropertyFieldRendererProps["availableOptions"];
  onChange: (propertyId: string, value: unknown) => void;
  onContextMenu: (event: React.MouseEvent, property: PropertyLike) => void;
  onDragStart: (propertyId: string) => void;
  onDragEnd: () => void;
  onDrop: (propertyId: string) => void;
  onToggleGroup: (propertyId: string) => void;
  onOpenPropertyEditor: (propertyId: string, anchorEl: HTMLElement) => void;
  isVariantMode?: boolean;
  canOverride?: (propertyId: string) => boolean;
  isOverridden?: (propertyId: string) => boolean;
  onCreateOverride?: (propertyId: string) => void;
  onRestoreOverride?: (propertyId: string) => void;
  vaultIndexProps?: Pick<
    PropertyFieldRendererProps,
    "vaultIndex" | "onOpenEntity" | "onRequestImage"
  >;
};

export type PropertyRowProps = {
  node: InspectorPropertyTreeNode;
  entityType: string;
  draggedPropertyId: string | null;
  collapsedGroups: Set<string>;
  handlers: PropertyRowHandlers;
};

/**
 * Compact Obsidian-style property row: [type icon + name | inline value].
 * Groups render a collapsible header; children are indented by depth.
 */
export function PropertyRow({
  node,
  entityType,
  draggedPropertyId,
  collapsedGroups,
  handlers,
}: PropertyRowProps) {
  const property = node.property as PropertyLike;
  const hasChildren = Boolean(node.children.length);
  const isGroup = property.type === "group";
  const isCollapsed = collapsedGroups.has(property.id);
  const canOverride = handlers.isVariantMode && handlers.canOverride?.(property.id);
  const overridden = handlers.isOverridden?.(property.id);
  const isReadOnly = Boolean(
    ("readOnly" in property && property.readOnly) || (handlers.isVariantMode && !canOverride),
  );
  const TypeIcon = propertyTypeIcon(property.type);

  if (!node.conditionActive) {
    return (
      <div
        className={`property-row property-row-locked property-row-depth-${node.depth}`}
        onContextMenu={(event) => handlers.onContextMenu(event, property)}
      >
        <span className="property-row-key">
          {/* propertyTypeIcon returns a module-level lucide component, not one created in render. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <TypeIcon size={13} className="property-row-type-icon" aria-hidden="true" />
          <span className="property-row-name">{property.label || property.id}</span>
        </span>
        <span className="property-row-locked-hint" title={node.conditionLabel}>
          Conditional
        </span>
        <button
          type="button"
          className="property-row-more"
          title="Edit property"
          aria-label={`Edit ${property.label || property.id}`}
          onClick={(event) => handlers.onOpenPropertyEditor(property.id, event.currentTarget)}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`property-row-wrapper ${draggedPropertyId === property.id ? "dragging" : ""} ${!node.visibleInType ? "property-row-hidden-in-type" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.stopPropagation();
        handlers.onDrop(property.id);
      }}
    >
      <div
        className={`property-row property-row-depth-${node.depth} ${isGroup ? "property-row-group" : ""}`}
        onContextMenu={(event) => handlers.onContextMenu(event, property)}
      >
        <button
          type="button"
          className="property-row-handle"
          draggable
          onDragStart={() => handlers.onDragStart(property.id)}
          onDragEnd={handlers.onDragEnd}
          title="Drag to reorder"
          aria-label={`Reorder ${property.label || property.id}`}
        >
          <GripVertical size={12} />
        </button>
        {isGroup ? (
          <button
            type="button"
            className="property-row-key property-row-group-toggle"
            onClick={() => handlers.onToggleGroup(property.id)}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span className="property-row-name">{property.label || property.id}</span>
            <small className="property-row-count">{node.children.length}</small>
          </button>
        ) : (
          <>
            <span className="property-row-key" title={property.description || property.id}>
              {/* propertyTypeIcon returns a module-level lucide component, not one created in render. */}
              {/* eslint-disable-next-line react-hooks/static-components */}
              <TypeIcon size={13} className="property-row-type-icon" aria-hidden="true" />
              <span className="property-row-name">
                {property.label || property.id}
                {property.required ? <span className="required-star">*</span> : null}
              </span>
            </span>
            <span className="property-row-value">
              <PropertyFieldRenderer
                property={property}
                value={handlers.getValue(property)}
                onChange={(newValue) => handlers.onChange(property.id, newValue)}
                readOnly={isReadOnly}
                entityType={entityType}
                availableOptions={handlers.getOptions(property)}
                {...handlers.vaultIndexProps}
              />
            </span>
            {handlers.isVariantMode ? (
              canOverride && overridden ? (
                <button
                  type="button"
                  className="property-row-variant"
                  title="Restore inherited value"
                  onClick={() => handlers.onRestoreOverride?.(property.id)}
                >
                  <RotateCcw size={12} />
                </button>
              ) : (
                <button
                  type="button"
                  className="property-row-variant"
                  title="Override in variant"
                  disabled={!canOverride}
                  onClick={() => handlers.onCreateOverride?.(property.id)}
                >
                  <Wand2 size={12} />
                </button>
              )
            ) : null}
          </>
        )}
        <button
          type="button"
          className="property-row-more"
          onClick={(event) => handlers.onOpenPropertyEditor(property.id, event.currentTarget)}
          title="Edit property"
          aria-label={`Edit ${property.label || property.id}`}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>
      {hasChildren && !isCollapsed ? (
        <div className="property-row-children">
          {node.children.map((child) => (
            <PropertyRow
              key={child.property.id}
              node={child}
              entityType={entityType}
              draggedPropertyId={draggedPropertyId}
              collapsedGroups={collapsedGroups}
              handlers={handlers}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
