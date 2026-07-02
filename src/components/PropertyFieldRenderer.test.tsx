import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CustomFieldDefinition } from "../editorTypes";
import { makeVaultIndex } from "../test/fixtures";
import { PropertyFieldRenderer } from "./PropertyFieldRenderer";

describe("PropertyFieldRenderer", () => {
  it("renders select fields with the WorldNotion control class", () => {
    const property: CustomFieldDefinition = {
      id: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "hero", label: "Hero" },
        { value: "mentor", label: "Mentor" },
      ],
    };

    render(<PropertyFieldRenderer property={property} value="hero" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox").className).toContain("property-field-control");
  });

  it("degrades entity-ref to a text input without a vault index", () => {
    const property: CustomFieldDefinition = {
      id: "home",
      label: "Home",
      type: "entity-ref",
      targetTypes: ["location"],
    };

    render(<PropertyFieldRenderer property={property} value="iron-keep" onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("iron-keep");
  });

  it("uses the entity picker when a vault index is provided", () => {
    const property: CustomFieldDefinition = {
      id: "home",
      label: "Home",
      type: "entity-ref",
      targetTypes: ["location"],
    };

    render(
      <PropertyFieldRenderer
        property={property}
        value="iron-keep"
        onChange={vi.fn()}
        vaultIndex={makeVaultIndex()}
      />,
    );

    expect(screen.getByText("Iron Keep")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
