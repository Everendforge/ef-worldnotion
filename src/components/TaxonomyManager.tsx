import { useState } from "react";
import { Hash, Layers, BookmarkCheck, ListTree } from "lucide-react";
import type { TaxonomyConfig } from "../editorTypes";
import { TagHierarchyEditor } from "./TagHierarchyEditor";
import { EntityTypeEditor } from "./EntityTypeEditor";
import { StatusEditor } from "./StatusEditor";
import { CustomFieldEditor } from "./CustomFieldEditor";
import "../App.css";

type TaxonomyTab = "tags" | "types" | "status" | "fields";

type TaxonomyManagerProps = {
  config: TaxonomyConfig;
  onChange: (config: TaxonomyConfig) => void;
};

export function TaxonomyManager({ config, onChange }: TaxonomyManagerProps) {
  const [activeTab, setActiveTab] = useState<TaxonomyTab>("tags");

  return (
    <div className="ecosystem-manager">
      <div className="ecosystem-tabs">
        <button
          className={`ecosystem-tab ${activeTab === "tags" ? "active" : ""}`}
          onClick={() => setActiveTab("tags")}
          type="button"
        >
          <Hash size={18} />
          <div className="tab-info">
            <span className="tab-title">Etiquetas</span>
            <span className="tab-subtitle">{config.tags.rootNodes.length} categorías</span>
          </div>
        </button>
        <button
          className={`ecosystem-tab ${activeTab === "types" ? "active" : ""}`}
          onClick={() => setActiveTab("types")}
          type="button"
        >
          <Layers size={18} />
          <div className="tab-info">
            <span className="tab-title">Tipos de Entidad</span>
            <span className="tab-subtitle">{config.entityTypes.definitions.length} tipos</span>
          </div>
        </button>
        <button
          className={`ecosystem-tab ${activeTab === "status" ? "active" : ""}`}
          onClick={() => setActiveTab("status")}
          type="button"
        >
          <BookmarkCheck size={18} />
          <div className="tab-info">
            <span className="tab-title">Estados</span>
            <span className="tab-subtitle">{config.statuses.definitions.length} estados</span>
          </div>
        </button>
        <button
          className={`ecosystem-tab ${activeTab === "fields" ? "active" : ""}`}
          onClick={() => setActiveTab("fields")}
          type="button"
        >
          <ListTree size={18} />
          <div className="tab-info">
            <span className="tab-title">Campos Personalizados</span>
            <span className="tab-subtitle">{config.customFields.definitions.length} campos</span>
          </div>
        </button>
      </div>

      <div className="ecosystem-content">
        {activeTab === "tags" && (
          <div className="ecosystem-panel">
            <div className="panel-header">
              <div>
                <h3>Jerarquía de Etiquetas</h3>
                <p className="panel-description">
                  Organiza tus notas con etiquetas jerárquicas. Puedes usar notación de barra diagonal (ej: "personaje/protagonista/principal").
                </p>
              </div>
            </div>
            <div className="panel-settings">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.tags.allowCustomTags}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      tags: { ...config.tags, allowCustomTags: e.target.checked },
                    })
                  }
                />
                <div className="setting-info">
                  <span className="setting-label">Permitir etiquetas personalizadas</span>
                  <span className="setting-description">Acepta etiquetas que no estén en la jerarquía</span>
                </div>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.tags.autoDetectSlashNotation}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      tags: { ...config.tags, autoDetectSlashNotation: e.target.checked },
                    })
                  }
                />
                <div className="setting-info">
                  <span className="setting-label">Auto-detectar notación de barras</span>
                  <span className="setting-description">Reconoce automáticamente la estructura jerárquica</span>
                </div>
              </label>
            </div>
            <TagHierarchyEditor
              nodes={config.tags.rootNodes}
              onChange={(rootNodes) =>
                onChange({
                  ...config,
                  tags: { ...config.tags, rootNodes },
                })
              }
            />
          </div>
        )}

        {activeTab === "types" && (
          <div className="ecosystem-panel">
            <div className="panel-header">
              <div>
                <h3>Tipos de Entidad</h3>
                <p className="panel-description">
                  Define los tipos de entidades en tu mundo (personajes, lugares, conceptos, etc.).
                </p>
              </div>
            </div>
            <div className="panel-settings">
              <label className="setting-select">
                <span className="setting-label">Tipo por defecto para nuevas entidades:</span>
                <select
                  value={config.entityTypes.defaultType}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      entityTypes: { ...config.entityTypes, defaultType: e.target.value },
                    })
                  }
                >
                  {config.entityTypes.definitions.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.entityTypes.allowCustomTypes}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      entityTypes: { ...config.entityTypes, allowCustomTypes: e.target.checked },
                    })
                  }
                />
                <div className="setting-info">
                  <span className="setting-label">Permitir tipos personalizados</span>
                  <span className="setting-description">Acepta tipos que no estén en las definiciones</span>
                </div>
              </label>
            </div>
            <EntityTypeEditor
              types={config.entityTypes.definitions}
              customFields={config.customFields.definitions}
              onChange={(definitions) =>
                onChange({
                  ...config,
                  entityTypes: { ...config.entityTypes, definitions },
                })
              }
            />
          </div>
        )}

        {activeTab === "status" && (
          <div className="ecosystem-panel">
            <div className="panel-header">
              <div>
                <h3>Estados</h3>
                <p className="panel-description">
                  Define estados para rastrear el progreso de tus notas (borrador, publicado, archivado, etc.).
                </p>
              </div>
            </div>
            <div className="panel-settings">
              <label className="setting-select">
                <span className="setting-label">Estado por defecto para nuevas entidades:</span>
                <select
                  value={config.statuses.defaultStatus}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      statuses: { ...config.statuses, defaultStatus: e.target.value },
                    })
                  }
                >
                  {config.statuses.definitions.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.statuses.allowCustomStatuses}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      statuses: { ...config.statuses, allowCustomStatuses: e.target.checked },
                    })
                  }
                />
                <div className="setting-info">
                  <span className="setting-label">Permitir estados personalizados</span>
                  <span className="setting-description">Acepta estados que no estén en las definiciones</span>
                </div>
              </label>
            </div>
            <StatusEditor
              statuses={config.statuses.definitions}
              onChange={(definitions) =>
                onChange({
                  ...config,
                  statuses: { ...config.statuses, definitions },
                })
              }
            />
          </div>
        )}

        {activeTab === "fields" && (
          <div className="ecosystem-panel">
            <div className="panel-header">
              <div>
                <h3>Campos Personalizados</h3>
                <p className="panel-description">
                  Define campos de metadatos personalizados con tipos específicos y validación.
                </p>
              </div>
            </div>
            <CustomFieldEditor
              fields={config.customFields.definitions}
              onChange={(definitions) =>
                onChange({
                  ...config,
                  customFields: { ...config.customFields, definitions },
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
