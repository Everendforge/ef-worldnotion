import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeVaultIndex } from "../../../test/fixtures";
import { ImageField } from "./ImageField";

describe("ImageField", () => {
  it("uploads an image from the unified picker and stores its vault-relative path", async () => {
    const onChange = vi.fn();
    const onRequestImage = vi.fn().mockResolvedValue({
      path: "attachments/mara-portrait.png",
      alt: "mara-portrait",
    });

    render(
      <ImageField
        value=""
        onChange={onChange}
        vaultIndex={makeVaultIndex()}
        onRequestImage={onRequestImage}
      />,
    );

    // Empty state offers a single entry point; upload lives inside the picker.
    fireEvent.click(screen.getByRole("button", { name: /Pick image/ }));
    fireEvent.click(screen.getByRole("button", { name: "Upload from computer" }));

    await waitFor(() => expect(onRequestImage).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith("attachments/mara-portrait.png");
  });

  it("offers Replace and Remove when an image is already chosen", () => {
    const onChange = vi.fn();

    render(
      <ImageField
        value="attachments/existing.png"
        onChange={onChange}
        vaultIndex={makeVaultIndex()}
        onRequestImage={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Replace/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("keeps the current value and reports an upload failure from the picker", async () => {
    const onChange = vi.fn();
    const onRequestImage = vi.fn().mockRejectedValue(new Error("Image copy failed."));

    render(
      <ImageField
        value="attachments/existing.png"
        onChange={onChange}
        vaultIndex={makeVaultIndex()}
        onRequestImage={onRequestImage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Replace/ }));
    fireEvent.click(screen.getByRole("button", { name: "Upload from computer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Image copy failed.");
    expect(onChange).not.toHaveBeenCalled();
  });
});
