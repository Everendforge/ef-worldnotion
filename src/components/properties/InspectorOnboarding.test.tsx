import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDefaultTaxonomyConfig } from "../../domain";
import { applyPropertyTemplate, WORLDBUILDING_TEMPLATE } from "../../utils/propertyTemplates";
import { InspectorOnboarding } from "./InspectorOnboarding";

const config = applyPropertyTemplate(createDefaultTaxonomyConfig(), WORLDBUILDING_TEMPLATE);

describe("InspectorOnboarding", () => {
  it("initializes frontmatter with the chosen type and core fields", () => {
    const onInitialize = vi.fn();
    render(
      <InspectorOnboarding
        fileName="Mara Vex"
        propertiesConfig={config}
        onInitialize={onInitialize}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Character" }));
    fireEvent.click(screen.getByRole("button", { name: /create properties/i }));

    const raw = onInitialize.mock.calls[0]?.[0] as string;
    expect(raw).toContain("id: mara-vex");
    expect(raw).toContain("type: character");
    expect(raw).toContain("name: Mara Vex");
    expect(raw).toContain(`status: ${config.statuses.defaultStatus}`);
    expect(raw.startsWith("---")).toBe(true);
  });

  it("offers type-related fields and writes the ticked ones into the YAML", () => {
    const onInitialize = vi.fn();
    render(
      <InspectorOnboarding fileName="Mara" propertiesConfig={config} onInitialize={onInitialize} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Character" }));
    // Role is a character-related leaf from the worldbuilding template.
    fireEvent.click(screen.getByText("Role"));
    fireEvent.click(screen.getByRole("button", { name: /create properties/i }));

    const raw = onInitialize.mock.calls[0]?.[0] as string;
    expect(raw).toContain("role:");
    // Unticked related fields must not be written.
    expect(raw).not.toContain("affiliation:");
  });

  it("drops selections that are unrelated to a newly picked type", () => {
    const onInitialize = vi.fn();
    render(
      <InspectorOnboarding
        fileName="Ashfall"
        propertiesConfig={config}
        onInitialize={onInitialize}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Character" }));
    fireEvent.click(screen.getByText("Role"));
    fireEvent.click(screen.getByRole("radio", { name: "Location" }));
    fireEvent.click(screen.getByRole("button", { name: /create properties/i }));

    const raw = onInitialize.mock.calls[0]?.[0] as string;
    expect(raw).toContain("type: location");
    expect(raw).not.toContain("role:");
  });
});
