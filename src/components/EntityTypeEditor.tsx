import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { EntityTypeDefinition, CustomFieldDefinition } from "../editorTypes";
import { useAppDialogs } from "./DialogProvider";

type EntityTypeEditorProps = {
  types: EntityTypeDefinition[];
  customFields: CustomFieldDefinition[];
  onChange: (types: EntityTypeDefinition[]) => void;
};

type TypeItemProps = {
  type: EntityTypeDefinition;
  customFields: CustomFieldDefinition[];
  onUpdate: (type: EntityTypeDefinition) => void;
  onDelete: (typeId: string) => void;
  onMoveUp: (typeId: string) => void;
  onMoveDown: (typeId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function TypeItem({
  type,
  customFields,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TypeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(type);

  const handleSave = () => {
    onUpdate(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(type);
    setIsEditing(false);
  };

  // Fields available for this type (computed but not currently used in UI)
  // const availableFields = customFields.map((field) => ({
  //   id: field.id,
  //   label: field.label,
  //   selected: type.customFields?.includes(field.id) ?? false,
  // }));

  return (
    <div className="entity-type-item">
      {isEditing ? (
        <div className="entity-type-edit">
          <div className="entity-type-edit-row">
            <label>
              <span>Label:</span>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Character"
              />
            </label>
            <label>
              <span>ID:</span>
              <input
                type="text"
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="character"
                pattern="[a-z0-9-]+"
              />
            </label>
          </div>

          <label>
            <span>Description:</span>
            <input
              type="text"
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Optional description"
            />
          </label>

          <div className="entity-type-edit-row">
            <label>
              <span>Icon:</span>
              <input
                type="text"
                value={draft.icon ?? ""}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                placeholder="user"
              />
            </label>
            <label>
              <span>Color:</span>
              <input
                type="color"
                value={draft.color ?? "#6b7280"}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              />
            </label>
          </div>

          {customFields.length > 0 && (
            <div className="entity-type-fields">
              <span>Custom Fields:</span>
              <div className="field-checkboxes">
                {customFields.map((field) => (
                  <label key={field.id}>
                    <input
                      type="checkbox"
                      checked={draft.customFields?.includes(field.id) ?? false}
                      onChange={(e) => {
                        const current = draft.customFields ?? [];
                        const updated = e.target.checked
                          ? [...current, field.id]
                          : current.filter((id) => id !== field.id);
                        setDraft({ ...draft, customFields: updated });
                      }}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="entity-type-actions">
            <button type="button" onClick={handleSave}>
              Save
            </button>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="entity-type-info">
            {type.color && (
              <span className="type-color-indicator" style={{ backgroundColor: type.color }} />
            )}
            <div>
              <strong>{type.label}</strong>
              <span className="type-id">({type.id})</span>
              {type.description && <p className="type-description">{type.description}</p>}
              {type.customFields && type.customFields.length > 0 && (
                <p className="type-fields-count">
                  {type.customFields.length} custom field{type.customFields.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="entity-type-controls">
            <button
              type="button"
              onClick={() => onMoveUp(type.id)}
              disabled={!canMoveUp}
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(type.id)}
              disabled={!canMoveDown}
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
            <button type="button" onClick={() => setIsEditing(true)} title="Edit">
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(type.id)}
              title="Delete"
              className="danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function EntityTypeEditor({ types, customFields, onChange }: EntityTypeEditorProps) {
  const { alertDialog, confirmDialog } = useAppDialogs();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<EntityTypeDefinition>({
    id: "",
    label: "",
    description: "",
    color: "#6b7280",
    customFields: [],
  });

  const handleAdd = () => {
    if (!newType.id.trim() || !newType.label.trim()) {
      void alertDialog("ID and Label are required");
      return;
    }

    if (types.some((t) => t.id === newType.id)) {
      void alertDialog("Type ID must be unique");
      return;
    }

    onChange([...types, newType]);
    setNewType({
      id: "",
      label: "",
      description: "",
      color: "#6b7280",
      customFields: [],
    });
    setShowAddForm(false);
  };

  const handleUpdate = (updatedType: EntityTypeDefinition) => {
    onChange(types.map((t) => (t.id === updatedType.id ? updatedType : t)));
  };

  const handleDelete = async (typeId: string) => {
    const confirmed = await confirmDialog(
      `Delete entity type "${types.find((t) => t.id === typeId)?.label}"?`,
      { title: "Delete entity type", confirmLabel: "Delete", destructive: true },
    );
    if (confirmed) {
      onChange(types.filter((t) => t.id !== typeId));
    }
  };

  const handleMoveUp = (typeId: string) => {
    const index = types.findIndex((t) => t.id === typeId);
    if (index <= 0) return;
    const newTypes = [...types];
    [newTypes[index - 1], newTypes[index]] = [newTypes[index], newTypes[index - 1]];
    onChange(newTypes);
  };

  const handleMoveDown = (typeId: string) => {
    const index = types.findIndex((t) => t.id === typeId);
    if (index === -1 || index >= types.length - 1) return;
    const newTypes = [...types];
    [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
    onChange(newTypes);
  };

  return (
    <div className="entity-type-editor">
      <div className="entity-type-list">
        {types.map((type, index) => (
          <TypeItem
            key={type.id}
            type={type}
            customFields={customFields}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            canMoveUp={index > 0}
            canMoveDown={index < types.length - 1}
          />
        ))}
      </div>

      {showAddForm ? (
        <div className="entity-type-add-form">
          <h4>New Entity Type</h4>
          <label>
            <span>Label:</span>
            <input
              type="text"
              value={newType.label}
              onChange={(e) => setNewType({ ...newType, label: e.target.value })}
              placeholder="Character"
            />
          </label>
          <label>
            <span>ID:</span>
            <input
              type="text"
              value={newType.id}
              onChange={(e) => setNewType({ ...newType, id: e.target.value })}
              placeholder="character"
              pattern="[a-z0-9-]+"
            />
          </label>
          <label>
            <span>Description:</span>
            <input
              type="text"
              value={newType.description ?? ""}
              onChange={(e) => setNewType({ ...newType, description: e.target.value })}
              placeholder="Optional description"
            />
          </label>
          <label>
            <span>Color:</span>
            <input
              type="color"
              value={newType.color ?? "#6b7280"}
              onChange={(e) => setNewType({ ...newType, color: e.target.value })}
            />
          </label>
          <div className="entity-type-add-actions">
            <button type="button" onClick={handleAdd}>
              Add Type
            </button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="entity-type-add-button"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={14} />
          Add Entity Type
        </button>
      )}
    </div>
  );
}
