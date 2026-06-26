import type { TaxonomyConfig, CustomFieldDefinition } from "../editorTypes";

/**
 * Property template for quick setup
 */
export type PropertyTemplate = {
  id: string;
  label: string;
  description: string;
  /**
   * IDs of base properties to show by default
   */
  visibleBaseProperties: string[];
  /**
   * Custom field definitions to add
   */
  customFields: CustomFieldDefinition[];
  /**
   * Optional per-type property visibility and order.
   */
  typeProperties?: Record<string, string[]>;
};

/**
 * Minimal template - Only essential fields
 * Shows: id, name, type
 */
export const MINIMAL_TEMPLATE: PropertyTemplate = {
  id: "minimal",
  label: "Minimal",
  description: "Only essential fields (id, name, type)",
  visibleBaseProperties: ["type"],
  customFields: [],
};

/**
 * Standard template - Common fields for most use cases
 * Shows: id, name, type + status
 */
export const STANDARD_TEMPLATE: PropertyTemplate = {
  id: "standard",
  label: "Standard",
  description: "Common fields for most use cases (+ status)",
  visibleBaseProperties: ["type"],
  customFields: [
    {
      id: "status",
      label: "Status",
      type: "select",
      description: "Editorial state for this note",
      required: false,
    },
  ],
};

/**
 * Collaborative template - For team collaboration
 * Shows: id, name, type + status, author, lastModified, assignee
 */
export const COLLABORATIVE_TEMPLATE: PropertyTemplate = {
  id: "collaborative",
  label: "Collaborative",
  description: "Team collaboration with author tracking and assignments",
  visibleBaseProperties: ["type"],
  customFields: [
    {
      id: "status",
      label: "Status",
      type: "select",
      description: "Editorial state for this note",
      required: false,
    },
    {
      id: "author",
      label: "Author",
      type: "text",
      description: "Person who created this entity",
      required: false,
    },
    {
      id: "lastModified",
      label: "Last Modified",
      type: "date",
      description: "Date of last modification",
      required: false,
    },
    {
      id: "assignee",
      label: "Assignee",
      type: "text",
      description: "Person assigned to this entity",
      required: false,
    },
  ],
};

/**
 * Worldbuilding template - For narrative universe building
 * Adds worldbuilding properties on top of the protected id/name/type base.
 */
export const WORLDBUILDING_TEMPLATE: PropertyTemplate = {
  id: "worldbuilding",
  label: "Worldbuilding",
  description: "Narrative universe with type-aware properties for characters, places, items, events and stories",
  visibleBaseProperties: ["type"],
  customFields: [
    {
      id: "status",
      label: "Status",
      type: "select",
      description: "Editorial state for this note",
      required: false,
      options: [
        { value: "idea", label: "Idea", color: "#94a3b8" },
        { value: "draft", label: "Draft", color: "#64748b" },
        { value: "semi-canon", label: "Semi-canon", color: "#f59e0b" },
        { value: "canon", label: "Canon", color: "#10b981" },
        { value: "archived", label: "Archived", color: "#6b7280" },
      ],
    },
    {
      id: "aliases",
      label: "Aliases",
      type: "text",
      description: "Alternative names or search labels",
      required: false,
    },
    {
      id: "worldbuilding-details",
      label: "Worldbuilding Details",
      type: "group",
      description: "Type-aware worldbuilding fields",
      required: false,
      children: [
        {
          id: "role",
          label: "Role",
          type: "select",
          description: "Narrative function for a character or organization",
          required: false,
          visibleWhen: { type: ["character", "organization"] },
          options: [
            { value: "protagonist", label: "Protagonist" },
            { value: "antagonist", label: "Antagonist" },
            { value: "ally", label: "Ally" },
            { value: "mentor", label: "Mentor" },
            { value: "supporting", label: "Supporting" },
          ],
        },
        {
          id: "affiliation",
          label: "Affiliation",
          type: "entity-ref",
          description: "Organization, faction, house, or group connected to this note",
          required: false,
          visibleWhen: { type: ["character"] },
          targetTypes: ["organization"],
        },
        {
          id: "home",
          label: "Home",
          type: "entity-ref",
          description: "Primary place connected to this note",
          required: false,
          visibleWhen: { type: ["character", "organization"] },
          targetTypes: ["location"],
        },
        {
          id: "arc",
          label: "Arc",
          type: "select",
          description: "Narrative arc state",
          required: false,
          visibleWhen: { type: ["character", "story", "scene", "quest"] },
          options: [
            { value: "setup", label: "Setup" },
            { value: "rising", label: "Rising" },
            { value: "turning-point", label: "Turning Point" },
            { value: "climax", label: "Climax" },
            { value: "resolution", label: "Resolution" },
          ],
        },
        {
          id: "scale",
          label: "Scale",
          type: "select",
          description: "Physical or social scale",
          required: false,
          visibleWhen: { type: ["location"] },
          options: [
            { value: "room", label: "Room" },
            { value: "building", label: "Building" },
            { value: "settlement", label: "Settlement" },
            { value: "region", label: "Region" },
            { value: "world", label: "World" },
          ],
        },
        {
          id: "region",
          label: "Region",
          type: "entity-ref",
          description: "Parent or surrounding location",
          required: false,
          visibleWhen: { type: ["location"] },
          targetTypes: ["location"],
        },
        {
          id: "population",
          label: "Population",
          type: "text",
          description: "Population estimate or known inhabitants",
          required: false,
          visibleWhen: { type: ["location"] },
        },
        {
          id: "parentId",
          label: "Parent",
          type: "entity-ref",
          description: "Parent entity ID",
          required: false,
          visibleWhen: { type: ["organization"] },
        },
        {
          id: "childrenIds",
          label: "Children",
          type: "entity-ref-list",
          description: "Child entity IDs",
          required: false,
          visibleWhen: { type: ["organization"] },
        },
        {
          id: "rarity",
          label: "Rarity",
          type: "select",
          description: "How common or legendary an item is",
          required: false,
          visibleWhen: { type: ["item"] },
          options: [
            { value: "common", label: "Common" },
            { value: "uncommon", label: "Uncommon" },
            { value: "rare", label: "Rare" },
            { value: "legendary", label: "Legendary" },
            { value: "unique", label: "Unique" },
          ],
        },
        {
          id: "material",
          label: "Material",
          type: "text",
          description: "Primary material, component, or substance",
          required: false,
          visibleWhen: { type: ["item"] },
        },
        {
          id: "owner",
          label: "Owner",
          type: "entity-ref",
          description: "Current or notable owner",
          required: false,
          visibleWhen: { type: ["item"] },
          targetTypes: ["character", "organization"],
        },
        {
          id: "date",
          label: "Date",
          type: "date",
          description: "In-world or planning date",
          required: false,
          visibleWhen: { type: ["event"] },
        },
        {
          id: "location",
          label: "Location",
          type: "entity-ref",
          description: "Place where this event, scene, or object belongs",
          required: false,
          visibleWhen: { type: ["item", "event", "story", "scene", "quest"] },
          targetTypes: ["location"],
        },
        {
          id: "participants",
          label: "Participants",
          type: "entity-ref-list",
          description: "Characters or organizations involved",
          required: false,
          visibleWhen: { type: ["event", "story", "scene", "quest"] },
          targetTypes: ["character", "organization"],
        },
        {
          id: "theme",
          label: "Theme",
          type: "text",
          description: "Major idea, motif, or concept family",
          required: false,
          visibleWhen: { type: ["concept"] },
        },
        {
          id: "rules",
          label: "Rules",
          type: "text",
          description: "Important constraints, laws, or operating rules",
          required: false,
          visibleWhen: { type: ["concept"] },
        },
        {
          id: "category",
          label: "Category",
          type: "select",
          description: "Worldbuilding category",
          required: false,
          visibleWhen: { type: ["concept"] },
          options: [
            { value: "character", label: "Character" },
            { value: "location", label: "Location" },
            { value: "item", label: "Item" },
            { value: "event", label: "Event" },
            { value: "concept", label: "Concept" },
            { value: "faction", label: "Faction" },
          ],
        },
        {
          id: "lore-level",
          label: "Lore Level",
          type: "select",
          description: "Level of detail/canonicity",
          required: false,
          visibleWhen: { type: ["character", "location", "organization", "item", "event", "concept", "story", "scene", "quest"] },
          options: [
            { value: "canon", label: "Canon" },
            { value: "semi-canon", label: "Semi-Canon" },
            { value: "draft", label: "Draft" },
            { value: "idea", label: "Idea" },
          ],
        },
      ],
    },
  ],
  typeProperties: {
    character: ["type", "status", "aliases", "worldbuilding-details"],
    location: ["type", "status", "aliases", "worldbuilding-details"],
    organization: ["type", "status", "aliases", "worldbuilding-details"],
    item: ["type", "status", "aliases", "worldbuilding-details"],
    event: ["type", "status", "aliases", "worldbuilding-details"],
    concept: ["type", "status", "aliases", "worldbuilding-details"],
    story: ["type", "status", "aliases", "worldbuilding-details"],
    scene: ["type", "status", "aliases", "worldbuilding-details"],
    quest: ["type", "status", "aliases", "worldbuilding-details"],
  },
};

/**
 * Task Management template - For project/task tracking
 * Shows: id, name, type + status, priority, dueDate, assignee
 */
export const TASK_MANAGEMENT_TEMPLATE: PropertyTemplate = {
  id: "task-management",
  label: "Task Management",
  description: "Project and task tracking with priorities and deadlines",
  visibleBaseProperties: ["type"],
  customFields: [
    {
      id: "status",
      label: "Status",
      type: "select",
      description: "Task state",
      required: false,
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      description: "Task priority level",
      required: false,
      options: [
        { value: "urgent", label: "🔴 Urgent" },
        { value: "high", label: "🟠 High" },
        { value: "medium", label: "🟡 Medium" },
        { value: "low", label: "🟢 Low" },
      ],
    },
    {
      id: "dueDate",
      label: "Due Date",
      type: "date",
      description: "Task deadline",
      required: false,
    },
    {
      id: "assignee",
      label: "Assignee",
      type: "text",
      description: "Person assigned to this task",
      required: false,
    },
  ],
};

/**
 * All available property templates
 */
export const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  WORLDBUILDING_TEMPLATE,
];

/**
 * Apply a property template to a taxonomy config
 */
export function applyPropertyTemplate(
  taxonomyConfig: TaxonomyConfig,
  template: PropertyTemplate
): TaxonomyConfig {
  if (!taxonomyConfig.baseProperties) {
    throw new Error("Taxonomy config must have baseProperties defined");
  }

  const newVisibleByDefault = [...template.visibleBaseProperties];

  // Merge custom fields (avoid duplicates)
  const existingCustomFieldIds = new Set(
    taxonomyConfig.customFields?.definitions.map((f: CustomFieldDefinition) => f.id) || []
  );
  
  const newCustomFields = [
    ...(taxonomyConfig.customFields?.definitions || []),
    ...template.customFields.filter((field) => !existingCustomFieldIds.has(field.id)),
  ];
  const templateFieldIds = template.customFields.map((field) => field.id);
  const globalTemplateFieldIds = templateFieldIds.filter((id) =>
    Object.values(template.typeProperties ?? {}).every((properties) => properties.includes(id)),
  );

  return {
    ...taxonomyConfig,
    baseProperties: {
      ...taxonomyConfig.baseProperties,
      visibleByDefault: newVisibleByDefault,
      order: [...newVisibleByDefault],
    },
    entityTypes: template.typeProperties
      ? {
          ...taxonomyConfig.entityTypes,
          definitions: taxonomyConfig.entityTypes.definitions.map((definition) => {
            const typePropertyIds = template.typeProperties?.[definition.id];
            if (!typePropertyIds) return definition;
            const customFields = typePropertyIds.filter((id) => templateFieldIds.includes(id));
            return {
              ...definition,
              customFields,
              visibleProperties: typePropertyIds.filter((id) => template.visibleBaseProperties.includes(id)),
              propertyOrder: typePropertyIds,
            };
          }),
        }
      : taxonomyConfig.entityTypes,
    customFields: {
      definitions: newCustomFields,
      globalFields: [
        ...new Set([...(taxonomyConfig.customFields?.globalFields || []), ...(template.typeProperties ? globalTemplateFieldIds : templateFieldIds)]),
      ],
    },
  };
}

/**
 * Get a template by ID
 */
export function getTemplateById(templateId: string): PropertyTemplate | undefined {
  return PROPERTY_TEMPLATES.find((t) => t.id === templateId);
}
