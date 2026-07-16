import { describe, expect, it } from "vitest";
import { structureAt, wikilinkMarkdown } from "./structuredMarkdown";

function documentFor(text: string) {
  const lines = text.split("\n");
  const starts = lines.reduce<number[]>((offsets, _line, index) => {
    offsets.push(index === 0 ? 0 : offsets[index - 1] + lines[index - 1].length + 1);
    return offsets;
  }, []);
  return {
    lines: lines.length,
    line(number: number) {
      const index = number - 1;
      return { from: starts[index], to: starts[index] + lines[index].length, text: lines[index] };
    },
    lineAt(position: number) {
      const index = starts.findIndex((start, candidate) => {
        const next = starts[candidate + 1] ?? text.length + 1;
        return position >= start && position < next;
      });
      return { ...this.line(index + 1), number: index + 1 };
    },
  };
}

describe("structured Markdown helpers", () => {
  it("finds a wikilink and preserves target plus visible alias", () => {
    const text = "Meet [[People/Ada|Ada Lovelace]] today.";
    const element = structureAt(documentFor(text), text.indexOf("Ada Lovelace"));

    expect(element).toMatchObject({
      kind: "wikilink",
      target: "People/Ada",
      alias: "Ada Lovelace",
      label: "Ada Lovelace",
    });
  });

  it("finds an image and exposes its editable presentation", () => {
    const text = '![Portrait](attachments/ada.png "wn:width=55;align=left")';
    expect(structureAt(documentFor(text), 4)).toMatchObject({
      kind: "image",
      target: "attachments/ada.png",
      label: "Portrait",
      imagePresentation: { width: 55, align: "left" },
    });
  });

  it("finds block structures and serializes a semantic wikilink edit", () => {
    const text = "# Chronicle\n- [ ] Review\n| Name | Role |\n| --- | --- |\n| Ada | Analyst |";
    expect(structureAt(documentFor(text), 1)).toMatchObject({ kind: "heading", level: 1 });
    expect(structureAt(documentFor(text), text.indexOf("Review"))).toMatchObject({
      kind: "task",
      checked: false,
    });
    expect(structureAt(documentFor(text), text.indexOf("Name"))).toMatchObject({ kind: "table" });
    expect(structureAt(documentFor(text), text.indexOf("Analyst"))).toMatchObject({
      kind: "table",
    });
    expect(wikilinkMarkdown("People/Ada", "Ada")).toBe("[[People/Ada|Ada]]");
    expect(wikilinkMarkdown("People/Ada", "People/Ada")).toBe("[[People/Ada]]");
  });
});
