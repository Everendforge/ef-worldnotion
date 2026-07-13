import type { PropertiesConfig, PropertyDefinition } from "../editorTypes";
import {
  conditionIsActive,
  getConfiguredFrontmatterOrder,
  knownPropertyIds,
  listVisibleProperties,
  NON_INSPECTOR_PROPERTY_IDS,
} from "./propertiesConfig";

export interface ValidationIssue {
  type: "missing" | "extra" | "misorder";
  fieldName: string;
  value?: unknown;
  expectedPosition?: number;
  actualPosition?: number;
  expectedType?: string;
}

/** Core Everend base fields every note's frontmatter is expected to carry. */
const CORE_FRONTMATTER_FIELDS = ["id", "type", "name", "status", "tags", "aliases"];

const CORE_FIELD_TYPES: Record<string, string> = {
  id: "text",
  type: "select",
  name: "text",
  status: "select",
  tags: "multiselect",
  aliases: "multiselect",
};

/**
 * Lists schema fields that should exist in the frontmatter but do not:
 * the Everend core fields plus visible-for-type leaves that are required or
 * carry a default value. Conditional fields are only reported when their
 * visibleWhen condition holds for the note's current values.
 */
export function listMissingPropertyFields(
  frontmatterData: Record<string, unknown>,
  config?: PropertiesConfig,
  entityType?: string,
): ValidationIssue[] {
  const missing: ValidationIssue[] = [];
  CORE_FRONTMATTER_FIELDS.forEach((fieldName) => {
    if (fieldName in frontmatterData) return;
    missing.push({
      type: "missing",
      fieldName,
      expectedType: CORE_FIELD_TYPES[fieldName] ?? "text",
    });
  });

  if (!config?.baseProperties) return missing;

  const values: Record<string, unknown> = { type: entityType, ...frontmatterData };
  const visit = (property: PropertyDefinition) => {
    if (!conditionIsActive(property, values)) return;
    if (
      property.type !== "group" &&
      !(property.id in frontmatterData) &&
      !CORE_FRONTMATTER_FIELDS.includes(property.id) &&
      !NON_INSPECTOR_PROPERTY_IDS.has(property.id) &&
      (property.required || property.defaultValue !== undefined)
    ) {
      missing.push({ type: "missing", fieldName: property.id, expectedType: property.type });
    }
    property.children?.forEach(visit);
  };
  listVisibleProperties(config, entityType).forEach(visit);
  return missing;
}

/**
 * Detects schema validation issues:
 * - extra fields not in schema
 * - fields in wrong order (per Everend Spec v0.1)
 * - missing required base properties
 *
 * @param frontmatterData Parsed YAML data
 * @param config Properties schema
 * @returns Array of validation issues
 */
export function detectOrphanedFields(
  frontmatterData: Record<string, unknown>,
  config?: PropertiesConfig,
  entityType?: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const knownIds = knownPropertyIds(config);
  const frontmatterKeys = Object.keys(frontmatterData);

  frontmatterKeys.forEach((key) => {
    if (!knownIds.has(key) && !NON_INSPECTOR_PROPERTY_IDS.has(key)) {
      issues.push({
        type: "extra",
        fieldName: key,
        value: frontmatterData[key],
      });
    }
  });

  const expectedOrder = getConfiguredFrontmatterOrder(config, entityType, frontmatterKeys);
  const isOrderCorrect =
    frontmatterKeys.length === expectedOrder.length &&
    frontmatterKeys.every((key, index) => key === expectedOrder[index]);

  if (!isOrderCorrect) {
    frontmatterKeys.forEach((key, actualPos) => {
      const expectedPos = expectedOrder.indexOf(key);
      if (expectedPos !== actualPos) {
        issues.push({
          type: "misorder",
          fieldName: key,
          actualPosition: actualPos,
          expectedPosition: expectedPos,
        });
      }
    });
  }

  issues.push(...listMissingPropertyFields(frontmatterData, config, entityType));

  return issues;
}

/**
 * Returns the expected field order for a given frontmatter
 * Useful for reordering operations
 */
export function getExpectedFieldOrder(
  frontmatterKeys: string[],
  config?: PropertiesConfig,
  entityType?: string,
): string[] {
  return getConfiguredFrontmatterOrder(config, entityType, frontmatterKeys);
}

/**
 * Infers the type of a value for schema definition
 * @param value The value to infer type from
 * @returns A type string ("string", "number", "boolean", "array")
 */
export function inferValueType(value: unknown): string {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "array";
  return "string";
}
