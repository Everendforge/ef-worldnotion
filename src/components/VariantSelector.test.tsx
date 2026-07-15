import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VariantSelector } from "./VariantSelector";

describe("VariantSelector", () => {
  it("creates a named variant and selects it locally", () => {
    const onSelect = vi.fn();
    const onUpdateRawYaml = vi.fn();
    render(
      <VariantSelector
        rawYaml={"---\nid: mara\ntype: character\nname: Mara\n---"}
        activeVariantId="base"
        onSelect={onSelect}
        onUpdateRawYaml={onUpdateRawYaml}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create variant" }));
    fireEvent.change(screen.getByLabelText("New variant name"), {
      target: { value: "Mara adulta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSelect).toHaveBeenCalledWith("mara-adulta");
    expect(onUpdateRawYaml.mock.calls[0]?.[0]).toContain("mara-adulta:");
    expect(onUpdateRawYaml.mock.calls[0]?.[0]).toContain("label: Mara adulta");
  });

  it("selects an existing variant without rewriting the note", () => {
    const onSelect = vi.fn();
    const onUpdateRawYaml = vi.fn();
    render(
      <VariantSelector
        rawYaml={
          "---\nid: mara\ntype: character\nname: Mara\nvariants:\n  base:\n    label: Canon\n  adulta:\n    label: Mara adulta\n---"
        }
        activeVariantId="base"
        onSelect={onSelect}
        onUpdateRawYaml={onUpdateRawYaml}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "adulta" } });
    expect(onSelect).toHaveBeenCalledWith("adulta");
    expect(onUpdateRawYaml).not.toHaveBeenCalled();
  });
});
