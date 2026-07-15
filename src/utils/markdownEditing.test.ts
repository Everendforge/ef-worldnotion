import { describe, expect, it } from "vitest";
import type { Entity } from "../domain";
import {
  entityToFrontmatterRaw,
  fontFamilyInsertion,
  headingLine,
  listLine,
  markdownLinkInsertion,
  tableInsertion,
  wikilinkInsertion,
  wrapSelectionText,
} from "./markdownEditing";

const entity: Entity = {
  id: "ada",
  type: "character",
  name: "Ada",
  status: "draft",
  tags: ["cast", "engineer"],
  aliases: ["A."],
  childrenIds: [],
  path: "People/Ada.md",
  body: "# Ada",
  file: {
    relativePath: "People/Ada.md",
    content: "# Ada",
  },
  backlinks: [],
  wikilinks: [],
  customProperties: {
    age: 32,
    faction: "Archive",
  },
};

describe("markdown editing helpers", () => {
  it("serializes editable entity metadata to frontmatter", () => {
    const frontmatter = entityToFrontmatterRaw(entity);

    expect(frontmatter).toContain("id: ada");
    expect(frontmatter).toContain("type: character");
    expect(frontmatter).toContain("tags:");
    expect(frontmatter).toContain("- cast");
    expect(frontmatter).toContain("faction: Archive");
    expect(frontmatter).toMatch(/^---\n[\s\S]*---$/);
  });

  it("wraps selected text and preserves selection offsets", () => {
    expect(wrapSelectionText("word", "**")).toEqual({
      text: "**word**",
      anchorOffset: 2,
      headOffset: 6,
    });
  });

  it("builds wikilink, markdown link, and font span insertions", () => {
    expect(wikilinkInsertion("Ada")).toEqual({
      text: "[[Ada|Ada]]",
      anchorOffset: 6,
      headOffset: 9,
    });
    expect(markdownLinkInsertion("docs", " https://example.com ")).toEqual({
      text: "[docs](https://example.com)",
      anchorOffset: 1,
      headOffset: 5,
    });
    expect(fontFamilyInsertion("voice", "Atkinson")).toMatchObject({
      text: '<span style="font-family: Atkinson">voice</span>',
      anchorOffset: 36,
      headOffset: 41,
    });
  });

  it("transforms current lines into headings and lists", () => {
    expect(headingLine("- [ ] Old", 2)).toBe("## Old");
    expect(headingLine("", 3)).toBe("### Heading 3");
    expect(listLine("  # Scene", 0, "bullet")).toBe("  - # Scene");
    expect(listLine("Old", 1, "ordered")).toBe("2. Old");
    expect(listLine("", 0, "task")).toBe("- [ ] List item");
  });

  it("creates a portable GFM table from tabular selection", () => {
    expect(tableInsertion("Cargo\tUso\nVirithiana\tVi-na")).toMatchObject({
      text: "\n\n| Cargo | Uso |\n| :---: | :---: |\n| Virithiana | Vi-na |\n\n",
      anchorOffset: 2,
      headOffset: 7,
    });
  });
});
