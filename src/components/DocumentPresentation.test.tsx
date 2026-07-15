import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeVaultIndex } from "../test/fixtures";
import { DocumentPresentation } from "./DocumentPresentation";

vi.mock("../utils/vaultImages", () => ({
  useVaultImage: (_index: unknown, path: string) => ({
    url: path ? `data:image/png;base64,${path}` : undefined,
  }),
}));

describe("DocumentPresentation", () => {
  it("renders a clean cover, portrait, type, and title", () => {
    const { container } = render(
      <DocumentPresentation
        vaultIndex={makeVaultIndex()}
        name="Mara Voss"
        typeLabel="Character"
        portraitPath="mara"
        coverPath="veil"
      />,
    );

    expect(screen.getByRole("heading", { name: "Mara Voss" })).toBeInTheDocument();
    expect(screen.getByAltText("Mara Voss portrait")).toBeInTheDocument();
    expect(screen.getByText("Character")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("does not reserve presentation space when no role has a value", () => {
    const { container } = render(
      <DocumentPresentation vaultIndex={makeVaultIndex()} name="Mara" typeLabel="Character" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("supports portrait-only and cover-only headers", () => {
    const { rerender, container } = render(
      <DocumentPresentation
        vaultIndex={makeVaultIndex()}
        name="Mara"
        typeLabel="Character"
        portraitPath="mara"
      />,
    );
    expect(screen.getByAltText("Mara portrait")).toBeInTheDocument();
    expect(container.querySelector(".document-presentation-cover")).toBeNull();

    rerender(
      <DocumentPresentation
        vaultIndex={makeVaultIndex()}
        name="Mara"
        typeLabel="Character"
        coverPath="veil"
      />,
    );
    expect(screen.queryByAltText("Mara portrait")).not.toBeInTheDocument();
    expect(container.querySelector(".document-presentation-cover")).toBeInTheDocument();
  });
});
