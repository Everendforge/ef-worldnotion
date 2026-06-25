/**
 * Utility functions for working with hierarchical property structures.
 * Handles traversal, search, validation of circular dependencies, and flattening.
 */

import { PropertyDefinition } from "../editorTypes";

/**
 * Traverse property tree depth-first, executing callback on each node.
 */
export function traversePropertyTree(
  definitions: PropertyDefinition[],
  callback: (def: PropertyDefinition, depth: number, parent?: PropertyDefinition) => void,
  depth: number = 0,
  parent?: PropertyDefinition
): void {
  definitions.forEach((def) => {
    callback(def, depth, parent);
    if (def.children && def.children.length > 0) {
      traversePropertyTree(def.children, callback, depth + 1, def);
    }
  });
}

/**
 * Find a property definition by ID anywhere in the tree.
 */
export function findPropertyById(
  definitions: PropertyDefinition[],
  id: string
): PropertyDefinition | null {
  let result: PropertyDefinition | null = null;

  traversePropertyTree(definitions, (def) => {
    if (def.id === id) {
      result = def;
    }
  });

  return result;
}

/**
 * Find all properties that have a given property as parent/ancestor.
 */
export function findChildrenOf(
  definitions: PropertyDefinition[],
  parentId: string
): PropertyDefinition[] {
  const children: PropertyDefinition[] = [];

  const parent = findPropertyById(definitions, parentId);
  if (parent?.children) {
    traversePropertyTree(parent.children, (def) => {
      children.push(def);
    });
  }

  return children;
}

/**
 * Flatten tree into a flat array with depth info.
 * Useful for rendering and validation.
 */
export interface FlatPropertyNode {
  definition: PropertyDefinition;
  depth: number;
  parentId?: string;
}

export function flattenPropertyTree(definitions: PropertyDefinition[]): FlatPropertyNode[] {
  const flat: FlatPropertyNode[] = [];

  traversePropertyTree(definitions, (def, depth, parent) => {
    flat.push({
      definition: def,
      depth,
      parentId: parent?.id,
    });
  });

  return flat;
}

/**
 * Get all properties at a given depth level.
 */
export function getPropertiesAtDepth(
  definitions: PropertyDefinition[],
  depth: number
): PropertyDefinition[] {
  const result: PropertyDefinition[] = [];

  traversePropertyTree(definitions, (def, d) => {
    if (d === depth) {
      result.push(def);
    }
  });

  return result;
}

/**
 * Get path from root to a property.
 * Example: ['character-powers', 'power-level']
 */
export function getPropertyPath(
  definitions: PropertyDefinition[],
  targetId: string
): string[] {
  let path: string[] = [];

  function findPath(defs: PropertyDefinition[], target: string, current: string[]): boolean {
    for (const def of defs) {
      const newPath = [...current, def.id];
      if (def.id === target) {
        path = newPath;
        return true;
      }
      if (def.children && findPath(def.children, target, newPath)) {
        return true;
      }
    }
    return false;
  }

  findPath(definitions, targetId, []);
  return path;
}

/**
 * Check if a property is a child of another (directly or indirectly).
 */
export function isChildOf(
  definitions: PropertyDefinition[],
  childId: string,
  parentId: string
): boolean {
  const path = getPropertyPath(definitions, childId);
  return path.includes(parentId);
}

/**
 * Detect circular dependencies in property tree.
 * A circular dependency is when Property A lists Property B as parent,
 * but Property B is a child of Property A.
 */
export function hasCircularDependency(definitions: PropertyDefinition[]): boolean {
  const flat = flattenPropertyTree(definitions);

  for (const node of flat) {
    if (node.definition.visibleWhen) {
      for (const parentId of Object.keys(node.definition.visibleWhen)) {
        // If current property is a child of this parent, it's a cycle
        if (isChildOf(definitions, parentId, node.definition.id)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get all broken references in visibleWhen clauses.
 * Returns array of {propertyId, missingParentIds}.
 */
export function findBrokenReferences(
  definitions: PropertyDefinition[]
): Array<{ propertyId: string; missingParentIds: string[] }> {
  const flat = flattenPropertyTree(definitions);
  const allIds = new Set(flat.map((n) => n.definition.id));
  const broken: Array<{ propertyId: string; missingParentIds: string[] }> = [];

  for (const node of flat) {
    if (node.definition.visibleWhen) {
      const missing = Object.keys(node.definition.visibleWhen).filter((id) => !allIds.has(id));
      if (missing.length > 0) {
        broken.push({
          propertyId: node.definition.id,
          missingParentIds: missing,
        });
      }
    }
  }

  return broken;
}

/**
 * Check if a property should be visible based on parent values.
 * Returns true if all visibleWhen conditions are met.
 */
export function isPropertyVisible(
  property: PropertyDefinition,
  parentValues: Record<string, unknown>
): boolean {
  if (!property.visibleWhen) return true;

  // All conditions must be true (AND logic)
  return Object.entries(property.visibleWhen).every(([parentId, allowedValues]) => {
    const parentValue = parentValues[parentId];
    return allowedValues.includes(String(parentValue));
  });
}

/**
 * Get all visible children of a property given parent values.
 */
export function getVisibleChildren(
  property: PropertyDefinition,
  parentValues: Record<string, unknown>
): PropertyDefinition[] {
  if (!property.children) return [];

  return property.children.filter((child) => isPropertyVisible(child, parentValues));
}

/**
 * Recursively get all visible properties in tree.
 */
export function getVisiblePropertiesRecursive(
  definitions: PropertyDefinition[],
  parentValues: Record<string, unknown>
): PropertyDefinition[] {
  const visible: PropertyDefinition[] = [];

  function traverse(defs: PropertyDefinition[]): void {
    defs.forEach((def) => {
      if (isPropertyVisible(def, parentValues)) {
        visible.push(def);
        if (def.children) {
          traverse(def.children);
        }
      }
    });
  }

  traverse(definitions);
  return visible;
}

/**
 * Sort properties by order field, falling back to natural order.
 */
export function sortPropertiesByOrder(definitions: PropertyDefinition[]): PropertyDefinition[] {
  return [...definitions].sort((a, b) => {
    const aOrder = a.order ?? Infinity;
    const bOrder = b.order ?? Infinity;
    return aOrder - bOrder;
  });
}

/**
 * Group properties by their `group` field for UI rendering.
 */
export function groupPropertiesByCategory(
  definitions: PropertyDefinition[]
): Map<string | undefined, PropertyDefinition[]> {
  const grouped = new Map<string | undefined, PropertyDefinition[]>();

  definitions.forEach((def) => {
    const groupKey = def.group;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(def);
  });

  return grouped;
}

/**
 * Migrate properties from v1.0 (flat) to v2.0 (hierarchical).
 * Simply wraps each flat property with empty children.
 */
export function migrateV1toV2(v1Properties: PropertyDefinition[]): PropertyDefinition[] {
  return v1Properties.map((prop) => ({
    ...prop,
    children: prop.children || [],
    visibleWhen: prop.visibleWhen || undefined,
    group: prop.group || undefined,
  }));
}

/**
 * Get property by path (e.g., ['character-powers', 'power-level']).
 */
export function getPropertyByPath(
  definitions: PropertyDefinition[],
  path: string[]
): PropertyDefinition | null {
  if (path.length === 0) return null;

  let current = definitions.find((d) => d.id === path[0]);
  if (!current) return null;

  for (let i = 1; i < path.length; i++) {
    if (!current.children) return null;
    current = current.children.find((d) => d.id === path[i]);
    if (!current) return null;
  }

  return current;
}

/**
 * Clone a property tree deeply, useful for edits without mutation.
 */
export function deepCloneProperty(property: PropertyDefinition): PropertyDefinition {
  return {
    ...property,
    children: property.children?.map(deepCloneProperty),
    options: property.options ? [...property.options] : undefined,
    visibleWhen: property.visibleWhen ? { ...property.visibleWhen } : undefined,
  };
}

/**
 * Recursively update a property in the tree by ID.
 */
export function updatePropertyInTree(
  definitions: PropertyDefinition[],
  propertyId: string,
  updates: Partial<PropertyDefinition>
): PropertyDefinition[] {
  return definitions.map((def) => {
    if (def.id === propertyId) {
      return { ...def, ...updates };
    }
    if (def.children) {
      return {
        ...def,
        children: updatePropertyInTree(def.children, propertyId, updates),
      };
    }
    return def;
  });
}

/**
 * Remove a property from tree by ID.
 */
export function removePropertyFromTree(
  definitions: PropertyDefinition[],
  propertyId: string
): PropertyDefinition[] {
  return definitions
    .filter((def) => def.id !== propertyId)
    .map((def) => {
      if (def.children) {
        return {
          ...def,
          children: removePropertyFromTree(def.children, propertyId),
        };
      }
      return def;
    });
}
