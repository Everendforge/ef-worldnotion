import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeVaultIndex } from "../../../test/fixtures";
import { ImageField } from "./ImageField";

describe("ImageField", () => {
  it("uploads an image from the computer and stores its vault-relative path", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Upload image from computer" }));

    await waitFor(() => expect(onRequestImage).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith("attachments/mara-portrait.png");
  });

  it("keeps the current value and reports an upload failure", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Upload image from computer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Image copy failed.");
    expect(onChange).not.toHaveBeenCalled();
  });
});
