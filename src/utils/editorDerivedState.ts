import type { OpenTab } from "../editorTypes";
import { rawToEditorParts } from "./contentTemplates";
import { extractOutline, findCurrentHeader, type OutlineHeader } from "./outlineExtractor";

export function editorDisplayValue(tab: OpenTab | undefined): string {
  if (!tab) return "";
  return tab.mode === "write" ? rawToEditorParts(tab.rawMarkdown).bodyMarkdown : tab.rawMarkdown;
}

export function outlineForTab(tab: OpenTab | undefined): OutlineHeader[] {
  return extractOutline(editorDisplayValue(tab));
}

export function currentHeaderForLine(
  tab: OpenTab | undefined,
  cursorLine: number,
): OutlineHeader | null {
  if (!tab) return null;
  return findCurrentHeader(outlineForTab(tab), cursorLine, 0);
}
