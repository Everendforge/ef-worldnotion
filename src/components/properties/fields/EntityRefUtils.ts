import type { Entity, VaultIndex } from "../../../domain";
import type { PickerItem } from "../PickerPopover";

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

export function parseEntityRef(value: string): { entityId: string; variantId?: string } {
  const parts = value.split("@");
  return {
    entityId: parts[0] ?? "",
    variantId: parts[1],
  };
}

export function buildEntityRef(entityId: string, variantId?: string): string {
  return variantId ? `${entityId}@${variantId}` : entityId;
}

export function entityRefDisplayLabel(vaultIndex: VaultIndex, refValue: string): string {
  const { entityId, variantId } = parseEntityRef(refValue);
  const entity = findEntityById(vaultIndex, entityId);
  if (!entity) return refValue;
  if (!variantId) return entity.name || entity.id;

  const variant = entity.variants?.find((candidate) => candidate.id === variantId);
  return variant?.label || `${entity.name || entity.id} @ ${variantId}`;
}
