import YAML from "yaml";

export type VaultFile = {
  relativePath: string;
  absolutePath?: string;
  content: string;
  modifiedMs?: number | null;
};

export type VaultReadError = {
  relativePath: string;
  message: string;
};

export type VaultReadResult = {
  rootPath: string;
  files: VaultFile[];
  directories: string[];
  errors: VaultReadError[];
};

export type TaxonomyProperty = {
  type: string;
  label?: string;
  description?: string;
  options?: string[];
  targetTypes?: string[];
  required?: boolean;
};

export type TaxonomyType = {
  label: string;
  description?: string;
  properties?: Record<string, TaxonomyProperty>;
};

export type Taxonomy = {
  specVersion?: string;
  types: Record<string, TaxonomyType>;
};

export type UniverseIcon = {
  type: "preset" | "image";
  value: string;
};

export type UniverseProfile = {
  name?: string;
  icon?: UniverseIcon;
  taxonomyVersion?: string; // Version of taxonomy config being used
};

export type ValidationFinding = {
  code:
    | "missing_frontmatter"
    | "missing_required_field"
    | "duplicate_id"
    | "broken_wikilink"
    | "missing_canon_ref"
    | "broken_graph_transition"
    | "missing_runtime_asset"
    | "save_conflict"
    | "undefined_tag"
    | "undefined_entity_type"
    | "undefined_status"
    | "invalid_custom_field";
  severity: "info" | "warning" | "error";
  message: string;
  file?: string;
  field?: string;
  nodeId?: string;
  suggestion?: string;
};

export type Entity = {
  id: string;
  type: string;
  name: string;
  status: string;
  tags: string[];
  aliases: string[];
  parentId?: string;
  childrenIds: string[];
  customProperties: Record<string, unknown>;
  body: string;
  path: string;
  file: VaultFile;
  wikilinks: string[];
  backlinks: string[];
};

export type VaultIndex = {
  rootPath: string;
  files: VaultFile[];
  directories: string[];
  markdownFiles: VaultFile[];
  taxonomy?: Taxonomy;
  taxonomyConfig?: import("./editorTypes.js").TaxonomyConfig; // New hierarchical taxonomy
  templates: EntityTemplate[];
  universeProfile?: UniverseProfile;
  universes: Universe[];
  tree: VaultTreeNode[];
  entities: Entity[];
  findings: ValidationFinding[];
  readErrors: VaultReadError[];
  typeCounts: Record<string, number>;
};

export type Universe = {
  name: string;
  relativePath: string;
  entityCount: number;
};

export type VaultTreeNode = {
  name: string;
  path: string;
  kind: "folder" | "file";
  children: VaultTreeNode[];
  hasDescription?: boolean;
  descriptionPath?: string;
};

export type EntityTemplate = {
  type: string;
  path: string;
  content: string;
  modifiedMs?: number | null;
};

export type EditorDocument = {
  path: string;
  absolutePath?: string;
  content: string;
  savedContent: string;
  modifiedMs?: number | null;
  dirty: boolean;
  mode: "entity" | "template" | "taxonomy" | "file";
};

export type WriteResult = {
  ok: boolean;
  path: string;
  modifiedMs?: number | null;
  message?: string | null;
};

export type ThemeManifest = {
  name: string;
  relativePath: string;
  absolutePath: string;
  content: string;
  kind: "css" | "json";
};

export const STARTER_TAXONOMY: Taxonomy = {
  specVersion: "0.1",
  types: {
    character: { label: "Character", description: "Person, creature, or viewpoint actor." },
    location: { label: "Location", description: "Place, region, settlement, or site." },
    organization: { label: "Organization", description: "Faction, institution, house, or guild." },
    event: { label: "Event", description: "Canon event or historical beat." },
    concept: { label: "Concept", description: "Idea, law, magic rule, or abstract note." },
    item: { label: "Item", description: "Object, relic, tool, or artifact." },
    world: { label: "World", description: "Top-level world entity." },
    cycle: { label: "Cycle", description: "Era, cycle, age, or repeated chronology." },
    universe: { label: "Universe", description: "Universe-level project container." },
    story: { label: "Story", description: "Narrative container." },
    arc: { label: "Arc", description: "Narrative arc." },
    scene: { label: "Scene", description: "Planning scene, not a runtime node." },
    quest: { label: "Quest", description: "Quest or objective chain." },
  },
};

export const PROPERTY_TYPES = [
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multiSelect",
  "entityRef",
  "entityRefList",
] as const;

const REQUIRED_FIELDS = ["id", "type", "name", "status"] as const;
const BASE_ENTITY_FIELDS = new Set([
  "id",
  "type",
  "name",
  "status",
  "tags",
  "aliases",
  "parentId",
  "childrenIds",
]);
const ALLOWED_PROPERTY_TYPES = new Set([
  "text",
  "number",
  "boolean",
  "date",
  "select",
  "multiSelect",
  "entityRef",
  "entityRefList",
]);

type ParsedMarkdown = {
  data: Record<string, unknown>;
  content: string;
};

export type SplitMarkdown = {
  frontmatterRaw: string;
  bodyMarkdown: string;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function basenameWithoutExtension(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.[^.]+$/, "");
}

/**
 * Process tags considering hierarchical slash notation
 * Returns normalized tag strings
 * @internal Not currently used - kept for future tag hierarchy processing
 *
function _processTagsWithHierarchy(value: unknown): string[] {
  const tags = toStringArray(value);
  // Tags are stored as-is (with slash notation if present)
  // The hierarchy extraction happens in mergeTagHierarchy during indexing
  return tags;
}
*/

/**
 * Validate entity against taxonomy configuration
 * Returns array of validation findings
 */
export function validateAgainstTaxonomy(
  entity: Entity,
  taxonomyConfig: import("./editorTypes.js").TaxonomyConfig | undefined,
  filePath: string,
): ValidationFinding[] {
  if (!taxonomyConfig) return [];

  const findings: ValidationFinding[] = [];

  // Validate tags
  if (entity.tags.length > 0 && !taxonomyConfig.tags.allowCustomTags) {
    const definedTags = new Set<string>();
    const collectTags = (nodes: import("./editorTypes.js").TagHierarchyNode[]) => {
      nodes.forEach((node) => {
        definedTags.add(node.fullPath);
        collectTags(node.children);
      });
    };
    collectTags(taxonomyConfig.tags.rootNodes);

    entity.tags.forEach((tag) => {
      if (!definedTags.has(tag)) {
        findings.push(
          createFinding(
            "undefined_tag",
            "warning",
            `Tag "${tag}" is not defined in taxonomy. Add it to the hierarchy or enable custom tags.`,
            filePath,
            "tags",
          ),
        );
      }
    });
  }

  // Validate entity type
  const typeIds = new Set(taxonomyConfig.entityTypes.definitions.map((t) => t.id));
  if (!typeIds.has(entity.type) && !taxonomyConfig.entityTypes.allowCustomTypes) {
    const suggestion = taxonomyConfig.entityTypes.definitions
      .map((t) => t.id)
      .find((id) => id.includes(entity.type) || entity.type.includes(id));

    findings.push(
      createFinding(
        "undefined_entity_type",
        "warning",
        `Entity type "${entity.type}" is not defined in taxonomy.`,
        filePath,
        "type",
      ),
    );
    if (suggestion) {
      findings[findings.length - 1].suggestion = `Did you mean "${suggestion}"?`;
    }
  }

  // Validate status
  const statusIds = new Set(taxonomyConfig.statuses.definitions.map((s) => s.id));
  if (!statusIds.has(entity.status) && !taxonomyConfig.statuses.allowCustomStatuses) {
    const suggestion = taxonomyConfig.statuses.definitions
      .map((s) => s.id)
      .find((id) => id.includes(entity.status) || entity.status.includes(id));

    findings.push(
      createFinding(
        "undefined_status",
        "warning",
        `Status "${entity.status}" is not defined in taxonomy.`,
        filePath,
        "status",
      ),
    );
    if (suggestion) {
      findings[findings.length - 1].suggestion = `Did you mean "${suggestion}"?`;
    }
  }

  // Validate custom fields if entity type has required fields
  const entityTypeDef = taxonomyConfig.entityTypes.definitions.find((t) => t.id === entity.type);
  if (entityTypeDef?.customFields) {
    entityTypeDef.customFields.forEach((fieldId) => {
      const fieldDef = taxonomyConfig.customFields.definitions.find((f) => f.id === fieldId);
      if (fieldDef?.required && !(fieldId in entity.customProperties)) {
        findings.push(
          createFinding(
            "invalid_custom_field",
            "warning",
            `Required field "${fieldDef.label}" (${fieldId}) is missing for entity type "${entityTypeDef.label}".`,
            filePath,
            fieldId,
          ),
        );
      }
    });
  }

  return findings;
}

function pathName(path: string): string {
  return path.replace(/^browser:/, "").split(/[\\/]/).pop() ?? path;
}

export function dirname(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

function isHiddenMetadata(path: string): boolean {
  return path.startsWith(".everend/");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function extractWikilinks(body: string): string[] {
  const links = new Set<string>();
  const linkPattern = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(body)) !== null) {
    const target = match[1]?.trim();
    if (target) {
      links.add(target);
    }
  }

  return Array.from(links);
}

export function parseMarkdownFrontmatter(content: string): ParsedMarkdown {
  if (!content.startsWith("---")) {
    throw new Error("Missing YAML frontmatter fence.");
  }

  const normalized = content.replace(/\r\n/g, "\n");
  const closingFence = normalized.indexOf("\n---", 3);
  if (closingFence === -1) {
    throw new Error("Unterminated YAML frontmatter fence.");
  }

  const yaml = normalized.slice(3, closingFence).trim();
  const bodyStart = normalized.indexOf("\n", closingFence + 4);
  const body = bodyStart === -1 ? "" : normalized.slice(bodyStart + 1);
  const data = YAML.parse(yaml, { mapAsMap: true }) as Record<string, unknown> | null;

  return {
    data: data ?? {},
    content: body,
  };
}

export function splitMarkdown(content: string): SplitMarkdown {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatterRaw: "", bodyMarkdown: normalized.replace(/^\n+/, "") };
  }
  const closingFence = normalized.indexOf("\n---", 4);
  if (closingFence === -1) {
    return { frontmatterRaw: "", bodyMarkdown: normalized.replace(/^\n+/, "") };
  }
  const frontmatterRaw = normalized.slice(0, closingFence + 4).trim();
  const bodyStart = normalized.indexOf("\n", closingFence + 4);
  const bodyMarkdown = bodyStart === -1 ? "" : normalized.slice(bodyStart + 1).replace(/^\n+/, "");
  return { frontmatterRaw, bodyMarkdown };
}

export function joinMarkdown(frontmatterRaw: string, bodyMarkdown: string): string {
  const frontmatter = frontmatterRaw.trim();
  const body = bodyMarkdown.replace(/^\n+/, "");
  return frontmatter ? `${frontmatter}\n\n${body}` : body;
}

function createFinding(
  code: ValidationFinding["code"],
  severity: ValidationFinding["severity"],
  message: string,
  file?: string,
  field?: string,
): ValidationFinding {
  return { code, severity, message, file, field };
}

function parseTemplates(files: VaultFile[]): EntityTemplate[] {
  return files
    .filter((file) => file.relativePath.startsWith(".everend/templates/"))
    .filter((file) => file.relativePath.endsWith(".md"))
    .map((file) => ({
      type: basenameWithoutExtension(file.relativePath),
      path: file.relativePath,
      content: file.content,
      modifiedMs: file.modifiedMs,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

function parseUniverseProfile(files: VaultFile[], findings: ValidationFinding[]): UniverseProfile | undefined {
  const profileFile = files.find((file) => file.relativePath === ".everend/universe.json");
  if (!profileFile) return undefined;

  try {
    const parsed = JSON.parse(profileFile.content) as UniverseProfile | null;
    if (!parsed || typeof parsed !== "object") return undefined;
    const icon: UniverseIcon | undefined =
      parsed.icon?.type && parsed.icon.value
        ? {
            type: parsed.icon.type === "image" ? "image" : "preset",
            value: String(parsed.icon.value),
          }
        : undefined;
    return {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : undefined,
      icon,
    };
  } catch {
    findings.push(
      createFinding(
        "missing_runtime_asset",
        "warning",
        "Universe profile must be valid JSON.",
        ".everend/universe.json",
      ),
    );
    return undefined;
  }
}

// ============================================================================
// Taxonomy Config Persistence Functions
// ============================================================================

/**
 * Parse taxonomy configuration from .everend/taxonomy.json
 */
function parseTaxonomyConfig(
  files: VaultFile[],
  findings: ValidationFinding[],
): import("./editorTypes.js").TaxonomyConfig | undefined {
  const taxonomyFile = files.find((file) => file.relativePath === ".everend/taxonomy.json");
  if (!taxonomyFile) return undefined;

  try {
    const parsed = JSON.parse(taxonomyFile.content);
    if (!parsed || typeof parsed !== "object") return undefined;

    // Validate structure
    const config = parsed as import("./editorTypes.js").TaxonomyConfig;
    if (!config.version || !config.tags || !config.entityTypes || !config.statuses || !config.customFields) {
      findings.push(
        createFinding(
          "missing_runtime_asset",
          "warning",
          "Taxonomy config is missing required fields.",
          ".everend/taxonomy.json",
        ),
      );
      return undefined;
    }

    return config;
  } catch (error) {
    findings.push(
      createFinding(
        "missing_runtime_asset",
        "warning",
        `Taxonomy config must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        ".everend/taxonomy.json",
      ),
    );
    return undefined;
  }
}

/**
 * Generate default taxonomy config with common entity types and statuses
 */
export function createDefaultTaxonomyConfig(): import("./editorTypes.js").TaxonomyConfig {
  return {
    version: "1.0",
    tags: {
      rootNodes: [],
      allowCustomTags: true,
      autoDetectSlashNotation: true,
    },
    entityTypes: {
      definitions: [
        {
          id: "character",
          label: "Character",
          description: "Person, creature, or viewpoint actor",
          icon: "user",
          color: "#3b82f6",
          customFields: [],
        },
        {
          id: "location",
          label: "Location",
          description: "Place, region, settlement, or site",
          icon: "map-pin",
          color: "#10b981",
          customFields: [],
        },
        {
          id: "organization",
          label: "Organization",
          description: "Faction, institution, house, or guild",
          icon: "users",
          color: "#f59e0b",
          customFields: [],
        },
        {
          id: "concept",
          label: "Concept",
          description: "Idea, law, magic rule, or abstract note",
          icon: "lightbulb",
          color: "#8b5cf6",
          customFields: [],
        },
        {
          id: "event",
          label: "Event",
          description: "Canon event or historical beat",
          icon: "calendar",
          color: "#ef4444",
          customFields: [],
        },
        {
          id: "item",
          label: "Item",
          description: "Object, relic, tool, or artifact",
          icon: "package",
          color: "#ec4899",
          customFields: [],
        },
      ],
      defaultType: "concept",
      allowCustomTypes: true,
    },
    statuses: {
      definitions: [
        {
          id: "draft",
          label: "Draft",
          description: "Work in progress",
          color: "#6b7280",
          order: 0,
        },
        {
          id: "in-progress",
          label: "In Progress",
          description: "Actively being worked on",
          color: "#f59e0b",
          order: 1,
        },
        {
          id: "review",
          label: "Review",
          description: "Ready for review",
          color: "#3b82f6",
          order: 2,
        },
        {
          id: "published",
          label: "Published",
          description: "Finalized and approved",
          color: "#10b981",
          order: 3,
        },
        {
          id: "archived",
          label: "Archived",
          description: "No longer active",
          color: "#6b7280",
          order: 4,
        },
      ],
      defaultStatus: "draft",
      allowCustomStatuses: true,
    },
    customFields: {
      definitions: [],
      globalFields: [],
    },
  };
}

/**
 * Generate initial taxonomy configuration from existing vault entities
 * Analyzes tags, types, statuses, and custom properties to create a starting taxonomy
 */
export function generateTaxonomyFromEntities(entities: Entity[]): import("./editorTypes.js").TaxonomyConfig {
  const tagSet = new Set<string>();
  const typeSet = new Set<string>();
  const statusSet = new Set<string>();
  const propertyFrequency = new Map<string, number>();
  const propertyExamples = new Map<string, Set<unknown>>();

  // Analyze entities
  entities.forEach((entity) => {
    // Collect tags
    entity.tags.forEach((tag) => tagSet.add(tag));

    // Collect types
    if (entity.type) typeSet.add(entity.type);

    // Collect statuses
    if (entity.status) statusSet.add(entity.status);

    // Collect custom properties
    Object.entries(entity.customProperties).forEach(([key, value]) => {
      propertyFrequency.set(key, (propertyFrequency.get(key) || 0) + 1);
      if (!propertyExamples.has(key)) {
        propertyExamples.set(key, new Set());
      }
      propertyExamples.get(key)!.add(value);
    });
  });

  // Build hierarchical tag structure from slash notation
  const buildTagHierarchy = (tags: string[]): import("./editorTypes.js").TagHierarchyNode[] => {
    const rootMap = new Map<string, import("./editorTypes.js").TagHierarchyNode>();

    tags.forEach((tag) => {
      const parts = tag.split("/");
      let currentPath = "";

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (index === 0) {
          // Root level
          if (!rootMap.has(currentPath)) {
            rootMap.set(currentPath, {
              id: `tag-${currentPath}`,
              label: part,
              fullPath: currentPath,
              children: [],
            });
          }
        } else {
          // Find parent and add child
          const findAndAddChild = (nodes: import("./editorTypes.js").TagHierarchyNode[]): boolean => {
            for (const node of nodes) {
              if (node.fullPath === parentPath) {
                const existing = node.children.find((c) => c.fullPath === currentPath);
                if (!existing) {
                  node.children.push({
                    id: `tag-${currentPath}`,
                    label: part,
                    fullPath: currentPath,
                    children: [],
                    parentId: node.id,
                  });
                }
                return true;
              }
              if (findAndAddChild(node.children)) return true;
            }
            return false;
          };

          findAndAddChild(Array.from(rootMap.values()));
        }
      });
    });

    return Array.from(rootMap.values());
  };

  // Build entity type definitions
  const entityTypeDefinitions: import("./editorTypes.js").EntityTypeDefinition[] = Array.from(typeSet)
    .filter((type) => type !== "")
    .map((type, _index) => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      customFields: [],
    }));

  // Build status definitions
  const statusDefinitions: import("./editorTypes.js").StatusDefinition[] = Array.from(statusSet)
    .filter((status) => status !== "")
    .map((status, index) => ({
      id: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      order: index,
    }));

  // Build custom field definitions (only for frequently used properties)
  const threshold = Math.max(3, Math.floor(entities.length * 0.1)); // At least 10% of entities or minimum 3
  const customFieldDefinitions: import("./editorTypes.js").CustomFieldDefinition[] = Array.from(
    propertyFrequency.entries()
  )
    .filter(([_, count]) => count >= threshold)
    .map(([key, _]) => {
      const examples = Array.from(propertyExamples.get(key) || []);
      
      // Infer field type from examples
      let fieldType: import("./editorTypes.js").CustomFieldType = "text";
      if (examples.every((v) => typeof v === "boolean")) {
        fieldType = "boolean";
      } else if (examples.every((v) => typeof v === "number")) {
        fieldType = "number";
      } else if (examples.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(String(v)))) {
        fieldType = "date";
      } else if (examples.length <= 10 && examples.every((v) => typeof v === "string")) {
        fieldType = "select";
      }

      return {
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        type: fieldType,
        ...(fieldType === "select" && {
          options: examples.map((v) => ({
            label: String(v),
            value: String(v),
          })),
        }),
      };
    });

  return {
    version: "1.0",
    tags: {
      rootNodes: buildTagHierarchy(Array.from(tagSet)),
      allowCustomTags: true,
      autoDetectSlashNotation: true,
    },
    entityTypes: {
      definitions: entityTypeDefinitions.length > 0 
        ? entityTypeDefinitions 
        : createDefaultTaxonomyConfig().entityTypes.definitions,
      defaultType: entityTypeDefinitions.length > 0 ? entityTypeDefinitions[0].id : "concept",
      allowCustomTypes: true,
    },
    statuses: {
      definitions: statusDefinitions.length > 0 
        ? statusDefinitions 
        : createDefaultTaxonomyConfig().statuses.definitions,
      defaultStatus: statusDefinitions.length > 0 ? statusDefinitions[0].id : "draft",
      allowCustomStatuses: true,
    },
    customFields: {
      definitions: customFieldDefinitions,
      globalFields: customFieldDefinitions.map((f) => f.id),
    },
  };
}

/**
 * Merge hierarchical tags from predefined structure and auto-detected slash notation
 */
export function mergeTagHierarchy(
  predefinedTags: import("./editorTypes.js").TagHierarchyNode[],
  detectedTags: string[],
): import("./editorTypes.js").TagHierarchyNode[] {
  const tagMap = new Map<string, import("./editorTypes.js").TagHierarchyNode>();

  // Add all predefined tags to map
  const addToMap = (node: import("./editorTypes.js").TagHierarchyNode) => {
    tagMap.set(node.fullPath, node);
    node.children.forEach(addToMap);
  };
  predefinedTags.forEach(addToMap);

  // Process detected tags with slash notation
  detectedTags.forEach((tag) => {
    if (tag.includes("/")) {
      const parts = tag.split("/").filter(Boolean);
      let currentPath = "";
      let parentId: string | undefined;

      parts.forEach((part, _index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!tagMap.has(currentPath)) {
          const newNode: import("./editorTypes.js").TagHierarchyNode = {
            id: currentPath.replace(/\//g, "-"),
            label: part,
            fullPath: currentPath,
            children: [],
            parentId,
          };

          tagMap.set(currentPath, newNode);

          // Add to parent's children or root
          if (parentId) {
            const parent = Array.from(tagMap.values()).find((n) => n.id === parentId);
            if (parent && !parent.children.some((c) => c.id === newNode.id)) {
              parent.children.push(newNode);
            }
          }
        }

        parentId = currentPath.replace(/\//g, "-");
      });
    }
  });

  // Return only root nodes (nodes without parentId)
  return Array.from(tagMap.values()).filter((node) => !node.parentId);
}

function isFolderDescriptionFile(file: VaultFile, folderName: string) {
  try {
    const parsed = parseMarkdownFrontmatter(file.content);
    return parsed.data.type === "folder-description" || parsed.data.folder === folderName;
  } catch {
    return false;
  }
}

export function buildTree(
  files: VaultFile[],
  directories: string[] = [],
  includeHiddenMetadata = false,
  hiddenRootFile?: string,
): VaultTreeNode[] {
  const roots: VaultTreeNode[] = [];
  const folders = new Map<string, VaultTreeNode>();
  const descriptionFiles = new Set<string>();
  const folderPaths = new Set<string>();

  directories
    .filter((directory) => includeHiddenMetadata || !isHiddenMetadata(`${directory}/`))
    .forEach((directory) => {
      if (!directory) return;
      folderPaths.add(directory);
      let current = dirname(directory);
      while (current) {
        folderPaths.add(current);
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
    });

  files.forEach((file) => {
    if (!includeHiddenMetadata && isHiddenMetadata(file.relativePath)) return;
    const parentPath = dirname(file.relativePath);
    if (parentPath) {
      folderPaths.add(parentPath);
      let current = parentPath;
      while (current) {
        folderPaths.add(current);
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
  });

  files.forEach((file) => {
    if (!includeHiddenMetadata && isHiddenMetadata(file.relativePath)) return;

    const parentPath = dirname(file.relativePath);
    const fileName = file.relativePath.split("/").pop() ?? "";
    if (fileName.endsWith(".md")) {
      const folderName = fileName.replace(/\.md$/, "");
      const potentialFolderPath = parentPath ? `${parentPath}/${folderName}` : folderName;

      if (folderPaths.has(potentialFolderPath) && isFolderDescriptionFile(file, folderName)) {
        descriptionFiles.add(file.relativePath);
      }
    }
  });

  function ensureFolder(folderPath: string): VaultTreeNode {
    const existing = folders.get(folderPath);
    if (existing) {
      return existing;
    }

    const name = folderPath.split("/").pop() ?? folderPath;
    const node: VaultTreeNode = { name, path: folderPath, kind: "folder", children: [] };
    folders.set(folderPath, node);
    const parentPath = dirname(folderPath);
    if (parentPath) {
      ensureFolder(parentPath).children.push(node);
    } else {
      roots.push(node);
    }
    return node;
  }

  Array.from(folderPaths)
    .sort((a, b) => a.localeCompare(b))
    .forEach((folderPath) => ensureFolder(folderPath));

  files
    .filter((file) =>
      (includeHiddenMetadata || !isHiddenMetadata(file.relativePath)) &&
      file.relativePath !== hiddenRootFile &&
      !descriptionFiles.has(file.relativePath)
    )
    .forEach((file) => {
      const parentPath = dirname(file.relativePath);
      const node: VaultTreeNode = {
        name: file.relativePath.split("/").pop() ?? file.relativePath,
        path: file.relativePath,
        kind: "file",
        children: [],
      };
      if (parentPath) {
        ensureFolder(parentPath).children.push(node);
      } else {
        roots.push(node);
      }
    });

  folders.forEach((folder) => {
    const folderName = folder.name;
    const parentPath = dirname(folder.path);
    const expectedDescPath = parentPath ? `${parentPath}/${folderName}.md` : `${folderName}.md`;
    if (descriptionFiles.has(expectedDescPath)) {
      folder.hasDescription = true;
      folder.descriptionPath = expectedDescPath;
    }
  });

  function sort(nodes: VaultTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sort(node.children));
  }
  sort(roots);
  return roots;
}

function detectUniverses(files: VaultFile[], directories: string[], entities: Entity[]): Universe[] {
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

function parseTaxonomy(files: VaultFile[], findings: ValidationFinding[]): Taxonomy | undefined {
  const taxonomyFile = files.find((file) => file.relativePath === ".everend/taxonomy.yaml");
  if (!taxonomyFile) {
    return undefined;
  }

  try {
    const parsed = YAML.parse(taxonomyFile.content, { mapAsMap: true }) as Taxonomy | null;
    if (!parsed || typeof parsed !== "object") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          "Taxonomy manifest must contain a YAML object.",
          taxonomyFile.relativePath,
        ),
      );
      return undefined;
    }

    if (parsed.specVersion !== "0.1") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          'Taxonomy manifest must use specVersion "0.1".',
          taxonomyFile.relativePath,
          "specVersion",
        ),
      );
    }

    if (!parsed.types || typeof parsed.types !== "object") {
      findings.push(
        createFinding(
          "missing_required_field",
          "error",
          "Taxonomy manifest must define a types object.",
          taxonomyFile.relativePath,
          "types",
        ),
      );
    }

    Object.entries(parsed.types ?? {}).forEach(([typeName, typeDefinition]) => {
      if (!typeDefinition.label) {
        findings.push(
          createFinding(
            "missing_required_field",
            "error",
            `Taxonomy type "${typeName}" is missing label.`,
            taxonomyFile.relativePath,
            `types.${typeName}.label`,
          ),
        );
      }

      Object.entries(typeDefinition.properties ?? {}).forEach(([propertyName, propertyDefinition]) => {
        if (!ALLOWED_PROPERTY_TYPES.has(propertyDefinition.type)) {
          findings.push(
            createFinding(
              "missing_required_field",
              "error",
              `Property "${propertyName}" uses unsupported type "${propertyDefinition.type}".`,
              taxonomyFile.relativePath,
              `types.${typeName}.properties.${propertyName}.type`,
            ),
          );
        }
      });
    });

    return parsed;
  } catch (error) {
    findings.push(
      createFinding(
        "missing_required_field",
        "error",
        `Could not parse taxonomy manifest: ${error instanceof Error ? error.message : String(error)}`,
        taxonomyFile.relativePath,
      ),
    );
    return undefined;
  }
}

function mergeWithStarterTaxonomy(taxonomy: Taxonomy | undefined): Taxonomy {
  return {
    specVersion: taxonomy?.specVersion ?? "0.1",
    types: {
      ...STARTER_TAXONOMY.types,
      ...(taxonomy?.types ?? {}),
    },
  };
}

export function indexVault(readResult: VaultReadResult): VaultIndex {
  const findings: ValidationFinding[] = [];
  const markdownFiles = readResult.files.filter((file) => file.relativePath.endsWith(".md"));
  const taxonomy = mergeWithStarterTaxonomy(parseTaxonomy(readResult.files, findings));
  const templates = parseTemplates(readResult.files);
  const universeProfile = parseUniverseProfile(readResult.files, findings);
  const taxonomyConfig = parseTaxonomyConfig(readResult.files, findings);
  const entities: Entity[] = [];
  const ids = new Map<string, Entity[]>();

  for (const file of markdownFiles) {
    if (file.relativePath.endsWith("README.md")) {
      continue;
    }

    if (!file.content.startsWith("---")) {
      findings.push(
        createFinding(
          "missing_frontmatter",
          "error",
          "Markdown entity is missing YAML frontmatter.",
          file.relativePath,
        ),
      );
      continue;
    }

    let parsed: ParsedMarkdown;
    try {
      parsed = parseMarkdownFrontmatter(file.content);
    } catch (error) {
      findings.push(
        createFinding(
          "missing_frontmatter",
          "error",
          `Could not parse frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          file.relativePath,
        ),
      );
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!parsed.data[field]) {
        findings.push(
          createFinding(
            "missing_required_field",
            "error",
            `Entity is missing required field ${field}.`,
            file.relativePath,
            field,
          ),
        );
      }
    }

    const id = asString(parsed.data.id) || `missing-id:${file.relativePath}`;
    const type = asString(parsed.data.type) || "unknown";
    const name = asString(parsed.data.name) || basenameWithoutExtension(file.relativePath);
    const status = asString(parsed.data.status) || "unknown";
    const customProperties = Object.fromEntries(
      Object.entries(parsed.data).filter(([key]) => !BASE_ENTITY_FIELDS.has(key)),
    );

    const entity: Entity = {
      id,
      type,
      name,
      status,
      tags: toStringArray(parsed.data.tags),
      aliases: toStringArray(parsed.data.aliases),
      parentId: asString(parsed.data.parentId) || undefined,
      childrenIds: toStringArray(parsed.data.childrenIds),
      customProperties,
      body: parsed.content.trim(),
      path: file.relativePath,
      file,
      wikilinks: extractWikilinks(parsed.content),
      backlinks: [],
    };

    entities.push(entity);
    ids.set(entity.id, [...(ids.get(entity.id) ?? []), entity]);

    // Validate against taxonomy if configured
    if (taxonomyConfig) {
      const taxonomyFindings = validateAgainstTaxonomy(entity, taxonomyConfig, file.relativePath);
      findings.push(...taxonomyFindings);
    }
  }

  for (const [id, matchingEntities] of ids.entries()) {
    if (matchingEntities.length > 1) {
      matchingEntities.forEach((entity) =>
        findings.push(
          createFinding("duplicate_id", "error", `Duplicate entity id "${id}".`, entity.path, "id"),
        ),
      );
    }
  }

  const linkTargets = new Map<string, Entity>();
  entities.forEach((entity) => {
    linkTargets.set(normalizeKey(entity.id), entity);
    linkTargets.set(normalizeKey(entity.name), entity);
    linkTargets.set(normalizeKey(basenameWithoutExtension(entity.path)), entity);
    entity.aliases.forEach((alias) => linkTargets.set(normalizeKey(alias), entity));
  });

  entities.forEach((source) => {
    source.wikilinks.forEach((wikilink) => {
      const target = linkTargets.get(normalizeKey(wikilink));
      if (!target) {
        findings.push(
          createFinding(
            "broken_wikilink",
            "warning",
            `Could not resolve wikilink [[${wikilink}]].`,
            source.path,
          ),
        );
        return;
      }

      target.backlinks.push(source.id);
    });
  });

  entities.forEach((entity) => {
    const missingParent = entity.parentId && !ids.has(entity.parentId);
    if (missingParent) {
      findings.push(
        createFinding(
          "missing_canon_ref",
          "warning",
          `Parent entity "${entity.parentId}" was not found.`,
          entity.path,
          "parentId",
        ),
      );
    }

    entity.childrenIds.forEach((childId) => {
      if (!ids.has(childId)) {
        findings.push(
          createFinding(
            "missing_canon_ref",
            "warning",
            `Child entity "${childId}" was not found.`,
            entity.path,
            "childrenIds",
          ),
        );
      }
    });
  });

  const typeCounts = entities.reduce<Record<string, number>>((counts, entity) => {
    counts[entity.type] = (counts[entity.type] ?? 0) + 1;
    return counts;
  }, {});

  readResult.errors.forEach((error) =>
    findings.push(
      createFinding("missing_runtime_asset", "warning", error.message, error.relativePath),
    ),
  );

  entities.sort((a, b) => a.name.localeCompare(b.name));
  const directories = readResult.directories ?? [];
  const universes = detectUniverses(readResult.files, directories, entities);
  const hiddenRootFile = `${pathName(readResult.rootPath)}.md`;

  return {
    rootPath: readResult.rootPath,
    files: readResult.files,
    directories,
    markdownFiles,
    taxonomy,
    taxonomyConfig,
    templates,
    universeProfile,
    universes,
    tree: buildTree(readResult.files, directories, false, hiddenRootFile),
    entities,
    findings,
    readErrors: readResult.errors,
    typeCounts,
  };
}

export function taxonomyToYaml(taxonomy: Taxonomy): string {
  return YAML.stringify({
    specVersion: taxonomy.specVersion ?? "0.1",
    types: taxonomy.types,
  });
}

export function defaultTemplateForType(type: string): string {
  return `---
id: {{id}}
type: {{type}}
name: {{name}}
status: {{status}}
tags: []
---

# {{name}}

<!-- Default ${type} template. -->
`;
}

export function createTypeDefinition(type: string): TaxonomyType {
  const label = type
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
  return {
    label: label || type,
    description: "",
    properties: {},
  };
}
