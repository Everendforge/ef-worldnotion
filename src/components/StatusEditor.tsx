import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { StatusDefinition } from "../editorTypes";

type StatusEditorProps = {
  statuses: StatusDefinition[];
  onChange: (statuses: StatusDefinition[]) => void;
};

type StatusItemProps = {
  status: StatusDefinition;
  onUpdate: (status: StatusDefinition) => void;
  onDelete: (statusId: string) => void;
  onMoveUp: (statusId: string) => void;
  onMoveDown: (statusId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function StatusItem({
  status,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: StatusItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(status);

  const handleSave = () => {
    onUpdate(draft);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(status);
    setIsEditing(false);
  };

  return (
    <div className="status-item">
      {isEditing ? (
        <div className="status-edit">
          <div className="status-edit-row">
            <label>
              <span>Label:</span>
              <input
                type="text"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Draft"
              />
            </label>
            <label>
              <span>ID:</span>
              <input
                type="text"
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="draft"
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

          <label>
            <span>Color:</span>
            <input
              type="color"
              value={draft.color ?? "#6b7280"}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            />
          </label>

          <div className="status-actions">
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
          <div className="status-info">
            {status.color && (
              <span className="status-color-badge" style={{ backgroundColor: status.color }}>
                {status.label}
              </span>
            )}
            <div>
              <span className="status-id">({status.id})</span>
              {status.description && <p className="status-description">{status.description}</p>}
            </div>
          </div>
          <div className="status-controls">
            <button
              type="button"
              onClick={() => onMoveUp(status.id)}
              disabled={!canMoveUp}
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(status.id)}
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
              onClick={() => onDelete(status.id)}
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

export function StatusEditor({ statuses, onChange }: StatusEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStatus, setNewStatus] = useState<StatusDefinition>({
    id: "",
    label: "",
    description: "",
    color: "#6b7280",
    order: statuses.length,
  });

  const handleAdd = () => {
    if (!newStatus.id.trim() || !newStatus.label.trim()) {
      alert("ID and Label are required");
      return;
    }

    if (statuses.some((s) => s.id === newStatus.id)) {
      alert("Status ID must be unique");
      return;
    }

    onChange([...statuses, newStatus]);
    setNewStatus({
      id: "",
      label: "",
      description: "",
      color: "#6b7280",
      order: statuses.length + 1,
    });
    setShowAddForm(false);
  };

  const handleUpdate = (updatedStatus: StatusDefinition) => {
    onChange(statuses.map((s) => (s.id === updatedStatus.id ? updatedStatus : s)));
  };

  const handleDelete = (statusId: string) => {
    if (confirm(`Delete status "${statuses.find((s) => s.id === statusId)?.label}"?`)) {
      onChange(statuses.filter((s) => s.id !== statusId));
    }
  };

  const handleMoveUp = (statusId: string) => {
    const index = statuses.findIndex((s) => s.id === statusId);
    if (index <= 0) return;
    const newStatuses = [...statuses];
    [newStatuses[index - 1], newStatuses[index]] = [newStatuses[index], newStatuses[index - 1]];
    // Update order values
    newStatuses.forEach((s, i) => (s.order = i));
    onChange(newStatuses);
  };

  const handleMoveDown = (statusId: string) => {
    const index = statuses.findIndex((s) => s.id === statusId);
    if (index === -1 || index >= statuses.length - 1) return;
    const newStatuses = [...statuses];
    [newStatuses[index], newStatuses[index + 1]] = [newStatuses[index + 1], newStatuses[index]];
    // Update order values
    newStatuses.forEach((s, i) => (s.order = i));
    onChange(newStatuses);
  };

  return (
    <div className="status-editor">
      <div className="status-list">
        {statuses
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((status, index) => (
            <StatusItem
              key={status.id}
              status={status}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < statuses.length - 1}
            />
          ))}
      </div>

      {showAddForm ? (
        <div className="status-add-form">
          <h4>New Status</h4>
          <label>
            <span>Label:</span>
            <input
              type="text"
              value={newStatus.label}
              onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
              placeholder="Draft"
            />
          </label>
          <label>
            <span>ID:</span>
            <input
              type="text"
              value={newStatus.id}
              onChange={(e) => setNewStatus({ ...newStatus, id: e.target.value })}
              placeholder="draft"
              pattern="[a-z0-9-]+"
            />
          </label>
          <label>
            <span>Description:</span>
            <input
              type="text"
              value={newStatus.description ?? ""}
              onChange={(e) => setNewStatus({ ...newStatus, description: e.target.value })}
              placeholder="Optional description"
            />
          </label>
          <label>
            <span>Color:</span>
            <input
              type="color"
              value={newStatus.color ?? "#6b7280"}
              onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
            />
          </label>
          <div className="status-add-actions">
            <button type="button" onClick={handleAdd}>
              Add Status
            </button>
            <button type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="status-add-button"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={14} />
          Add Status
        </button>
      )}
    </div>
  );
}
