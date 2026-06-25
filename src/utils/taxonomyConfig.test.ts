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
