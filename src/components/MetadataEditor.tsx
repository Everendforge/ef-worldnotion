import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Entity } from "../domain";
import type { TaxonomyConfig } from "../editorTypes";
import { TagSelector } from "./TagSelector";

type MetadataEditorProps = {
  entity: Entity;
  taxonomyConfig?: TaxonomyConfig;
  rawYaml: string;
  onUpdate: (updates: Partial<Entity>) => void;
  onUpdateRawYaml?: (yaml: string) => void;
};

export function MetadataEditor({
  entity,
  taxonomyConfig,
  rawYaml,
  onUpdate,
  onUpdateRawYaml,
}: MetadataEditorProps) {
  const [showRawYaml, setShowRawYaml] = useState(false);
  const [yamlDraft, setYamlDraft] = useState(rawYaml);

  const entityTypes = taxonomyConfig?.entityTypes.definitions ?? [];
  const statuses = taxonomyConfig?.statuses.definitions ?? [];
  const customFieldDefs = taxonomyConfig?.customFields.definitions ?? [];

  // Get custom fields for current entity type
  const entityTypeDef = entityTypes.find((t) => t.id === entity.type);
  const relevantFieldIds = [
    ...(taxonomyConfig?.customFields.globalFields ?? []),
    ...(entityTypeDef?.customFields ?? []),
  ];
  const relevantFields = customFieldDefs.filter((f) => relevantFieldIds.includes(f.id));

  const handleFieldChange = (fieldId: string, value: unknown) => {
    onUpdate({
      customProperties: {
        ...entity.customProperties,
        [fieldId]: value,
      },
    });
  };

  const renderCustomField = (fieldDef: typeof customFieldDefs[0]) => {
    const value = entity.customProperties[fieldDef.id];

    switch (fieldDef.type) {
      case "text":
        return (
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(fieldDef.id, e.target.value)}
            placeholder={fieldDef.description}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={Number(value ?? "")}
            onChange={(e) => handleFieldChange(fieldDef.id, Number(e.target.value))}
            min={fieldDef.min}
            max={fieldDef.max}
            placeholder={fieldDef.description}
          />
        );

      case "boolean":
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => handleFieldChange(fieldDef.id, e.target.checked)}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(fieldDef.id, e.target.value)}
          />
        );

      case "select":
        return (
          <select
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(fieldDef.id, e.target.value)}
          >
            <option value="">Select...</option>
            {fieldDef.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "multiselect":
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="multiselect-field">
            {fieldDef.options?.map((opt) => (
              <label key={opt.value}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    handleFieldChange(fieldDef.id, newValue);
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => handleFieldChange(fieldDef.id, e.target.value)}
            placeholder={fieldDef.description}
          />
        );
    }
  };

  if (showRawYaml) {
    return (
      <div className="metadata-editor raw-mode">
        <div className="metadata-editor-header">
          <h3>Frontmatter (YAML)</h3>
          <button
            type="button"
            onClick={() => {
              if (onUpdateRawYaml) {
                onUpdateRawYaml(yamlDraft);
              }
              setShowRawYaml(false);
            }}
            title="Switch to structured view"
          >
            <Eye size={14} />
            Structured View
          </button>
        </div>
        <textarea
          value={yamlDraft}
          onChange={(e) => setYamlDraft(e.target.value)}
          className="metadata-yaml-editor"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="metadata-editor">
      <div className="metadata-editor-header">
        <h3>Metadata</h3>
        <button
          type="button"
          onClick={() => setShowRawYaml(true)}
          title="View raw YAML"
        >
          <EyeOff size={14} />
          Raw YAML
        </button>
      </div>

      <div className="metadata-fields">
        {/* Core fields */}
        <div className="metadata-field">
          <label>
            <span>ID</span>
            <input
              type="text"
              value={entity.id}
              onChange={(e) => onUpdate({ id: e.target.value })}
              placeholder="unique-id"
            />
          </label>
        </div>

        <div className="metadata-field">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={entity.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Entity name"
            />
          </label>
        </div>

        <div className="metadata-field">
          <label>
            <span>Type</span>
            {entityTypes.length > 0 ? (
              <select
                value={entity.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
              >
                {entityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={entity.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                placeholder="character"
              />
            )}
          </label>
        </div>

        <div className="metadata-field">
          <label>
            <span>Status</span>
            {statuses.length > 0 ? (
              <select
                value={entity.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={entity.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
                placeholder="draft"
              />
            )}
          </label>
        </div>

        <div className="metadata-field">
          <label>
            <span>Tags</span>
            <TagSelector
              selectedTags={entity.tags}
              taxonomyConfig={taxonomyConfig}
              onChange={(tags) => onUpdate({ tags })}
            />
          </label>
        </div>

        <div className="metadata-field">
          <label>
            <span>Aliases</span>
            <input
              type="text"
              value={entity.aliases.join(", ")}
              onChange={(e) =>
                onUpdate({
                  aliases: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Alternative names (comma-separated)"
            />
          </label>
        </div>

        {/* Custom fields */}
        {relevantFields.length > 0 && (
          <>
            <div className="metadata-section-divider">
              <span>Custom Fields</span>
            </div>
            {relevantFields.map((fieldDef) => (
              <div key={fieldDef.id} className="metadata-field">
                <label>
                  <span>
                    {fieldDef.label}
                    {fieldDef.required && <span className="required-star">*</span>}
                  </span>
                  {renderCustomField(fieldDef)}
                  {fieldDef.description && (
                    <span className="field-hint">{fieldDef.description}</span>
                  )}
                </label>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
