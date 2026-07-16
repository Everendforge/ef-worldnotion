import { lazy, Suspense, useState } from "react";
import { PanelsTopLeft, SlidersHorizontal, Sparkles } from "lucide-react";
import type { Entity, EntityTemplate, VaultIndex } from "../domain";
import type { OpenTab, PropertiesConfig } from "../editorTypes";
import { rawToEditorParts } from "../utils/contentTemplates";
import { LazyPanelFallback } from "./LazyPanelFallback";
import { InspectorOnboarding } from "./properties/InspectorOnboarding";
import { VariantSelector } from "./VariantSelector";

function noteFileName(path: string) {
  return path.split("/").pop()?.replace(/\.md$/i, "") || "untitled";
}

const MetadataEditor = lazy(() =>
  import("./MetadataEditor").then((module) => ({ default: module.MetadataEditor })),
);
const PresentationEditor = lazy(() =>
  import("./PresentationEditor").then((module) => ({ default: module.PresentationEditor })),
);
export type InspectorPanelProps = {
  entity?: Entity;
  template?: EntityTemplate;
  index?: VaultIndex;
  activeTab?: OpenTab;
  onChangeFrontmatter?: (frontmatterRaw: string) => void;
  onUpdateEntity?: (updates: Partial<Entity>) => void;
  onOpenEntity?: (path: string) => void;
  onAddFrontmatter?: () => void;
  onUpdatePropertiesConfig?: (properties: PropertiesConfig) => void | Promise<void>;
  onRequestPropertyPathChange?: (properties: PropertiesConfig) => void | Promise<void>;
  onApplyPropertiesTemplate?: () => void | Promise<void>;
  onOpenPropertiesSettings?: () => void;
  onConserveField?: (fieldName: string, value: unknown) => void | Promise<void>;
  onDeleteField?: (fieldName: string) => void;
  onRequestImage?: () => Promise<{ path: string; alt?: string } | null>;
  activeVariantId?: string;
  onSelectVariant?: (id: string) => void;
  onInsertVariantBlock?: () => void;
  onDeleteVariant?: (id: string) => void;
  explorerSelection?: Array<{ path: string; kind: "file" | "folder" }>;
  onMoveExplorerSelection?: (targetFolderPath: string) => void | Promise<void>;
};

export function InspectorPanel({
  entity,
  template,
  index,
  activeTab,
  onChangeFrontmatter,
  onUpdateEntity,
  onOpenEntity,
  onAddFrontmatter,
  onUpdatePropertiesConfig,
  onRequestPropertyPathChange,
  onApplyPropertiesTemplate,
  onOpenPropertiesSettings,
  onConserveField,
  onDeleteField,
  onRequestImage,
  activeVariantId = "base",
  onSelectVariant,
  onInsertVariantBlock,
  onDeleteVariant,
  explorerSelection = [],
  onMoveExplorerSelection,
}: InspectorPanelProps) {
  const [activeView, setActiveView] = useState<"properties" | "presentation">("properties");
  const [moveTarget, setMoveTarget] = useState("");
  if (!index) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="muted">Open a universe to inspect metadata.</p>
      </aside>
    );
  }

  if (explorerSelection.length > 1) {
    return (
      <aside className="inspector">
        <h2>Bulk selection</h2>
        <p className="muted">
          {explorerSelection.length} items selected. Use Ctrl/⌘-click to adjust.
        </p>
        <label className="field-label">
          Move to folder path
          <input
            value={moveTarget}
            onChange={(event) => setMoveTarget(event.target.value)}
            placeholder="Root"
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void onMoveExplorerSelection?.(moveTarget)}
        >
          Move {explorerSelection.length} items
        </button>
      </aside>
    );
  }

  if (template) {
    return (
      <aside className="inspector">
        <h2>Template</h2>
        <p className="path-line">{template.path}</p>
        <p className="muted">Templates are Markdown files with placeholders.</p>
      </aside>
    );
  }

  // Check if we have an active tab without a corresponding entity (e.g., note without frontmatter)
  if (!entity && activeTab) {
    const tabFrontmatter = rawToEditorParts(activeTab.rawMarkdown).frontmatterRaw;
    const tabHasFrontmatter = tabFrontmatter.trim().length > 0;

    if (!tabHasFrontmatter && onAddFrontmatter && onChangeFrontmatter) {
      return (
        <aside className="inspector">
          <section>
            {index.propertiesConfig ? (
              <InspectorOnboarding
                fileName={noteFileName(activeTab.path)}
                propertiesConfig={index.propertiesConfig}
                onInitialize={onChangeFrontmatter}
              />
            ) : (
              <div className="no-frontmatter-notice">
                <p className="muted">This note has no frontmatter.</p>
                <button className="btn btn-primary" onClick={onAddFrontmatter}>
                  Add WorldNotion frontmatter
                </button>
              </div>
            )}
          </section>
        </aside>
      );
    }
  }

  if (!entity) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="muted">Select a note or template.</p>
      </aside>
    );
  }

  const propertiesConfig = index.propertiesConfig;
  const editableFrontmatter =
    activeTab?.path === entity.path ? rawToEditorParts(activeTab.rawMarkdown).frontmatterRaw : "";
  const hasFrontmatter = editableFrontmatter.trim().length > 0;

  if (!propertiesConfig) {
    return (
      <aside className="inspector">
        <section>
          <div className="inspector-setup-card">
            <div className="inspector-setup-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h3>Set up properties</h3>
              <p>
                This universe does not have `.everend/properties.json` yet. Apply a starter template
                here, then shape properties directly from the inspector.
              </p>
            </div>
            <div className="inspector-setup-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void onApplyPropertiesTemplate?.()}
              >
                <Sparkles size={14} />
                Apply template
              </button>
              <button type="button" className="btn" onClick={onOpenPropertiesSettings}>
                <SlidersHorizontal size={14} />
                Open utils
              </button>
            </div>
          </div>
        </section>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <section>
        {activeTab?.path === entity.path && onChangeFrontmatter && onUpdateEntity ? (
          <>
            {!hasFrontmatter && onAddFrontmatter ? (
              propertiesConfig ? (
                <InspectorOnboarding
                  fileName={noteFileName(entity.path)}
                  propertiesConfig={propertiesConfig}
                  onInitialize={onChangeFrontmatter}
                />
              ) : (
                <div className="no-frontmatter-notice">
                  <p className="muted">This note has no frontmatter.</p>
                  <button className="btn btn-primary" onClick={onAddFrontmatter}>
                    Add WorldNotion frontmatter
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="variant-selector-shell">
                  <VariantSelector
                    rawYaml={editableFrontmatter || "---\n\n---"}
                    config={propertiesConfig}
                    type={entity.type}
                    activeVariantId={activeVariantId}
                    onSelect={(id) => onSelectVariant?.(id)}
                    onUpdateRawYaml={(yaml) => onChangeFrontmatter(yaml)}
                    onInsertBlock={onInsertVariantBlock}
                    onDeleteVariant={onDeleteVariant}
                  />
                </div>
                <div className="inspector-subviews" role="tablist" aria-label="Note inspector">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === "properties"}
                    className={activeView === "properties" ? "active" : ""}
                    onClick={() => setActiveView("properties")}
                  >
                    Properties
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === "presentation"}
                    className={activeView === "presentation" ? "active" : ""}
                    onClick={() => setActiveView("presentation")}
                  >
                    <PanelsTopLeft size={13} aria-hidden="true" />
                    Presentation
                  </button>
                </div>
                <Suspense fallback={<LazyPanelFallback label="Loading inspector..." />}>
                  {activeView === "properties" ? (
                    <MetadataEditor
                      entity={entity}
                      propertiesConfig={propertiesConfig}
                      rawYaml={editableFrontmatter || "---\n\n---"}
                      vaultIndex={index}
                      onUpdate={(updates) => onUpdateEntity(updates)}
                      onUpdateRawYaml={(yaml) => onChangeFrontmatter(yaml)}
                      onUpdatePropertiesConfig={onUpdatePropertiesConfig}
                      onRequestPropertyPathChange={onRequestPropertyPathChange}
                      onConserveField={onConserveField}
                      onDeleteField={onDeleteField}
                      onOpenEntity={onOpenEntity}
                      onRequestImage={onRequestImage}
                      activeVariantId={activeVariantId}
                    />
                  ) : (
                    <PresentationEditor
                      entity={entity}
                      config={propertiesConfig}
                      rawYaml={editableFrontmatter || "---\n\n---"}
                      vaultIndex={index}
                      onUpdateRawYaml={onChangeFrontmatter}
                      onUpdatePropertiesConfig={onUpdatePropertiesConfig}
                      onRequestImage={onRequestImage}
                      activeVariantId={activeVariantId}
                    />
                  )}
                </Suspense>
              </>
            )}
          </>
        ) : (
          <>
            <p className="muted">Open this note in a tab to edit its metadata.</p>
          </>
        )}
      </section>
    </aside>
  );
}
