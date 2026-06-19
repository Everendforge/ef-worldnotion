import type { Entity } from "../domain";

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  path: string;
  degree: number;
  group: string;
  tags: string[];
  entity: Entity;
}

export interface GraphLink {
  source: string;
  target: string;
  type: "wikilink" | "hierarchy" | "tag";
  strength: number;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphOptions {
  mode: "global" | "local";
  centerNodeId?: string;
  depth?: number;
  filterTypes?: string[];
  filterTags?: string[];
  showWikilinks?: boolean;
  showHierarchy?: boolean;
  showTagRelations?: boolean;
}

/**
 * Build graph data from entities based on provided options.
 * Transforms Entity[] into { nodes, links } structure for force-graph.
 */
export function buildGraphData(
  entities: Entity[],
  options: GraphOptions
): GraphData {
  const {
    mode,
    centerNodeId,
    depth = 1,
    filterTypes,
    filterTags,
    showWikilinks = true,
    showHierarchy = true,
    showTagRelations = false,
  } = options;

  // Filter entities based on type and tags
  let filteredEntities = entities;

  if (filterTypes && filterTypes.length > 0) {
    filteredEntities = filteredEntities.filter((entity) =>
      filterTypes.includes(entity.type)
    );
  }

  if (filterTags && filterTags.length > 0) {
    filteredEntities = filteredEntities.filter((entity) =>
      entity.tags.some((tag) => filterTags.includes(tag))
    );
  }

  // For local mode, filter to only include relevant nodes
  if (mode === "local" && centerNodeId) {
    const relevantIds = getLocalGraphNodeIds(
      centerNodeId,
      filteredEntities,
      depth
    );
    filteredEntities = filteredEntities.filter((entity) =>
      relevantIds.has(entity.id)
    );
  }

  // Build nodes
  const nodes: GraphNode[] = filteredEntities.map((entity) => {
    // Calculate degree (number of connections)
    const outgoingLinks = entity.wikilinks.length;
    const incomingLinks = entity.backlinks.length;
    const hierarchyLinks =
      (entity.parentId ? 1 : 0) + entity.childrenIds.length;
    const degree = outgoingLinks + incomingLinks + hierarchyLinks;

    return {
      id: entity.id,
      label: entity.name,
      type: entity.type,
      path: entity.path,
      degree,
      group: entity.type,
      tags: entity.tags,
      entity,
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const links: GraphLink[] = [];

  // Build wikilink edges
  if (showWikilinks) {
    for (const entity of filteredEntities) {
      // Create a map of entity names and aliases to IDs for resolution
      const nameToIdMap = new Map<string, string>();
      for (const candidate of entities) {
        nameToIdMap.set(candidate.name.toLowerCase(), candidate.id);
        for (const alias of candidate.aliases) {
          nameToIdMap.set(alias.toLowerCase(), candidate.id);
        }
      }

      for (const wikilinkTarget of entity.wikilinks) {
        const targetId = nameToIdMap.get(wikilinkTarget.toLowerCase());
        if (targetId && nodeIds.has(targetId) && targetId !== entity.id) {
          // Avoid duplicate links
          const linkExists = links.some(
            (link) =>
              link.source === entity.id &&
              link.target === targetId &&
              link.type === "wikilink"
          );

          if (!linkExists) {
            links.push({
              source: entity.id,
              target: targetId,
              type: "wikilink",
              strength: 1,
            });
          }
        }
      }
    }
  }

  // Build hierarchy edges
  if (showHierarchy) {
    for (const entity of filteredEntities) {
      if (entity.parentId && nodeIds.has(entity.parentId)) {
        links.push({
          source: entity.parentId,
          target: entity.id,
          type: "hierarchy",
          strength: 1,
        });
      }
    }
  }

  // Build tag relation edges
  if (showTagRelations) {
    const processedPairs = new Set<string>();

    for (let i = 0; i < filteredEntities.length; i++) {
      for (let j = i + 1; j < filteredEntities.length; j++) {
        const entity1 = filteredEntities[i];
        const entity2 = filteredEntities[j];

        const sharedTags = entity1.tags.filter((tag) =>
          entity2.tags.includes(tag)
        );

        if (sharedTags.length > 0) {
          const pairKey = [entity1.id, entity2.id].sort().join("-");
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            links.push({
              source: entity1.id,
              target: entity2.id,
              type: "tag",
              strength: sharedTags.length,
              label: sharedTags.join(", "),
            });
          }
        }
      }
    }
  }

  return { nodes, links };
}

/**
 * Get all node IDs that should be included in a local graph view.
 * Includes the center node and all nodes within the specified depth.
 */
function getLocalGraphNodeIds(
  centerNodeId: string,
  entities: Entity[],
  depth: number
): Set<string> {
  const relevantIds = new Set<string>([centerNodeId]);
  const centerEntity = entities.find((entity) => entity.id === centerNodeId);

  if (!centerEntity) {
    return relevantIds;
  }

  // Create lookup maps for efficient traversal
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const nameToIdMap = new Map<string, string>();
  for (const entity of entities) {
    nameToIdMap.set(entity.name.toLowerCase(), entity.id);
    for (const alias of entity.aliases) {
      nameToIdMap.set(alias.toLowerCase(), entity.id);
    }
  }

  // BFS to find all nodes within depth
  const queue: Array<{ id: string; currentDepth: number }> = [
    { id: centerNodeId, currentDepth: 0 },
  ];
  const visited = new Set<string>([centerNodeId]);

  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;

    if (currentDepth >= depth) {
      continue;
    }

    const entity = entityById.get(id);
    if (!entity) continue;

    // Add connected nodes
    const connectedIds: string[] = [];

    // Wikilinks (outgoing)
    for (const wikilinkTarget of entity.wikilinks) {
      const targetId = nameToIdMap.get(wikilinkTarget.toLowerCase());
      if (targetId) {
        connectedIds.push(targetId);
      }
    }

    // Backlinks (incoming)
    connectedIds.push(...entity.backlinks);

    // Hierarchy
    if (entity.parentId) {
      connectedIds.push(entity.parentId);
    }
    connectedIds.push(...entity.childrenIds);

    // Add unvisited connected nodes to queue
    for (const connectedId of connectedIds) {
      if (!visited.has(connectedId)) {
        visited.add(connectedId);
        relevantIds.add(connectedId);
        queue.push({ id: connectedId, currentDepth: currentDepth + 1 });
      }
    }
  }

  return relevantIds;
}

/**
 * Get unique entity types from a list of entities.
 */
export function getUniqueTypes(entities: Entity[]): string[] {
  return Array.from(new Set(entities.map((entity) => entity.type))).sort();
}

/**
 * Get unique tags from a list of entities.
 */
export function getUniqueTags(entities: Entity[]): string[] {
  const allTags = entities.flatMap((entity) => entity.tags);
  return Array.from(new Set(allTags)).sort();
}

/**
 * Get color for a given entity type or relationship type.
 */
export function getNodeColor(type: string): string {
  // Hash the type string to get a consistent color
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = type.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to HSL color (varied hue, consistent saturation and lightness)
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

/**
 * Get color for a link based on its type.
 */
export function getLinkColor(linkType: "wikilink" | "hierarchy" | "tag"): string {
  switch (linkType) {
    case "wikilink":
      return "#3f7f64"; // Accent color
    case "hierarchy":
      return "#737b75"; // Muted color
    case "tag":
      return "#7cc7a2"; // Lighter accent
    default:
      return "#737b75";
  }
}
