export type PlatformLabels = {
  revealItem: string;
  revealUniverse: string;
  trashAction: string;
  trashDone: string;
};

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function canUseBrowserDirectoryPicker(): boolean {
  return "showDirectoryPicker" in window;
}

export function platformLabelsFor(platform: string, userAgent: string): PlatformLabels {
  const normalizedPlatform = platform.toLowerCase();
  const normalizedUserAgent = userAgent.toLowerCase();
  const isMac = normalizedPlatform.includes("mac");
  const isWindows = normalizedPlatform.includes("win") || normalizedUserAgent.includes("windows");

  return {
    revealItem: isWindows ? "Reveal in Explorer" : isMac ? "Reveal in Finder" : "Reveal in Files",
    revealUniverse: isWindows
      ? "Reveal universe folder in Explorer"
      : isMac
        ? "Reveal universe folder in Finder"
        : "Reveal universe folder",
    trashAction: isWindows ? "Move to Recycle Bin" : "Move to Trash",
    trashDone: isWindows ? "Moved to Recycle Bin." : "Moved to Trash.",
  };
}

export function platformLabels(): PlatformLabels {
  return platformLabelsFor(navigator.platform, navigator.userAgent);
}

export function shortcutMatches(event: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false;
  const parts = shortcut.split("+");
  const needsMod = parts.includes("Mod");
  const needsAlt = parts.includes("Alt");
  const needsShift = parts.includes("Shift");
  const key = parts.find((part) => !["Mod", "Alt", "Shift"].includes(part));
  const eventKey = event.key.length === 1 ? event.key.toUpperCase() : event.key;

  return (
    (event.metaKey || event.ctrlKey) === needsMod &&
    event.altKey === needsAlt &&
    event.shiftKey === needsShift &&
    (!key || eventKey === key)
  );
}
