import type { ValidationFinding, VaultFile } from "../domain";
import {
  DEFAULT_EDITOR_SETTINGS,
  DEFAULT_EXPLORER_SETTINGS,
  DEFAULT_GRAPH_SETTINGS,
  DEFAULT_KEYBINDINGS,
  DEFAULT_PLUGIN_SETTINGS,
  type AppSettingsV4,
  type VaultAppearanceExplorerSettings,
  type VaultAppearanceSettings,
} from "../editorTypes";
import { normalizeThemeId } from "../themes";
import { DEFAULT_AI_ADVISOR_SETTINGS, normalizeAiAdvisorSettings } from "./aiProviders";
import { normalizePluginSettings } from "./pluginRegistry";

export const VAULT_APPEARANCE_SETTINGS_PATH = ".everend/settings.json";

function normalizeExplorerAppearance(value: unknown): VaultAppearanceExplorerSettings {
  const parsed = (value ?? {}) as Partial<VaultAppearanceExplorerSettings>;
  return {
    confirmDragMove:
      typeof parsed.confirmDragMove === "boolean"
        ? parsed.confirmDragMove
        : DEFAULT_EXPLORER_SETTINGS.confirmDragMove,
    showHiddenEverend:
      typeof parsed.showHiddenEverend === "boolean"
        ? parsed.showHiddenEverend
        : DEFAULT_EXPLORER_SETTINGS.showHiddenEverend,
    folderNotesEnabled:
      typeof parsed.folderNotesEnabled === "boolean"
        ? parsed.folderNotesEnabled
        : DEFAULT_EXPLORER_SETTINGS.folderNotesEnabled,
    showImagesInAllFiles:
      typeof parsed.showImagesInAllFiles === "boolean"
        ? parsed.showImagesInAllFiles
        : DEFAULT_EXPLORER_SETTINGS.showImagesInAllFiles,
    activeSection:
      parsed.activeSection === "favorites" ||
      parsed.activeSection === "ecosystem" ||
      parsed.activeSection === "images"
        ? parsed.activeSection
        : "allFiles",
  };
}

function normalizeKeybindings(value: unknown): VaultAppearanceSettings["keybindings"] {
  if (!Array.isArray(value) || !value.length) return DEFAULT_KEYBINDINGS;
  const userBindings = new Map(
    value
      .filter(
        (entry): entry is { commandId: string; shortcut: string } =>
          Boolean(entry) &&
          typeof (entry as Record<string, unknown>).commandId === "string" &&
          typeof (entry as Record<string, unknown>).shortcut === "string",
      )
      .map((entry) => [entry.commandId, entry.shortcut]),
  );
  return DEFAULT_KEYBINDINGS.map((defaultKeybinding) => ({
    commandId: defaultKeybinding.commandId,
    shortcut: userBindings.get(defaultKeybinding.commandId) ?? defaultKeybinding.shortcut,
  }));
}

/** Extracts the portable "how this universe looks and behaves" slice from the full app settings. */
export function extractVaultAppearanceSettings(settings: AppSettingsV4): VaultAppearanceSettings {
  return {
    version: 1,
    theme: settings.theme,
    editor: settings.editor,
    explorer: normalizeExplorerAppearance(settings.explorer),
    graph: settings.graph,
    plugins: settings.plugins,
    aiAdvisor: settings.aiAdvisor,
    keybindings: settings.keybindings,
  };
}

export function serializeVaultAppearance(appearance: VaultAppearanceSettings): string {
  return `${JSON.stringify(appearance, null, 2)}\n`;
}

export function serializeVaultAppearanceSettings(settings: AppSettingsV4): string {
  return serializeVaultAppearance(extractVaultAppearanceSettings(settings));
}

/** Merges a universe's stored appearance over the current app settings; the universe wins. */
export function applyVaultAppearanceSettings(
  base: AppSettingsV4,
  appearance: VaultAppearanceSettings | undefined,
): AppSettingsV4 {
  if (!appearance) return base;
  return {
    ...base,
    theme: appearance.theme,
    editor: appearance.editor,
    explorer: { ...base.explorer, ...appearance.explorer },
    graph: appearance.graph,
    plugins: appearance.plugins,
    aiAdvisor: appearance.aiAdvisor,
    keybindings: appearance.keybindings,
  };
}

export function parseVaultAppearanceSettings(
  files: VaultFile[],
  findings: ValidationFinding[],
): VaultAppearanceSettings | undefined {
  const file = files.find((candidate) => candidate.relativePath === VAULT_APPEARANCE_SETTINGS_PATH);
  if (!file) return undefined;

  try {
    const parsed = JSON.parse(file.content) as Partial<VaultAppearanceSettings> | null;
    if (!parsed || typeof parsed !== "object") return undefined;
    return {
      version: 1,
      theme: normalizeThemeId(parsed.theme),
      editor: { ...DEFAULT_EDITOR_SETTINGS, ...(parsed.editor ?? {}) },
      explorer: normalizeExplorerAppearance(parsed.explorer),
      graph: { ...DEFAULT_GRAPH_SETTINGS, ...(parsed.graph ?? {}) },
      plugins: normalizePluginSettings(parsed.plugins ?? DEFAULT_PLUGIN_SETTINGS),
      aiAdvisor: normalizeAiAdvisorSettings(parsed.aiAdvisor ?? DEFAULT_AI_ADVISOR_SETTINGS),
      keybindings: normalizeKeybindings(parsed.keybindings),
    };
  } catch {
    findings.push({
      code: "missing_runtime_asset",
      severity: "warning",
      message: "Universe appearance settings must be valid JSON.",
      file: VAULT_APPEARANCE_SETTINGS_PATH,
    });
    return undefined;
  }
}
