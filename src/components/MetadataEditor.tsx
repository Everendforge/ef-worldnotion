import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import type { Entity, VaultIndex } from "../domain";
import type {
  PropertiesConfig,
  BasePropertyDefinition,
  CustomFieldDefinition,
  CustomFieldType,
} from "../editorTypes";
import {
  adaptFrontmatterProperty,
  buildInspectorPropertySections,
  changePropertyType,
  duplicateInspectorProperty,
  inferPropertyDefinition,
  knownPropertyIds,
  listAllProperties,
  listInspectableProperties,
  listUnconfiguredProperties,
  listVisibleProperties,
  moveInspectorProperty,
  NON_INSPECTOR_PROPERTY_IDS,
  parseFrontmatterRaw,
  removeFrontmatterProperty,
  renameInspectorProperty,
  emptyPropertyValue,
  getConfiguredFrontmatterOrder,
  reorderInspectorPropertySiblings,
  removeInspectorProperty,
  reorderFrontmatter,
  sanitizePropertyId,
  setInspectorPropertyVisibility,
  updateFrontmatterProperties,
  upsertInspectorProperty,
  type VisiblePropertyDefinition,
} from "../utils/propertiesConfig";
import { getPropertyPath } from "../utils/propertyTreeUtils";
import { coercePropertyValue } from "../utils/propertyValueCoercion";
import { detectOrphanedFields, inferValueType } from "../utils/frontmatterValidator";
import { useToast } from "./ToastProvider";
import { useAppDialogs } from "./DialogProvider";
import { PropertyRow, type PropertyRowHandlers } from "./properties/PropertyRow";
import { AddPropertyRow } from "./properties/AddPropertyRow";
import { PropertyContextMenu } from "./properties/PropertyContextMenu";
import { PropertyEditorPopover } from "./properties/PropertyEditorPopover";
import { LegacyMetadataFields } from "./properties/LegacyMetadataFields";

type MetadataEditorProps = {
  entity: Entity;
  propertiesConfig?: PropertiesConfig;
  rawYaml: string;
  vaultIndex?: VaultIndex;
  onUpdate: (updates: Partial<Entity>) => void;
  onUpdateRawYaml?: (yaml: string) => void;
  onUpdatePropertiesConfig?: (properties: PropertiesConfig) => void | Promise<void>;
  onConserveField?: (fieldName: string, value: unknown) => void | Promise<void>;
  onDeleteField?: (fieldName: string) => void;
  onOpenEntity?: (path: string) => void;
};

type EditableOption = { value: string; label: string; color?: string };

const ENTITY_FRONTMATTER_FIELD_IDS = new Set([
  "id",
  "name",
  "type",
  "status",
  "tags",
  "aliases",
  "parentId",
  "childrenIds",
  "folder",
]);

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function MetadataEditor({
  entity,
  propertiesConfig,
  rawYaml,
  vaultIndex,
  onUpdate,
  onUpdateRawYaml,
  onUpdatePropertiesConfig,
  onConserveField,
  onDeleteField,
  onOpenEntity,
}: MetadataEditorProps) {
  const { showToast } = useToast();
  const { confirmDialog } = useAppDialogs();
  const [adaptTargets, setAdaptTargets] = useState<Record<string, string>>({});
  const [draggedPropertyId, setDraggedPropertyId] = useState<string | null>(null);
  const [propertyContextMenu, setPropertyContextMenu] = useState<{
    x: number;
    y: number;
    propertyId?: string;
  } | null>(null);
  const [propertyEditor, setPropertyEditor] = useState<{
    propertyId: string;
    anchorEl: HTMLElement;
  } | null>(null);
  const [showHiddenProperties, setShowHiddenProperties] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const entityTypes = propertiesConfig?.entityTypes.definitions ?? [];
  const statuses = propertiesConfig?.statuses.definitions ?? [];
  const basePropertyDefs = propertiesConfig?.baseProperties?.definitions ?? [];
  const frontmatterData = useMemo(() => parseFrontmatterRaw(rawYaml), [rawYaml]);
  const configuredProperties = useMemo(
    () => listAllProperties(propertiesConfig),
    [propertiesConfig],
  );

  // Detect orphaned fields (new validator-based detection)
  const orphanedFields = useMemo(
    () => detectOrphanedFields(frontmatterData, propertiesConfig, entity.type),
    [frontmatterData, propertiesConfig, entity.type],
  );

  // Categorize issues by type
  const missingFields = useMemo(
    () => orphanedFields.filter((i) => i.type === "missing"),
    [orphanedFields],
  );
  const extraFields = useMemo(
    () => orphanedFields.filter((i) => i.type === "extra"),
    [orphanedFields],
  );
  const misorderedFields = useMemo(
    () => orphanedFields.filter((i) => i.type === "misorder"),
    [orphanedFields],
  );

  // Determine which properties to show
  const visibleProperties = useMemo(() => {
    if (basePropertyDefs.length > 0) {
      return listVisibleProperties(propertiesConfig, entity.type);
    }

    // Backward compatibility: no baseProperties defined, use legacy behavior
    return null;
  }, [basePropertyDefs.length, entity.type, propertiesConfig]);

  const inspectorProperties = useMemo(
    () =>
      visibleProperties?.filter((property) => !NON_INSPECTOR_PROPERTY_IDS.has(property.id)) ?? null,
    [visibleProperties],
  );

  const unconfiguredProperties = useMemo(
    () => listUnconfiguredProperties(frontmatterData, propertiesConfig),
    [frontmatterData, propertiesConfig],
  );

  const handlePropertyChange = (propertyId: string, value: unknown) => {
    if (ENTITY_FRONTMATTER_FIELD_IDS.has(propertyId)) {
      onUpdate({ [propertyId]: value } as Partial<Entity>);
    } else {
      onUpdate({
        customProperties: {
          ...entity.customProperties,
          [propertyId]: value,
        },
      });
    }
  };

  const getPropertyValue = (property: BasePropertyDefinition | CustomFieldDefinition): unknown => {
    if (property.id in frontmatterData) return frontmatterData[property.id];
    if (ENTITY_FRONTMATTER_FIELD_IDS.has(property.id)) return (entity as any)[property.id];
    return entity.customProperties[property.id];
  };

  const removeUnconfiguredProperty = (key: string) => {
    if (!onUpdateRawYaml) return;
    onUpdateRawYaml(removeFrontmatterProperty(rawYaml, key, propertiesConfig, entity.type));
  };

  const adaptUnconfiguredProperty = (key: string) => {
    if (!onUpdateRawYaml) return;
    const target = adaptTargets[key];
    if (!target || target === key) return;
    onUpdateRawYaml(adaptFrontmatterProperty(rawYaml, key, target, propertiesConfig, entity.type));
  };

  const saveConfig = (nextConfig: PropertiesConfig) => {
    void onUpdatePropertiesConfig?.(nextConfig);
  };

  const allInspectableProperties = useMemo(
    () => listInspectableProperties(propertiesConfig),
    [propertiesConfig],
  );

  const contextProperty = useMemo(
    () =>
      allInspectableProperties.find((property) => property.id === propertyContextMenu?.propertyId),
    [allInspectableProperties, propertyContextMenu?.propertyId],
  );

  const visiblePropertyIds = useMemo(
    () => new Set(inspectorProperties?.map((property) => property.id) ?? []),
    [inspectorProperties],
  );

  const openPropertyEditor = (propertyId: string, anchorEl: HTMLElement) => {
    setPropertyEditor({ propertyId, anchorEl });
    setPropertyContextMenu(null);
  };

  const parentIdOf = (propertyId: string): string => {
    if (!propertiesConfig) return "";
    const roots = [
      ...(propertiesConfig.baseProperties?.definitions ?? []),
      ...(propertiesConfig.customFields.definitions ?? []),
    ];
    const path = getPropertyPath(roots, propertyId);
    return path.length > 1 ? path[path.length - 2] : "";
  };

  const savePropertyDefinition = (property: CustomFieldDefinition, parentId?: string) => {
    if (!propertiesConfig) return;
    const nextConfig = upsertInspectorProperty(propertiesConfig, property, entity.type, parentId);
    saveConfig(nextConfig);
  };

  const updatePropertyDefinition = (propertyId: string, patch: Partial<CustomFieldDefinition>) => {
    if (!propertiesConfig) return;
    const property = allInspectableProperties.find((candidate) => candidate.id === propertyId);
    if (!property || !("type" in property)) return;
    const next = { ...property, ...patch } as CustomFieldDefinition;
    saveConfig(
      upsertInspectorProperty(
        propertiesConfig,
        next,
        entity.type,
        parentIdOf(propertyId) || undefined,
      ),
    );
  };

  const setPropertyDependency = (propertyId: string, parentId: string, values: string[]) => {
    const visibleWhen = parentId && values.length ? { [parentId]: values } : undefined;
    updatePropertyDefinition(propertyId, { visibleWhen });
  };

  const movePropertyParent = (propertyId: string, parentId: string | null) => {
    if (!propertiesConfig) return;
    saveConfig(moveInspectorProperty(propertiesConfig, entity.type, propertyId, parentId));
  };

  const duplicateProperty = (propertyId: string) => {
    if (!propertiesConfig) return;
    saveConfig(duplicateInspectorProperty(propertiesConfig, entity.type, propertyId));
  };

  const deletePropertyFromUniverse = async (propertyId: string) => {
    if (!propertiesConfig) return;
    const confirmed = await confirmDialog(
      "Delete this property from universe properties? Existing note values will stay until removed from frontmatter.",
      { title: "Delete property", confirmLabel: "Delete", destructive: true },
    );
    if (!confirmed) return;
    saveConfig(removeInspectorProperty(propertiesConfig, propertyId));
    setPropertyContextMenu(null);
    setPropertyEditor(null);
  };

  const removePropertyFromNote = (propertyId: string) => {
    if (!onUpdateRawYaml) return;
    onUpdateRawYaml(removeFrontmatterProperty(rawYaml, propertyId, propertiesConfig, entity.type));
    setPropertyContextMenu(null);
  };

  const getPropertyOptions = (property: BasePropertyDefinition | CustomFieldDefinition) => {
    if (property.type === "select" || property.type === "multiselect") {
      // Special handling for type and status properties
      if (property.id === "type") {
        return entityTypes.map((t) => ({ value: t.id, label: t.label, color: t.color }));
      }
      if (property.id === "status") {
        return statuses.map((s) => ({ value: s.id, label: s.label, color: s.color }));
      }

      // Use property-defined options
      return property.options;
    }
    return undefined;
  };

  const propertyCanEditOptions = (property: BasePropertyDefinition | CustomFieldDefinition) =>
    property.id === "type" ||
    property.id === "status" ||
    property.type === "select" ||
    property.type === "multiselect";

  const getEditableOptions = (
    property: BasePropertyDefinition | CustomFieldDefinition,
  ): EditableOption[] => {
    if (property.id === "type") {
      return entityTypes.map((type) => ({ value: type.id, label: type.label, color: type.color }));
    }
    if (property.id === "status") {
      return statuses.map((status) => ({
        value: status.id,
        label: status.label,
        color: status.color,
      }));
    }
    return property.options ?? [];
  };

  const updatePropertyOptions = (
    property: BasePropertyDefinition | CustomFieldDefinition,
    options: EditableOption[],
  ) => {
    if (!propertiesConfig) return;
    const normalizedOptions = options
      .map((option) => ({
        value: option.value.trim(),
        label: option.label.trim() || option.value.trim(),
        color: option.color?.trim() || undefined,
      }))
      .filter((option) => option.value.length > 0);

    if (property.id === "type") {
      const existingById = new Map(
        propertiesConfig.entityTypes.definitions.map((definition) => [definition.id, definition]),
      );
      const definitions = normalizedOptions.map((option) => ({
        ...(existingById.get(option.value) ?? { id: option.value, customFields: [] }),
        id: option.value,
        label: option.label,
        color: option.color,
      }));
      saveConfig({
        ...propertiesConfig,
        entityTypes: {
          ...propertiesConfig.entityTypes,
          definitions,
          defaultType: definitions.some(
            (definition) => definition.id === propertiesConfig.entityTypes.defaultType,
          )
            ? propertiesConfig.entityTypes.defaultType
            : (definitions[0]?.id ?? propertiesConfig.entityTypes.defaultType),
        },
      });
      return;
    }

    if (property.id === "status") {
      const existingById = new Map(
        propertiesConfig.statuses.definitions.map((definition) => [definition.id, definition]),
      );
      const definitions = normalizedOptions.map((option, index) => ({
        ...(existingById.get(option.value) ?? { id: option.value }),
        id: option.value,
        label: option.label,
        color: option.color,
        order: index,
      }));
      saveConfig({
        ...propertiesConfig,
        statuses: {
          ...propertiesConfig.statuses,
          definitions,
          defaultStatus: definitions.some(
            (definition) => definition.id === propertiesConfig.statuses.defaultStatus,
          )
            ? propertiesConfig.statuses.defaultStatus
            : (definitions[0]?.id ?? propertiesConfig.statuses.defaultStatus),
        },
      });
      return;
    }

    if ("immutable" in property) {
      saveConfig({
        ...propertiesConfig,
        baseProperties: propertiesConfig.baseProperties
          ? {
              ...propertiesConfig.baseProperties,
              definitions: propertiesConfig.baseProperties.definitions.map((definition) =>
                definition.id === property.id
                  ? { ...definition, options: normalizedOptions }
                  : definition,
              ),
            }
          : propertiesConfig.baseProperties,
      });
      return;
    }

    saveConfig({
      ...propertiesConfig,
      customFields: {
        ...propertiesConfig.customFields,
        definitions: propertiesConfig.customFields.definitions.map((definition) =>
          definition.id === property.id
            ? { ...definition, options: normalizedOptions }
            : definition,
        ),
      },
    });
  };

  const hideProperty = (propertyId: string) => {
    if (!propertiesConfig?.baseProperties) return;
    saveConfig(setInspectorPropertyVisibility(propertiesConfig, entity.type, propertyId, false));
  };

  const showProperty = (propertyId: string) => {
    if (!propertiesConfig?.baseProperties) return;
    saveConfig(setInspectorPropertyVisibility(propertiesConfig, entity.type, propertyId, true));
  };

  const togglePropertyVisibility = (propertyId: string) => {
    if (visiblePropertyIds.has(propertyId)) {
      hideProperty(propertyId);
    } else {
      showProperty(propertyId);
    }
  };

  const reorderProperty = (targetPropertyId: string) => {
    if (
      !propertiesConfig?.baseProperties ||
      !draggedPropertyId ||
      draggedPropertyId === targetPropertyId ||
      !inspectorProperties
    )
      return;
    const nextConfig = reorderInspectorPropertySiblings(
      propertiesConfig,
      entity.type,
      draggedPropertyId,
      targetPropertyId,
    );

    saveConfig(nextConfig);
    onUpdateRawYaml?.(
      reorderFrontmatter(
        rawYaml,
        getConfiguredFrontmatterOrder(nextConfig, entity.type, Object.keys(frontmatterData)),
      ),
    );
    setDraggedPropertyId(null);
  };

  const handleAutoReorder = () => {
    const frontmatterKeys = Object.keys(frontmatterData);
    const expectedOrder = getConfiguredFrontmatterOrder(
      propertiesConfig,
      entity.type,
      frontmatterKeys,
    );
    const reorderedYaml = reorderFrontmatter(rawYaml, expectedOrder);
    onUpdateRawYaml?.(reorderedYaml);
  };

  /** Sensible initial value for a missing schema field: entity fallback for core fields, defaultValue/empty otherwise. */
  const missingFieldValue = (fieldName: string): unknown => {
    const coreValues: Record<string, unknown> = {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      status: entity.status,
      tags: entity.tags,
      aliases: entity.aliases,
    };
    if (fieldName in coreValues) return coreValues[fieldName];
    const definition = allInspectableProperties.find((property) => property.id === fieldName);
    return definition?.defaultValue ?? emptyPropertyValue(definition?.type);
  };

  const addMissingFields = (fieldNames: string[]) => {
    if (!onUpdateRawYaml || fieldNames.length === 0) return;
    const updates = Object.fromEntries(
      fieldNames.map((fieldName) => [fieldName, missingFieldValue(fieldName)]),
    );
    onUpdateRawYaml(updateFrontmatterProperties(rawYaml, updates, propertiesConfig, entity.type));
  };

  /**
   * Get all current property values for visibleWhen evaluation
   */
  const getPropertyValues = (): Record<string, unknown> => {
    const values: Record<string, unknown> = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      status: entity.status,
      tags: entity.tags,
      aliases: entity.aliases,
      parentId: entity.parentId,
      childrenIds: entity.childrenIds,
    };

    Object.entries(frontmatterData).forEach(([key, value]) => {
      values[key] = value;
    });

    Object.entries(entity.customProperties).forEach(([key, value]) => {
      values[key] = value;
    });

    values.type = values.type || entity.type;
    values.status = values.status || entity.status;

    return values;
  };

  const openPropertyContextMenu = (
    event: React.MouseEvent,
    property?: BasePropertyDefinition | CustomFieldDefinition,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 270;
    const menuHeight = property ? 360 : Math.min(430, 88 + allInspectableProperties.length * 34);
    setPropertyContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
      propertyId: property?.id,
    });
  };

  const propertySections = useMemo(
    () =>
      buildInspectorPropertySections(propertiesConfig, entity.type, getPropertyValues(), {
        includeHidden: showHiddenProperties,
        includeInactiveConditions: showHiddenProperties,
      }),
    [entity.customProperties, entity.type, frontmatterData, propertiesConfig, showHiddenProperties],
  );

  const isProtectedProperty = (propertyId: string): boolean => {
    if (ENTITY_FRONTMATTER_FIELD_IDS.has(propertyId)) return true;
    const definition = allInspectableProperties.find((property) => property.id === propertyId);
    return Boolean(definition && "immutable" in definition && definition.immutable);
  };

  const availableProperties = useMemo(() => {
    const presentKeys = new Set(Object.keys(frontmatterData));
    return allInspectableProperties.filter(
      (property) =>
        !presentKeys.has(property.id) &&
        property.type !== "group" &&
        !NON_INSPECTOR_PROPERTY_IDS.has(property.id),
    );
  }, [allInspectableProperties, frontmatterData]);

  const addExistingProperty = (propertyId: string) => {
    if (!onUpdateRawYaml) return;
    const property = allInspectableProperties.find((candidate) => candidate.id === propertyId);
    const initialValue = property?.defaultValue ?? emptyPropertyValue(property?.type);
    onUpdateRawYaml(
      updateFrontmatterProperties(
        rawYaml,
        { [propertyId]: initialValue },
        propertiesConfig,
        entity.type,
      ),
    );
  };

  const createProperty = (name: string) => {
    if (!propertiesConfig || !onUpdateRawYaml) return;
    const id = sanitizePropertyId(name);
    if (!id) return;
    if (knownPropertyIds(propertiesConfig).has(id)) {
      addExistingProperty(id);
      return;
    }
    const definition = inferPropertyDefinition(id, "");
    definition.label = name.trim();
    const nextConfig = upsertInspectorProperty(propertiesConfig, definition, entity.type);
    saveConfig(nextConfig);
    onUpdateRawYaml(updateFrontmatterProperties(rawYaml, { [id]: "" }, nextConfig, entity.type));
  };

  const renameProperty = (propertyId: string, newName: string) => {
    if (!propertiesConfig || isProtectedProperty(propertyId)) return;
    const newId = sanitizePropertyId(newName);
    if (!newId || newId === propertyId) return;
    if (knownPropertyIds(propertiesConfig).has(newId)) {
      showToast(`A property named "${newId}" already exists.`, "warning");
      return;
    }
    let nextConfig = renameInspectorProperty(propertiesConfig, propertyId, newId);
    if (nextConfig === propertiesConfig) {
      showToast("Could not rename property.", "error");
      return;
    }
    const renamedDefinition = listInspectableProperties(nextConfig).find(
      (property) => property.id === newId,
    );
    if (renamedDefinition && "type" in renamedDefinition) {
      nextConfig = upsertInspectorProperty(
        nextConfig,
        { ...renamedDefinition, label: newName.trim() } as CustomFieldDefinition,
        entity.type,
      );
    }
    saveConfig(nextConfig);
    onUpdateRawYaml?.(
      adaptFrontmatterProperty(rawYaml, propertyId, newId, nextConfig, entity.type),
    );
    showToast(
      "Property renamed. Notes still using the old name will show it as unconfigured.",
      "warning",
    );
  };

  const changeType = (propertyId: string, newType: CustomFieldType) => {
    if (!propertiesConfig || isProtectedProperty(propertyId)) return;
    const nextConfig = changePropertyType(propertiesConfig, propertyId, newType);
    saveConfig(nextConfig);
    if (propertyId in frontmatterData && onUpdateRawYaml) {
      const coerced = coercePropertyValue(frontmatterData[propertyId], newType);
      onUpdateRawYaml(
        updateFrontmatterProperties(rawYaml, { [propertyId]: coerced }, nextConfig, entity.type),
      );
    }
  };

  const toggleGroupCollapsed = (propertyId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  const rowHandlers: PropertyRowHandlers = {
    getValue: getPropertyValue,
    getOptions: getPropertyOptions,
    onChange: handlePropertyChange,
    onContextMenu: openPropertyContextMenu,
    onDragStart: setDraggedPropertyId,
    onDragEnd: () => setDraggedPropertyId(null),
    onDrop: reorderProperty,
    onToggleGroup: toggleGroupCollapsed,
    onOpenPropertyEditor: openPropertyEditor,
    vaultIndexProps: { vaultIndex, onOpenEntity },
  };

  const renderPropertySections = (): React.ReactNode[] => {
    return (
      propertySections
        .filter((section) => section.nodes.length > 0)
        // Structure connectors (parentId/childrenIds) are noise for everyday
        // editing; only surface them alongside the other hidden properties.
        .filter((section) => section.kind !== "structure" || showHiddenProperties)
        .map((section) => {
          const isCollapsed = collapsedSections.has(section.id);
          // The main list needs no header — the inspector toolbar already reads
          // "Properties". Group rows carry their own name, so a section title
          // would just repeat it.
          const showHeader = section.kind !== "main";
          const nodesVisible = !showHeader || !isCollapsed;
          return (
            <section
              key={section.id}
              className={`metadata-property-section metadata-property-section-${section.kind}`}
            >
              {showHeader ? (
                <button
                  type="button"
                  className="metadata-property-section-title"
                  onClick={() =>
                    setCollapsedSections((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    })
                  }
                  aria-expanded={!isCollapsed}
                >
                  <span className="metadata-property-section-title-main">
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {section.title}
                  </span>
                  <small>{section.nodes.length}</small>
                </button>
              ) : null}
              {nodesVisible
                ? section.nodes.map((node) => (
                    <PropertyRow
                      key={node.property.id}
                      node={node}
                      entityType={entity.type}
                      draggedPropertyId={draggedPropertyId}
                      collapsedGroups={collapsedGroups}
                      handlers={rowHandlers}
                    />
                  ))
                : null}
            </section>
          );
        })
    );
  };

  const renderPropertyContextMenu = () => {
    if (!propertyContextMenu) return null;
    return (
      <PropertyContextMenu
        position={propertyContextMenu}
        property={contextProperty as VisiblePropertyDefinition | undefined}
        allProperties={allInspectableProperties}
        visiblePropertyIds={visiblePropertyIds}
        showHiddenProperties={showHiddenProperties}
        isProtected={isProtectedProperty}
        onEditProperty={openPropertyEditor}
        onHide={hideProperty}
        onRemoveFromNote={removePropertyFromNote}
        onDeleteFromUniverse={deletePropertyFromUniverse}
        onToggleVisibility={togglePropertyVisibility}
        onToggleShowHidden={() => setShowHiddenProperties((current) => !current)}
        onClose={() => setPropertyContextMenu(null)}
      />
    );
  };

  const renderPropertyEditor = () => {
    if (!propertyEditor || !propertiesConfig) return null;
    const property = allInspectableProperties.find(
      (candidate) => candidate.id === propertyEditor.propertyId,
    );
    if (!property) return null;
    return (
      <PropertyEditorPopover
        open
        anchorEl={propertyEditor.anchorEl}
        property={property}
        allProperties={allInspectableProperties}
        editableOptions={getEditableOptions(property)}
        canEditOptions={propertyCanEditOptions(property)}
        isProtected={isProtectedProperty(property.id)}
        parentId={parentIdOf(property.id)}
        onClose={() => setPropertyEditor(null)}
        onRename={(label) => renameProperty(property.id, label)}
        onChangeType={(type) => changeType(property.id, type)}
        onUpdate={(patch) => updatePropertyDefinition(property.id, patch)}
        onUpdateOptions={(options) => updatePropertyOptions(property, options)}
        onSetDependency={(parentId, values) => setPropertyDependency(property.id, parentId, values)}
        onMoveParent={(parentId) => movePropertyParent(property.id, parentId)}
        onDuplicate={() => duplicateProperty(property.id)}
        onDelete={() => deletePropertyFromUniverse(property.id)}
      />
    );
  };

  // Use new property system if available, otherwise fall back to legacy
  if (inspectorProperties) {
    return (
      <div
        className="metadata-editor"
        onClick={(event) => {
          if (
            !(event.target as HTMLElement).closest(
              ".inspector-property-context-menu, .property-editor-popover",
            )
          ) {
            setPropertyContextMenu(null);
          }
        }}
        onContextMenu={(event) => openPropertyContextMenu(event)}
      >
        {renderPropertyEditor()}
        {renderPropertyContextMenu()}
        <div className="metadata-fields">
          <div className="metadata-inspector-toolbar">
            <span>Properties</span>
            <button
              type="button"
              onClick={() => setShowHiddenProperties((current) => !current)}
              title={
                showHiddenProperties
                  ? "Hide hidden and conditional properties"
                  : "Show hidden and conditional properties"
              }
              aria-pressed={showHiddenProperties}
            >
              {showHiddenProperties ? <EyeOff size={13} /> : <Eye size={13} />}
              {showHiddenProperties ? "Hide hidden" : "Show hidden"}
            </button>
          </div>
          {renderPropertySections()}

          <AddPropertyRow
            availableProperties={availableProperties}
            onAddExisting={addExistingProperty}
            onCreate={createProperty}
          />

          {orphanedFields.length > 0 ? (
            <div className="metadata-orphaned-fields">
              <div className="metadata-section-divider metadata-section-divider-error">
                <AlertCircle size={16} />
                <span>Schema issues ({orphanedFields.length})</span>
              </div>
              <p className="field-hint">
                Your metadata does not match the universe schema. Review and fix these issues.
              </p>

              {/* Extra fields */}
              {extraFields.length > 0 && (
                <div className="metadata-issue-group">
                  <h4 className="metadata-issue-group-title metadata-issue-extra">
                    <AlertCircle size={14} /> Extra fields ({extraFields.length})
                  </h4>
                  <p className="field-hint">Fields not defined in the universe schema.</p>
                  {extraFields.map((field) => (
                    <div
                      key={field.fieldName}
                      className="metadata-orphaned-item metadata-issue-extra-item"
                    >
                      <div className="metadata-orphaned-content">
                        <div className="metadata-orphaned-header">
                          <strong className="metadata-orphaned-name">{field.fieldName}</strong>
                          <span className="metadata-orphaned-type">
                            {inferValueType(field.value)}
                          </span>
                        </div>
                        <code className="metadata-orphaned-value">
                          {formatPreviewValue(field.value)}
                        </code>
                      </div>
                      <div className="metadata-orphaned-actions">
                        <button
                          type="button"
                          className="metadata-action-primary"
                          onClick={() => {
                            onConserveField?.(field.fieldName, field.value);
                          }}
                          title="Add to universe schema"
                        >
                          <Plus size={13} />
                          Conserve
                        </button>
                        {field.fieldName !== "folder" && (
                          <button
                            type="button"
                            className="metadata-action-danger"
                            onClick={() => {
                              onDeleteField?.(field.fieldName);
                              if (onUpdateRawYaml) {
                                onUpdateRawYaml(
                                  removeFrontmatterProperty(rawYaml, field.fieldName),
                                );
                              }
                            }}
                            title="Remove from this note"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Misorder fields */}
              {misorderedFields.length > 0 && (
                <div className="metadata-issue-group">
                  <div className="metadata-issue-header">
                    <h4 className="metadata-issue-group-title metadata-issue-misorder">
                      <AlertCircle size={14} /> Wrong order ({misorderedFields.length})
                    </h4>
                    <button
                      type="button"
                      className="metadata-action-primary"
                      onClick={handleAutoReorder}
                      title="Reorder fields to match schema"
                    >
                      <ArrowRightLeft size={13} />
                      Auto-reorder
                    </button>
                  </div>
                  <p className="field-hint">
                    Fields should follow the schema order for consistency.
                  </p>
                  {misorderedFields.map((field) => (
                    <div
                      key={field.fieldName}
                      className="metadata-orphaned-item metadata-issue-misorder-item"
                    >
                      <div className="metadata-orphaned-content">
                        <div className="metadata-orphaned-header">
                          <strong className="metadata-orphaned-name">{field.fieldName}</strong>
                          <span className="metadata-orphaned-type">
                            Position {field.actualPosition} → {field.expectedPosition}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Missing fields */}
              {missingFields.length > 0 && (
                <div className="metadata-issue-group">
                  <div className="metadata-issue-header">
                    <h4 className="metadata-issue-group-title metadata-issue-missing">
                      <AlertCircle size={14} /> Missing fields ({missingFields.length})
                    </h4>
                    <button
                      type="button"
                      className="metadata-action-primary"
                      onClick={() => addMissingFields(missingFields.map((f) => f.fieldName))}
                      title="Add every missing field with a default value"
                    >
                      <Plus size={13} />
                      Add all
                    </button>
                  </div>
                  <p className="field-hint">
                    Required or important fields defined in schema are not present.
                  </p>
                  {missingFields.map((field) => (
                    <div
                      key={field.fieldName}
                      className="metadata-orphaned-item metadata-issue-missing-item"
                    >
                      <div className="metadata-orphaned-content">
                        <div className="metadata-orphaned-header">
                          <strong className="metadata-orphaned-name">{field.fieldName}</strong>
                          <span className="metadata-orphaned-type">
                            {field.expectedType || "unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="metadata-orphaned-actions">
                        <button
                          type="button"
                          className="metadata-action-primary"
                          onClick={() => addMissingFields([field.fieldName])}
                          title="Add this field with a default value"
                        >
                          <Plus size={13} />
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {unconfiguredProperties.length > 0 ? (
            <div className="metadata-unconfigured">
              <div className="metadata-section-divider">
                <span>Unconfigured properties</span>
              </div>
              <p className="field-hint">
                These keys exist in this note but are not declared in universe properties.
              </p>
              {unconfiguredProperties.map((property) => (
                <div key={property.key} className="metadata-unconfigured-item">
                  <div>
                    <strong>{property.key}</strong>
                    <span>{property.inferredType}</span>
                    <code>{formatPreviewValue(property.value)}</code>
                  </div>
                  <div className="metadata-unconfigured-actions">
                    <button
                      type="button"
                      onClick={() => {
                        const nextProperty = inferPropertyDefinition(property.key, property.value);
                        savePropertyDefinition(nextProperty);
                      }}
                      title="Declare this key in the universe schema"
                    >
                      <Plus size={13} />
                      Add to schema
                    </button>
                    <label>
                      <select
                        value={adaptTargets[property.key] ?? ""}
                        onChange={(event) =>
                          setAdaptTargets((current) => ({
                            ...current,
                            [property.key]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Adapt to...</option>
                        {configuredProperties
                          .filter((candidate) => candidate.id !== property.key)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.label || candidate.id}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => adaptUnconfiguredProperty(property.key)}
                      disabled={!adaptTargets[property.key]}
                      title="Move value to selected property"
                    >
                      <Wand2 size={13} />
                      Adapt
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeUnconfiguredProperty(property.key)}
                      title="Remove this key from the note"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // Legacy rendering (backward compatibility): schemas without baseProperties
  return (
    <LegacyMetadataFields entity={entity} propertiesConfig={propertiesConfig} onUpdate={onUpdate} />
  );
}
