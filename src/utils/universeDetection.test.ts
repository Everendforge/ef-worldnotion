import { describe, expect, it } from "vitest";
import type { Entity, VaultFile } from "../domain";
import { detectUniverses } from "./universeDetection";

function file(relativePath: string): VaultFile {
  return { relativePath, content: "" };
}

function entity(id: string, path: string): Entity {
  return {
    id,
    type: "concept",
    name: id,
    status: "draft",
    tags: [],
    aliases: [],
    childrenIds: [],
    customProperties: {},
    body: "",
    path,
    file: file(path),
    wikilinks: [],
    backlinks: [],
  };
}

describe("universe detection", () => {
  it("detects top-level universe folders from directories, files, and entities", () => {
    const universes = detectUniverses(
      [file("Beta/Notes.md"), file("Root.md"), file(".everend/universe.json")],
      ["Alpha", "Alpha/Cast", ".everend"],
      [entity("ada", "Alpha/Cast/Ada.md"), entity("gate", "Beta/Gate.md"), entity("loose", "Loose.md")],
    );

    expect(universes).toEqual([
      { name: "Alpha", relativePath: "Alpha", entityCount: 1 },
      { name: "Beta", relativePath: "Beta", entityCount: 1 },
    ]);
  });

  it("does not count root-level files as universes", () => {
    expect(detectUniverses([file("Notes.md")], [], [entity("note", "Notes.md")])).toEqual([]);
  });
});
