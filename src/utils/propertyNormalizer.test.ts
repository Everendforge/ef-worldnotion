import { describe, expect, it } from "vitest";
import type { VaultFile } from "../domain";
import { createDefaultTaxonomyConfig } from "../domain";
import { applyPropertyTemplate, WORLDBUILDING_TEMPLATE } from "./propertyTemplates";
import { getConfiguredFrontmatterOrder } from "./propertiesConfig";
import { planPropertyNormalization } from "./propertyNormalizer";

function file(relativePath: string, content: string, modifiedMs = 1): VaultFile {
  return { relativePath, content, modifiedMs };
}

const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);

describe("property normalizer", () => {
  it("fills missing core fields with defaults derived from the note", () => {
    const [item] = planPropertyNormalization({
      files: [file("Mara.md", "---\ntype: character\n---\n\n# Mara")],
      propertiesConfig: config,
    });

    expect(item?.path).toBe("Mara.md");
    expect(item?.type).toBe("character");
    expect(item?.addedFields).toEqual(
      expect.arrayContaining(["id", "name", "status", "tags", "aliases"]),
    );
    expect(item?.nextContent).toContain("id: mara");
    expect(item?.nextContent).toContain("name: Mara");
    expect(item?.nextContent).toContain("status: draft");
    expect(item?.nextContent).toContain("# Mara");
  });

  it("reorders keys to the schema order without touching values", () => {
    const [item] = planPropertyNormalization({
      files: [
        file(
          "Mara.md",
          "---\nstatus: canon\nname: Mara\ntype: character\nid: mara\ntags: []\naliases: []\n---\n\nBody",
        ),
      ],
      propertiesConfig: config,
    });

    expect(item?.addedFields).toEqual([]);
    expect(item?.reordered).toBe(true);
    const frontmatter = item?.nextContent.split("---")[1] ?? "";
    const keys = frontmatter
      .trim()
      .split("\n")
      .filter((line) => /^[a-zA-Z]/.test(line))
      .map((line) => line.split(":")[0]);
    const expected = getConfiguredFrontmatterOrder(config, "character", keys);
    expect(keys).toEqual(expected);
    expect(item?.nextContent).toContain("status: canon");
  });

  it("skips notes that already match the schema", () => {
    const [seed] = planPropertyNormalization({
      files: [file("Mara.md", "---\ntype: character\n---\n\n# Mara")],
      propertiesConfig: config,
    });
    // Feed the normalized output back in: a second pass must be a no-op.
    const items = planPropertyNormalization({
      files: [file("Mara.md", seed!.nextContent)],
      propertiesConfig: config,
    });
    expect(items).toEqual([]);
  });

  it("skips notes without frontmatter and hidden metadata files", () => {
    const items = planPropertyNormalization({
      files: [
        file("Loose.md", "# Loose note without frontmatter"),
        file(".everend/templates/concept.md", "---\ntype: concept\n---"),
      ],
      propertiesConfig: config,
    });
    expect(items).toEqual([]);
  });

  it("falls back to the default type when the note has none", () => {
    const [item] = planPropertyNormalization({
      files: [file("Idea.md", "---\nname: Idea\n---\n\nBody")],
      propertiesConfig: config,
    });
    expect(item?.type).toBe(config.entityTypes.defaultType);
    expect(item?.addedFields).toContain("type");
    expect(item?.nextContent).toContain(`type: ${config.entityTypes.defaultType}`);
  });

  it("keeps unknown extra keys instead of deleting them", () => {
    const [item] = planPropertyNormalization({
      files: [
        file(
          "Mara.md",
          "---\nid: mara\ntype: character\nname: Mara\nstatus: draft\ntags: []\naliases: []\nmystery: value\n---\n\nBody",
        ),
      ],
      propertiesConfig: config,
    });
    // mystery is unknown to the schema: kept at the end, note still normalized only if needed
    if (item) {
      expect(item.nextContent).toContain("mystery: value");
    }
  });
});
