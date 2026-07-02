import type { TaxonomyConfig, TagHierarchyNode } from "../editorTypes";
import type { Entity, ValidationFinding } from "../domain";

function createFinding(
  code: ValidationFinding["code"],
  severity: ValidationFinding["severity"],
  message: string,
  file?: string,
  field?: string,
): ValidationFinding {
  return { code, severity, message, file, field };
}

function collectDefinedTags(nodes: TagHierarchyNode[], tags = new Set<string>()) {
  nodes.forEach((node) => {
    tags.add(node.fullPath);
    collectDefinedTags(node.children, tags);
  });
  return tags;
}

export function validateAgainstTaxonomy(
  entity: Entity,
  taxonomyConfig: TaxonomyConfig | undefined,
  filePath: string,
): ValidationFinding[] {
  if (!taxonomyConfig) return [];

  const findings: ValidationFinding[] = [];

  if (entity.tags.length > 0 && !taxonomyConfig.tags.allowCustomTags) {
    const definedTags = collectDefinedTags(taxonomyConfig.tags.rootNodes);

    entity.tags.forEach((tag) => {
      if (!definedTags.has(tag)) {
        findings.push(
          createFinding(
            "undefined_tag",
            "warning",
            `Tag "${tag}" is not defined in taxonomy. Add it to the hierarchy or enable custom tags.`,
            filePath,
            "tags",
          ),
        );
      }
    });
  }

  const typeIds = new Set(taxonomyConfig.entityTypes.definitions.map((type) => type.id));
  if (!typeIds.has(entity.type) && !taxonomyConfig.entityTypes.allowCustomTypes) {
    const suggestion = taxonomyConfig.entityTypes.definitions
      .map((type) => type.id)
      .find((id) => id.includes(entity.type) || entity.type.includes(id));

    findings.push(
      createFinding(
        "undefined_entity_type",
        "warning",
        `Entity type "${entity.type}" is not defined in taxonomy.`,
        filePath,
        "type",
      ),
    );
    if (suggestion) {
      findings[findings.length - 1].suggestion = `Did you mean "${suggestion}"?`;
    }
  }

  const statusIds = new Set(taxonomyConfig.statuses.definitions.map((status) => status.id));
  if (!statusIds.has(entity.status) && !taxonomyConfig.statuses.allowCustomStatuses) {
    const suggestion = taxonomyConfig.statuses.definitions
      .map((status) => status.id)
      .find((id) => id.includes(entity.status) || entity.status.includes(id));

    findings.push(
      createFinding(
        "undefined_status",
        "warning",
        `Status "${entity.status}" is not defined in taxonomy.`,
        filePath,
        "status",
      ),
    );
    if (suggestion) {
      findings[findings.length - 1].suggestion = `Did you mean "${suggestion}"?`;
    }
  }

  const entityTypeDef = taxonomyConfig.entityTypes.definitions.find(
    (type) => type.id === entity.type,
  );
  if (entityTypeDef?.customFields) {
    entityTypeDef.customFields.forEach((fieldId) => {
      const fieldDef = taxonomyConfig.customFields.definitions.find(
        (field) => field.id === fieldId,
      );
      if (fieldDef?.required && !(fieldId in entity.customProperties)) {
        findings.push(
          createFinding(
            "invalid_custom_field",
            "warning",
            `Required field "${fieldDef.label}" (${fieldId}) is missing for entity type "${entityTypeDef.label}".`,
            filePath,
            fieldId,
          ),
        );
      }
    });
  }

  return findings;
}
