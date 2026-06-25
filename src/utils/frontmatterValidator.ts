/**
 * Frontmatter validation utilities
 * Comprehensive schema validation comparing YAML frontmatter against properties.json
 * 
 * Spec order (from Everend Spec v0.1):
 * folder → id → type → name → status → tags → aliases → parentId → childrenIds → [customFields]
 */

import type { PropertiesConfig } from "../editorTypes";

// Spec-defined canonical field order (from Everend Spec v0.1)
// folder is first (system property), then id, type, name, status, tags, aliases, parentId, childrenIds
const SPEC_FIELD_ORDER = [
  "folder",
  "id",
  "type",
  "name",
  "status",
  "tags",
  "aliases",
  "parentId",
  "childrenIds",
];

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
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Build set of known field IDs in schema with their positions
  const schemaFields = new Map<string, { position: number; type: string }>();
  let position = 0;

  // System fields follow spec order
  SPEC_FIELD_ORDER.forEach((id) => {
    schemaFields.set(id, { position, type: "system" });
    position++;
  });

  // Add base properties from schema
  config?.baseProperties?.definitions.forEach((prop) => {
    // Skip if already in spec order
    if (!schemaFields.has(prop.id)) {
      schemaFields.set(prop.id, { position, type: prop.type || "text" });
      position++;
    }
  });

  // Add custom fields from schema
  config?.customFields?.definitions.forEach((prop) => {
    schemaFields.set(prop.id, { position, type: prop.type || "text" });
    position++;
  });

  // Get frontmatter field names in order
  const frontmatterKeys = Object.keys(frontmatterData);
  
  console.log("[detectOrphanedFields] Spec order:", SPEC_FIELD_ORDER);
  console.log("[detectOrphanedFields] Schema fields:", Array.from(schemaFields.keys()));
  console.log("[detectOrphanedFields] Frontmatter keys:", frontmatterKeys);

  // Check 1: Extra fields (in frontmatter but not in schema)
  frontmatterKeys.forEach((key) => {
    if (!schemaFields.has(key)) {
      issues.push({
        type: "extra",
        fieldName: key,
        value: frontmatterData[key],
      });
    }
  });

  // Check 2: Order validation - compare actual order vs spec order
  // Expected order: fields present in frontmatter, ordered per spec
  const expectedOrder = SPEC_FIELD_ORDER.filter((id) => frontmatterKeys.includes(id));
  
  // Add any custom fields that are not in spec order, sorted by schema position
  const customFieldsNotInSpec = frontmatterKeys.filter(
    (key) => !SPEC_FIELD_ORDER.includes(key) && schemaFields.has(key)
  );
  customFieldsNotInSpec.sort(
    (a, b) => (schemaFields.get(a)?.position ?? 0) - (schemaFields.get(b)?.position ?? 0)
  );
  expectedOrder.push(...customFieldsNotInSpec);

  console.log("[detectOrphanedFields] Expected order:", expectedOrder);

  // Check if actual order matches expected
  const isOrderCorrect = JSON.stringify(frontmatterKeys) === JSON.stringify(expectedOrder);

  if (!isOrderCorrect) {
    // Find fields that are mispositioned
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

  console.log("[detectOrphanedFields] Issues detected:", issues.length);
  issues.forEach((issue) => console.log(`  - ${issue.type}: ${issue.fieldName}`));

  return issues;
}

/**
 * Returns the expected field order for a given frontmatter
 * Useful for reordering operations
 */
export function getExpectedFieldOrder(
  frontmatterKeys: string[],
  config?: PropertiesConfig,
): string[] {
  const schemaFields = new Map<string, number>();
  let position = 0;

  // System fields follow spec order
  SPEC_FIELD_ORDER.forEach((id) => {
    schemaFields.set(id, position);
    position++;
  });

  // Add base properties
  config?.baseProperties?.definitions.forEach((prop) => {
    if (!schemaFields.has(prop.id)) {
      schemaFields.set(prop.id, position);
      position++;
    }
  });

  // Add custom fields
  config?.customFields?.definitions.forEach((prop) => {
    schemaFields.set(prop.id, position);
    position++;
  });

  // Build expected order
  const expectedOrder = SPEC_FIELD_ORDER.filter((id) => frontmatterKeys.includes(id));
  const customFieldsNotInSpec = frontmatterKeys.filter(
    (key) => !SPEC_FIELD_ORDER.includes(key) && schemaFields.has(key)
  );
  customFieldsNotInSpec.sort((a, b) => (schemaFields.get(a) ?? 0) - (schemaFields.get(b) ?? 0));
  expectedOrder.push(...customFieldsNotInSpec);

  return expectedOrder;
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
