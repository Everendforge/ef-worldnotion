/**
 * Outline extraction utilities for markdown documents
 */

export type OutlineHeader = {
  level: number; // 1-6 for H1-H6
  text: string;
  line: number; // 0-indexed line number
  id: string; // slug for navigation
  children: OutlineHeader[];
};

/**
 * Extract outline structure from markdown content
 */
export function extractOutline(markdown: string): OutlineHeader[] {
  const lines = markdown.split("\n");
  const headers: OutlineHeader[] = [];
  const stack: OutlineHeader[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return;

    const level = match[1].length;
    const text = match[2].trim();
    const id = slugify(text);

    const header: OutlineHeader = {
      level,
      text,
      line: index,
      id,
      children: [],
    };

    // Find parent in stack (last header with lower level)
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level header
      headers.push(header);
    } else {
      // Nested header
      stack[stack.length - 1].children.push(header);
    }

    stack.push(header);
  });

  return headers;
}

/**
 * Find the current header at a given line number
 * @param outline - The outline structure
 * @param currentLine - The 0-indexed line number in the document  
 * @param frontmatterOffset - Optional offset to add (e.g., number of frontmatter lines in write mode)
 */
export function findCurrentHeader(
  outline: OutlineHeader[],
  currentLine: number,
  frontmatterOffset = 0
): OutlineHeader | null {
  let current: OutlineHeader | null = null;
  const adjustedLine = currentLine + frontmatterOffset;

  function traverse(headers: OutlineHeader[]) {
    for (const header of headers) {
      if (header.line <= adjustedLine) {
        current = header;
        traverse(header.children);
      } else {
        break;
      }
    }
  }

  traverse(outline);
  return current;
}

/**
 * Get breadcrumb path to a header
 */
export function getHeaderPath(
  outline: OutlineHeader[],
  targetHeader: OutlineHeader
): OutlineHeader[] {
  const path: OutlineHeader[] = [];

  function search(headers: OutlineHeader[]): boolean {
    for (const header of headers) {
      path.push(header);
      if (header === targetHeader) {
        return true;
      }
      if (search(header.children)) {
        return true;
      }
      path.pop();
    }
    return false;
  }

  search(outline);
  return path;
}

/**
 * Simple slugify function for header IDs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
