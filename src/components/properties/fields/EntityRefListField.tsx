import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { VaultIndex } from "../../../domain";
import type { BasePropertyDefinition, CustomFieldDefinition } from "../../../editorTypes";
import { PickerPopover } from "../PickerPopover";
import { entityPickerItems, findEntityById } from "./EntityRefField";

type PropertyLike = BasePropertyDefinition | CustomFieldDefinition;

export type EntityRefListFieldProps = {
  property: PropertyLike;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  vaultIndex: VaultIndex;
  onOpenEntity?: (path: string) => void;
};

/**
 * List of entity references as removable chips plus a "+" picker that
 * excludes already-selected ids. Stored value is an array of entity ids.
 */
export function EntityRefListField({
  property,
  value,
  onChange,
  readOnly,
  vaultIndex,
  onOpenEntity,
}: EntityRefListFieldProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const ids = useMemo(
    () => (Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []),
    [value],
  );
  const items = useMemo(
    () => entityPickerItems(vaultIndex, property.targetTypes, new Set(ids)),
    [ids, property.targetTypes, vaultIndex],
  );

  const removeId = (id: string) => {
    onChange(ids.filter((candidate) => candidate !== id));
  };

  return (
    <div className="entity-ref-list-field">
      {ids.map((id) => {
        const resolved = findEntityById(vaultIndex, id);
        return (
          <span
            key={id}
            className={`entity-ref-chip ${resolved ? "" : "entity-ref-unresolved"}`}
            title={resolved ? resolved.path : `Unresolved id: ${id}`}
          >
            <button
              type="button"
              className="entity-ref-chip-label"
              onClick={() => resolved && onOpenEntity?.(resolved.path)}
              disabled={!resolved || !onOpenEntity}
            >
              {resolved?.name ?? id}
            </button>
            {!readOnly ? (
              <button
                type="button"
                className="entity-ref-chip-remove"
                onClick={() => removeId(id)}
                title="Remove"
              >
                <X size={11} />
              </button>
            ) : null}
          </span>
        );
      })}
      {!readOnly ? (
        <button
          ref={anchorRef}
          type="button"
          className="entity-ref-add"
          onClick={() => setOpen((current) => !current)}
          title={`Add ${property.targetTypes?.join("/") || "entity"}`}
        >
          <Plus size={12} />
        </button>
      ) : null}
      <PickerPopover
        open={open}
        anchorRef={anchorRef}
        items={items}
        placeholder={`Search ${property.targetTypes?.join(", ") || "entities"}…`}
        emptyLabel="No matching entities"
        onSelect={(item) => onChange([...ids, item.id])}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
