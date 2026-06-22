import { describe, expect, it } from "vitest";
import type { VaultFile } from "../domain";
import { indexMarkdownEntities } from "./entityIndex";

function markdown(relativePath: string, frontmatter: string, body = ""): VaultFile {
  return {
    relativePath,
    content: `---\n${frontmatter}\n---\n\n${body}`,
  };
}

describe("entity indexing", () => {
  it("indexes entities, custom properties, aliases, wikilinks, and backlinks", () => {
    const result = indexMarkdownEntities([
      markdown(
        "Characters/Mara.md",
        "id: mara\ntype: character\nname: Mara\nstatus: canon\naliases: [Red Scholar]\nrank: adept",
        "Mentions [[Ash Gate]].",
      ),
      markdown("Locations/Ash-Gate.md", "id: ash-gate\ntype: location\nname: Ash Gate\nstatus: canon", "Stone."),
      markdown("Notes/Reader.md", "id: reader\ntype: concept\nname: Reader\nstatus: draft", "Mentions [[Red Scholar]]."),
    ]);

    expect(result.typeCounts).toMatchObject({ character: 1, concept: 1, location: 1 });
    expect(result.entities.find((entity) => entity.id === "mara")?.customProperties).toEqual({ rank: "adept" });
    expect(result.entities.find((entity) => entity.id === "mara")?.backlinks).toEqual(["reader"]);
    expect(result.entities.find((entity) => entity.id === "ash-gate")?.backlinks).toEqual(["mara"]);
    expect(result.findings).toEqual([]);
  });

  it("reports missing frontmatter, required fields, duplicate ids, broken links, and missing canon refs", () => {
    const result = indexMarkdownEntities([
      { relativePath: "Loose.md", content: "# Loose" },
      markdown(
        "Characters/Mara.md",
        "id: duplicate\ntype: character\nname: Mara\nstatus: canon\nparentId: missing-parent\nchildrenIds: [missing-child]",
        "Mentions [[Missing Place]].",
      ),
      markdown("Characters/Mara Copy.md", "id: duplicate\ntype: character\nname: Mara Copy\nstatus: canon"),
      markdown("Draft.md", "type: concept\nname: Draft\nstatus: draft"),
      markdown("README.md", "id: ignored\ntype: concept\nname: Ignored\nstatus: draft"),
    ]);

    expect(result.entities.map((entity) => entity.id)).toEqual(["missing-id:Draft.md", "duplicate", "duplicate"]);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing_frontmatter", file: "Loose.md" }),
        expect.objectContaining({ code: "missing_required_field", file: "Draft.md", field: "id" }),
        expect.objectContaining({ code: "duplicate_id", file: "Characters/Mara.md", field: "id" }),
        expect.objectContaining({ code: "broken_wikilink", file: "Characters/Mara.md" }),
        expect.objectContaining({ code: "missing_canon_ref", file: "Characters/Mara.md", field: "parentId" }),
        expect.objectContaining({ code: "missing_canon_ref", file: "Characters/Mara.md", field: "childrenIds" }),
      ]),
    );
  });
});
