import { EyeOff, Pencil, Trash2 } from "lucide-react";
import type { VisiblePropertyDefinition } from "../../utils/propertiesConfig";

export type PropertyContextMenuProps = {
  position: { x: number; y: number };
  /** Property under the cursor; undefined for the panel-background menu. */
  property?: VisiblePropertyDefinition;
  allProperties: VisiblePropertyDefinition[];
  visiblePropertyIds: Set<string>;
  showHiddenProperties: boolean;
  /** Core spec fields (id/type/name/status…) cannot be removed. */
  isProtected: (propertyId: string) => boolean;
  /** Opens the full contextual editor anchored to the clicked menu item. */
  onEditProperty: (propertyId: string, anchorEl: HTMLElement) => void;
  onHide: (propertyId: string) => void;
  onRemoveFromNote: (propertyId: string) => void;
  onDeleteFromUniverse: (propertyId: string) => void;
  onToggleVisibility: (propertyId: string) => void;
  onToggleShowHidden: () => void;
  onClose: () => void;
};

/**
 * Quick-action menu for a property row (or the panel background). Editing a
 * property's name, type, options, or dependency now happens in the contextual
 * PropertyEditorPopover — this menu only keeps the fast actions (edit, hide,
 * remove, delete) plus the per-type visibility toggles.
 */
export function PropertyContextMenu({
  position,
  property,
  allProperties,
  visiblePropertyIds,
  showHiddenProperties,
  isProtected,
  onEditProperty,
  onHide,
  onRemoveFromNote,
  onDeleteFromUniverse,
  onToggleVisibility,
  onToggleShowHidden,
  onClose,
}: PropertyContextMenuProps) {
  const protectedProperty = property ? isProtected(property.id) : false;

  const visibilityToggles = allProperties.map((candidate) => {
    const visible = visiblePropertyIds.has(candidate.id);
    return (
      <button
        key={candidate.id}
        type="button"
        className="context-menu-item"
        onClick={() => {
          onToggleVisibility(candidate.id);
          onClose();
        }}
      >
        <span className="context-menu-check">{visible ? "✓" : ""}</span>
        <span>{candidate.label || candidate.id}</span>
      </button>
    );
  });

  return (
    <div
      className="context-menu inspector-property-context-menu"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      role="menu"
    >
      {property ? (
        <>
          <button
            type="button"
            className="context-menu-item"
            onClick={(event) => onEditProperty(property.id, event.currentTarget)}
          >
            <Pencil size={16} />
            <span>Edit property</span>
          </button>
          <button type="button" className="context-menu-item" onClick={() => onHide(property.id)}>
            <EyeOff size={16} />
            <span>Hide</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            disabled={protectedProperty}
            onClick={() => onRemoveFromNote(property.id)}
          >
            <Trash2 size={16} />
            <span>Remove from this note</span>
          </button>
          <div className="context-menu-separator" />
          <button
            type="button"
            className="context-menu-item danger"
            disabled={protectedProperty}
            onClick={() => onDeleteFromUniverse(property.id)}
          >
            <Trash2 size={16} />
            <span>Delete from universe</span>
          </button>
          <div className="context-menu-separator" />
          {visibilityToggles}
        </>
      ) : (
        <>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onToggleShowHidden();
              onClose();
            }}
          >
            <EyeOff size={16} />
            <span>
              {showHiddenProperties ? "Hide hidden properties" : "Show hidden properties"}
            </span>
          </button>
          <div className="context-menu-separator" />
          {visibilityToggles}
        </>
      )}
    </div>
  );
}
