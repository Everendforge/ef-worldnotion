import type { Entity, Universe, VaultFile } from "../domain";
import { isHiddenMetadata } from "./treeBuilder";

export function detectUniverses(files: VaultFile[], directories: string[], entities: Entity[]): Universe[] {
  const rootFolders = new Set<string>();

  directories
    .filter((directory) => !isHiddenMetadata(`${directory}/`))
    .forEach((directory) => {
      const [first] = directory.split("/");
      if (first) {
        rootFolders.add(first);
      }
    });

  files
    .filter((file) => !isHiddenMetadata(file.relativePath))
    .forEach((file) => {
      const [first] = file.relativePath.split("/");
      if (first && first !== file.relativePath) {
        rootFolders.add(first);
      }
    });

  entities.forEach((entity) => {
    const [first] = entity.path.split("/");
    if (first && first !== entity.path) {
      rootFolders.add(first);
    }
  });

  return Array.from(rootFolders)
    .sort((a, b) => a.localeCompare(b))
    .map((folder) => ({
      name: folder,
      relativePath: folder,
      entityCount: entities.filter((entity) => entity.path.startsWith(`${folder}/`)).length,
    }));
}
