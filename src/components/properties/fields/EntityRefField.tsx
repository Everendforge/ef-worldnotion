import { useMemo, useRef, useState } from "react";
import { ExternalLink, Link2, X } from "lucide-react";
import type { Entity, VaultIndex } from "../../../domain";
import type { BasePropertyDefinition, CustomFieldDefinition } from "../../../editorTypes";
import { PickerPopover, type PickerItem } from "../PickerPopover";

type PropertyLike = BasePropertyDefinition | CustomFieldDefinition;

export function entityPickerItems(
  vaultIndex: VaultIndex,
  targetTypes: string[] | undefined,
  excludeIds: Set<string> = new Set(),
): PickerItem[] {
  const allowedTypes = targetTypes?.length ? new Set(targetTypes) : null;
  return vaultIndex.entities
    .filter((entity) => entity.id && !excludeIds.has(entity.id))
    .filter((entity) => !allowedTypes || allowedTypes.has(entity.type))
    .map((entity) => ({
      id: entity.id,
      label: entity.name || entity.id,
      sublabel: entity.type,
      keywords: [entity.id, entity.path, ...entity.aliases],
    }));
}

export function findEntityById(vaultIndex: VaultIndex, id: string): Entity | undefined {
  return vaultIndex.entities.find((entity) => entity.id === id);
}

export type EntityRefFieldProps = {
  property: PropertyLike;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  vaultIndex: VaultIndex;
  onOpenEntity?: (path: string) => void;
};

/**
 * Single entity reference: shows the resolved entity as a chip and picks a
 * replacement from a fuzzy popover filtered by the property's targetTypes.
 * The stored value is always the stable entity id (spec v0.1).
 */
export function EntityRefField({
  property,
  value,
  onChange,
  readOnly,
  vaultIndex,
  onOpenEntity,
}: EntityRefFieldProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const stringValue = typeof value === "string" ? value : "";
  const resolved = useMemo(
    () => (stringValue ? findEntityById(vaultIndex, stringValue) : undefined),
    [stringValue, vaultIndex],
  );
  const items = useMemo(
    () => entityPickerItems(vaultIndex, property.targetTypes),
    [property.targetTypes, vaultIndex],
  );

  return (
    <div className="entity-ref-field">
      <button
        ref={anchorRef}
        type="button"
        className={`entity-ref-chip ${stringValue && !resolved ? "entity-ref-unresolved" : ""} ${stringValue ? "" : "entity-ref-empty"}`}
        onClick={() => !readOnly && setOpen((current) => !current)}
        disabled={readOnly}
        title={
          resolved
            ? `${resolved.name} (${resolved.path})`
            : stringValue
              ? `Unresolved id: ${stringValue}`
              : `Link a ${property.targetTypes?.join("/") || "entity"}`
        }
      >
        <Link2 size={12} aria-hidden="true" />
        <span className="entity-ref-chip-label">
          {resolved?.name ?? stringValue ?? ""}
          {!stringValue ? `Link ${property.targetTypes?.join("/") || "entity"}…` : null}
        </span>
      </button>
      {resolved && onOpenEntity ? (
        <button
          type="button"
          className="entity-ref-action"
          onClick={() => onOpenEntity(resolved.path)}
          title={`Open ${resolved.name}`}
        >
          <ExternalLink size={12} />
        </button>
      ) : null}
      {stringValue && !readOnly ? (
        <button
          type="button"
          className="entity-ref-action"
          onClick={() => onChange("")}
          title="Clear reference"
        >
          <X size={12} />
        </button>
      ) : null}
      <PickerPopover
        open={open}
        anchorRef={anchorRef}
        items={items}
        placeholder={`Search ${property.targetTypes?.join(", ") || "entities"}…`}
        emptyLabel="No matching entities"
        onSelect={(item) => onChange(item.id)}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
