import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { XmlReader } from "./XmlReader";

describe("XmlReader", () => {
  it("renders XML elements, attributes, and text as a tree", () => {
    render(<XmlReader value='<world id="a"><name>Everend</name><region /></world>' />);

    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText('"a"')).toBeInTheDocument();
    expect(screen.getByText("Everend")).toBeInTheDocument();
    expect(screen.getByText("region")).toBeInTheDocument();
  });

  it("shows a useful state for malformed XML", () => {
    render(<XmlReader value="<world>" />);

    expect(screen.getByText("Invalid XML")).toBeInTheDocument();
  });
});
