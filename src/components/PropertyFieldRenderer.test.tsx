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

  it("renders multiple entity references as a wrapping chip list", () => {
    const property: CustomFieldDefinition = {
      id: "affiliation",
      label: "Affiliation",
      type: "entity-ref-list",
      targetTypes: ["organization"],
    };

    const baseEntity = makeVaultIndex().entities[0];
    const index = makeVaultIndex({
      entities: [
        { ...baseEntity, id: "empire", type: "organization", name: "Imperio del Norte" },
        {
          ...baseEntity,
          id: "squadron",
          type: "organization",
          name: "Escuadrón de la Frontera",
        },
      ],
    });

    render(
      <PropertyFieldRenderer
        property={property}
        value={["empire", "squadron"]}
        onChange={vi.fn()}
        vaultIndex={index}
      />,
    );

    expect(screen.getByText("Imperio del Norte")).toBeInTheDocument();
    expect(screen.getByText("Escuadrón de la Frontera")).toBeInTheDocument();
    expect(screen.getByText("Imperio del Norte").closest(".entity-ref-list-field")).toBeTruthy();
  });
});
