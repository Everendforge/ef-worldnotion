import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertyEditorPopover, type EditableOption } from "./PropertyEditorPopover";
import type { VisiblePropertyDefinition } from "../../utils/propertiesConfig";

function selectProperty(
  overrides: Partial<VisiblePropertyDefinition> = {},
): VisiblePropertyDefinition {
  return {
    id: "magic",
    label: "Magic",
    type: "select",
    source: "custom",
    options: [
      { value: "fire", label: "Fire" },
      { value: "water", label: "Water" },
    ],
    ...overrides,
  } as VisiblePropertyDefinition;
}

function renderPopover(props: Partial<React.ComponentProps<typeof PropertyEditorPopover>> = {}) {
  const anchorEl = document.createElement("button");
  document.body.appendChild(anchorEl);
  const handlers = {
    onClose: vi.fn(),
    onRename: vi.fn(),
    onChangeType: vi.fn(),
    onUpdate: vi.fn(),
    onUpdateOptions: vi.fn(),
    onSetDependency: vi.fn(),
    onMoveParent: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };
  const property = props.property ?? selectProperty();
  render(
    <PropertyEditorPopover
      open
      anchorEl={anchorEl}
      property={property}
      allProperties={[property]}
      editableOptions={property.options ?? []}
      canEditOptions
      isProtected={false}
      parentId=""
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("PropertyEditorPopover", () => {
  it("renders the name and type of the property", () => {
    renderPopover();
    expect((screen.getByLabelText("Property name") as HTMLInputElement).value).toBe("Magic");
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe("select");
  });

  it("commits a rename on Enter", () => {
    const handlers = renderPopover();
    const input = screen.getByLabelText("Property name");
    fireEvent.change(input, { target: { value: "Sorcery" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handlers.onRename).toHaveBeenCalledWith("Sorcery");
  });

  it("changes the property type", () => {
    const handlers = renderPopover();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "number" } });
    expect(handlers.onChangeType).toHaveBeenCalledWith("number");
  });

  it("shows resolved options for the type property and edits them", () => {
    // The old modal showed an empty option list for `type` because it read
    // property.options; here the resolved entity-type options are passed in.
    const typeProperty = selectProperty({ id: "type", label: "Type", options: undefined });
    const typeOptions: EditableOption[] = [
      { value: "character", label: "Character" },
      { value: "location", label: "Location" },
    ];
    const handlers = renderPopover({
      property: typeProperty,
      editableOptions: typeOptions,
    });

    expect((screen.getByDisplayValue("Character") as HTMLInputElement).value).toBe("Character");
    expect(screen.getByDisplayValue("Location")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /add option/i }));
    expect(handlers.onUpdateOptions).toHaveBeenCalled();
    const nextOptions = handlers.onUpdateOptions.mock.calls[0][0] as EditableOption[];
    expect(nextOptions.length).toBe(typeOptions.length + 1);
  });

  it("duplicates and deletes via the footer actions", () => {
    const handlers = renderPopover();
    fireEvent.click(screen.getByRole("button", { name: /duplicate/i }));
    expect(handlers.onDuplicate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it("disables rename and delete for protected properties", () => {
    renderPopover({ isProtected: true });
    expect((screen.getByLabelText("Property name") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /^delete$/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("closes on Escape", () => {
    const handlers = renderPopover();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(handlers.onClose).toHaveBeenCalled();
  });
});
