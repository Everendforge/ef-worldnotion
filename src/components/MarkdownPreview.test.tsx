import { describe, expect, it } from "vitest";
import { renderMarkdownPreviewHtml } from "./MarkdownPreview";

describe("renderMarkdownPreviewHtml", () => {
  it("sanitizes dangerous HTML while preserving Markdown", () => {
    const html = renderMarkdownPreviewHtml(
      "# Title\n\n<script>alert('x')</script>\n\n<img src=x onerror=alert(1)>",
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onerror");
  });

  it("renders wikilinks with escaped data attributes", () => {
    const html = renderMarkdownPreviewHtml('See [[Mara "The Gate" & allies]].');

    expect(html).toContain('class="wikilink"');
    expect(html).toContain("Mara &quot;The Gate&quot; &#x26; allies");
    expect(html).not.toContain('data-target="Mara "The Gate" & allies"');
  });
});
