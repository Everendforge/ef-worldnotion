/**
 * Serialization and migration utilities for property configurations.
 * Handles saving/loading properties.json and explicit migrations between versions.
 */

import { PropertiesConfig, PropertyDefinition, CustomFieldDefinition } from "../editorTypes";
import { migrateV1toV2, flattenPropertyTree } from "./propertyTreeUtils";
import { validatePropertyStructure, ValidationResult } from "./propertyValidator";
import { validateEntityPresentations } from "./entityPresentation";

export const CURRENT_PROPERTIES_VERSION = "3.0";
const V2_VERSION = "2.0";
const V1_VERSION = "1.0";

/**
 * Serialize property configuration to JSON string.
 */
export function serializePropertiesConfig(config: PropertiesConfig): string {
  // Ensure version is set
  const configWithVersion: PropertiesConfig = {
    ...config,
    version: config.version || CURRENT_PROPERTIES_VERSION,
  };

  return JSON.stringify(configWithVersion, null, 2);
}

/**
 * Deserialize JSON string to PropertiesConfig.
 * Automatically normalizes v1.0 to the legacy hierarchical 2.0 model. Version
 * 2.0 is deliberately not upgraded here: 3.0 changes YAML storage paths and
 * therefore requires a vault-wide preview and explicit confirmation.
 */
export function deserializePropertiesConfig(jsonString: string): {
  config: PropertiesConfig;
  migrated: boolean;
  validation: ValidationResult;
} {
  let config: PropertiesConfig;

  try {
    config = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Failed to parse properties.json: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  // Detect version
  const version = config.version || V1_VERSION;
  let migrated = false;

  // Migrate if needed
  if (version === V1_VERSION || !version) {
    config = migratePropertiesV1toV2(config);
    migrated = true;
  }

  // Validate structure
  const validation = validatePropertiesConfig(config);

  return { config, migrated, validation };
}

export function validatePropertiesConfig(config: PropertiesConfig): ValidationResult {
  const roots: PropertyDefinition[] = [
    ...(config.baseProperties?.definitions ?? []),
    ...(config.customFields.definitions ?? []),
  ];
  const validation = validatePropertyStructure(roots);
  if (config.version !== CURRENT_PROPERTIES_VERSION) return validation;
  const allTypes = new Set(config.entityTypes.definitions.map((definition) => definition.id));
  const visit = (definitions: PropertyDefinition[], parentScope?: string[]) => {
    definitions.forEach((definition) => {
      if (definition.visibleWhen && "type" in definition.visibleWhen) {
        validation.errors.push({
          type: "invalid-configuration",
          propertyId: definition.id,
          message: "Use appliesTo instead of visibleWhen.type in properties 3.0.",
        });
      }
      const scope = definition.appliesTo ?? parentScope;
      definition.appliesTo?.forEach((typeId) => {
        if (!allTypes.has(typeId)) {
          validation.errors.push({
            type: "invalid-configuration",
            propertyId: definition.id,
            message: `Unknown entity type in appliesTo: ${typeId}`,
          });
        }
        if (parentScope && !parentScope.includes(typeId)) {
          validation.errors.push({
            type: "invalid-configuration",
            propertyId: definition.id,
            message: `Child scope must be a subset of its parent scope: ${typeId}`,
          });
        }
      });
      if (definition.type !== "group" && definition.children?.length) {
        validation.errors.push({
          type: "invalid-configuration",
          propertyId: definition.id,
          message: "Only group properties may contain children in properties 3.0.",
        });
      }
      if (definition.type === "group" && definition.defaultValue !== undefined) {
        validation.errors.push({
          type: "invalid-configuration",
          propertyId: definition.id,
          message: "Groups cannot have scalar default values.",
        });
      }
      if (definition.children?.length) visit(definition.children, scope);
    });
  };
  visit(roots, [...allTypes]);
  validateEntityPresentations(config).forEach((issue) => {
    validation.errors.push({
      type: "invalid-configuration",
      propertyId: issue.propertyId,
      message: issue.message,
    });
  });
  validation.valid = validation.errors.length === 0;
  return validation;
}

/**
 * Migrate properties from v1.0 (flat) to v2.0 (hierarchical).
 * v1.0: Properties are flat with no children or visibleWhen
 * v2.0: Properties can have nested children and conditional visibility
 *
 * Migration strategy:
 * - Add empty children array to each property
 * - Add optional visibleWhen/group fields (empty by default)
 * - Update version to 2.0
 * - Keep all other fields intact
 */
export function migratePropertiesV1toV2(config: PropertiesConfig): PropertiesConfig {
  const migratedConfig: PropertiesConfig = {
    ...config,
    version: V2_VERSION,
  };

  // Migrate customFields definitions
  if (migratedConfig.customFields?.definitions) {
    migratedConfig.customFields.definitions = migrateV1toV2(
      migratedConfig.customFields.definitions,
    ) as CustomFieldDefinition[];
  }

  // Migrate baseProperties if exists
  if (migratedConfig.baseProperties?.definitions) {
    migratedConfig.baseProperties.definitions = migrateV1toV2(
      migratedConfig.baseProperties.definitions,
    ) as any;
  }

  return migratedConfig;
}

function sameScope(first: readonly string[], second: readonly string[]) {
  return first.length === second.length && first.every((value) => second.includes(value));
}

function legacyScopeForProperty(
  config: PropertiesConfig,
  property: PropertyDefinition,
): string[] | undefined {
  const typeCondition = property.visibleWhen?.type;
  if (typeCondition?.length) return [...typeCondition];

  const isGlobal =
    config.customFields.globalFields?.includes(property.id) ||
    config.baseProperties?.visibleByDefault?.includes(property.id);
  const scope = config.entityTypes.definitions
    .filter((type) => {
      if (type.hiddenProperties?.includes(property.id)) return false;
      return (
        isGlobal ||
        type.customFields?.includes(property.id) ||
        type.visibleProperties?.includes(property.id)
      );
    })
    .map((type) => type.id);
  return scope.length ? scope : undefined;
}

/** Convert only the schema. Note values must be moved by the migration planner. */
export function upgradePropertiesConfigToV3(config: PropertiesConfig): PropertiesConfig {
  if (config.version === CURRENT_PROPERTIES_VERSION) return config;
  const allTypes = config.entityTypes.definitions.map((definition) => definition.id);

  function upgradeDefinitions(
    definitions: PropertyDefinition[],
    inheritedScope: string[] = allTypes,
  ): PropertyDefinition[] {
    return definitions.map((definition) => {
      const explicitScope = legacyScopeForProperty(config, definition);
      const scope = explicitScope ?? inheritedScope;
      const { type: _legacyType, ...visibleWhen } = definition.visibleWhen ?? {};
      const children = definition.children?.length
        ? upgradeDefinitions(definition.children, scope)
        : undefined;
      return {
        ...definition,
        ...(sameScope(scope, inheritedScope) ? {} : { appliesTo: scope }),
        ...(Object.keys(visibleWhen).length ? { visibleWhen } : { visibleWhen: undefined }),
        ...(children ? { children } : {}),
      } as PropertyDefinition;
    });
  }

  function normalizeScopes(
    definitions: PropertyDefinition[],
    inheritedScope: string[] = allTypes,
  ): Array<{ definition: PropertyDefinition; effectiveScope: string[] }> {
    return definitions.map((definition) => {
      const initialScope = definition.appliesTo ?? inheritedScope;
      const normalizedChildren = normalizeScopes(definition.children ?? [], initialScope);
      const effectiveScope =
        definition.type === "group"
          ? uniqueScope([
              ...initialScope,
              ...normalizedChildren.flatMap((child) => child.effectiveScope),
            ])
          : initialScope;
      const children = normalizedChildren.map((child) => ({
        ...child.definition,
        appliesTo: sameScope(child.effectiveScope, effectiveScope)
          ? undefined
          : child.effectiveScope,
      }));
      return {
        effectiveScope,
        definition: {
          ...definition,
          appliesTo: sameScope(effectiveScope, inheritedScope) ? undefined : effectiveScope,
          ...(definition.type === "group" ? { children } : {}),
        },
      };
    });
  }

  const upgradedBase = upgradeDefinitions(config.baseProperties?.definitions ?? []);
  const upgradedCustom = upgradeDefinitions(config.customFields.definitions);

  return {
    ...config,
    version: CURRENT_PROPERTIES_VERSION,
    baseProperties: config.baseProperties
      ? {
          ...config.baseProperties,
          definitions: normalizeScopes(upgradedBase).map(
            (entry) => entry.definition,
          ) as typeof config.baseProperties.definitions,
        }
      : config.baseProperties,
    customFields: {
      ...config.customFields,
      definitions: normalizeScopes(upgradedCustom).map(
        (entry) => entry.definition,
      ) as CustomFieldDefinition[],
    },
  };
}

function uniqueScope(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

/**
 * Export properties to a template file (just the customFields definitions).
 */
export function exportPropertiesTemplate(
  definitions: PropertyDefinition[],
  templateName: string,
  description?: string,
): string {
  const template = {
    version: CURRENT_PROPERTIES_VERSION,
    name: templateName,
    description: description || "",
    exportedAt: new Date().toISOString(),
    definitions,
  };

  return JSON.stringify(template, null, 2);
}

/**
 * Import properties from a template file.
 */
export function importPropertiesTemplate(jsonString: string): {
  name?: string;
  description?: string;
  definitions: PropertyDefinition[];
  validation: ValidationResult;
} {
  let template: {
    version?: string;
    name?: string;
    description?: string;
    definitions: PropertyDefinition[];
  };

  try {
    template = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(
      `Failed to parse template: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (!template.definitions || !Array.isArray(template.definitions)) {
    throw new Error("Invalid template: missing definitions array");
  }

  // Migrate if template is v1.0
  const definitions =
    template.version === V1_VERSION ? migrateV1toV2(template.definitions) : template.definitions;

  // Validate imported structure
  const validation = validatePropertyStructure(definitions);

  return {
    name: template.name,
    description: template.description,
    definitions,
    validation,
  };
}

/**
 * Merge imported template properties with existing ones.
 * Strategy: Add imported properties as siblings (not merged into existing).
 * If property ID already exists, skip or append suffix based on strategy.
 */
export function mergePropertyTemplates(
  existing: PropertyDefinition[],
  imported: PropertyDefinition[],
  strategy: "skip-existing" | "rename-new" | "replace" = "skip-existing",
): PropertyDefinition[] {
  const existingIds = new Set(flattenPropertyTree(existing).map((n) => n.definition.id));
  const result = [...existing];

  for (const importedProp of imported) {
    if (existingIds.has(importedProp.id)) {
      if (strategy === "skip-existing") {
        // Skip this property
        continue;
      } else if (strategy === "rename-new") {
        // Rename imported property
        const newId = generateUniquePropertyId(importedProp.id, existingIds);
        result.push({ ...importedProp, id: newId });
        existingIds.add(newId);
      } else if (strategy === "replace") {
        // Replace existing
        const index = result.findIndex((p) => p.id === importedProp.id);
        if (index !== -1) {
          result[index] = importedProp;
        }
      }
    } else {
      // Property doesn't exist, add it
      result.push(importedProp);
      existingIds.add(importedProp.id);
    }
  }

  return result;
}

/**
 * Generate a unique property ID by appending suffix.
 */
function generateUniquePropertyId(baseId: string, existingIds: Set<string>): string {
  let counter = 1;
  let newId = `${baseId}-${counter}`;

  while (existingIds.has(newId)) {
    counter++;
    newId = `${baseId}-${counter}`;
  }

  return newId;
}

/**
 * Clean up properties JSON: remove empty arrays/objects, fix formatting.
 */
export function cleanupPropertiesConfig(config: PropertiesConfig): PropertiesConfig {
  const cleaned = JSON.parse(JSON.stringify(config)); // Deep clone

  // Remove empty children arrays
  function cleanChildren(defs: PropertyDefinition[]): void {
    defs.forEach((def) => {
      if (def.type !== "group" && def.children && def.children.length === 0) {
        delete (def as any).children;
      } else if (def.children) {
        cleanChildren(def.children);
      }

      // Remove empty visibleWhen
      if (def.visibleWhen && Object.keys(def.visibleWhen).length === 0) {
        delete (def as any).visibleWhen;
      }

      // Remove undefined group
      if (def.group === undefined || def.group === "") {
        delete (def as any).group;
      }
    });
  }

  if (cleaned.customFields?.definitions) {
    cleanChildren(cleaned.customFields.definitions);
  }

  if (cleaned.baseProperties?.definitions) {
    cleanChildren(cleaned.baseProperties.definitions);
  }

  return cleaned;
}

/**
 * Add a new custom field to the properties schema.
 * If field already exists, replaces it.
 * Automatically infers type from value.
 * @param config Current properties configuration
 * @param fieldName Name/ID of the field
 * @param inferredType Type of the field ("string", "number", "boolean", "array")
 * @returns Updated config with new custom field
 */
export function addCustomFieldToSchema(
  config: PropertiesConfig,
  fieldName: string,
  inferredType: string,
): PropertiesConfig {
  // Normalize field name
  const id = fieldName.trim() || fieldName;
  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, " $1");

  // Create new custom field definition
  const newField: CustomFieldDefinition = {
    id,
    label: label.trim(),
    type: (inferredType as any) || "text",
    required: false,
  };

  // Check if field already exists
  const existingDefinitions = config.customFields?.definitions ?? [];
  const existingIndex = existingDefinitions.findIndex((d) => d.id === id);

  let nextDefinitions: CustomFieldDefinition[];
  if (existingIndex !== -1) {
    // Replace existing
    nextDefinitions = existingDefinitions.map((d, i) => (i === existingIndex ? newField : d));
  } else {
    // Add new
    nextDefinitions = [...existingDefinitions, newField];
  }

  // Ensure field is in globalFields
  const existingGlobalFields = config.customFields?.globalFields ?? [];
  const nextGlobalFields = existingGlobalFields.includes(id)
    ? existingGlobalFields
    : [...existingGlobalFields, id];

  return {
    ...config,
    customFields: {
      ...config.customFields,
      definitions: nextDefinitions,
      globalFields: nextGlobalFields,
    },
  };
}

/**
 * Get summary statistics about property structure.
 */
export function getPropertyStructureStats(definitions: PropertyDefinition[]): {
  totalCount: number;
  rootCount: number;
  maxDepth: number;
  withChildren: number;
  withVisibleWhen: number;
  byType: Record<string, number>;
  byGroup: Record<string, number>;
} {
  const flat = flattenPropertyTree(definitions);
  const byType: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  let maxDepth = 0;
  let withChildren = 0;
  let withVisibleWhen = 0;

  flat.forEach((node) => {
    const def = node.definition;

    // Track type
    byType[def.type] = (byType[def.type] || 0) + 1;

    // Track group
    if (def.group) {
      byGroup[def.group] = (byGroup[def.group] || 0) + 1;
    }

    // Track max depth
    maxDepth = Math.max(maxDepth, node.depth);

    // Count with children/visibleWhen
    if (def.children && def.children.length > 0) {
      withChildren++;
    }
    if (def.visibleWhen && Object.keys(def.visibleWhen).length > 0) {
      withVisibleWhen++;
    }
  });

  return {
    totalCount: flat.length,
    rootCount: definitions.length,
    maxDepth,
    withChildren,
    withVisibleWhen,
    byType,
    byGroup,
  };
}

/**
 * Diff two property configurations to see what changed.
 */
export function diffPropertiesConfigs(
  oldConfig: PropertiesConfig,
  newConfig: PropertiesConfig,
): {
  added: PropertyDefinition[];
  removed: PropertyDefinition[];
  modified: Array<{ old: PropertyDefinition; new: PropertyDefinition }>;
} {
  const oldFlat = flattenPropertyTree(oldConfig.customFields?.definitions || []);
  const newFlat = flattenPropertyTree(newConfig.customFields?.definitions || []);

  const oldMap = new Map(oldFlat.map((n) => [n.definition.id, n.definition]));
  const newMap = new Map(newFlat.map((n) => [n.definition.id, n.definition]));

  const added: PropertyDefinition[] = [];
  const removed: PropertyDefinition[] = [];
  const modified: Array<{ old: PropertyDefinition; new: PropertyDefinition }> = [];

  // Find added and modified
  newFlat.forEach((node) => {
    const oldDef = oldMap.get(node.definition.id);
    if (!oldDef) {
      added.push(node.definition);
    } else if (JSON.stringify(oldDef) !== JSON.stringify(node.definition)) {
      modified.push({ old: oldDef, new: node.definition });
    }
  });

  // Find removed
  oldFlat.forEach((node) => {
    if (!newMap.has(node.definition.id)) {
      removed.push(node.definition);
    }
  });

  return { added, removed, modified };
}
