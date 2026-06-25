import type { OpenTab } from "../editorTypes";
import type { VaultIndex } from "../domain";
import { dirname, joinMarkdown, slugify, splitMarkdown } from "../domain";
import { pathName } from "./pathUtils";

export const FOLDER_SYSTEM_PROPERTY_COMMENT =
  "Don't delete; it's a WorldNotion system property: indicates whether this note corresponds to a folder.";

function yamlScalar(value: string) {
  if (/^[A-Za-z0-9 _.-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

export function createEntityFrontmatter({
  id,
  type,
  name,
  status = "draft",
  tags = [],
  aliases = [],
  parentId,
  childrenIds,
  folder,
}: {
  id: string;
  type: string;
  name: string;
  status?: string;
  tags?: string[];
  aliases?: string[];
  parentId?: string;
  childrenIds?: string[];
  folder?: string;
}) {
  // Build frontmatter in Spec v0.1 order: folder (system), id, type, name, status, tags, aliases, parentId, childrenIds
  const lines: string[] = [];
  lines.push("---");
  if (folder) lines.push(`folder: ${yamlScalar(folder)} # ${FOLDER_SYSTEM_PROPERTY_COMMENT}`);
  lines.push(`id: ${yamlScalar(id)}`);
  lines.push(`type: ${yamlScalar(type)}`);
  lines.push(`name: ${yamlScalar(name)}`);
  lines.push(`status: ${yamlScalar(status)}`);
  lines.push(`tags: [${tags.map((t) => yamlScalar(t)).join(", ")}]`);
  lines.push(`aliases: [${aliases.map((a) => yamlScalar(a)).join(", ")}]`);
  if (parentId) lines.push(`parentId: ${yamlScalar(parentId)}`);
  if (childrenIds && childrenIds.length > 0)
    lines.push(`childrenIds: [${childrenIds.map((c) => yamlScalar(c)).join(", ")}]`);
  lines.push("---");
  return lines.join("\n");
}

export function contentFromTemplate(index: VaultIndex, entityType: string, name: string) {
  const slug = slugify(name);
  const template = index.templates.find((candidate) => candidate.type === entityType);
  if (!template) {
    // Return frontmatter only, no header for blank notes
    return `${createEntityFrontmatter({ id: slug, type: entityType, name })}\n`;
  }
  return template.content
    .replace(/\{\{id\}\}/g, slug)
    .replace(/\{\{type\}\}/g, entityType)
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{status\}\}/g, "draft");
}

export function folderDescriptionContent(name: string) {
  return `${createEntityFrontmatter({
    id: `${slugify(name)}-folder`,
    type: "folder-description",
    name,
    folder: name,
  })}\n`;
}

export function folderDescriptionPath(folderPath: string) {
  const folderName = pathName(folderPath);
  const parentPath = dirname(folderPath);
  return parentPath ? `${parentPath}/${folderName}.md` : `${folderName}.md`;
}

export function folderDescriptionInfo(index: VaultIndex, folderPath: string) {
  const folderName = pathName(folderPath) || pathName(index.rootPath);
  const descriptionPath = folderDescriptionPath(folderPath);

  return {
    folderName,
    descriptionPath,
    hasDescription: index.files.some((file) => file.relativePath === descriptionPath),
  };
}

export function updateFolderDescriptionContent(content: string, oldName: string, newName: string) {
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content
    .replace(new RegExp(`(^name:\\s*)${escaped}(\\s*$)`, "m"), `$1${newName}$2`)
    .replace(new RegExp(`(^folder:\\s*)${escaped}(\\s*(?:#.*)?$)`, "m"), `$1${newName}$2`)
    .replace(new RegExp(`(^#\\s+)${escaped}(\\s*$)`, "m"), `$1${newName}$2`);
}

export function universeNoteContent(name: string) {
  return `${createEntityFrontmatter({ id: slugify(name), type: "universe", name })}\n\n# ${name}\n`;
}

export function rawToEditorParts(rawMarkdown: string) {
  return splitMarkdown(rawMarkdown);
}

export function bodyToRawMarkdown(tab: OpenTab, bodyMarkdown: string) {
  return joinMarkdown(rawToEditorParts(tab.rawMarkdown).frontmatterRaw, bodyMarkdown);
}
