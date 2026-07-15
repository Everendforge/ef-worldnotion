import YAML, { isMap, isNode, type Document } from "yaml";

type FrontmatterDocument = Document.Parsed;

function splitFrontmatter(frontmatterRaw: string): string | undefined {
  const normalized = frontmatterRaw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*$/);
  return match?.[1];
}

export function parseFrontmatterDocument(frontmatterRaw: string): FrontmatterDocument | undefined {
  const body = splitFrontmatter(frontmatterRaw);
  if (body === undefined) return undefined;
  const document = YAML.parseDocument(body, { keepSourceTokens: true });
  if (document.errors.length) return undefined;
  return document;
}

export function frontmatterDocumentToRaw(document: FrontmatterDocument): string {
  const body = document.toString({ lineWidth: 0 }).replace(/\n$/, "");
  return `---\n${body}\n---`;
}

function pruneEmptyParents(document: FrontmatterDocument, path: readonly string[]) {
  for (let depth = path.length - 1; depth > 0; depth -= 1) {
    const parentPath = path.slice(0, depth);
    const node = document.getIn(parentPath, true);
    if (!isMap(node) || node.items.length > 0) break;
    document.deleteIn(parentPath);
  }
}

export function setDocumentValue(
  document: FrontmatterDocument,
  path: readonly string[],
  value: unknown,
) {
  if (value === undefined) {
    document.deleteIn(path);
    pruneEmptyParents(document, path);
    return;
  }
  document.setIn(path, value);
}

export function copyDocumentValue(
  document: FrontmatterDocument,
  fromPath: readonly string[],
  toPath: readonly string[],
) {
  const sourceNode = document.getIn(fromPath, true);
  document.setIn(toPath, isNode(sourceNode) ? sourceNode.clone() : document.getIn(fromPath));
}

export function updateFrontmatterDocument(
  frontmatterRaw: string,
  updates: Array<{ path: string[]; value: unknown }>,
  topLevelOrder?: string[],
): string {
  const document = parseFrontmatterDocument(frontmatterRaw);
  if (!document) return frontmatterRaw;
  updates.forEach(({ path, value }) => setDocumentValue(document, path, value));
  if (topLevelOrder && isMap(document.contents)) {
    const order = new Map(topLevelOrder.map((key, index) => [key, index]));
    document.contents.items = document.contents.items
      .map((pair, index) => ({ pair, index }))
      .sort((first, second) => {
        const firstKey = String(
          (first.pair.key as { value?: unknown } | null)?.value ?? first.pair.key ?? "",
        );
        const secondKey = String(
          (second.pair.key as { value?: unknown } | null)?.value ?? second.pair.key ?? "",
        );
        const firstOrder = order.get(firstKey) ?? Number.MAX_SAFE_INTEGER;
        const secondOrder = order.get(secondKey) ?? Number.MAX_SAFE_INTEGER;
        return firstOrder - secondOrder || first.index - second.index;
      })
      .map(({ pair }) => pair);
  }
  return frontmatterDocumentToRaw(document);
}

export function moveFrontmatterDocumentValue(
  frontmatterRaw: string,
  fromPath: string[],
  toPath: string[],
): string {
  const document = parseFrontmatterDocument(frontmatterRaw);
  if (!document || !document.hasIn(fromPath)) return frontmatterRaw;
  copyDocumentValue(document, fromPath, toPath);
  document.deleteIn(fromPath);
  pruneEmptyParents(document, fromPath);
  return frontmatterDocumentToRaw(document);
}
