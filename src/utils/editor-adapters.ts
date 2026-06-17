import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/**
 * Convert HTML from Tiptap editor back to Markdown
 */
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

/**
 * Convert Markdown to HTML for Tiptap editor
 * Simple regex-based approach - handles basic Markdown syntax
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) {
    return "<p></p>";
  }

  let html = markdown
    // Headings: # Text -> <h1>Text</h1>
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic: *text* -> <em>text</em>
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Code: `text` -> <code>text</code>
    .replace(/`(.*?)`/g, "<code>$1</code>")
    // Code blocks: ```...``` -> <pre><code>...</code></pre>
    .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
    // Blockquote: > text -> <blockquote>text</blockquote>
    .replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>")
    // Line breaks between paragraphs
    .split("\n\n")
    .map((para) => {
      if (para.startsWith("<h") || para.startsWith("<blockquote") || para.startsWith("<pre")) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join("");

  return html || "<p></p>";
}
