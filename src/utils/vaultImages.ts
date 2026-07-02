import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { VaultIndex } from "../domain";
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

type VaultImageResult = {
  /** Object URL (browser mode) that must be revoked by the caller. */
  objectUrl?: string;
  /** Data URL (Tauri mode); nothing to clean up. */
  dataUrl?: string;
};

async function loadVaultImage(
  index: VaultIndex,
  relativePath: string,
): Promise<VaultImageResult | null> {
  if (!relativePath || !isImagePath(relativePath)) return null;

  if (isTauriRuntime()) {
    const base64 = await invoke<string>("read_file_base64", {
      vaultPath: index.rootPath,
      relativePath,
    });
    const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
    return { dataUrl: `data:${mime};base64,${base64}` };
  }

  if (!browserVaultRoot) return null;
  const handle = await getBrowserFile(browserVaultRoot, relativePath);
  const file = await handle.getFile();
  return { objectUrl: URL.createObjectURL(file) };
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
    let objectUrl: string | undefined;

    loadVaultImage(index, relativePath)
      .then((result) => {
        if (cancelled) {
          if (result?.objectUrl) URL.revokeObjectURL(result.objectUrl);
          return;
        }
        objectUrl = result?.objectUrl;
        setUrl(result?.objectUrl ?? result?.dataUrl);
        setError(undefined);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setUrl(undefined);
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [index, relativePath]);

  return { url, error };
}
