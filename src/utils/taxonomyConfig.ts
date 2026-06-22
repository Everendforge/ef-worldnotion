import type {
  CustomFieldDefinition,
  CustomFieldType,
  EntityTypeDefinition,
  StatusDefinition,
  TagHierarchyNode,
  TaxonomyConfig,
} from "../editorTypes";

export type TaxonomyEntityInput = {
  type: string;
  status: string;
  tags: string[];
  customProperties: Record<string, unknown>;
};

export function createDefaultTaxonomyConfig(): TaxonomyConfig {
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

function buildTagHierarchy(tags: string[]): TagHierarchyNode[] {
  const rootMap = new Map<string, TagHierarchyNode>();

  tags.forEach((tag) => {
    const parts = tag.split("/");
    let currentPath = "";

    parts.forEach((part, index) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (index === 0) {
        if (!rootMap.has(currentPath)) {
          rootMap.set(currentPath, {
            id: `tag-${currentPath}`,
            label: part,
            fullPath: currentPath,
            children: [],
          });
        }
      } else {
        const findAndAddChild = (nodes: TagHierarchyNode[]): boolean => {
          for (const node of nodes) {
            if (node.fullPath === parentPath) {
              const existing = node.children.find((child) => child.fullPath === currentPath);
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
}

export function generateTaxonomyFromEntities(entities: TaxonomyEntityInput[]): TaxonomyConfig {
  const tagSet = new Set<string>();
  const typeSet = new Set<string>();
  const statusSet = new Set<string>();
  const propertyFrequency = new Map<string, number>();
  const propertyExamples = new Map<string, Set<unknown>>();

  entities.forEach((entity) => {
    entity.tags.forEach((tag) => tagSet.add(tag));
    if (entity.type) typeSet.add(entity.type);
    if (entity.status) statusSet.add(entity.status);

    Object.entries(entity.customProperties).forEach(([key, value]) => {
      propertyFrequency.set(key, (propertyFrequency.get(key) || 0) + 1);
      if (!propertyExamples.has(key)) {
        propertyExamples.set(key, new Set());
      }
      propertyExamples.get(key)!.add(value);
    });
  });

  const entityTypeDefinitions: EntityTypeDefinition[] = Array.from(typeSet)
    .filter((type) => type !== "")
    .map((type) => ({
      id: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      customFields: [],
    }));

  const statusDefinitions: StatusDefinition[] = Array.from(statusSet)
    .filter((status) => status !== "")
    .map((status, index) => ({
      id: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      order: index,
    }));

  const threshold = Math.max(3, Math.floor(entities.length * 0.1));
  const customFieldDefinitions: CustomFieldDefinition[] = Array.from(propertyFrequency.entries())
    .filter(([, count]) => count >= threshold)
    .map(([key]) => {
      const examples = Array.from(propertyExamples.get(key) || []);

      let fieldType: CustomFieldType = "text";
      if (examples.every((value) => typeof value === "boolean")) {
        fieldType = "boolean";
      } else if (examples.every((value) => typeof value === "number")) {
        fieldType = "number";
      } else if (examples.every((value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(String(value)))) {
        fieldType = "date";
      } else if (examples.length <= 10 && examples.every((value) => typeof value === "string")) {
        fieldType = "select";
      }

      return {
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        type: fieldType,
        ...(fieldType === "select" && {
          options: examples.map((value) => ({
            label: String(value),
            value: String(value),
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
      definitions: entityTypeDefinitions.length > 0 ? entityTypeDefinitions : createDefaultTaxonomyConfig().entityTypes.definitions,
      defaultType: entityTypeDefinitions.length > 0 ? entityTypeDefinitions[0].id : "concept",
      allowCustomTypes: true,
    },
    statuses: {
      definitions: statusDefinitions.length > 0 ? statusDefinitions : createDefaultTaxonomyConfig().statuses.definitions,
      defaultStatus: statusDefinitions.length > 0 ? statusDefinitions[0].id : "draft",
      allowCustomStatuses: true,
    },
    customFields: {
      definitions: customFieldDefinitions,
      globalFields: customFieldDefinitions.map((field) => field.id),
    },
  };
}

export function mergeTagHierarchy(predefinedTags: TagHierarchyNode[], detectedTags: string[]): TagHierarchyNode[] {
  const tagMap = new Map<string, TagHierarchyNode>();

  const addToMap = (node: TagHierarchyNode) => {
    tagMap.set(node.fullPath, node);
    node.children.forEach(addToMap);
  };
  predefinedTags.forEach(addToMap);

  detectedTags.forEach((tag) => {
    if (tag.includes("/")) {
      const parts = tag.split("/").filter(Boolean);
      let currentPath = "";
      let parentId: string | undefined;

      parts.forEach((part) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!tagMap.has(currentPath)) {
          const newNode: TagHierarchyNode = {
            id: currentPath.replace(/\//g, "-"),
            label: part,
            fullPath: currentPath,
            children: [],
            parentId,
          };

          tagMap.set(currentPath, newNode);

          if (parentId) {
            const parent = Array.from(tagMap.values()).find((node) => node.id === parentId);
            if (parent && !parent.children.some((child) => child.id === newNode.id)) {
              parent.children.push(newNode);
            }
          }
        }

        parentId = currentPath.replace(/\//g, "-");
      });
    }
  });

  return Array.from(tagMap.values()).filter((node) => !node.parentId);
}
