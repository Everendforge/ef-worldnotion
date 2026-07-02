import { describe, expect, it } from "vitest";
import type { Entity } from "../domain";
import type { TaxonomyConfig } from "../editorTypes";
import { validateAgainstTaxonomy } from "./taxonomyValidation";

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "ada",
    type: "character",
    name: "Ada",
    status: "draft",
    tags: ["cast/main"],
    aliases: [],
    childrenIds: [],
    customProperties: {},
    body: "",
    path: "Ada.md",
    file: { relativePath: "Ada.md", content: "" },
    wikilinks: [],
    backlinks: [],
    ...overrides,
  };
}

const taxonomy: TaxonomyConfig = {
  version: "1.0",
  tags: {
    allowCustomTags: false,
    autoDetectSlashNotation: true,
    rootNodes: [
      {
        id: "cast",
        label: "cast",
        fullPath: "cast",
        children: [
          { id: "cast-main", label: "main", fullPath: "cast/main", children: [], parentId: "cast" },
        ],
      },
    ],
  },
  entityTypes: {
    allowCustomTypes: false,
    defaultType: "character",
    definitions: [{ id: "character", label: "Character", customFields: ["faction"] }],
  },
  statuses: {
    allowCustomStatuses: false,
    defaultStatus: "draft",
    definitions: [{ id: "draft", label: "Draft" }],
  },
  customFields: {
    definitions: [{ id: "faction", label: "Faction", type: "text", required: true }],
  },
};

describe("taxonomy validation", () => {
  it("returns no findings when taxonomy is absent or entity is valid", () => {
    expect(validateAgainstTaxonomy(entity(), undefined, "Ada.md")).toEqual([]);
    expect(
      validateAgainstTaxonomy(
        entity({ customProperties: { faction: "Archive" } }),
        taxonomy,
        "Ada.md",
      ),
    ).toEqual([]);
  });

  it("flags undefined tags when custom tags are disabled", () => {
    const findings = validateAgainstTaxonomy(
      entity({ tags: ["cast/unknown"] }),
      taxonomy,
      "Ada.md",
    );

    expect(findings).toEqual([
      expect.objectContaining({ code: "undefined_tag", field: "tags", file: "Ada.md" }),
      expect.objectContaining({ code: "invalid_custom_field", field: "faction", file: "Ada.md" }),
    ]);
  });

  it("flags undefined type and status with suggestions when available", () => {
    const findings = validateAgainstTaxonomy(
      entity({ type: "char", status: "dra", customProperties: { faction: "Archive" } }),
      taxonomy,
      "Ada.md",
    );

    expect(findings).toEqual([
      expect.objectContaining({
        code: "undefined_entity_type",
        field: "type",
        suggestion: 'Did you mean "character"?',
      }),
      expect.objectContaining({
        code: "undefined_status",
        field: "status",
        suggestion: 'Did you mean "draft"?',
      }),
    ]);
  });

  it("flags required custom fields", () => {
    const findings = validateAgainstTaxonomy(entity(), taxonomy, "Ada.md");

    expect(findings).toContainEqual(
      expect.objectContaining({
        code: "invalid_custom_field",
        message: 'Required field "Faction" (faction) is missing for entity type "Character".',
        field: "faction",
      }),
    );
  });
});
