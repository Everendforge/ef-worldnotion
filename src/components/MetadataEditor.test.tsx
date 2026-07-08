import { fireEvent, render as rtlRender, screen, within } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "../domain";
import { createDefaultTaxonomyConfig } from "../domain";
import { applyPropertyTemplate, WORLDBUILDING_TEMPLATE } from "../utils/propertyTemplates";
import { MetadataEditor } from "./MetadataEditor";
import { ToastProvider } from "./ToastProvider";
import { DialogProvider } from "./DialogProvider";

// MetadataEditor uses useToast() and useAppDialogs(), so every render needs both.
function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DialogProvider>{children}</DialogProvider>
    </ToastProvider>
  );
}

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: Providers });
}

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "mara",
    type: "character",
    name: "Mara",
    status: "draft",
    tags: [],
    aliases: [],
    childrenIds: [],
    customProperties: {},
    body: "",
    path: "Mara.md",
    file: {
      relativePath: "Mara.md",
      absolutePath: "Mara.md",
      content: "",
      modifiedMs: 0,
    },
    wikilinks: [],
    backlinks: [],
    ...overrides,
  };
}

describe("MetadataEditor inspector", () => {
  it("shows visible and hidden properties in the inspector context menu", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);

    render(
      <MetadataEditor
        entity={entity()}
        propertiesConfig={config}
        rawYaml={"---\ntype: character\nstatus: draft\n---"}
        onUpdate={vi.fn()}
        onUpdatePropertiesConfig={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByText("Properties"));
    const menu = screen.getByRole("menu");

    expect(within(menu).getByText("Role")).toBeTruthy();
    expect(within(menu).getByText("Rarity")).toBeTruthy();
  });

  it("uses entity core values to keep typed hierarchy visible when yaml omits type", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);

    render(
      <MetadataEditor
        entity={entity({ type: "character" })}
        propertiesConfig={config}
        rawYaml={"---\nstatus: draft\n---"}
        onUpdate={vi.fn()}
        onUpdatePropertiesConfig={vi.fn()}
      />,
    );

    expect(screen.getByText("Role")).toBeTruthy();
  });

  it("adds an existing schema property to the note via the add-property picker", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const onUpdateRawYaml = vi.fn();

    render(
      <MetadataEditor
        entity={entity()}
        propertiesConfig={config}
        rawYaml={"---\ntype: character\nstatus: draft\n---"}
        onUpdate={vi.fn()}
        onUpdateRawYaml={onUpdateRawYaml}
        onUpdatePropertiesConfig={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add property/i }));
    const listbox = screen.getByRole("listbox");
    const roleOption = within(listbox)
      .getAllByRole("option")
      .find((option) => within(option).queryByText("Role"));
    expect(roleOption).toBeTruthy();
    fireEvent.click(roleOption!);

    const nextYaml = onUpdateRawYaml.mock.calls[0]?.[0] as string;
    expect(nextYaml).toContain("role:");
  });

  it("creates a brand-new property from the add-property picker query", () => {
    const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);
    const onUpdateRawYaml = vi.fn();
    const onUpdatePropertiesConfig = vi.fn();

    render(
      <MetadataEditor
        entity={entity()}
        propertiesConfig={config}
        rawYaml={"---\ntype: character\nstatus: draft\n---"}
        onUpdate={vi.fn()}
        onUpdateRawYaml={onUpdateRawYaml}
        onUpdatePropertiesConfig={onUpdatePropertiesConfig}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add property/i }));
    fireEvent.change(screen.getByPlaceholderText("Property name…"), {
      target: { value: "Secret Motive" },
    });
    fireEvent.click(screen.getByText('Create property "Secret Motive"'));

    const savedConfig = onUpdatePropertiesConfig.mock.calls[0]?.[0];
    expect(
      savedConfig.customFields.definitions.map((property: { id: string }) => property.id),
    ).toContain("secret-motive");
    const nextYaml = onUpdateRawYaml.mock.calls[0]?.[0] as string;
    expect(nextYaml).toContain("secret-motive:");
  });
});
