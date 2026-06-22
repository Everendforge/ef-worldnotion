import type { VaultIndex } from "../domain";
import { dirname } from "../domain";

export type PathChange = {
  fromPath: string;
  toPath: string;
  mode: "single" | "tree";
};

export type PathChangeSet = PathChange | PathChange[];

export type ExplorerTarget = {
  path: string;
  kind: "file" | "folder";
};

export function pathName(path: string): string {
  return path.replace(/^browser:/, "").split(/[\\/]/).pop() ?? path;
}

export function fileTitle(path: string) {
  return pathName(path).replace(/\.md$/i, "");
}

export function relativeFromAbsolute(rootPath: string, absolutePath: string) {
  return absolutePath.startsWith(rootPath)
    ? absolutePath.slice(rootPath.length).replace(/^[\\/]+/, "")
    : absolutePath;
}

export function selectedAbsolutePath(index: VaultIndex | undefined, path: string | undefined) {
  if (!index || !path) return index?.rootPath;
  const file = index.files.find((candidate) => candidate.relativePath === path);
  return file?.absolutePath ?? `${index.rootPath}/${path}`;
}

export function activeCreationFolder(selectedExplorerTarget: ExplorerTarget | undefined, selectedPath: string | undefined) {
  if (selectedExplorerTarget?.kind === "folder") return selectedExplorerTarget.path;
  if (selectedExplorerTarget?.kind === "file") return dirname(selectedExplorerTarget.path);
  return selectedPath ? dirname(selectedPath) : "";
}

export function childPathAfterMove(path: string, fromPath: string, movedRootPath: string) {
  if (path === fromPath) {
    return movedRootPath;
  }
  if (path.startsWith(`${fromPath}/`)) {
    return `${movedRootPath}/${path.slice(fromPath.length + 1)}`;
  }
  return path;
}

export function pathIsAffectedByChange(path: string | undefined, change: PathChange) {
  if (!path) return false;
  return change.mode === "tree" ? path === change.fromPath || path.startsWith(`${change.fromPath}/`) : path === change.fromPath;
}

export function pathAfterChange(path: string, change: PathChange) {
  return change.mode === "tree" ? childPathAfterMove(path, change.fromPath, change.toPath) : change.toPath;
}

export function normalizePathChanges(changes?: PathChangeSet) {
  return Array.isArray(changes) ? changes : changes ? [changes] : [];
}

export function pathAfterChanges(path: string, changes?: PathChangeSet) {
  return normalizePathChanges(changes).reduce(
    (current, change) => (pathIsAffectedByChange(current, change) ? pathAfterChange(current, change) : current),
    path,
  );
}

export function pathIsAffectedByChanges(path: string | undefined, changes?: PathChangeSet) {
  if (!path) return false;
  return normalizePathChanges(changes).some((change) => pathIsAffectedByChange(path, change));
}

export function pathExists(index: VaultIndex, path: string, kind: "file" | "folder") {
  if (kind === "file") {
    return index.files.some((file) => file.relativePath === path);
  }
  const stack = [...index.tree];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (node.kind === "folder" && node.path === path) return true;
    stack.push(...node.children);
  }
  return false;
}

export function duplicatePathFor(index: VaultIndex, relativePath: string, kind: "file" | "folder") {
  const parent = dirname(relativePath);
  const filename = pathName(relativePath);
  const extensionMatch = kind === "file" ? filename.match(/(\.[^.]+)$/) : undefined;
  const extension = extensionMatch?.[1] ?? "";
  const stem = extension ? filename.slice(0, -extension.length) : filename;

  for (let copyIndex = 1; copyIndex < 1000; copyIndex += 1) {
    const candidateName = `${stem} copy ${copyIndex}${extension}`;
    const candidate = parent ? `${parent}/${candidateName}` : candidateName;
    if (!pathExists(index, candidate, kind)) return candidate;
  }
  throw new Error("Could not find an available duplicate name.");
}
