import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VisibleExplorerRow } from "../utils/explorerSelectors";
import { makeVaultIndex } from "../test/fixtures";
import { ExplorerPanel } from "./ExplorerPanel";

function makeRows(count: number): VisibleExplorerRow[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Note ${index}.md`,
    path: `Notes/Note ${index}.md`,
    kind: "file" as const,
    children: [],
    depth: 1,
    hasChildren: false,
    isExpanded: false,
  }));
}

function renderPanel(rows: VisibleExplorerRow[], query = "") {
  return render(
    <ExplorerPanel
      index={makeVaultIndex()}
      query={query}
      onQueryChange={vi.fn()}
      activeSection="allFiles"
      onSectionChange={vi.fn()}
      focusBreadcrumb={[]}
      onSetFocusedFolder={vi.fn()}
      visibleRows={rows}
      openTabPaths={new Set()}
      dirtyTabPaths={new Set()}
      favoritePaths={new Set()}
      favoriteItems={[]}
      ecosystemGroups={new Map()}
      entityTagColors={new Map()}
      folderNotesEnabled={false}
      pointerDragActive={false}
      templatesExpanded={false}
      onToggleTemplatesExpanded={vi.fn()}
      onCreateTemplate={vi.fn()}
      onSelectPath={vi.fn()}
      onSelectFolder={vi.fn()}
      onToggleExpand={vi.fn()}
      onTreeAction={vi.fn()}
      onContextMenu={vi.fn()}
      onToggleFavorite={vi.fn()}
      onToggleFolderFocus={vi.fn()}
      onOpenFolderDescription={vi.fn()}
      onDragMove={vi.fn()}
      onPointerDragStart={vi.fn()}
      isPointerClickSuppressed={() => false}
    />,
  );
}

describe("ExplorerPanel virtualization", () => {
  it("renders every row for small trees", () => {
    const { container } = renderPanel(makeRows(50));
    expect(container.querySelectorAll(".tree-node").length).toBe(50);
  });

  it("renders only a window of rows for large trees", () => {
    const { container } = renderPanel(makeRows(10000));
    const rendered = container.querySelectorAll(".tree-node").length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(100);
  });

  it("keeps virtualizing while a search query is active", () => {
    const { container } = renderPanel(makeRows(10000), "note");
    const rendered = container.querySelectorAll(".tree-node").length;
    expect(rendered).toBeLessThan(100);
  });
});
