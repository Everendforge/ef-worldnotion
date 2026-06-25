import { useState } from "react";
import { Hash, Wand2 } from "lucide-react";
import type { TaxonomyConfig } from "../editorTypes";
import { TagHierarchyEditor } from "./TagHierarchyEditor";
import { PropertyConfigPanel } from "./PropertyConfigPanel";
import "../App.css";

type PropertiesTab = "tags" | "properties";

type PropertiesManagerProps = {
  config: TaxonomyConfig;
  onChange: (config: TaxonomyConfig) => void;
  activeTab?: PropertiesTab;
  showTabs?: boolean;
};

export function TaxonomyManager({ config, onChange, activeTab: controlledActiveTab, showTabs = true }: PropertiesManagerProps) {
  const [localActiveTab, setLocalActiveTab] = useState<PropertiesTab>("properties");
  const activeTab = controlledActiveTab ?? localActiveTab;
  const setActiveTab = controlledActiveTab ? undefined : setLocalActiveTab;

  return (
    <div className="ecosystem-manager">
      {showTabs ? (
      <div className="ecosystem-tabs">
        <button
          className={`ecosystem-tab ${activeTab === "properties" ? "active" : ""}`}
          onClick={() => setActiveTab?.("properties")}
          type="button"
        >
          <Wand2 size={18} />
          <div className="tab-info">
            <span className="tab-title">Propiedades</span>
            <span className="tab-subtitle">
              {config.baseProperties ? config.baseProperties.definitions.length : 0} base + {config.customFields.definitions.length} custom
            </span>
          </div>
        </button>
        <button
          className={`ecosystem-tab ${activeTab === "tags" ? "active" : ""}`}
          onClick={() => setActiveTab?.("tags")}
          type="button"
        >
          <Hash size={18} />
          <div className="tab-info">
            <span className="tab-title">Etiquetas</span>
            <span className="tab-subtitle">{config.tags.rootNodes.length} categorías</span>
          </div>
        </button>
      </div>
      ) : null}

      <div className="ecosystem-content">
        {activeTab === "tags" && (
          <div className="ecosystem-panel">
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

        {activeTab === "properties" && (
          <div className="ecosystem-panel">
            <PropertyConfigPanel
              taxonomyConfig={config}
              onChange={onChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
