import { describe, expect, it } from "vitest";
import type { Entity, VaultIndex } from "../domain";
import { resolveWikilinkInIndex } from "./wikilinkResolver";

function entity(overrides: Partial<Entity> = {}): Entity {
  const path = overrides.path ?? "Characters/Ada.md";
  return {
    id: "ada",
    type: "character",
    name: "Ada Lovelace",
    status: "canon",
    tags: [],
    aliases: ["Countess"],
    childrenIds: [],
    customProperties: {},
    body: "",
    path,
    file: { relativePath: path, content: "" },
    wikilinks: [],
    backlinks: [],
    ...overrides,
  };
}

function index(overrides: Partial<VaultIndex> = {}): VaultIndex {
  const entities = overrides.entities ?? [entity()];
  const markdownFiles = overrides.markdownFiles ?? [
    { relativePath: "Characters/Ada.md", content: "" },
    { relativePath: "Loose/World Primer.md", content: "" },
  ];
  return {
    rootPath: "Demo",
    files: markdownFiles,
    directories: [],
    markdownFiles,
    templates: [],
    universes: [],
    tree: [],
    entities,
    findings: [],
    readErrors: [],
    typeCounts: {},
    ...overrides,
  };
}

describe("wikilink resolver", () => {
  it("resolves entities by id, name, file title, and aliases", () => {
    const vault = index();

    expect(resolveWikilinkInIndex(vault, " ada ")).toEqual({
      label: " ada ",
      targetPath: "Characters/Ada.md",
      status: "resolved",
    });
    expect(resolveWikilinkInIndex(vault, "ada lovelace").targetPath).toBe("Characters/Ada.md");
    expect(resolveWikilinkInIndex(vault, "Ada").targetPath).toBe("Characters/Ada.md");
    expect(resolveWikilinkInIndex(vault, "countess").targetPath).toBe("Characters/Ada.md");
  });

  it("resolves markdown files by title when no entity matches", () => {
    expect(resolveWikilinkInIndex(index(), "world primer")).toEqual({
      label: "world primer",
      targetPath: "Loose/World Primer.md",
      status: "resolved",
    });
  });

  it("returns missing for empty labels, absent indexes, and unresolved targets", () => {
    expect(resolveWikilinkInIndex(undefined, "Ada")).toEqual({ label: "Ada", status: "missing" });
    expect(resolveWikilinkInIndex(index(), "   ")).toEqual({ label: "   ", status: "missing" });
    expect(resolveWikilinkInIndex(index(), "Unknown")).toEqual({
      label: "Unknown",
      status: "missing",
    });
  });

  it("prefers entity matches over loose files with the same title", () => {
    const vault = index({
      entities: [entity({ id: "primer", name: "World Primer", path: "Entities/Primer.md" })],
      markdownFiles: [
        { relativePath: "Loose/World Primer.md", content: "" },
        { relativePath: "Entities/Primer.md", content: "" },
      ],
    });

    expect(resolveWikilinkInIndex(vault, "World Primer").targetPath).toBe("Entities/Primer.md");
  });
});
