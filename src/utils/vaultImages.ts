import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { VaultIndex } from "../domain";
import { dirname } from "../domain";
import { isTauriRuntime } from "./appEnvironment";
import { getBrowserFile, type BrowserDirectoryHandle } from "./browserVault";

export const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function isImagePath(relativePath: string): boolean {
  const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

// In browser mode the directory handle only lives in App state; App registers
// it here so leaf components (image previews) can read binary files without
// threading the handle through every layer.
let browserVaultRoot: BrowserDirectoryHandle | null = null;

export function setBrowserVaultRoot(root: BrowserDirectoryHandle | null) {
  browserVaultRoot = root;
}

async function loadVaultImage(index: VaultIndex, relativePath: string): Promise<string | null> {
  if (!relativePath || !isImagePath(relativePath)) return null;

  if (isTauriRuntime()) {
    const base64 = await invoke<string>("read_file_base64", {
      vaultPath: index.rootPath,
      relativePath,
    });
    const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
    return `data:${mime};base64,${base64}`;
  }

  if (!browserVaultRoot) return null;
  const handle = await getBrowserFile(browserVaultRoot, relativePath);
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}

// Resolved image URLs are cached per (vault, path) so the CodeMirror image
// widget can rebuild without re-reading the file every time. The cache owns
// the lifecycle of browser object URLs (revoked on invalidation).
const imageUrlCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

function cacheKey(rootPath: string, relativePath: string) {
  return `${rootPath}::${relativePath}`;
}

/**
 * Resolves a vault-relative image path to a displayable URL, memoized across
 * calls. Returns null while unavailable. Non-hook: usable from CodeMirror
 * widgets and other imperative code.
 */
export async function resolveVaultImageUrl(
  index: VaultIndex,
  relativePath: string,
): Promise<string | null> {
  if (!relativePath || !isImagePath(relativePath)) return null;
  const key = cacheKey(index.rootPath, relativePath);
  const cached = imageUrlCache.get(key);
  if (cached) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = loadVaultImage(index, relativePath)
    .then((url) => {
      if (url) imageUrlCache.set(key, url);
      return url;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

export function isExternalUrl(rawPath: string): boolean {
  return /^(https?:|data:)/i.test(rawPath);
}

/**
 * Maps a raw image path written in a note (`![](path)`) to a concrete
 * vault-relative path, tried in order: exact vault-relative, relative to the
 * note's folder, then by filename anywhere in the vault (Obsidian-style
 * fallback). Returns null when nothing matches. Pure — no I/O.
 */
export function resolveNoteImagePath(
  index: VaultIndex,
  notePath: string,
  rawPath: string,
): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed || isExternalUrl(trimmed)) return null;

  let decoded: string;
  try {
    decoded = decodeURI(trimmed);
  } catch {
    decoded = trimmed;
  }

  const known = new Set(index.files.map((file) => file.relativePath));
  const noteDir = dirname(notePath);
  const candidates = [decoded, noteDir ? `${noteDir}/${decoded}` : decoded];
  for (const candidate of candidates) {
    const normalized = candidate.replace(/^\.\//, "").replace(/\/+/g, "/").replace(/^\/+/, "");
    if (known.has(normalized)) return normalized;
  }

  const basename = decoded.split("/").pop();
  if (basename) {
    const match = index.files.find((file) => file.relativePath.split("/").pop() === basename);
    if (match) return match.relativePath;
  }

  return null;
}

/**
 * Resolves a raw image path from a note to a displayable URL. External URLs
 * pass through; vault paths go through {@link resolveNoteImagePath}.
 */
export async function resolveNoteImageUrl(
  index: VaultIndex,
  notePath: string,
  rawPath: string,
): Promise<string | null> {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (isExternalUrl(trimmed)) return trimmed;
  const matched = resolveNoteImagePath(index, notePath, trimmed);
  return matched ? resolveVaultImageUrl(index, matched) : null;
}

/** Drops a cached URL so the next resolve re-reads from disk (after rename/edit). */
export function invalidateVaultImage(rootPath: string, relativePath: string) {
  const key = cacheKey(rootPath, relativePath);
  const url = imageUrlCache.get(key);
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  imageUrlCache.delete(key);
}

/**
 * Resolves a vault-relative image path to a displayable URL.
 * Returns undefined while loading or when the image cannot be read.
 */
export function useVaultImage(index: VaultIndex | undefined, relativePath: string) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!index || !relativePath) {
      setUrl(undefined);
      setError(undefined);
      return;
    }
    let cancelled = false;

    resolveVaultImageUrl(index, relativePath)
      .then((resolved) => {
        if (cancelled) return;
        setUrl(resolved ?? undefined);
        setError(undefined);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setUrl(undefined);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [index, relativePath]);

  return { url, error };
}
