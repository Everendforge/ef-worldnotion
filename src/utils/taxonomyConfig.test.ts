import { describe, expect, it } from "vitest";
import {
  createDefaultTaxonomyConfig,
  generateTaxonomyFromEntities,
  mergeTagHierarchy,
  normalizeCoreBaseProperties,
  type TaxonomyEntityInput,
} from "./taxonomyConfig";

describe("taxonomy config helpers", () => {
  it("creates the default taxonomy without requiring vault data", () => {
    const taxonomy = createDefaultTaxonomyConfig();

    expect(taxonomy.version).toBe("1.0");
    expect(taxonomy.entityTypes.defaultType).toBe("concept");
    expect(taxonomy.entityTypes.definitions.map((definition) => definition.id)).toContain("character");
    expect(taxonomy.statuses.definitions.map((definition) => definition.id)).toContain("draft");
  });

  it("keeps folder out of properties while preserving type as the default visible base field", () => {
    const taxonomy = normalizeCoreBaseProperties({
      ...createDefaultTaxonomyConfig(),
      customFields: {
        definitions: [{ id: "folder", label: "Folder", type: "text" }],
        globalFields: ["folder"],
      },
    });

    expect(taxonomy.baseProperties?.definitions.map((definition) => definition.id)).toEqual(["id", "name", "type"]);
    expect(taxonomy.baseProperties?.visibleByDefault).toEqual(["type"]);
    expect(taxonomy.customFields.definitions.some((definition) => definition.id === "folder")).toBe(false);
  });

  it("migrates flat worldbuilding fields into the details group", () => {
    const base = createDefaultTaxonomyConfig();
    const taxonomy = normalizeCoreBaseProperties({
      ...base,
      customFields: {
        definitions: [
          {
            id: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "draft", label: "Draft" },
              { value: "canon", label: "Canon" },
            ],
          },
          { id: "aliases", label: "Aliases", type: "text" },
          {
            id: "role",
            label: "Role",
            type: "select",
            options: [
              { value: "protagonist", label: "Protagonist" },
              { value: "antagonist", label: "Antagonist" },
            ],
          },
          { id: "affiliation", label: "Affiliation", type: "entity-ref" },
          {
            id: "lore-level",
            label: "Lore Level",
            type: "select",
            options: [
              { value: "known", label: "Known" },
              { value: "secret", label: "Secret" },
            ],
          },
        ],
        globalFields: ["status", "aliases"],
      },
      entityTypes: {
        ...base.entityTypes,
        definitions: base.entityTypes.definitions.map((definition) =>
          definition.id === "character"
            ? {
                ...definition,
                customFields: ["status", "aliases", "role", "affiliation", "lore-level"],
                visibleProperties: ["type", "status", "aliases", "role", "affiliation", "lore-level"],
                propertyOrder: ["type", "status", "aliases", "role", "affiliation", "lore-level"],
              }
            : definition,
        ),
      },
    });

    const rootFieldIds = taxonomy.customFields.definitions.map((definition) => definition.id);
    const detailsGroup = taxonomy.customFields.definitions.find((definition) => definition.id === "worldbuilding-details");
    const character = taxonomy.entityTypes.definitions.find((definition) => definition.id === "character");

    expect(rootFieldIds).toContain("worldbuilding-details");
    expect(rootFieldIds).not.toContain("role");
    expect(rootFieldIds).not.toContain("affiliation");
    expect(rootFieldIds).not.toContain("lore-level");
    expect(detailsGroup?.children?.map((definition) => definition.id)).toEqual(
      expect.arrayContaining(["role", "affiliation", "lore-level"]),
    );
    expect(detailsGroup?.children?.find((definition) => definition.id === "role")?.options).toEqual([
      { value: "protagonist", label: "Protagonist" },
      { value: "antagonist", label: "Antagonist" },
    ]);
    expect(detailsGroup?.children?.find((definition) => definition.id === "role")?.visibleWhen).toEqual({
      type: ["character", "organization"],
    });
    expect(character?.customFields).toEqual(["status", "aliases", "worldbuilding-details"]);
    expect(character?.visibleProperties).toEqual(["type", "status", "aliases", "worldbuilding-details"]);
    expect(character?.propertyOrder).toEqual(["type", "status", "aliases", "worldbuilding-details"]);
  });

  it("generates hierarchy, entity types, statuses, and frequent custom fields from entities", () => {
    const entities: TaxonomyEntityInput[] = [
      { type: "character", status: "draft", tags: ["cast/main"], customProperties: { faction: "Archive", alive: true } },
      { type: "location", status: "canon", tags: ["place/city"], customProperties: { faction: "Archive", alive: false } },
      { type: "character", status: "draft", tags: ["cast/support"], customProperties: { faction: "Guild", alive: true } },
    ];

    const taxonomy = generateTaxonomyFromEntities(entities);

    expect(taxonomy.tags.rootNodes.map((node) => node.fullPath)).toEqual(["cast", "place"]);
    expect(taxonomy.tags.rootNodes[0].children.map((node) => node.fullPath)).toEqual(["cast/main", "cast/support"]);
    expect(taxonomy.entityTypes.definitions.map((definition) => definition.id)).toEqual(["character", "location"]);
    expect(taxonomy.statuses.definitions.map((definition) => definition.id)).toEqual(["draft", "canon"]);
    expect(taxonomy.customFields.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "faction", type: "select" }),
        expect.objectContaining({ id: "alive", type: "boolean" }),
      ]),
    );
  });

  it("falls back to defaults when no entity types or statuses are available", () => {
    const taxonomy = generateTaxonomyFromEntities([]);

    expect(taxonomy.entityTypes.defaultType).toBe("concept");
    expect(taxonomy.statuses.defaultStatus).toBe("draft");
    expect(taxonomy.entityTypes.definitions.length).toBeGreaterThan(0);
    expect(taxonomy.statuses.definitions.length).toBeGreaterThan(0);
  });

  it("merges detected slash tags into predefined hierarchy", () => {
    const merged = mergeTagHierarchy(
      [
        {
          id: "cast",
          label: "cast",
          fullPath: "cast",
          children: [],
        },
      ],
      ["cast/main", "place/city"],
    );

    expect(merged.map((node) => node.fullPath)).toEqual(["cast", "place"]);
    expect(merged.find((node) => node.fullPath === "cast")?.children[0].fullPath).toBe("cast/main");
    expect(merged.find((node) => node.fullPath === "place")?.children[0].fullPath).toBe("place/city");
  });
});
