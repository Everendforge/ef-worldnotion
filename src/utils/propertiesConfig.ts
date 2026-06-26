import YAML from "yaml";
import type { CustomFieldDefinition, CustomFieldType, PropertiesConfig, PropertyDefinition } from "../editorTypes";
import { traversePropertyTree } from "./propertyTreeUtils";

export type VisiblePropertyDefinition = PropertyDefinition & { source: "base" | "custom" };

export type UnconfiguredProperty = {
  key: string;
  value: unknown;
  inferredType: CustomFieldType;
};

const BASE_FRONTMATTER_KEYS = ["id", "type", "name", "status", "tags", "aliases", "parentId", "childrenIds", "folder"];
export const SYSTEM_FRONTMATTER_KEYS = new Set(["folder"]);
export const NON_INSPECTOR_PROPERTY_IDS = new Set(["folder", "tags"]);

// System property comment for folder field
const FOLDER_SYSTEM_PROPERTY_COMMENT =
  "Don't delete; it's a WorldNotion system property: indicates whether this note corresponds to a folder.";

export function knownPropertyIds(config?: PropertiesConfig): Set<string> {
  const ids = new Set<string>(BASE_FRONTMATTER_KEYS);
  flattenPropertyDefinitions(config?.baseProperties?.definitions ?? []).forEach((property) => ids.add(property.id));
  flattenPropertyDefinitions(config?.customFields.definitions ?? []).forEach((property) => ids.add(property.id));
  return ids;
}

function uniqueInOrder(values: string[]): string[] {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function getTypeDefinition(config: PropertiesConfig | undefined, entityType: string | undefined) {
  return entityType ? config?.entityTypes.definitions.find((candidate) => candidate.id === entityType) : undefined;
}

export function listVisibleProperties(config?: PropertiesConfig, entityType?: string): VisiblePropertyDefinition[] {
  if (!config?.baseProperties) return [];
  const typeDefinition = getTypeDefinition(config, entityType);
  const baseVisible = typeDefinition?.visibleProperties?.length
    ? typeDefinition.visibleProperties
    : config.baseProperties.visibleByDefault ?? ["id", "name", "type", "status", "tags"];
  const customVisible = [
    ...(config.customFields.globalFields ?? []),
    ...(typeDefinition?.customFields ?? []),
  ];
  const visibleIds = new Set([...baseVisible, ...customVisible]);
  const order = uniqueInOrder([
    ...(typeDefinition?.propertyOrder ?? config.baseProperties.order ?? []),
    ...customVisible,
  ]);

  const properties: VisiblePropertyDefinition[] = [
    ...config.baseProperties.definitions.map((property) => ({ ...property, source: "base" as const })),
    ...config.customFields.definitions
      .filter((property) => !config.baseProperties?.definitions.some((baseProperty) => baseProperty.id === property.id))
      .map((property) => ({ ...property, source: "custom" as const })),
  ].filter(
    (property) =>
      visibleIds.has(property.id) &&
      !NON_INSPECTOR_PROPERTY_IDS.has(property.id) &&
      !("hidden" in property && property.hidden),
  );

  return properties.sort((first, second) => {
    const firstIndex = order.indexOf(first.id);
    const secondIndex = order.indexOf(second.id);
    if (firstIndex === -1 && secondIndex === -1) {
      return (first.label ?? first.id).localeCompare(second.label ?? second.id);
    }
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;
    return firstIndex - secondIndex;
  });
}

export function listAllProperties(config?: PropertiesConfig): VisiblePropertyDefinition[] {
  if (!config?.baseProperties) return [];
  return [
    ...flattenPropertyDefinitions(config.baseProperties.definitions).map((property) => ({ ...property, source: "base" as const })),
    ...flattenPropertyDefinitions(config.customFields.definitions)
      .filter((property) => !config.baseProperties?.definitions.some((baseProperty) => baseProperty.id === property.id))
      .map((property) => ({ ...property, source: "custom" as const })),
  ];
}

export function listInspectableProperties(config?: PropertiesConfig): VisiblePropertyDefinition[] {
  return listAllProperties(config).filter((property) => !NON_INSPECTOR_PROPERTY_IDS.has(property.id));
}

export function listUnconfiguredProperties(
  frontmatterData: Record<string, unknown>,
  config?: PropertiesConfig,
): UnconfiguredProperty[] {
  const knownIds = knownPropertyIds(config);
  return Object.entries(frontmatterData)
    .filter(([key]) => !knownIds.has(key))
    .map(([key, value]) => ({
      key,
      value,
      inferredType: inferPropertyType(value),
    }));
}

export function inferPropertyType(value: unknown): CustomFieldType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "multiselect";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  if (typeof value === "string" && /^https?:\/\//.test(value)) return "url";
  return "text";
}

export function inferPropertyDefinition(key: string, value: unknown): CustomFieldDefinition {
  const inferredType = inferPropertyType(value);
  const options =
    inferredType === "select" || inferredType === "multiselect"
      ? valuesToOptions(Array.isArray(value) ? value : [value])
      : undefined;
  return {
    id: key.trim() || sanitizePropertyId(labelFromPropertyId(key)),
    label: labelFromPropertyId(key),
    type: inferredType,
    required: false,
    ...(options?.length ? { options } : {}),
  };
}

export function addPropertyToConfig(config: PropertiesConfig, property: CustomFieldDefinition): PropertiesConfig {
  const existingDefinitions = config.customFields.definitions ?? [];
  const existingGlobalFields = config.customFields.globalFields ?? [];
  const nextDefinitions = existingDefinitions.some((candidate) => candidate.id === property.id)
    ? existingDefinitions.map((candidate) => (candidate.id === property.id ? property : candidate))
    : [...existingDefinitions, property];
  const nextGlobalFields = existingGlobalFields.includes(property.id)
    ? existingGlobalFields
    : [...existingGlobalFields, property.id];
  return {
    ...config,
    customFields: {
      ...config.customFields,
      definitions: nextDefinitions,
      globalFields: nextGlobalFields,
    },
  };
}

function mapPropertyDefinitions(
  definitions: PropertyDefinition[],
  propertyId: string,
  mapper: (property: PropertyDefinition) => PropertyDefinition,
): PropertyDefinition[] {
  return definitions.map((definition) => {
    if (definition.id === propertyId) return mapper(definition);
    if (definition.children?.length) {
      return {
        ...definition,
        children: mapPropertyDefinitions(definition.children, propertyId, mapper),
      };
    }
    return definition;
  });
}

function removePropertyDefinitions(definitions: PropertyDefinition[], propertyId: string): PropertyDefinition[] {
  return definitions
    .filter((definition) => definition.id !== propertyId)
    .map((definition) => ({
      ...definition,
      children: definition.children ? removePropertyDefinitions(definition.children, propertyId) : undefined,
    }));
}

function definitionTreeContains(definitions: PropertyDefinition[], propertyId: string): boolean {
  return flattenPropertyDefinitions(definitions).some((definition) => definition.id === propertyId);
}

function findDefinitionInTree(definitions: PropertyDefinition[], propertyId: string): PropertyDefinition | undefined {
  for (const definition of definitions) {
    if (definition.id === propertyId) return definition;
    if (definition.children?.length) {
      const child = findDefinitionInTree(definition.children, propertyId);
      if (child) return child;
    }
  }
  return undefined;
}

function expandPropertyOrderIds(config: PropertiesConfig | undefined, ids: string[]): string[] {
  const roots = [
    ...(config?.baseProperties?.definitions ?? []),
    ...(config?.customFields.definitions ?? []),
  ];
  return ids.flatMap((id) => {
    const definition = findDefinitionInTree(roots, id);
    if (!definition?.children?.length) return [id];
    return [id, ...flattenPropertyDefinitions(definition.children).map((child) => child.id)];
  });
}

function reorderSiblingDefinitions(
  definitions: PropertyDefinition[],
  draggedId: string,
  targetId: string,
): { definitions: PropertyDefinition[]; changed: boolean } {
  const siblingIds = definitions.map((definition) => definition.id);
  if (siblingIds.includes(draggedId) && siblingIds.includes(targetId)) {
    const withoutDragged = definitions.filter((definition) => definition.id !== draggedId);
    const dragged = definitions.find((definition) => definition.id === draggedId);
    const targetIndex = withoutDragged.findIndex((definition) => definition.id === targetId);
    if (!dragged || targetIndex === -1) return { definitions, changed: false };
    return {
      definitions: [
        ...withoutDragged.slice(0, targetIndex),
        dragged,
        ...withoutDragged.slice(targetIndex),
      ],
      changed: true,
    };
  }

  let changed = false;
  const nextDefinitions = definitions.map((definition) => {
    if (!definition.children?.length) return definition;
    const result = reorderSiblingDefinitions(definition.children, draggedId, targetId);
    if (!result.changed) return definition;
    changed = true;
    return { ...definition, children: result.definitions };
  });
  return { definitions: nextDefinitions, changed };
}

function ensureTypePropertyMembership(
  config: PropertiesConfig,
  entityType: string | undefined,
  propertyIds: string[],
): PropertiesConfig {
  const ids = uniqueInOrder(propertyIds.filter((id) => !NON_INSPECTOR_PROPERTY_IDS.has(id)));
  if (!entityType) {
    return {
      ...config,
      customFields: {
        ...config.customFields,
        globalFields: uniqueInOrder([...(config.customFields.globalFields ?? []), ...ids]),
      },
    };
  }

  return {
    ...config,
    entityTypes: {
      ...config.entityTypes,
      definitions: config.entityTypes.definitions.map((definition) => {
        if (definition.id !== entityType) return definition;
        return {
          ...definition,
          customFields: uniqueInOrder([...(definition.customFields ?? []), ...ids]),
          propertyOrder: uniqueInOrder([...(definition.propertyOrder ?? []), ...ids]),
        };
      }),
    },
  };
}

export function upsertInspectorProperty(
  config: PropertiesConfig,
  property: CustomFieldDefinition,
  entityType?: string,
  parentId?: string,
): PropertiesConfig {
  const customDefinitions = config.customFields.definitions ?? [];
  const baseDefinitions = config.baseProperties?.definitions ?? [];
  const existsInCustom = definitionTreeContains(customDefinitions, property.id);
  const existsInBase = definitionTreeContains(baseDefinitions, property.id);

  if (parentId) {
    const child = { ...property, children: property.children?.length ? property.children : undefined };
    let nextConfig = {
      ...config,
      customFields: {
        ...config.customFields,
        definitions: removePropertyDefinitions(customDefinitions, property.id) as CustomFieldDefinition[],
      },
      baseProperties: config.baseProperties
        ? {
            ...config.baseProperties,
            definitions: removePropertyDefinitions(baseDefinitions, property.id) as typeof baseDefinitions,
          }
        : config.baseProperties,
    };

    const parentInCustom = definitionTreeContains(nextConfig.customFields.definitions, parentId);
    if (parentInCustom) {
      nextConfig = {
        ...nextConfig,
        customFields: {
          ...nextConfig.customFields,
          definitions: mapPropertyDefinitions(nextConfig.customFields.definitions, parentId, (parent) => ({
            ...parent,
            children: [
              ...(parent.children ?? []).filter((candidate) => candidate.id !== property.id),
              child,
            ],
          })) as CustomFieldDefinition[],
        },
      };
    } else if (nextConfig.baseProperties && definitionTreeContains(nextConfig.baseProperties.definitions, parentId)) {
      nextConfig = {
        ...nextConfig,
        baseProperties: {
          ...nextConfig.baseProperties,
          definitions: mapPropertyDefinitions(nextConfig.baseProperties.definitions, parentId, (parent) => ({
            ...parent,
            children: [
              ...(parent.children ?? []).filter((candidate) => candidate.id !== property.id),
              child,
            ],
          })) as typeof nextConfig.baseProperties.definitions,
        },
      };
    }

    return ensureTypePropertyMembership(nextConfig, entityType, [parentId, property.id]);
  }

  const nextDefinitions = existsInCustom
    ? mapPropertyDefinitions(customDefinitions, property.id, () => property) as CustomFieldDefinition[]
    : [...customDefinitions, property];

  if (existsInBase && config.baseProperties) {
    return ensureTypePropertyMembership(
      {
        ...config,
        baseProperties: {
          ...config.baseProperties,
          definitions: mapPropertyDefinitions(baseDefinitions, property.id, () => property) as typeof config.baseProperties.definitions,
        },
      },
      entityType,
      [property.id],
    );
  }

  return ensureTypePropertyMembership(
    {
      ...config,
      customFields: {
        ...config.customFields,
        definitions: nextDefinitions,
      },
    },
    entityType,
    [property.id],
  );
}

export function removeInspectorProperty(config: PropertiesConfig, propertyId: string): PropertiesConfig {
  const nextOrder = (config.baseProperties?.order ?? []).filter((id) => id !== propertyId);
  return {
    ...config,
    baseProperties: config.baseProperties
      ? {
          ...config.baseProperties,
          order: nextOrder,
          visibleByDefault: (config.baseProperties.visibleByDefault ?? []).filter((id) => id !== propertyId),
          definitions: removePropertyDefinitions(config.baseProperties.definitions, propertyId) as typeof config.baseProperties.definitions,
        }
      : config.baseProperties,
    customFields: {
      ...config.customFields,
      definitions: removePropertyDefinitions(config.customFields.definitions, propertyId) as CustomFieldDefinition[],
      globalFields: (config.customFields.globalFields ?? []).filter((id) => id !== propertyId),
    },
    entityTypes: {
      ...config.entityTypes,
      definitions: config.entityTypes.definitions.map((definition) => ({
        ...definition,
        customFields: (definition.customFields ?? []).filter((id) => id !== propertyId),
        visibleProperties: definition.visibleProperties?.filter((id) => id !== propertyId),
        propertyOrder: definition.propertyOrder?.filter((id) => id !== propertyId),
      })),
    },
  };
}

export function reorderInspectorPropertySiblings(
  config: PropertiesConfig,
  entityType: string | undefined,
  draggedId: string,
  targetId: string,
): PropertiesConfig {
  const customResult = reorderSiblingDefinitions(config.customFields.definitions, draggedId, targetId);
  const baseResult = config.baseProperties
    ? reorderSiblingDefinitions(config.baseProperties.definitions, draggedId, targetId)
    : { definitions: [], changed: false };

  if (customResult.changed || baseResult.changed) {
    return {
      ...config,
      customFields: {
        ...config.customFields,
        definitions: customResult.definitions as CustomFieldDefinition[],
      },
      baseProperties: config.baseProperties
        ? {
            ...config.baseProperties,
            definitions: baseResult.changed ? baseResult.definitions as typeof config.baseProperties.definitions : config.baseProperties.definitions,
          }
        : config.baseProperties,
    };
  }

  const currentOrder = getConfiguredPropertyOrder(config, entityType);
  const withoutDragged = currentOrder.filter((id) => id !== draggedId);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex === -1) return config;
  withoutDragged.splice(targetIndex, 0, draggedId);
  return reorderPropertiesConfig(config, entityType, withoutDragged);
}

export function parseFrontmatterRaw(frontmatterRaw: string): Record<string, unknown> {
  const trimmed = frontmatterRaw.trim();
  if (!trimmed.startsWith("---")) return {};
  const body = trimmed.replace(/^---\s*/, "").replace(/\s*---$/, "");
  try {
    const parsed = YAML.parse(body) as Record<string, unknown> | null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function frontmatterDataToRaw(data: Record<string, unknown>): string {
  return `---\n${YAML.stringify(data)}---`;
}

export function getConfiguredFrontmatterOrder(
  config: PropertiesConfig | undefined,
  entityType: string | undefined,
  frontmatterKeys: string[],
): string[] {
  const keys = new Set(frontmatterKeys);
  const typeDefinition = getTypeDefinition(config, entityType);
  const configuredOrder = uniqueInOrder([
    "folder",
    ...expandPropertyOrderIds(config, typeDefinition?.propertyOrder ?? config?.baseProperties?.order ?? []),
    ...(flattenPropertyDefinitions(config?.baseProperties?.definitions ?? []).map((property) => property.id)),
    ...(config?.customFields.globalFields ?? []),
    ...expandPropertyOrderIds(config, typeDefinition?.customFields ?? []),
    ...(flattenPropertyDefinitions(config?.customFields.definitions ?? []).map((property) => property.id)),
  ]);

  const ordered = configuredOrder.filter((key) => keys.has(key));
  const remaining = frontmatterKeys.filter((key) => !ordered.includes(key));
  return [...ordered, ...remaining];
}

export function flattenPropertyDefinitions(definitions: PropertyDefinition[]): PropertyDefinition[] {
  const flattened: PropertyDefinition[] = [];
  traversePropertyTree(definitions, (definition) => {
    flattened.push(definition);
  });
  return flattened;
}

export function getConfiguredPropertyOrder(config: PropertiesConfig | undefined, entityType?: string): string[] {
  const allIds = listInspectableProperties(config).map((property) => property.id);
  return getConfiguredFrontmatterOrder(config, entityType, allIds).filter((id) => !NON_INSPECTOR_PROPERTY_IDS.has(id));
}

export function reorderPropertiesConfig(
  config: PropertiesConfig,
  entityType: string | undefined,
  orderedIds: string[],
): PropertiesConfig {
  if (!config.baseProperties) return config;
  const sanitizedOrder = uniqueInOrder(orderedIds.filter((id) => !NON_INSPECTOR_PROPERTY_IDS.has(id)));
  return {
    ...config,
    baseProperties: {
      ...config.baseProperties,
      order: sanitizedOrder,
    },
    entityTypes: {
      ...config.entityTypes,
      definitions: config.entityTypes.definitions.map((definition) =>
        entityType && definition.id === entityType
          ? {
              ...definition,
              propertyOrder: sanitizedOrder,
            }
          : definition,
      ),
    },
  };
}

export function updateFrontmatterProperties(
  frontmatterRaw: string,
  updates: Record<string, unknown>,
  config?: PropertiesConfig,
  entityType?: string,
): string {
  const data = parseFrontmatterRaw(frontmatterRaw);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) {
      delete data[key];
    } else {
      data[key] = value;
    }
  });
  const nextOrder = getConfiguredFrontmatterOrder(config, entityType, Object.keys(data));
  return reorderFrontmatter(frontmatterDataToRaw(data), nextOrder);
}

export function removeFrontmatterProperty(
  frontmatterRaw: string,
  key: string,
  config?: PropertiesConfig,
  entityType?: string,
): string {
  const data = parseFrontmatterRaw(frontmatterRaw);
  delete data[key];
  const nextOrder = getConfiguredFrontmatterOrder(config, entityType, Object.keys(data));
  return reorderFrontmatter(frontmatterDataToRaw(data), nextOrder);
}

export function adaptFrontmatterProperty(
  frontmatterRaw: string,
  fromKey: string,
  toKey: string,
  config?: PropertiesConfig,
  entityType?: string,
): string {
  const data = parseFrontmatterRaw(frontmatterRaw);
  if (!(fromKey in data)) return frontmatterRaw;
  data[toKey] = data[fromKey];
  delete data[fromKey];
  const nextOrder = getConfiguredFrontmatterOrder(config, entityType, Object.keys(data));
  return reorderFrontmatter(frontmatterDataToRaw(data), nextOrder);
}

/**
 * Reorders frontmatter fields according to expected order
 * Ensures folder field always has its system property comment
 * @param frontmatterRaw The raw YAML frontmatter string
 * @param expectedOrder Array of field keys in desired order
 * @returns Reordered frontmatter string with folder comment preserved/added
 */
export function reorderFrontmatter(frontmatterRaw: string, expectedOrder: string[]): string {
  const data = parseFrontmatterRaw(frontmatterRaw);
  const reordered: Record<string, unknown> = {};
  
  // Add fields in expected order
  expectedOrder.forEach((key) => {
    if (key in data) {
      reordered[key] = data[key];
    }
  });
  
  // Add any remaining fields not in expected order
  Object.entries(data).forEach(([key, value]) => {
    if (!(key in reordered)) {
      reordered[key] = value;
    }
  });
  
  let result = frontmatterDataToRaw(reordered);
  
  // Ensure folder field has system property comment if it exists
  if ("folder" in reordered && reordered.folder) {
    const folderValue = reordered.folder;
    const yamlScalarValue = typeof folderValue === "string" && /^[A-Za-z0-9 _.-]+$/.test(folderValue) 
      ? folderValue 
      : JSON.stringify(folderValue);
    
    // Replace folder line with commented version
    const folderLineRegex = /^folder:\s*.+?(?=\n|$)/m;
    result = result.replace(folderLineRegex, `folder: ${yamlScalarValue} # ${FOLDER_SYSTEM_PROPERTY_COMMENT}`);
  }
  
  return result;
}

export function sanitizePropertyId(value: string): string {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function labelFromPropertyId(value: string): string {
  const normalized = value
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Property";
}

export function valuesToOptions(values: unknown[]) {
  return values
    .filter((value): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value))
    .map((value) => {
      const label = String(value);
      return { value: sanitizePropertyId(label) || label, label };
    });
}

export function propertyUsesOptions(type: CustomFieldType) {
  return type === "select" || type === "multiselect";
}
