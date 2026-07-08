import { useEffect, useState } from "react";
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import { Copy, FolderTree, Plus, Trash2, X } from "lucide-react";
import type { CustomFieldType } from "../../editorTypes";
import type { VisiblePropertyDefinition } from "../../utils/propertiesConfig";
import { PROPERTY_TYPE_LABELS } from "./propertyTypeIcons";

export type EditableOption = { value: string; label: string; color?: string };

const SELECTABLE_TYPES = (Object.keys(PROPERTY_TYPE_LABELS) as CustomFieldType[]).filter(
  (type) => type !== "group",
);

export type PropertyEditorPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  property: VisiblePropertyDefinition;
  allProperties: VisiblePropertyDefinition[];
  /** Fully resolved options (handles the special type/status cases). */
  editableOptions: EditableOption[];
  canEditOptions: boolean;
  isProtected: boolean;
  parentId: string;
  onClose: () => void;
  onRename: (label: string) => void;
  onChangeType: (type: CustomFieldType) => void;
  onUpdate: (patch: { description?: string; required?: boolean }) => void;
  onUpdateOptions: (options: EditableOption[]) => void;
  onSetDependency: (parentId: string, values: string[]) => void;
  onMoveParent: (parentId: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

/**
 * Notion-style contextual property editor. Anchored to the property row and
 * consolidating everything the old two-column PropertyManagerModal did:
 * name, type, description, required, options, dependency, location, and the
 * duplicate/make-root/delete actions. Presentational — every mutation is a
 * curried callback owned by MetadataEditor, which keeps the YAML the source of
 * truth. Reuses the floating anchor pattern from PickerPopover.
 */
export function PropertyEditorPopover({
  open,
  anchorEl,
  property,
  allProperties,
  editableOptions,
  canEditOptions,
  isProtected,
  parentId,
  onClose,
  onRename,
  onChangeType,
  onUpdate,
  onUpdateOptions,
  onSetDependency,
  onMoveParent,
  onDuplicate,
  onDelete,
}: PropertyEditorPopoverProps) {
  const [nameDraft, setNameDraft] = useState(property.label ?? property.id);

  const { refs, floatingStyles } = useFloating({
    open,
    placement: "left-start",
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = `${Math.max(240, Math.min(availableHeight, 520))}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(anchorEl);
  }, [anchorEl, refs, open]);

  useEffect(() => {
    setNameDraft(property.label ?? property.id);
  }, [property.id, property.label]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (refs.floating.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorEl, onClose, open, refs.floating]);

  if (!open) return null;

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== (property.label ?? property.id)) {
      onRename(trimmed);
    }
  };

  const dependencyParents = allProperties.filter(
    (candidate) =>
      candidate.id !== property.id &&
      (candidate.type === "select" || candidate.type === "multiselect"),
  );
  const dependencyParentId = Object.keys(property.visibleWhen ?? {})[0] ?? "";
  const dependencyParent = allProperties.find((candidate) => candidate.id === dependencyParentId);
  const dependencyValues = property.visibleWhen?.[dependencyParentId] ?? [];

  const parentCandidates = allProperties.filter(
    (candidate) => candidate.id !== property.id && candidate.type === "group",
  );

  const updateOption = (index: number, patch: Partial<EditableOption>) => {
    onUpdateOptions(
      editableOptions.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    );
  };

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="property-editor-popover"
      role="dialog"
      aria-label={`Edit ${property.label ?? property.id}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="property-editor-header">
        <input
          className="property-editor-name"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitName();
            }
          }}
          disabled={isProtected}
          title={isProtected ? "Core fields cannot be renamed" : undefined}
          aria-label="Property name"
        />
        <button type="button" onClick={onClose} title="Close" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <label className="property-editor-field">
        <span>Type</span>
        <select
          value={property.type}
          disabled={isProtected || property.type === "group"}
          onChange={(event) => onChangeType(event.target.value as CustomFieldType)}
        >
          {SELECTABLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROPERTY_TYPE_LABELS[type]}
            </option>
          ))}
          {property.type === "group" ? <option value="group">Group</option> : null}
        </select>
      </label>

      <label className="property-editor-field">
        <span>Description</span>
        <textarea
          value={property.description ?? ""}
          rows={2}
          onChange={(event) => onUpdate({ description: event.target.value })}
          placeholder="Optional helper text"
        />
      </label>

      <label className="property-editor-checkbox">
        <input
          type="checkbox"
          checked={property.required ?? false}
          onChange={(event) => onUpdate({ required: event.target.checked })}
        />
        <span>Required</span>
      </label>

      {canEditOptions ? (
        <div className="property-editor-options">
          <span className="property-editor-section-label">Options</span>
          {editableOptions.map((option, index) => (
            <div key={`${option.value}-${index}`} className="property-editor-option-row">
              <input
                value={option.label}
                onChange={(event) => updateOption(index, { label: event.target.value })}
                placeholder="Label"
              />
              <input
                value={option.value}
                onChange={(event) => updateOption(index, { value: event.target.value })}
                placeholder="value"
              />
              <input
                type="color"
                value={option.color ?? "#64748b"}
                onChange={(event) => updateOption(index, { color: event.target.value })}
                title="Color"
              />
              <button
                type="button"
                className="danger"
                title="Delete option"
                onClick={() =>
                  onUpdateOptions(editableOptions.filter((_, optionIndex) => optionIndex !== index))
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="property-editor-action"
            onClick={() =>
              onUpdateOptions([
                ...editableOptions,
                {
                  value: `option-${editableOptions.length + 1}`,
                  label: `Option ${editableOptions.length + 1}`,
                },
              ])
            }
          >
            <Plus size={13} />
            Add option
          </button>
        </div>
      ) : null}

      {dependencyParents.length ? (
        <div className="property-editor-dependency">
          <span className="property-editor-section-label">Only show when</span>
          <select
            value={dependencyParentId}
            onChange={(event) => {
              const nextParent = allProperties.find(
                (candidate) => candidate.id === event.target.value,
              );
              onSetDependency(
                event.target.value,
                nextParent?.options?.[0]?.value ? [nextParent.options[0].value] : [],
              );
            }}
          >
            <option value="">Always shown</option>
            {dependencyParents.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label ?? candidate.id}
              </option>
            ))}
          </select>
          {dependencyParent ? (
            <div className="property-editor-dependency-values">
              {(dependencyParent.options ?? []).map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={dependencyValues.includes(option.value)}
                    onChange={(event) => {
                      const nextValues = event.target.checked
                        ? [...dependencyValues, option.value]
                        : dependencyValues.filter((value) => value !== option.value);
                      onSetDependency(dependencyParentId, nextValues);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="property-editor-field">
        <span>Location</span>
        <select value={parentId} onChange={(event) => onMoveParent(event.target.value || null)}>
          <option value="">Top level</option>
          {parentCandidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label ?? candidate.id}
            </option>
          ))}
        </select>
      </label>

      <div className="property-editor-footer">
        <button type="button" onClick={onDuplicate}>
          <Copy size={13} />
          Duplicate
        </button>
        <button type="button" disabled={!parentId} onClick={() => onMoveParent(null)}>
          <FolderTree size={13} />
          Make top level
        </button>
        <button type="button" className="danger" disabled={isProtected} onClick={onDelete}>
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}
