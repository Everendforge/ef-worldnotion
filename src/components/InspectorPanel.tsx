import { lazy, Suspense } from "react";
import type { Entity, EntityTemplate, ValidationFinding, VaultIndex } from "../domain";
import type { OpenTab } from "../editorTypes";
import { rawToEditorParts } from "../utils/contentTemplates";
import { LazyPanelFallback } from "./LazyPanelFallback";

const MetadataEditor = lazy(() =>
  import("./MetadataEditor").then((module) => ({ default: module.MetadataEditor })),
);
const BacklinksPanel = lazy(() =>
  import("./BacklinksPanel").then((module) => ({ default: module.BacklinksPanel })),
);

export type InspectorPanelProps = {
  entity?: Entity;
  template?: EntityTemplate;
  index?: VaultIndex;
  activeTab?: OpenTab;
  onChangeFrontmatter?: (frontmatterRaw: string) => void;
  onUpdateEntity?: (updates: Partial<Entity>) => void;
  onOpenEntity?: (path: string) => void;
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function FindingBadge({ finding }: { finding: ValidationFinding }) {
  return <span className={`finding-badge finding-${finding.severity}`}>{finding.severity}</span>;
}

export function InspectorPanel({
  entity,
  template,
  index,
  activeTab,
  onChangeFrontmatter,
  onUpdateEntity,
  onOpenEntity,
}: InspectorPanelProps) {
  if (!index) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="muted">Open a universe to inspect metadata and links.</p>
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

  if (!entity) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p className="muted">Select a note or template.</p>
      </aside>
    );
  }

  const findings = index.findings.filter((finding) => finding.file === entity.path);
  const typeDefinition = index.taxonomy?.types[entity.type];
  const editableFrontmatter = activeTab?.path === entity.path ? rawToEditorParts(activeTab.rawMarkdown).frontmatterRaw : "";

  return (
    <aside className="inspector">
      <h2>{entity.name}</h2>
      <p className="path-line">{entity.path}</p>

      <section>
        {activeTab?.path === entity.path && onChangeFrontmatter && onUpdateEntity ? (
          <Suspense fallback={<LazyPanelFallback label="Loading metadata..." />}>
            <MetadataEditor
              entity={entity}
              taxonomyConfig={index.taxonomyConfig}
              rawYaml={editableFrontmatter || "---\n\n---"}
              onUpdate={(updates) => onUpdateEntity(updates)}
              onUpdateRawYaml={(yaml) => onChangeFrontmatter(yaml)}
            />
          </Suspense>
        ) : (
          <>
            <h3>Metadata</h3>
            <p className="muted">Open this note in a tab to edit its metadata.</p>
            <dl className="metadata-list">
              <dt>id</dt>
              <dd>{entity.id}</dd>
              <dt>type</dt>
              <dd>{typeDefinition?.label ?? entity.type}</dd>
              <dt>status</dt>
              <dd>{entity.status}</dd>
              {Object.entries(entity.customProperties).map(([key, value]) => (
                <div key={key} className="metadata-pair">
                  <dt>{key}</dt>
                  <dd>{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <section>
        <h3>Links</h3>
        <p className="muted">Wikilinks: {entity.wikilinks.length ? entity.wikilinks.join(", ") : "None"}</p>
      </section>

      <Suspense fallback={<LazyPanelFallback label="Loading backlinks..." />}>
        <BacklinksPanel
          entity={entity}
          allEntities={index.entities}
          onOpenEntity={(path) => {
            onOpenEntity?.(path);
          }}
        />
      </Suspense>

      <section>
        <h3>Findings</h3>
        {findings.length ? (
          <div className="finding-list">
            {findings.map((finding) => (
              <div key={`${finding.code}-${finding.message}`} className="finding-item">
                <FindingBadge finding={finding} />
                <span>{finding.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No findings for this file.</p>
        )}
      </section>
    </aside>
  );
}
