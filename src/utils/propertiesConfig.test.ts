import { describe, expect, it } from "vitest";
import { createDefaultTaxonomyConfig } from "../domain";
import { applyPropertyTemplate, WORLDBUILDING_TEMPLATE } from "./propertyTemplates";
import {
  adaptFrontmatterProperty,
  addPropertyToConfig,
  inferPropertyDefinition,
  listUnconfiguredProperties,
  listVisibleProperties,
  parseFrontmatterRaw,
  removeFrontmatterProperty,
} from "./propertiesConfig";

describe("propertiesConfig", () => {
  it("lists visible base and custom properties", () => {
    const config = addPropertyToConfig(applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE), {
      id: "rarity",
      label: "Rarity",
      type: "select",
      options: [{ value: "rare", label: "Rare" }],
    });

    expect(listVisibleProperties(config).map((property) => property.id)).toContain("status");
    expect(listVisibleProperties(config).map((property) => property.id)).toContain("rarity");
  });

  it("worldbuilding starts with only type visible from base properties", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const visibleIds = listVisibleProperties(config).map((property) => property.id);

    expect(visibleIds).toContain("type");
    expect(visibleIds).not.toContain("id");
    expect(visibleIds).not.toContain("name");
  });

  it("worldbuilding shows type-specific properties instead of every field globally", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const characterIds = listVisibleProperties(config, "character").map((property) => property.id);
    const itemIds = listVisibleProperties(config, "item").map((property) => property.id);

    expect(characterIds).toEqual(["type", "status", "aliases", "role", "affiliation", "home", "arc", "lore-level"]);
    expect(itemIds).toEqual(["type", "status", "aliases", "rarity", "material", "owner", "location", "lore-level"]);
    expect(characterIds).not.toContain("rarity");
    expect(itemIds).not.toContain("role");
  });

  it("does not treat hidden configured properties as unconfigured", () => {
    const config = addPropertyToConfig(createDefaultTaxonomyConfig(), {
      id: "rarity",
      label: "Rarity",
      type: "text",
    });
    const hiddenConfig = {
      ...config,
      customFields: { ...config.customFields, globalFields: [] },
    };

    expect(listUnconfiguredProperties({ id: "iron", rarity: "rare" }, hiddenConfig)).toEqual([]);
  });

  it("detects unconfigured properties and infers definitions", () => {
    const extras = listUnconfiguredProperties({ id: "iron", rating: 5, released: true }, createDefaultTaxonomyConfig());

    expect(extras).toEqual([
      { key: "rating", value: 5, inferredType: "number" },
      { key: "released", value: true, inferredType: "boolean" },
    ]);
    expect(inferPropertyDefinition("rating", 5)).toMatchObject({ id: "rating", type: "number" });
  });

  it("removes and adapts frontmatter properties", () => {
    const raw = "---\nid: iron\nrarity: rare\noldKey: value\n---";

    expect(parseFrontmatterRaw(removeFrontmatterProperty(raw, "rarity"))).not.toHaveProperty("rarity");
    expect(parseFrontmatterRaw(adaptFrontmatterProperty(raw, "oldKey", "newKey"))).toMatchObject({
      id: "iron",
      rarity: "rare",
      newKey: "value",
    });
  });

  it("returns an empty object for malformed frontmatter instead of throwing", () => {
    expect(parseFrontmatterRaw("---\nid: iron\nlore-level: semi-canon\nc\n---")).toEqual({});
  });
});
