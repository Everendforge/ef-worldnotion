import { useMemo, useState } from "react";
import { Check, Info, Sparkles } from "lucide-react";
import type { CustomFieldType, PropertiesConfig, PropertyDefinition } from "../../editorTypes";
import { slugify } from "../../utils/markdownFrontmatter";
import { createEntityFrontmatter } from "../../utils/contentTemplates";
import {
  conditionIsActive,
  emptyPropertyValue,
  listVisibleProperties,
  updateFrontmatterProperties,
} from "../../utils/propertiesConfig";
import { propertyTypeIcon, PROPERTY_TYPE_LABELS } from "./propertyTypeIcons";

export type InspectorOnboardingProps = {
  /** Note file name without extension; used for the initial id/name. */
  fileName: string;
  propertiesConfig: PropertiesConfig;
  /** Receives the full frontmatter raw (with --- fences) to write into the note. */
  onInitialize: (frontmatterRaw: string) => void;
};

const CORE_FIELD_IDS = new Set([
  "id",
  "type",
  "name",
  "status",
  "tags",
  "aliases",
  "parentId",
  "childrenIds",
  "folder",
]);

/**
 * Flattens the visible property tree for a type into selectable leaves whose
 * visibleWhen conditions hold when `type` is the chosen entity type.
 */
function relatedFieldsForType(config: PropertiesConfig, entityType: string): PropertyDefinition[] {
  const values = { type: entityType };
  const leaves: PropertyDefinition[] = [];
  const visit = (property: PropertyDefinition) => {
    if (!conditionIsActive(property, values)) return;
    if (property.type !== "group" && !CORE_FIELD_IDS.has(property.id)) {
      leaves.push(property);
    }
    property.children?.forEach(visit);
  };
  listVisibleProperties(config, entityType).forEach(visit);
  return leaves;
}

/**
 * Notion-style two-step onboarding shown when a note has no properties yet:
 * pick the entity type, tick the type-related fields the note actually uses,
 * and the component emits ready-to-save frontmatter ordered per the schema.
 */
export function InspectorOnboarding({
  fileName,
  propertiesConfig,
  onInitialize,
}: InspectorOnboardingProps) {
  const [selectedType, setSelectedType] = useState(propertiesConfig.entityTypes.defaultType);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());

  const entityTypes = propertiesConfig.entityTypes.definitions;
  const relatedFields = useMemo(
    () => relatedFieldsForType(propertiesConfig, selectedType),
    [propertiesConfig, selectedType],
  );

  const pickType = (typeId: string) => {
    setSelectedType(typeId);
    // Field relevance is type-specific; keep only still-related selections.
    setSelectedFieldIds((current) => {
      const stillRelated = new Set(
        relatedFieldsForType(propertiesConfig, typeId).map((field) => field.id),
      );
      return new Set([...current].filter((id) => stillRelated.has(id)));
    });
  };

  const toggleField = (fieldId: string) => {
    setSelectedFieldIds((current) => {
      const next = new Set(current);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const initialize = () => {
    const base = createEntityFrontmatter({
      id: slugify(fileName) || "untitled",
      type: selectedType,
      name: fileName,
      status: propertiesConfig.statuses.defaultStatus,
      propertiesConfig,
    });
    const extras: Record<string, unknown> = {};
    relatedFields
      .filter((field) => selectedFieldIds.has(field.id))
      .forEach((field) => {
        extras[field.id] = field.defaultValue ?? emptyPropertyValue(field.type);
      });
    onInitialize(
      Object.keys(extras).length
        ? updateFrontmatterProperties(base, extras, propertiesConfig, selectedType)
        : base,
    );
  };

  return (
    <div className="inspector-onboarding" data-testid="inspector-onboarding">
      <div className="inspector-onboarding-header">
        <span className="inspector-onboarding-icon">
          <Sparkles size={15} />
        </span>
        <h3>Set up properties</h3>
        <span
          className="inspector-onboarding-tip"
          data-tip="This note has no properties yet. Pick its type and the fields it uses; WorldNotion writes clean YAML frontmatter ordered per your universe schema."
        >
          <Info size={13} />
        </span>
      </div>
      <p className="inspector-onboarding-question">What type of note is this?</p>
      <div className="inspector-onboarding-types" role="radiogroup" aria-label="Entity type">
        {entityTypes.map((entityType) => (
          <button
            key={entityType.id}
            type="button"
            role="radio"
            aria-checked={selectedType === entityType.id}
            className={`inspector-onboarding-type ${selectedType === entityType.id ? "active" : ""}`}
            onClick={() => pickType(entityType.id)}
          >
            <span
              className="inspector-onboarding-type-dot"
              style={entityType.color ? { background: entityType.color } : undefined}
            />
            {entityType.label || entityType.id}
          </button>
        ))}
      </div>

      {relatedFields.length > 0 ? (
        <>
          <p className="inspector-onboarding-question">
            Does it use any of these{" "}
            {entityTypes.find((candidate) => candidate.id === selectedType)?.label ?? selectedType}{" "}
            fields?
          </p>
          <div className="inspector-onboarding-fields">
            {relatedFields.map((field) => {
              const TypeIcon = propertyTypeIcon(field.type);
              const checked = selectedFieldIds.has(field.id);
              return (
                <label
                  key={field.id}
                  className={`inspector-onboarding-field ${checked ? "checked" : ""}`}
                  title={field.description || field.id}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleField(field.id)} />
                  <span className="inspector-onboarding-field-check">
                    {checked ? <Check size={11} /> : null}
                  </span>
                  <TypeIcon size={13} className="inspector-onboarding-field-icon" />
                  <span className="inspector-onboarding-field-label">
                    {field.label || field.id}
                  </span>
                  <small>{PROPERTY_TYPE_LABELS[field.type as CustomFieldType] ?? field.type}</small>
                </label>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="inspector-onboarding-footer">
        <button type="button" className="btn btn-primary" onClick={initialize}>
          <Sparkles size={13} />
          Create properties
        </button>
        <small className="muted">
          {selectedFieldIds.size
            ? `${selectedFieldIds.size} extra field${selectedFieldIds.size === 1 ? "" : "s"}`
            : "Core fields only"}
        </small>
      </div>
    </div>
  );
}
