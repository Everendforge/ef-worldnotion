import type { Entity, VaultFile, VaultIndex } from "../domain";

export function makeVaultFile(relativePath: string, content = ""): VaultFile {
  return {
    relativePath,
    absolutePath: `/vault/${relativePath}`,
    content,
    modifiedMs: 0,
  };
}

export function makeEntity(overrides: Partial<Entity> = {}): Entity {
  const path = overrides.path ?? "Characters/Mara.md";
  return {
    id: "mara",
    type: "character",
    name: "Mara",
    status: "draft",
    tags: [],
    aliases: [],
    childrenIds: [],
    customProperties: {},
    body: "",
    path,
    file: makeVaultFile(path),
    wikilinks: [],
    backlinks: [],
    ...overrides,
  };
}

export function makeVaultIndex(overrides: Partial<VaultIndex> = {}): VaultIndex {
  const entities = overrides.entities ?? [
    makeEntity(),
    makeEntity({ id: "iron-keep", type: "location", name: "Iron Keep", path: "Places/Iron.md" }),
  ];
  return {
    rootPath: "/vault",
    files: entities.map((entity) => entity.file),
    directories: [],
    markdownFiles: entities.map((entity) => entity.file),
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
