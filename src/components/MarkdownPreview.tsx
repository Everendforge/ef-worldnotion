import { useMemo } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import "../App.css";

export interface MarkdownPreviewProps {
  markdown: string;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

export function renderMarkdownPreviewHtml(markdown: string) {
  const result = remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: true })
    .processSync(markdown);

  return String(result).replace(/\[\[([^\]]+)\]\]/g, (_match, rawTarget: string) => {
    const target = rawTarget.trim();
    const escapedTarget = escapeHtml(target);
    return `<span class="wikilink" data-target="${escapedTarget}">${escapedTarget}</span>`;
  });
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return renderMarkdownPreviewHtml(markdown);
    } catch {
      return "<div class='error'>Error rendering markdown</div>";
    }
  }, [markdown]);

  return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}
