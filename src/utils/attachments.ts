export const DEFAULT_ATTACHMENTS_FOLDER = ".everend/assets/image";

export type ImagePresentation = {
  /** Percentage of the writing column occupied by the image. */
  width?: number;
  align?: "left" | "center" | "right";
};

const UNSAFE_CHARS = /[^a-zA-Z0-9._-]+/g;

function splitExtension(fileName: string): { base: string; ext: string } {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return { base: fileName, ext: "" };
  // dot === 0 means an extension-only name (e.g. ".png") -> empty base.
  return { base: fileName.slice(0, dot), ext: fileName.slice(dot) };
}

/** Sanitizes a file name into a safe, lowercase vault segment. */
export function sanitizeAttachmentName(fileName: string, fallback = "image"): string {
  const { base, ext } = splitExtension(fileName.trim());
  const safeBase = base
    .replace(UNSAFE_CHARS, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const safeExt = ext.replace(UNSAFE_CHARS, "").toLowerCase();
  return `${safeBase || fallback}${safeExt}`;
}

/**
 * Returns a collision-free vault-relative path under the attachments folder
 * for a new file, appending -1, -2, … when the name is already taken.
 */
export function uniqueAttachmentPath(
  existingPaths: Iterable<string>,
  fileName: string,
  folder: string = DEFAULT_ATTACHMENTS_FOLDER,
): string {
  const taken = new Set(existingPaths);
  const safeName = sanitizeAttachmentName(fileName);
  const { base, ext } = splitExtension(safeName);

  let candidate = `${folder}/${safeName}`;
  let counter = 1;
  while (taken.has(candidate)) {
    candidate = `${folder}/${base}-${counter}${ext}`;
    counter += 1;
  }
  return candidate;
}

/** Percent-encodes a vault path for use inside `![](…)` (spaces → %20). */
export function encodeImagePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Reads WorldNotion image presentation metadata from a standard Markdown
 * image title. Other image titles remain untouched by the renderer.
 */
export function parseImagePresentation(title?: string): ImagePresentation | undefined {
  if (!title?.startsWith("wn:")) return undefined;

  const values = new Map<string, string>();
  for (const part of title.slice(3).split(";")) {
    const [key, value] = part.split("=", 2).map((entry) => entry.trim());
    if (key && value) values.set(key, value);
  }
  const rawWidth = Number(values.get("width"));
  const width = Number.isFinite(rawWidth)
    ? Math.min(100, Math.max(20, Math.round(rawWidth)))
    : undefined;
  const rawAlign = values.get("align");
  const align =
    rawAlign === "left" || rawAlign === "center" || rawAlign === "right" ? rawAlign : undefined;

  return width || align ? { width, align } : undefined;
}

function imagePresentationTitle(presentation?: ImagePresentation): string | undefined {
  if (!presentation?.width && !presentation?.align) return undefined;
  const width = presentation.width
    ? Math.min(100, Math.max(20, Math.round(presentation.width)))
    : 100;
  return `wn:width=${width};align=${presentation.align ?? "center"}`;
}

/** Builds a portable Markdown image snippet for an inserted attachment. */
export function imageMarkdown(
  relativePath: string,
  alt?: string,
  presentation?: ImagePresentation,
): string {
  const label = (alt ?? splitExtension(relativePath.split("/").pop() ?? "").base).trim();
  const title = imagePresentationTitle(presentation);
  return `![${label}](${encodeImagePath(relativePath)}${title ? ` "${title}"` : ""})`;
}
