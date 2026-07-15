import { describe, expect, it } from "vitest";
import type { PropertiesConfig } from "../editorTypes";
import { createDefaultTaxonomyConfig } from "./taxonomyConfig";
import { parseFrontmatterRaw, updateFrontmatterProperties } from "./propertiesConfig";
import { deserializePropertiesConfig, upgradePropertiesConfigToV3 } from "./propertiesSerializer";
import {
  planPropertyPathMigration,
  planPropertyStructureMigration,
} from "./propertyStructureMigration";

function legacyConfig(): PropertiesConfig {
  const base = createDefaultTaxonomyConfig();
  return {
    ...base,
    version: "2.0",
    entityTypes: {
      ...base.entityTypes,
      definitions: base.entityTypes.definitions.map((definition) => ({
        ...definition,
        customFields: definition.id === "character" ? ["identity"] : [],
      })),
    },
    customFields: {
      definitions: [
        {
          id: "identity",
          label: "Identity",
          type: "group",
          visibleWhen: { type: ["character"] },
          children: [
            {
              id: "role",
              label: "Role",
              type: "select",
              options: [{ value: "protagonist", label: "Protagonist" }],
            },
          ],
        },
      ],
      globalFields: [],
    },
  };
}

describe("property structure migration", () => {
  it("opens 2.0 configurations in legacy mode without upgrading them", () => {
    const { config, migrated } = deserializePropertiesConfig(JSON.stringify(legacyConfig()));

    expect(config.version).toBe("2.0");
    expect(migrated).toBe(false);
  });

  it("converts legacy type conditions to appliesTo without auto-writing notes", () => {
    const upgraded = upgradePropertiesConfigToV3(legacyConfig());
    const identity = upgraded.customFields.definitions[0];

    expect(upgraded.version).toBe("3.0");
    expect(identity.appliesTo).toEqual(["character"]);
    expect(identity.visibleWhen).toBeUndefined();
    expect(identity.children?.[0].appliesTo).toBeUndefined();
  });

  it("widens a migrated parent scope when an explicit child needs another type", () => {
    const legacy = legacyConfig();
    legacy.customFields.definitions[0].children![0].visibleWhen = {
      type: ["organization"],
    };
    const identity = upgradePropertiesConfigToV3(legacy).customFields.definitions[0];

    expect(identity.appliesTo).toEqual(["character", "organization"]);
    expect(identity.children?.[0].appliesTo).toEqual(["organization"]);
  });

  it("previews copy and cleanup stages while preserving comments and unknown values", () => {
    const content = [
      "---",
      "id: mara",
      "type: character",
      "role: protagonist # keep this comment",
      "unknown-list:",
      "  - one",
      "  - two",
      "---",
      "",
      "# Mara",
    ].join("\n");
    const plan = planPropertyStructureMigration(
      [{ relativePath: "Characters/Mara.md", content }],
      legacyConfig(),
    );
    const item = plan.items[0];

    expect(item.status).toBe("ready");
    expect(item.moves).toEqual([
      {
        propertyId: "role",
        fromPath: ["role"],
        toPath: ["identity", "role"],
        action: "copy",
      },
    ]);
    expect(item.copyContent).toContain("role: protagonist # keep this comment");
    expect(item.copyContent).toContain("identity:");
    expect(item.nextContent).not.toMatch(/^role:/m);
    expect(item.nextContent).toContain("unknown-list:");
    expect(item.nextContent).toContain("# Mara");

    expect(
      planPropertyStructureMigration(
        [{ relativePath: "Characters/Mara.md", content: item.nextContent! }],
        plan.upgradedConfig,
      ).items,
    ).toEqual([]);
  });

  it("never overwrites a different nested value", () => {
    const content = [
      "---",
      "id: mara",
      "type: character",
      "role: protagonist",
      "identity:",
      "  role: antagonist",
      "---",
    ].join("\n");
    const [item] = planPropertyStructureMigration(
      [{ relativePath: "Mara.md", content }],
      legacyConfig(),
    ).items;

    expect(item.status).toBe("conflict");
    expect(item.copyContent).toBeUndefined();
    expect(item.conflicts[0]).toContain("different values");
  });

  it("reports a scalar where a group object is required", () => {
    const content = "---\nid: mara\ntype: character\nidentity: legacy-value\n---";
    const [item] = planPropertyStructureMigration(
      [{ relativePath: "Mara.md", content }],
      legacyConfig(),
    ).items;

    expect(item.status).toBe("conflict");
    expect(item.conflicts[0]).toContain("must be a YAML object");
  });

  it("marks unsaved notes as blocked", () => {
    const content = "---\nid: mara\ntype: character\nrole: protagonist\n---";
    const [item] = planPropertyStructureMigration(
      [{ relativePath: "Mara.md", content }],
      legacyConfig(),
      new Set(["Mara.md"]),
    ).items;

    expect(item.status).toBe("dirty");
  });

  it("previews property moves between nested groups", () => {
    const fromConfig = upgradePropertiesConfigToV3(legacyConfig());
    const toConfig: PropertiesConfig = {
      ...fromConfig,
      customFields: {
        ...fromConfig.customFields,
        definitions: [
          {
            id: "worldbuilding",
            label: "Worldbuilding",
            type: "group",
            children: fromConfig.customFields.definitions,
          },
        ],
      },
    };
    const content = "---\nid: mara\ntype: character\nidentity:\n  role: protagonist\n---";
    const [item] = planPropertyPathMigration(
      [{ relativePath: "Mara.md", content }],
      fromConfig,
      toConfig,
    ).items;

    expect(item.moves[0].fromPath).toEqual(["identity", "role"]);
    expect(item.moves[0].toPath).toEqual(["worldbuilding", "identity", "role"]);
    expect(parseFrontmatterRaw(item.nextContent!)).toMatchObject({
      worldbuilding: { identity: { role: "protagonist" } },
    });
  });
});

describe("nested frontmatter editing", () => {
  it("writes and removes a nested leaf without disturbing siblings or comments", () => {
    const config = upgradePropertiesConfigToV3(legacyConfig());
    const raw = [
      "---",
      "identity:",
      "  role: protagonist # role note",
      "  unknown: keep",
      "---",
    ].join("\n");
    const updated = updateFrontmatterProperties(raw, { role: "antagonist" }, config, "character");
    const removed = updateFrontmatterProperties(updated, { role: undefined }, config, "character");

    expect(updated).toContain("role: antagonist # role note");
    expect(removed).toContain("identity:");
    expect(removed).toContain("unknown: keep");
    expect(removed).not.toContain("role:");
  });
});
