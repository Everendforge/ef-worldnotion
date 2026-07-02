import YAML from "yaml";
import type { Taxonomy, TaxonomyType, ValidationFinding, VaultFile } from "../domain";

export const STARTER_TAXONOMY: Taxonomy = {
  specVersion: "0.1",
  types: {
    character: { label: "Character", description: "Person, creature, or viewpoint actor." },
    location: { label: "Location", description: "Place, region, settlement, or site." },
    organization: { label: "Organization", description: "Faction, institution, house, or guild." },
    event: { label: "Event", description: "Canon event or historical beat." },
    concept: { label: "Concept", description: "Idea, law, magic rule, or abstract note." },
    item: { label: "Item", description: "Object, relic, tool, or artifact." },
    world: { label: "World", description: "Top-level world entity." },
    cycle: { label: "Cycle", description: "Era, cycle, age, or repeated chronology." },
    universe: { label: "Universe", description: "Universe-level project container." },
    story: { label: "Story", description: "Narrative container." },
    arc: { label: "Arc", description: "Narrative arc." },
    scene: { label: "Scene", description: "Planning scene, not a runtime node." },
    quest: { label: "Quest", description: "Quest or objective chain." },
  },
};

export const PROPERTY_TYPES = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multiSelect",
  "entityRef",
  "entityRefList",
] as const;

const ALLOWED_PROPERTY_TYPES = new Set<string>(PROPERTY_TYPES);

function createFinding(
  code: ValidationFinding["code"],
  severity: ValidationFinding["severity"],
  message: string,
  file?: string,
  field?: string,
): ValidationFinding {
  return { code, severity, message, file, field };
}

export function parseLegacyTaxonomy(
  files: VaultFile[],
  findings: ValidationFinding[],
): Taxonomy | undefined {
  const taxonomyFile = files.find((file) => file.relativePath === ".everend/taxonomy.yaml");
  if (!taxonomyFile) {
    return undefined;
  }

  try {
    const parsed = YAML.parse(taxonomyFile.content) as Taxonomy | null;
    if (!parsed || typeof parsed !== "object") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          "Taxonomy manifest must contain a YAML object.",
          taxonomyFile.relativePath,
        ),
      );
      return undefined;
    }

    if (parsed.specVersion !== "0.1") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          'Taxonomy manifest must use specVersion "0.1".',
          taxonomyFile.relativePath,
          "specVersion",
        ),
      );
    }

    if (!parsed.types || typeof parsed.types !== "object") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          "Taxonomy manifest must define a types object.",
          taxonomyFile.relativePath,
          "types",
        ),
      );
    }

    Object.entries(parsed.types ?? {}).forEach(([typeName, typeDefinition]) => {
      if (!typeDefinition.label) {
        findings.push(
          createFinding(
            "missing_required_field",
            "error",
            `Taxonomy type "${typeName}" is missing label.`,
            taxonomyFile.relativePath,
            `types.${typeName}.label`,
          ),
        );
      }

      Object.entries(typeDefinition.properties ?? {}).forEach(
        ([propertyName, propertyDefinition]) => {
          if (!ALLOWED_PROPERTY_TYPES.has(propertyDefinition.type)) {
            findings.push(
              createFinding(
                "missing_required_field",
                "error",
                `Property "${propertyName}" uses unsupported type "${propertyDefinition.type}".`,
                taxonomyFile.relativePath,
                `types.${typeName}.properties.${propertyName}.type`,
              ),
            );
          }
        },
      );
    });

    return parsed;
  } catch (error) {
    findings.push(
      createFinding(
        "missing_required_field",
        "error",
        `Could not parse taxonomy manifest: ${error instanceof Error ? error.message : String(error)}`,
        taxonomyFile.relativePath,
      ),
    );
    return undefined;
  }
}

export function mergeWithStarterTaxonomy(taxonomy: Taxonomy | undefined): Taxonomy {
  return {
    specVersion: taxonomy?.specVersion ?? "0.1",
    types: {
      ...STARTER_TAXONOMY.types,
      ...(taxonomy?.types ?? {}),
    },
  };
}

export function taxonomyToYaml(taxonomy: Taxonomy): string {
  return YAML.stringify({
    specVersion: taxonomy.specVersion ?? "0.1",
    types: taxonomy.types,
  });
}

export function defaultTemplateForType(type: string): string {
  return `---
id: {{id}}
type: {{type}}
name: {{name}}
status: {{status}}
tags: []
---

# {{name}}

<!-- Default ${type} template. -->
`;
}

export function createTypeDefinition(type: string): TaxonomyType {
  const label = type
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return {
    label: label || type,
    description: "",
    properties: {},
  };
}
