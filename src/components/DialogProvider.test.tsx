import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DialogProvider, useAppDialogs } from "./DialogProvider";

function Harness({ onResult }: { onResult: (result: unknown) => void }) {
  const { confirmDialog, alertDialog, promptDialog } = useAppDialogs();
  return (
    <div>
      <button onClick={() => void confirmDialog("Delete this?").then(onResult)}>ask-confirm</button>
      <button
        onClick={() => void alertDialog("Saved!", { title: "Done" }).then(() => onResult("closed"))}
      >
        ask-alert
      </button>
      <button onClick={() => void promptDialog("New name", "name", "old").then(onResult)}>
        ask-prompt
      </button>
    </div>
  );
}

function renderHarness() {
  const onResult = vi.fn();
  render(
    <DialogProvider>
      <Harness onResult={onResult} />
    </DialogProvider>,
  );
  return onResult;
}

describe("DialogProvider", () => {
  it("resolves confirmDialog with true on confirm", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-confirm"));
    expect(screen.getByText("Delete this?")).toBeTruthy();

    fireEvent.click(screen.getByText("OK"));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(screen.queryByText("Delete this?")).toBeNull();
  });

  it("resolves confirmDialog with false on cancel", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-confirm"));
    fireEvent.click(screen.getByText("Cancel"));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it("shows and closes alertDialog", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-alert"));
    expect(screen.getByText("Saved!")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();

    fireEvent.click(screen.getByText("OK"));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith("closed"));
  });

  it("resolves promptDialog with the typed value", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-prompt"));

    const input = screen.getByPlaceholderText("name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "fresh" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith("fresh"));
  });

  it("resolves promptDialog with null when cancelled", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-prompt"));
    fireEvent.click(screen.getByText("Cancel"));
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
  });

  it("closes the confirm dialog with Escape resolving false", async () => {
    const onResult = renderHarness();
    fireEvent.click(screen.getByText("ask-confirm"));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });
});
