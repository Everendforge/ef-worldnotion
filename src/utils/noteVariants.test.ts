import { describe, expect, it } from "vitest";
import type { PropertiesConfig } from "../editorTypes";
import {
  BASE_VARIANT_ID,
  addVariant,
  deleteVariant,
  hasVariantOverride,
  insertVariantBlock,
  readNoteVariants,
  removeVariantBlocks,
  renameVariant,
  resolveVariantFrontmatter,
  setVariantOverride,
  validateVariantBlocks,
} from "./noteVariants";

const config: PropertiesConfig = {
  version: "3.0",
  baseProperties: { definitions: [] },
  tags: { rootNodes: [], allowCustomTags: true, autoDetectSlashNotation: true },
  entityTypes: {
    definitions: [{ id: "character", label: "Character" }],
    defaultType: "character",
    allowCustomTypes: false,
  },
  statuses: { definitions: [], defaultStatus: "draft", allowCustomStatuses: true },
  customFields: {
    definitions: [
      {
        id: "identity",
        label: "Identity",
        type: "group",
        children: [{ id: "age", label: "Age", type: "number" }],
      },
    ],
  },
};

const frontmatter = {
  id: "mara",
  type: "character",
  name: "Mara",
  identity: { age: 34 },
  variants: {
    base: { label: "Canon" },
    older: { label: "Mara adulta", overrides: { name: "Mara mayor", identity: { age: 62 } } },
  },
};

describe("note variants", () => {
  it("inherits base metadata and deeply resolves a variant override", () => {
    expect(resolveVariantFrontmatter(frontmatter, "older")).toMatchObject({
      id: "mara",
      type: "character",
      name: "Mara mayor",
      identity: { age: 62 },
    });
    expect(resolveVariantFrontmatter(frontmatter, "missing").name).toBe("Mara");
  });

  it("creates, renames, and keeps the structural base variant", () => {
    const created = addVariant(frontmatter, "Joven");
    expect(created.id).toBe("joven");
    expect(
      renameVariant({ ...frontmatter, variants: created.variants }, BASE_VARIANT_ID, "Original")
        .base.label,
    ).toBe("Original");
    expect(() => deleteVariant(frontmatter, BASE_VARIANT_ID)).toThrow(/cannot be deleted/i);
  });

  it("adds and restores a nested override without permitting id or type", () => {
    const changed = setVariantOverride(frontmatter, config, "older", "age", 63);
    expect(hasVariantOverride({ ...frontmatter, variants: changed }, config, "older", "age")).toBe(
      true,
    );
    const restored = setVariantOverride(
      { ...frontmatter, variants: changed },
      config,
      "older",
      "age",
      undefined,
    );
    expect(hasVariantOverride({ ...frontmatter, variants: restored }, config, "older", "age")).toBe(
      false,
    );
    expect(() => setVariantOverride(frontmatter, config, "older", "type", "location")).toThrow(
      /cannot be overridden/i,
    );
  });

  it("validates and removes explicit Markdown blocks", () => {
    const body =
      'Shared\n\n<!-- everend:variant id="older" -->\nOnly older\n<!-- /everend:variant -->';
    expect(validateVariantBlocks(body, readNoteVariants(frontmatter))).toEqual([]);
    expect(removeVariantBlocks(body, "older")).toBe("Shared\n");
    expect(
      validateVariantBlocks(
        '<!-- everend:variant id="none" -->\n<!-- /everend:variant -->',
        readNoteVariants(frontmatter),
      )[0]?.message,
    ).toMatch(/unknown/i);
  });

  it("can create a dedicated base variant section", () => {
    expect(insertVariantBlock("Shared", BASE_VARIANT_ID)).toContain(
      '<!-- everend:variant id="base" -->',
    );
  });
});
