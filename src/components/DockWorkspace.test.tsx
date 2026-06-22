import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DockTabRef } from "../editorTypes";
import { createDefaultWorkspaceLayout, documentDockTabId, panelDockTabId } from "../utils/workspaceLayout";
import { DockWorkspace } from "./DockWorkspace";

function renderDockWorkspace(options: { emptyDocuments?: boolean } = {}) {
  const documentTabs = options.emptyDocuments
    ? []
    : [
    {
      path: "A.md",
      title: "A",
      mode: "write" as const,
      modifiedMs: 1,
      isTemplate: false,
    },
    {
      path: "B.md",
      title: "B",
      mode: "write" as const,
      modifiedMs: 1,
      isTemplate: false,
    },
      ];
  const layout = createDefaultWorkspaceLayout(documentTabs);
  const handlers = {
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onTabContextMenu: vi.fn(),
    onGroupContextMenu: vi.fn(),
    onMoveTab: vi.fn(),
    onResizeSplit: vi.fn(),
    onOpenDocument: vi.fn(),
  };

  render(
    <DockWorkspace
      layout={layout}
      renderTab={(tab: DockTabRef) => <div data-testid="dock-panel">{tab.title}</div>}
      {...handlers}
    />,
  );

  return { layout, handlers };
}

function mockDockGroupRects() {
  const groups = [...document.querySelectorAll<HTMLElement>("[data-dock-group-id]")];
  for (const group of groups) {
    const rect =
      group.dataset.dockGroupId === "dock-explorer"
        ? { left: 0, top: 0, right: 220, bottom: 600, width: 220, height: 600 }
        : { left: 224, top: 0, right: 900, bottom: 600, width: 676, height: 600 };
    group.getBoundingClientRect = vi.fn(() => ({ ...rect, x: rect.left, y: rect.top, toJSON: () => rect }));
  }
}

function pointerDrag(element: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: to.x, clientY: to.y });
}

describe("DockWorkspace", () => {
  it("keeps the writing sheet visible when no document tab is open", () => {
    renderDockWorkspace({ emptyDocuments: true });

    expect(screen.getByText("Writing sheet")).toBeTruthy();
  });

  it("renders dock tabs and activates tabs on click", () => {
    const { handlers } = renderDockWorkspace();

    fireEvent.click(screen.getByText("B"));

    expect(screen.getAllByTestId("dock-panel").map((panel) => panel.textContent)).toContain("A");
    expect(handlers.onSelectTab).toHaveBeenCalledWith(
      expect.objectContaining({ id: documentDockTabId("B.md") }),
      "dock-documents",
    );
  });

  it("opens the document command from the tab add button", () => {
    const { handlers } = renderDockWorkspace();

    fireEvent.click(screen.getAllByTitle("Open note")[0]);

    expect(handlers.onOpenDocument).toHaveBeenCalledTimes(1);
  });

  it("routes document tab context menus to the app", () => {
    const { handlers } = renderDockWorkspace();

    fireEvent.contextMenu(screen.getAllByText("A")[0], { clientX: 120, clientY: 80 });

    expect(handlers.onTabContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: documentDockTabId("A.md") }),
      120,
      80,
    );
  });

  it("routes panel tab context menus to the dock group menu", () => {
    const { handlers } = renderDockWorkspace();

    fireEvent.contextMenu(screen.getByTitle("Inspector"), { clientX: 320, clientY: 44 });

    expect(handlers.onTabContextMenu).not.toHaveBeenCalled();
    expect(handlers.onGroupContextMenu).toHaveBeenCalledWith("dock-tools", 320, 44);
  });

  it("resizes splits from the keyboard", () => {
    const { handlers } = renderDockWorkspace();

    fireEvent.keyDown(screen.getAllByRole("separator")[0], { key: "ArrowRight" });

    expect(handlers.onResizeSplit).toHaveBeenCalledWith("dock-root", 0.25);
  });

  it("keeps document tabs anchored to the writing group during pointer drag", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();

    pointerDrag(screen.getByText("B").closest(".dock-tab")!, { x: 520, y: 18 }, { x: 110, y: 300 });

    expect(handlers.onMoveTab).not.toHaveBeenCalled();
  });

  it("moves a panel tab to the center of another group with pointer drag", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();

    pointerDrag(screen.getByTitle("Inspector"), { x: 760, y: 18 }, { x: 110, y: 300 });

    expect(handlers.onMoveTab).toHaveBeenCalledWith({
      tabId: panelDockTabId("inspector"),
      sourceGroupId: "dock-tools",
      targetGroupId: "dock-explorer",
      position: "center",
      targetTabId: undefined,
    });
  });

  it("splits a group when a dock tab is dragged to an edge zone", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();

    pointerDrag(screen.getByTitle("Inspector"), { x: 760, y: 18 }, { x: 8, y: 300 });

    expect(handlers.onMoveTab).toHaveBeenCalledWith({
      tabId: panelDockTabId("inspector"),
      sourceGroupId: "dock-tools",
      targetGroupId: "dock-explorer",
      position: "left",
      targetTabId: undefined,
    });
  });

  it("drags the active tab from the group header", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();

    pointerDrag(screen.getByTitle("Drag Inspector"), { x: 760, y: 18 }, { x: 110, y: 300 });

    expect(handlers.onMoveTab).toHaveBeenCalledWith({
      tabId: panelDockTabId("inspector"),
      sourceGroupId: "dock-tools",
      targetGroupId: "dock-explorer",
      position: "center",
      targetTabId: undefined,
    });
  });

  it("does not start docking from close or add buttons", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();

    pointerDrag(screen.getAllByTitle("Close tab")[0], { x: 560, y: 18 }, { x: 8, y: 300 });
    pointerDrag(screen.getAllByTitle("Open note")[0], { x: 880, y: 18 }, { x: 8, y: 300 });

    expect(handlers.onMoveTab).not.toHaveBeenCalled();
  });

  it("cancels an active dock drag with Escape", () => {
    const { handlers } = renderDockWorkspace();
    mockDockGroupRects();
    const tab = screen.getByText("B").closest(".dock-tab")!;

    fireEvent.pointerDown(tab, { button: 0, pointerId: 1, clientX: 520, clientY: 18 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 8, clientY: 300 });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 8, clientY: 300 });

    expect(handlers.onMoveTab).not.toHaveBeenCalled();
  });
});
