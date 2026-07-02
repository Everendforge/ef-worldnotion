import { describe, expect, it } from "vitest";
import {
  extractWikilinks,
  joinMarkdown,
  normalizeMarkdownKey,
  parseMarkdownFrontmatter,
  slugify,
  splitMarkdown,
} from "./markdownFrontmatter";

describe("markdown frontmatter utilities", () => {
  it("parses YAML frontmatter and keeps body content", () => {
    const parsed = parseMarkdownFrontmatter("---\nid: mara\r\nname: Mara\n---\n\n# Mara");

    expect(parsed.data).toMatchObject({ id: "mara", name: "Mara" });
    expect(parsed.content).toBe("\n# Mara");
  });

  it("reports missing or unterminated frontmatter fences", () => {
    expect(() => parseMarkdownFrontmatter("# No frontmatter")).toThrow(
      "Missing YAML frontmatter fence.",
    );
    expect(() => parseMarkdownFrontmatter("---\nid: mara")).toThrow(
      "Unterminated YAML frontmatter fence.",
    );
  });

  it("splits and joins markdown while normalizing leading body whitespace", () => {
    const parts = splitMarkdown("---\nid: mara\n---\n\n\n# Mara");

    expect(parts).toEqual({ frontmatterRaw: "---\nid: mara\n---", bodyMarkdown: "# Mara" });
    expect(joinMarkdown(parts.frontmatterRaw, parts.bodyMarkdown)).toBe(
      "---\nid: mara\n---\n\n# Mara",
    );
  });

  it("extracts unique wikilink targets without aliases or headings", () => {
    expect(extractWikilinks("[[Ash Gate#North|the gate]] and [[Mara]] and [[Ash Gate]]")).toEqual([
      "Ash Gate",
      "Mara",
    ]);
  });

  it("normalizes slugs and lookup keys", () => {
    expect(slugify("  Ash Gate: East! ")).toBe("ash-gate-east");
    expect(normalizeMarkdownKey("  Ash Gate  ")).toBe("ash gate");
  });
});
