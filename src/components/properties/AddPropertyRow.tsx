import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import type { CustomFieldType } from "../../editorTypes";
import type { VisiblePropertyDefinition } from "../../utils/propertiesConfig";
import { PickerPopover, type PickerItem } from "./PickerPopover";
import { propertyTypeIcon, PROPERTY_TYPE_LABELS } from "./propertyTypeIcons";

export type NewInspectorProperty = {
  name: string;
  type: CustomFieldType;
  parentId?: string;
};

export type AddPropertyRowProps = {
  /** Schema properties that are not present in the note yet. */
  availableProperties: VisiblePropertyDefinition[];
  /** Group properties eligible to contain a new child property. */
  parentProperties: VisiblePropertyDefinition[];
  onAddExisting: (propertyId: string) => void;
  onCreate: (property: NewInspectorProperty) => void | Promise<void>;
};

const PROPERTY_TYPES = Object.entries(PROPERTY_TYPE_LABELS) as Array<[CustomFieldType, string]>;

/**
 * Adds a schema property through a small explicit form. Existing properties
 * remain available through a separate picker so the type and destination are
 * explicit and persistence failures can be reported without closing the form.
 */
export function AddPropertyRow({
  availableProperties,
  parentProperties,
  onAddExisting,
  onCreate,
}: AddPropertyRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [parentId, setParentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const pickerAnchorRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!createOpen) return;
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        setCreateOpen(false);
        setName("");
        setType("text");
        setParentId("");
        setCreateError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [createOpen, submitting]);

  const items: PickerItem[] = availableProperties.map((property) => {
    const TypeIcon = propertyTypeIcon(property.type);
    return {
      id: property.id,
      label: property.label || property.id,
      sublabel: PROPERTY_TYPE_LABELS[property.type as CustomFieldType] ?? property.type,
      icon: <TypeIcon size={13} />,
      keywords: [property.id, property.description ?? ""],
    };
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setName("");
    setType("text");
    setParentId("");
    setCreateError("");
  };

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setCreateError("");
    try {
      await onCreate({ name: name.trim(), type, parentId: parentId || undefined });
      closeCreate();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not add the property.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-property-row">
      <button
        type="button"
        className="add-property-button add-property-button-primary"
        onClick={() => setCreateOpen(true)}
      >
        <Plus size={13} />
        Add property
      </button>
      <button
        ref={pickerAnchorRef}
        type="button"
        className="add-property-button"
        onClick={() => setPickerOpen((current) => !current)}
        aria-expanded={pickerOpen}
      >
        Add existing
      </button>
      <PickerPopover
        open={pickerOpen}
        anchorRef={pickerAnchorRef}
        items={items}
        placeholder="Find a property…"
        emptyLabel="No properties in schema"
        onSelect={(item) => onAddExisting(item.id)}
        onClose={() => setPickerOpen(false)}
      />

      {createOpen
        ? createPortal(
            <div
              className="property-create-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) closeCreate();
              }}
            >
              <form
                className="property-create-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="property-create-title"
                onSubmit={submitCreate}
              >
                <div>
                  <h3 id="property-create-title">Add property</h3>
                  <p>Define the field and add it to this note.</p>
                </div>
                <label>
                  Name
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Portrait"
                  />
                </label>
                <label>
                  Type
                  <select
                    aria-label="Property type"
                    value={type}
                    onChange={(event) => setType(event.target.value as CustomFieldType)}
                  >
                    {PROPERTY_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Parent section
                  <select
                    aria-label="Parent section"
                    value={parentId}
                    onChange={(event) => setParentId(event.target.value)}
                  >
                    <option value="">Top level</option>
                    {parentProperties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.label || property.id}
                      </option>
                    ))}
                  </select>
                  <small>Choose a section only when this property belongs inside it.</small>
                </label>
                {createError ? (
                  <p className="property-create-error" role="alert">
                    {createError}
                  </p>
                ) : null}
                <div className="property-create-actions">
                  <button type="button" onClick={closeCreate} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!name.trim() || submitting}>
                    {submitting ? "Adding…" : "Add property"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
