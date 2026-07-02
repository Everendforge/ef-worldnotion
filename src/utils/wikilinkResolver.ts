import type { ResolvedWikilink } from "../editorTypes";
import type { VaultIndex } from "../domain";
import { fileTitle } from "./pathUtils";

function normalizeWikilinkCandidate(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveWikilinkInIndex(
  index: VaultIndex | undefined,
  label: string,
): ResolvedWikilink {
  const normalized = normalizeWikilinkCandidate(label);
  if (!index || !normalized) return { label, status: "missing" };

  const entity = index.entities.find((candidate) => {
    const candidates = [
      candidate.id,
      candidate.name,
      fileTitle(candidate.path),
      ...candidate.aliases,
    ].map(normalizeWikilinkCandidate);
    return candidates.includes(normalized);
  });
  if (entity) return { label, targetPath: entity.path, status: "resolved" };

  const file = index.markdownFiles.find(
    (candidate) => normalizeWikilinkCandidate(fileTitle(candidate.relativePath)) === normalized,
  );
  return file
    ? { label, targetPath: file.relativePath, status: "resolved" }
    : { label, status: "missing" };
}
