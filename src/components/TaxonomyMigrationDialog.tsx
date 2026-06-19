import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import type { TaxonomyConfig, TagHierarchyNode } from "../editorTypes";

export interface TaxonomyMigrationDialogProps {
  isOpen: boolean;
  generatedTaxonomy: TaxonomyConfig;
  entityCount: number;
  onAccept: (taxonomy: TaxonomyConfig) => void;
  onDecline: () => void;
  onCustomize: () => void;
}

export function TaxonomyMigrationDialog({
  isOpen,
  generatedTaxonomy,
  entityCount,
  onAccept,
  onDecline,
  onCustomize,
}: TaxonomyMigrationDialogProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const tagCount = countTags(generatedTaxonomy.tags.rootNodes);
  const typeCount = generatedTaxonomy.entityTypes.definitions.length;
  const statusCount = generatedTaxonomy.statuses.definitions.length;
  const fieldCount = generatedTaxonomy.customFields.definitions.length;

  return (
    <div className="taxonomy-migration-backdrop">
      <div className="taxonomy-migration-dialog">
        <div className="dialog-header">
          <AlertTriangle className="header-icon" size={24} />
          <h2>Set Up Taxonomy System</h2>
        </div>

        <div className="dialog-content">
          <p className="dialog-intro">
            WorldNotion can organize your universe with a taxonomy system. We've analyzed your{" "}
            <strong>{entityCount} existing notes</strong> and generated an initial configuration.
          </p>

          <div className="taxonomy-summary">
            <div className="summary-item">
              <span className="summary-label">Tags:</span>
              <span className="summary-value">{tagCount} detected</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Entity Types:</span>
              <span className="summary-value">{typeCount} types</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Statuses:</span>
              <span className="summary-value">{statusCount} statuses</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Custom Fields:</span>
              <span className="summary-value">{fieldCount} fields</span>
            </div>
          </div>

          {showDetails && (
            <div className="taxonomy-details">
              <div className="detail-section">
                <h4>Tags</h4>
                <ul className="tag-list">
                  {generatedTaxonomy.tags.rootNodes.map((tag) => (
                    <li key={tag.id}>
                      {tag.label}
                      {tag.children.length > 0 && ` (${tag.children.length} children)`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h4>Entity Types</h4>
                <ul className="type-list">
                  {generatedTaxonomy.entityTypes.definitions.map((type) => (
                    <li key={type.id}>{type.label}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h4>Statuses</h4>
                <ul className="status-list">
                  {generatedTaxonomy.statuses.definitions.map((status) => (
                    <li key={status.id}>{status.label}</li>
                  ))}
                </ul>
              </div>

              {fieldCount > 0 && (
                <div className="detail-section">
                  <h4>Custom Fields</h4>
                  <ul className="field-list">
                    {generatedTaxonomy.customFields.definitions.map((field) => (
                      <li key={field.id}>
                        {field.label} ({field.type})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            className="toggle-details-button"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? "Hide" : "Show"} Details
          </button>

          <div className="dialog-note">
            <p>
              You can customize this taxonomy anytime in <strong>Settings → Universe → Taxonomy</strong>.
            </p>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="action-button decline-button" onClick={onDecline}>
            <X size={16} />
            Skip for Now
          </button>
          <button className="action-button customize-button" onClick={onCustomize}>
            Customize First
          </button>
          <button className="action-button accept-button" onClick={() => onAccept(generatedTaxonomy)}>
            <Check size={16} />
            Accept &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
}

function countTags(nodes: TagHierarchyNode[]): number {
  let count = nodes.length;
  nodes.forEach((node) => {
    count += countTags(node.children);
  });
  return count;
}
