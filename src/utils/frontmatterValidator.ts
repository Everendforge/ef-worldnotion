import type { PropertiesConfig } from "../editorTypes";
import {
  getConfiguredFrontmatterOrder,
  knownPropertyIds,
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
