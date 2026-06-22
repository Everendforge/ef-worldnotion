import type { OpenTab } from "../editorTypes";

export type SaveFileCommandPayload = {
  path: string;
  content: string;
  expectedModifiedMs: number | null;
};

export function saveFilePayloadForTab(tab: OpenTab): SaveFileCommandPayload {
  if (!tab.absolutePath) {
    throw new Error("This document does not have a writable path.");
  }

  return {
    path: tab.absolutePath,
    content: tab.rawMarkdown,
    expectedModifiedMs: tab.modifiedMs ?? null,
  };
}

export function markTabSaved(tab: OpenTab, modifiedMs?: number | null): OpenTab {
  return {
    ...tab,
    savedMarkdown: tab.rawMarkdown,
    dirty: false,
    modifiedMs: modifiedMs ?? tab.modifiedMs,
  };
}

export function markSavedTabInList(tabs: OpenTab[], path: string, modifiedMs?: number | null): OpenTab[] {
  return tabs.map((tab) => (tab.path === path ? markTabSaved(tab, modifiedMs) : tab));
}
