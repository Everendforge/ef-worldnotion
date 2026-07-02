import type { VaultIndex } from "../domain";
import { dirname } from "../domain";
import type { ExplorerFavorite, OpenTab } from "../editorTypes";
import { folderDescriptionPath, updateFolderDescriptionContent } from "./contentTemplates";
import { pathName, type PathChange } from "./pathUtils";

export type FolderDescriptionRenamePlan = {
  oldDescriptionPath: string;
  newDescriptionPath: string;
  newFileName: string;
  content: string;
  change: PathChange;
};

export function pathWithinTree(path: string, rootPath: string) {
  return path === rootPath || path.startsWith(`${rootPath}/`);
}

export function pathsAffectedByTree(paths: string[], rootPath: string) {
  return paths.filter((path) => pathWithinTree(path, rootPath));
}

export function dirtyTabPathsAffectedByTree(tabs: OpenTab[], rootPath: string) {
  return pathsAffectedByTree(
    tabs.filter((tab) => tab.dirty).map((tab) => tab.path),
    rootPath,
  );
}

export function favoritesOutsideTree(favorites: ExplorerFavorite[], rootPath: string) {
  return favorites.filter((favorite) => !pathWithinTree(favorite.path, rootPath));
}

export function renamePathTarget(fromPath: string, newName: string) {
  const parent = dirname(fromPath);
  return parent ? `${parent}/${newName}` : newName;
}

export function renamePathChange(
  fromPath: string,
  newName: string,
  kind: "file" | "folder",
): PathChange {
  return {
    fromPath,
    toPath: renamePathTarget(fromPath, newName),
    mode: kind === "folder" ? "tree" : "single",
  };
}

export function movePathTarget(fromPath: string, toFolderPath: string) {
  return toFolderPath ? `${toFolderPath}/${pathName(fromPath)}` : pathName(fromPath);
}

export function movePathChange(fromPath: string, toFolderPath: string): PathChange {
  return {
    fromPath,
    toPath: movePathTarget(fromPath, toFolderPath),
    mode: "tree",
  };
}

export function movePathProblem(fromPath: string, toFolderPath: string, kind: "file" | "folder") {
  if (kind === "folder" && (toFolderPath === fromPath || toFolderPath.startsWith(`${fromPath}/`))) {
    return "Cannot move a folder into itself.";
  }
  if (dirname(fromPath) === toFolderPath) {
    return "already-there";
  }
  return undefined;
}

export function planFolderDescriptionRename(
  index: VaultIndex,
  folderPath: string,
  newFolderName: string,
): FolderDescriptionRenamePlan | undefined {
  const oldDescriptionPath = folderDescriptionPath(folderPath);
  const oldDescriptionFile = index.files.find((file) => file.relativePath === oldDescriptionPath);
  if (!oldDescriptionFile) return undefined;

  const newDescriptionPath = renamePathTarget(oldDescriptionPath, `${newFolderName}.md`);
  if (
    oldDescriptionPath !== newDescriptionPath &&
    index.files.some((file) => file.relativePath === newDescriptionPath)
  ) {
    throw new Error(
      `Cannot rename folder description because ${newDescriptionPath} already exists.`,
    );
  }

  const oldFolderName = pathName(folderPath);
  return {
    oldDescriptionPath,
    newDescriptionPath,
    newFileName: `${newFolderName}.md`,
    content: updateFolderDescriptionContent(
      oldDescriptionFile.content,
      oldFolderName,
      newFolderName,
    ),
    change: {
      fromPath: oldDescriptionPath,
      toPath: newDescriptionPath,
      mode: "single",
    },
  };
}
