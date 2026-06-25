/**
 * Modal/panel editor for property conditional visibility (visibleWhen).
 * Allows users to define when a property should appear based on parent values.
 */

import { useState, useMemo } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { PropertyDefinition } from "../editorTypes";
import { findPropertyById } from "../utils/propertyTreeUtils";

type PropertyConditionsEditorProps = {
  property: PropertyDefinition;
  allProperties: PropertyDefinition[];
  onSave: (visibleWhen: Record<string, string[]> | undefined) => void;
  onCancel: () => void;
};

export function PropertyConditionsEditor({
  property,
  allProperties,
  onSave,
  onCancel,
}: PropertyConditionsEditorProps) {
  const [conditions, setConditions] = useState<Record<string, string[]>>(
    property.visibleWhen || {}
  );

  // Find potential parent properties (properties that could be parents for this one)
  const potentialParents = useMemo(() => {
    const parents: PropertyDefinition[] = [];

    function findParents(
      defs: PropertyDefinition[],
      excludeId: string
    ): void {
      defs.forEach((def) => {
        // Can only depend on parents that come before in tree
        if (def.id !== excludeId && def.type !== "group") {
          // Groups don't have values, so can't condition on them
          if (def.type === "select" || def.type === "multiselect") {
            parents.push(def);
          }
        }
        if (def.children) {
          findParents(def.children, excludeId);
        }
      });
    }

    findParents(allProperties, property.id);
    return parents;
  }, [allProperties, property.id]);

  const getParentOptions = (parentId: string): Array<{ value: string; label: string }> => {
    const parent = findPropertyById(allProperties, parentId);
    if (!parent || !parent.options) return [];

    return parent.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));
  };

  const addCondition = () => {
    if (potentialParents.length === 0) return;

    const firstParentId = potentialParents[0].id;
    setConditions((prev) => ({
      ...prev,
      [firstParentId]: [],
    }));
  };

  const removeCondition = (parentId: string) => {
    setConditions((prev) => {
      const next = { ...prev };
      delete next[parentId];
      return next;
    });
  };

  const toggleOptionValue = (parentId: string, optionValue: string) => {
    setConditions((prev) => ({
      ...prev,
      [parentId]: prev[parentId] || [],
    }));

    setConditions((prev) => {
      const parentValues = prev[parentId] || [];
      const isIncluded = parentValues.includes(optionValue);

      return {
        ...prev,
        [parentId]: isIncluded
          ? parentValues.filter((v) => v !== optionValue)
          : [...parentValues, optionValue],
      };
    });
  };

  const handleSave = () => {
    // Clean up empty conditions
    const cleaned = Object.fromEntries(
      Object.entries(conditions).filter(([, values]) => values.length > 0)
    );

    onSave(Object.keys(cleaned).length > 0 ? cleaned : undefined);
  };

  const hasConditions = Object.keys(conditions).length > 0;

  return (
    <div className="property-conditions-editor">
      <div className="property-conditions-header">
        <h3>Conditional Visibility</h3>
        <button className="close-btn" onClick={onCancel} title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="property-conditions-content">
        <p className="property-conditions-description">
          Choose when this property should appear based on parent property values.
          If no conditions are set, this property always appears.
        </p>

        {hasConditions && (
          <div className="property-conditions-list">
            {Object.entries(conditions).map(([parentId, values]) => {
              const parent = findPropertyById(allProperties, parentId);
              if (!parent) return null;

              const options = getParentOptions(parentId);

              return (
                <div key={parentId} className="property-condition-group">
                  <div className="condition-group-header">
                    <label className="condition-parent-label">
                      <strong>{parent.label || parentId}</strong>
                      <span className="condition-operator">equals one of:</span>
                    </label>
                    <button
                      className="condition-delete-btn"
                      onClick={() => removeCondition(parentId)}
                      title="Remove this condition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="condition-values">
                    {options.length === 0 ? (
                      <div className="condition-empty">
                        No options available for {parent.label || parentId}
                      </div>
                    ) : (
                      <div className="condition-checkboxes">
                        {options.map((option) => (
                          <label key={option.value} className="condition-checkbox">
                            <input
                              type="checkbox"
                              checked={values.includes(option.value)}
                              onChange={() =>
                                toggleOptionValue(parentId, option.value)
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {potentialParents.length > 0 && (
          <button
            className="condition-add-btn"
            onClick={addCondition}
            disabled={
              Object.keys(conditions).length >= potentialParents.length
            }
          >
            <Plus size={16} />
            Add Condition
          </button>
        )}

        {potentialParents.length === 0 && (
          <div className="condition-empty">
            <p>No eligible parent properties available.</p>
            <p className="text-muted">
              Parent properties must be select/multiselect types.
            </p>
          </div>
        )}
      </div>

      <div className="property-conditions-footer">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleSave}>
          Save Conditions
        </button>
      </div>
    </div>
  );
}
