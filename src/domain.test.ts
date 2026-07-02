import { describe, expect, it } from "vitest";
import {
  indexVault,
  joinMarkdown,
  parseMarkdownFrontmatter,
  slugify,
  splitMarkdown,
  type VaultReadResult,
} from "./domain";

describe("markdown frontmatter helpers", () => {
  it("splits and rejoins Markdown without losing frontmatter", () => {
    const markdown =
      "---\nid: mara\ntype: character\nname: Mara\nstatus: canon\n---\n\n# Mara\n\nBody";

    const parts = splitMarkdown(markdown);

    expect(parts.frontmatterRaw).toContain("id: mara");
    expect(parts.bodyMarkdown).toBe("# Mara\n\nBody");
    expect(joinMarkdown(parts.frontmatterRaw, parts.bodyMarkdown)).toBe(markdown);
  });

  it("parses YAML frontmatter and normalizes line endings", () => {
    const parsed = parseMarkdownFrontmatter(
      "---\nid: ash-gate\r\ntype: location\nname: Ash Gate\nstatus: draft\n---\n\nText",
    );

    expect(parsed.data).toMatchObject({
      id: "ash-gate",
      type: "location",
      name: "Ash Gate",
      status: "draft",
    });
    expect(parsed.content).toBe("\nText");
  });

  it("creates stable slugs from display names", () => {
    expect(slugify("  Ash Gate: East! ")).toBe("ash-gate-east");
  });
});

describe("vault indexing", () => {
  it("indexes entities, backlinks, broken wikilinks, and required-field findings", () => {
    const readResult: VaultReadResult = {
      rootPath: "demo",
      directories: ["Characters", "Locations"],
      errors: [],
      files: [
        {
          relativePath: "Characters/Mara.md",
          content:
            "---\nid: mara\ntype: character\nname: Mara\nstatus: canon\ntags: [cast/main]\n---\n\nVisits [[Ash Gate]] and [[Missing Place]].",
        },
        {
          relativePath: "Locations/Ash-Gate.md",
          content:
            "---\nid: ash-gate\ntype: location\nname: Ash Gate\nstatus: canon\n---\n\nA city gate.",
        },
        {
          relativePath: "Draft.md",
          content: "---\ntype: concept\nname: Draft\nstatus: draft\n---\n\nNo id.",
        },
      ],
    };

    const index = indexVault(readResult);

    expect(index.entities).toHaveLength(3);
    expect(index.typeCounts).toMatchObject({ character: 1, location: 1, concept: 1 });
    expect(index.entities.find((entity) => entity.id === "ash-gate")?.backlinks).toEqual(["mara"]);
    expect(
      index.findings.some(
        (finding) => finding.code === "broken_wikilink" && finding.file === "Characters/Mara.md",
      ),
    ).toBe(true);
    expect(
      index.findings.some(
        (finding) => finding.code === "missing_required_field" && finding.field === "id",
      ),
    ).toBe(true);
  });

  it("does not use taxonomy.json as a properties fallback", () => {
    const index = indexVault({
      rootPath: "demo",
      directories: [],
      errors: [],
      files: [
        {
          relativePath: ".everend/taxonomy.json",
          content: JSON.stringify({
            version: "1.0",
            tags: { rootNodes: [], allowCustomTags: true, autoDetectSlashNotation: true },
            entityTypes: { definitions: [], defaultType: "concept", allowCustomTypes: true },
            statuses: { definitions: [], defaultStatus: "draft", allowCustomStatuses: true },
            customFields: { definitions: [], globalFields: [] },
          }),
        },
      ],
    });

    expect(index.propertiesConfig).toBeUndefined();
  });
});
