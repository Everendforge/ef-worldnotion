import type { VaultFile, VaultReadResult } from "../domain";
import { dirname } from "../domain";
import { pathName } from "./pathUtils";

export type BrowserFileHandle = {
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }>;
  queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

export type BrowserDirectoryHandle = {
  name: string;
  entries: () => AsyncIterableIterator<[string, BrowserDirectoryHandle | BrowserFileHandle]>;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<BrowserDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<BrowserFileHandle>;
  removeEntry?: (name: string, options?: { recursive?: boolean }) => Promise<void>;
  queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};

export function browserPathParts(relativePath: string, options: { allowRoot?: boolean } = {}) {
  if (relativePath === "" && options.allowRoot) return [];
  if (!relativePath) throw new Error("Path is required.");
  if (/^[a-zA-Z]:/.test(relativePath) || relativePath.startsWith("/") || relativePath.startsWith("\\")) {
    throw new Error("Browser vault paths must be relative.");
  }
  if (relativePath.includes("\0")) {
    throw new Error("Browser vault paths cannot contain null bytes.");
  }
  if (relativePath.includes("\\")) {
    throw new Error("Browser vault paths must use forward slashes.");
  }

  const parts = relativePath.split("/");
  for (const [index, part] of parts.entries()) {
    validateBrowserPathSegment(part, { parts, index });
  }
  return parts;
}

export function validateBrowserPathSegment(
  segment: string,
  context: { parts?: string[]; index?: number } = {},
) {
  if (!segment || segment === "." || segment === "..") {
    throw new Error("Browser vault paths cannot contain empty or traversal segments.");
  }
  if (segment.includes("/") || segment.includes("\\") || segment.includes("\0")) {
    throw new Error("Browser vault path segments cannot contain separators or null bytes.");
  }
  if (segment.startsWith(".")) {
    const isEverendRoot = segment === ".everend" && (context.index ?? 0) === 0;
    const isPathBranchingMetadata =
      segment === ".pathbranching" && context.index === 1 && context.parts?.[0] === ".everend";
    if (!isEverendRoot && !isPathBranchingMetadata) {
      throw new Error("Browser vault paths can only use .everend and .everend/.pathbranching as hidden segments.");
    }
  }
}

export async function readBrowserUniverse(root: BrowserDirectoryHandle): Promise<VaultReadResult> {
  const files: VaultFile[] = [];
  const directories: string[] = [];
  const errors: VaultReadResult["errors"] = [];

  async function walk(directory: BrowserDirectoryHandle, prefix: string) {
    for await (const [name, handle] of directory.entries()) {
      const relativePath = prefix ? `${prefix}/${name}` : name;
      const maybeDirectory = handle as BrowserDirectoryHandle;
      const maybeFile = handle as BrowserFileHandle;

      if ("entries" in maybeDirectory) {
        if (name.startsWith(".") && name !== ".everend") continue;
        directories.push(relativePath);
        await walk(maybeDirectory, relativePath);
        continue;
      }

      if (!relativePath.endsWith(".md") && !relativePath.endsWith(".yaml") && !relativePath.endsWith(".json")) continue;

      try {
        const file = await maybeFile.getFile();
        files.push({
          relativePath,
          content: await file.text(),
          modifiedMs: file.lastModified,
        });
      } catch (error) {
        errors.push({
          relativePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  await walk(root, "");
  directories.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { rootPath: `browser:${root.name}`, files, directories, errors };
}

export async function getBrowserDirectory(root: BrowserDirectoryHandle, relativePath: string, create = false) {
  const parts = browserPathParts(relativePath, { allowRoot: true });
  let current = root;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

export async function ensureBrowserWritePermission(root: BrowserDirectoryHandle) {
  if (!root.queryPermission || !root.requestPermission) return;
  try {
    const descriptor = { mode: "readwrite" as const };
    const current = await root.queryPermission(descriptor);
    if (current === "granted") return;
    const requested = await root.requestPermission(descriptor);
    if (requested !== "granted") {
      console.warn("Write permission was not granted for this universe folder. Some operations may fail.");
    }
  } catch (error) {
    console.warn("Could not request write permission for this universe folder.", error);
  }
}

export async function getBrowserFile(root: BrowserDirectoryHandle, relativePath: string, create = false) {
  const parts = browserPathParts(relativePath);
  const filename = parts.pop();
  if (!filename) throw new Error("File path is required.");
  const directory = await getBrowserDirectory(root, parts.join("/"), create);
  return directory.getFileHandle(filename, { create });
}

export async function getBrowserParent(root: BrowserDirectoryHandle, relativePath: string) {
  const parts = browserPathParts(relativePath);
  const name = parts.pop();
  if (!name) throw new Error("Path is required.");
  return {
    directory: await getBrowserDirectory(root, parts.join("/")),
    name,
  };
}

export async function writeBrowserFile(root: BrowserDirectoryHandle, relativePath: string, content: string) {
  await ensureBrowserWritePermission(root);
  const fileHandle = await getBrowserFile(root, relativePath, true);
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  const file = await fileHandle.getFile();
  return file.lastModified;
}

export async function removeBrowserPath(root: BrowserDirectoryHandle, relativePath: string, recursive = true) {
  await ensureBrowserWritePermission(root);
  const { directory, name } = await getBrowserParent(root, relativePath);
  if (!directory.removeEntry) {
    throw new Error("This browser does not support deleting files from a selected folder.");
  }
  await directory.removeEntry(name, { recursive });
}

export async function copyBrowserDirectory(source: BrowserDirectoryHandle, target: BrowserDirectoryHandle) {
  await ensureBrowserWritePermission(target);
  for await (const [name, handle] of source.entries()) {
    const maybeDirectory = handle as BrowserDirectoryHandle;
    const maybeFile = handle as BrowserFileHandle;
    if ("entries" in maybeDirectory) {
      const nextTarget = await target.getDirectoryHandle(name, { create: true });
      await copyBrowserDirectory(maybeDirectory, nextTarget);
    } else {
      const file = await maybeFile.getFile();
      const targetFile = await target.getFileHandle(name, { create: true });
      const writable = await targetFile.createWritable();
      await writable.write(await file.text());
      await writable.close();
    }
  }
}

export async function copyBrowserPath(
  root: BrowserDirectoryHandle,
  fromPath: string,
  toPath: string,
  kind: "file" | "folder",
) {
  await ensureBrowserWritePermission(root);
  if (kind === "file") {
    const source = await getBrowserFile(root, fromPath);
    const file = await source.getFile();
    await writeBrowserFile(root, toPath, await file.text());
    return;
  }

  const source = await getBrowserDirectory(root, fromPath);
  const { directory, name } = await getBrowserParent(root, toPath);
  const target = await directory.getDirectoryHandle(name, { create: true });
  await copyBrowserDirectory(source, target);
}

export async function renameBrowserPath(
  root: BrowserDirectoryHandle,
  fromPath: string,
  newName: string,
  kind: "file" | "folder",
) {
  validateBrowserPathSegment(newName);
  const targetPath = dirname(fromPath) ? `${dirname(fromPath)}/${newName}` : newName;
  await copyBrowserPath(root, fromPath, targetPath, kind);
  await removeBrowserPath(root, fromPath, true);
  return targetPath;
}

export async function moveBrowserPath(
  root: BrowserDirectoryHandle,
  fromPath: string,
  toFolderPath: string,
  kind: "file" | "folder",
) {
  const targetPath = toFolderPath ? `${toFolderPath}/${pathName(fromPath)}` : pathName(fromPath);
  await copyBrowserPath(root, fromPath, targetPath, kind);
  await removeBrowserPath(root, fromPath, true);
  return targetPath;
}
