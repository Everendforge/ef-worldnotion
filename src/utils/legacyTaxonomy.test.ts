import { describe, expect, it } from "vitest";
import type { ValidationFinding, VaultFile } from "../domain";
import {
  createTypeDefinition,
  defaultTemplateForType,
  mergeWithStarterTaxonomy,
  parseLegacyTaxonomy,
  STARTER_TAXONOMY,
  taxonomyToYaml,
} from "./legacyTaxonomy";

describe("legacy taxonomy helpers", () => {
  it("parses .everend/taxonomy.yaml and merges it with starter taxonomy", () => {
    const findings: ValidationFinding[] = [];
    const files: VaultFile[] = [
      {
        relativePath: ".everend/taxonomy.yaml",
        content: [
          'specVersion: "0.1"',
          "types:",
          "  deity:",
          "    label: Deity",
          "    properties:",
          "      domain:",
          "        type: text",
        ].join("\n"),
      },
    ];

    const parsed = parseLegacyTaxonomy(files, findings);
    const merged = mergeWithStarterTaxonomy(parsed);

    expect(findings).toEqual([]);
    expect(parsed?.types.deity.label).toBe("Deity");
    expect(merged.types.character).toEqual(STARTER_TAXONOMY.types.character);
    expect(merged.types.deity.label).toBe("Deity");
  });

  it("reports unsupported property types and missing labels", () => {
    const findings: ValidationFinding[] = [];

    parseLegacyTaxonomy(
      [
        {
          relativePath: ".everend/taxonomy.yaml",
          content: [
            'specVersion: "0.1"',
            "types:",
            "  deity:",
            "    properties:",
            "      domain:",
            "        type: unknown",
          ].join("\n"),
        },
      ],
      findings,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "types.deity.label", message: 'Taxonomy type "deity" is missing label.' }),
        expect.objectContaining({
          field: "types.deity.properties.domain.type",
          message: 'Property "domain" uses unsupported type "unknown".',
        }),
      ]),
    );
  });

  it("serializes taxonomy, creates default templates, and derives readable type labels", () => {
    expect(taxonomyToYaml({ types: { deity: { label: "Deity" } } })).toContain('specVersion: "0.1"');
    expect(defaultTemplateForType("deity")).toContain("<!-- Default deity template. -->");
    expect(createTypeDefinition("great_house")).toEqual({
      label: "Great House",
      description: "",
      properties: {},
    });
  });
});
