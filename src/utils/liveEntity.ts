import type { OpenTab } from "../editorTypes";
import type { Entity, VaultIndex } from "../domain";
import { parseMarkdownFrontmatter } from "./markdownFrontmatter";

const LIVE_ENTITY_BASE_FIELDS = new Set(["id", "name", "type", "status", "tags", "aliases"]);

export function selectLiveEntity(
  index: VaultIndex | undefined,
  selectedPath: string | undefined,
  tabs: OpenTab[],
): Entity | undefined {
  const indexEntity = index?.entities.find((entity) => entity.path === selectedPath);
  const activeTabForSelected = tabs.find((tab) => tab.path === selectedPath);

  if (!activeTabForSelected || !indexEntity) {
    return indexEntity;
  }

  try {
    const parsed = parseMarkdownFrontmatter(activeTabForSelected.rawMarkdown);
    const customProperties: Record<string, unknown> = {};
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (!LIVE_ENTITY_BASE_FIELDS.has(key)) {
        customProperties[key] = value;
      }
    });

    return {
      ...indexEntity,
      id: String(parsed.data.id || indexEntity.id),
      name: String(parsed.data.name || indexEntity.name),
      type: String(parsed.data.type || indexEntity.type),
      status: String(parsed.data.status || indexEntity.status),
      tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : indexEntity.tags,
      aliases: Array.isArray(parsed.data.aliases) ? parsed.data.aliases.map(String) : indexEntity.aliases,
      customProperties,
      body: parsed.content,
    };
  } catch {
    return indexEntity;
  }
}
