import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeVaultIndex } from "../test/fixtures";
import { InspectorPanel } from "./InspectorPanel";

describe("InspectorPanel bulk move", () => {
  it("moves the selected Explorer items to the entered folder", () => {
    const onMoveExplorerSelection = vi.fn();
    render(
      <InspectorPanel
        index={makeVaultIndex()}
        explorerSelection={[
          { path: "Notes/Ada.md", kind: "file" },
          { path: "Notes/Mara.md", kind: "file" },
        ]}
        onMoveExplorerSelection={onMoveExplorerSelection}
      />,
    );

    fireEvent.change(screen.getByLabelText("Move to folder path"), {
      target: { value: "Archive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Move 2 items" }));

    expect(onMoveExplorerSelection).toHaveBeenCalledWith("Archive");
  });
});
