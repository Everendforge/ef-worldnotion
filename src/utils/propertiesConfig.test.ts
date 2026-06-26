import { describe, expect, it } from "vitest";
import { createDefaultTaxonomyConfig } from "../domain";
import { createEntityFrontmatter } from "./contentTemplates";
import { applyPropertyTemplate, WORLDBUILDING_TEMPLATE } from "./propertyTemplates";
import {
  adaptFrontmatterProperty,
  addPropertyToConfig,
  getConfiguredFrontmatterOrder,
  inferPropertyDefinition,
  listAllProperties,
  listUnconfiguredProperties,
  listVisibleProperties,
  parseFrontmatterRaw,
  removeFrontmatterProperty,
  reorderInspectorPropertySiblings,
  removeInspectorProperty,
  upsertInspectorProperty,
  updateFrontmatterProperties,
} from "./propertiesConfig";
import { isPropertyVisible } from "./propertyTreeUtils";

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
    const details = listVisibleProperties(config, "character").find((property) => property.id === "worldbuilding-details");
    const characterChildIds = details?.children
      ?.filter((property) => isPropertyVisible(property, { type: "character" }))
      .map((property) => property.id);
    const itemChildIds = details?.children
      ?.filter((property) => isPropertyVisible(property, { type: "item" }))
      .map((property) => property.id);

    expect(characterIds).toEqual(["type", "status", "aliases", "worldbuilding-details"]);
    expect(itemIds).toEqual(["type", "status", "aliases", "worldbuilding-details"]);
    expect(characterChildIds).toEqual(["role", "affiliation", "home", "arc", "lore-level"]);
    expect(itemChildIds).toEqual(["rarity", "material", "owner", "location", "lore-level"]);
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

  it("updates frontmatter fields using configured YAML order", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const raw = [
      "---",
      "id: mara",
      "name: Mara",
      "lore-level: canon",
      "type: character",
      "arc: awakening",
      "status: draft",
      "role: lead",
      "aliases:",
      "  - Mara",
      "affiliation: archive",
      "home: north",
      "---",
    ].join("\n");

    const next = updateFrontmatterProperties(raw, { status: "canon" }, config, "character");
    const keys = Object.keys(parseFrontmatterRaw(next));

    expect(parseFrontmatterRaw(next)).toMatchObject({ status: "canon", role: "lead" });
    expect(keys.slice(0, 8)).toEqual(["type", "status", "aliases", "role", "affiliation", "home", "arc", "lore-level"]);
    expect(keys.slice(-2)).toEqual(["id", "name"]);
  });

  it("creates frontmatter through the same configured serializer", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const raw = createEntityFrontmatter({
      id: "mara",
      name: "Mara",
      type: "character",
      propertiesConfig: config,
    });

    expect(Object.keys(parseFrontmatterRaw(raw))).toEqual(["type", "status", "aliases", "id", "name", "tags"]);
  });

  it("adds child properties without making YAML nested", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const withParent = upsertInspectorProperty(
      config,
      {
        id: "magic",
        label: "Magic",
        type: "select",
        options: [{ value: "yes", label: "Yes" }],
      },
      "character",
    );
    const withChild = upsertInspectorProperty(
      withParent,
      {
        id: "power-level",
        label: "Power level",
        type: "number",
        visibleWhen: { magic: ["yes"] },
      },
      "character",
      "magic",
    );

    const magic = listVisibleProperties(withChild, "character").find((property) => property.id === "magic");

    expect(magic?.children?.map((child) => child.id)).toEqual(["power-level"]);
    expect(listUnconfiguredProperties({ magic: "yes", "power-level": 3 }, withChild)).toEqual([]);
    expect(getConfiguredFrontmatterOrder(withChild, "character", ["power-level", "magic"])).toEqual(["magic", "power-level"]);
  });

  it("reorders child properties inside their parent", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const withParent = upsertInspectorProperty(config, { id: "magic", label: "Magic", type: "group" }, "character");
    const withFirstChild = upsertInspectorProperty(withParent, { id: "alpha", label: "Alpha", type: "text" }, "character", "magic");
    const withSecondChild = upsertInspectorProperty(withFirstChild, { id: "beta", label: "Beta", type: "text" }, "character", "magic");
    const reordered = reorderInspectorPropertySiblings(withSecondChild, "character", "beta", "alpha");
    const magic = listVisibleProperties(reordered, "character").find((property) => property.id === "magic");

    expect(magic?.children?.map((child) => child.id)).toEqual(["beta", "alpha"]);
  });

  it("removes nested properties from schema visibility and known fields", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const withParent = upsertInspectorProperty(config, { id: "magic", label: "Magic", type: "group" }, "character");
    const withChild = upsertInspectorProperty(withParent, { id: "power-level", label: "Power level", type: "number" }, "character", "magic");
    const next = removeInspectorProperty(withChild, "power-level");

    expect(listAllProperties(next).map((property) => property.id)).not.toContain("power-level");
    expect(listUnconfiguredProperties({ "power-level": 3 }, next)).toEqual([
      { key: "power-level", value: 3, inferredType: "number" },
    ]);
  });

  it("returns an empty object for malformed frontmatter instead of throwing", () => {
    expect(parseFrontmatterRaw("---\nid: iron\nlore-level: semi-canon\nc\n---")).toEqual({});
  });
});
