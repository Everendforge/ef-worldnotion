import { describe, expect, it } from "vitest";
import type { ValidationFinding, VaultFile } from "../domain";
import { DEFAULT_EDITOR_SETTINGS, type AppSettingsV4 } from "../editorTypes";
import { loadSettings } from "../settings";
import {
  VAULT_APPEARANCE_SETTINGS_PATH,
  applyVaultAppearanceSettings,
  extractVaultAppearanceSettings,
  parseVaultAppearanceSettings,
  serializeVaultAppearance,
} from "./vaultAppearanceSettings";

function baseSettings(): AppSettingsV4 {
  return loadSettings();
}

describe("vault appearance settings", () => {
  it("returns undefined when the universe has no settings file yet", () => {
    const findings: ValidationFinding[] = [];
    expect(parseVaultAppearanceSettings([{ relativePath: "Notes.md", content: "" }], findings)).toBeUndefined();
    expect(findings).toEqual([]);
  });

  it("round-trips a universe's appearance through serialize/parse", () => {
    const settings: AppSettingsV4 = {
      ...baseSettings(),
      theme: "github-dark",
      editor: { ...DEFAULT_EDITOR_SETTINGS, fontSize: 22 },
    };
    const appearance = extractVaultAppearanceSettings(settings);
    const files: VaultFile[] = [
      { relativePath: VAULT_APPEARANCE_SETTINGS_PATH, content: serializeVaultAppearance(appearance) },
    ];

    const findings: ValidationFinding[] = [];
    const parsed = parseVaultAppearanceSettings(files, findings);

    expect(findings).toEqual([]);
    expect(parsed?.theme).toBe("github-dark");
    expect(parsed?.editor.fontSize).toBe(22);
  });

  it("flags invalid JSON instead of throwing", () => {
    const findings: ValidationFinding[] = [];
    const parsed = parseVaultAppearanceSettings(
      [{ relativePath: VAULT_APPEARANCE_SETTINGS_PATH, content: "{ not json" }],
      findings,
    );

    expect(parsed).toBeUndefined();
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: VAULT_APPEARANCE_SETTINGS_PATH, severity: "warning" });
  });

  it("lets a universe's stored appearance override the local/machine settings", () => {
    const local = { ...baseSettings(), theme: "worldnotion-light" as const };
    const findings: ValidationFinding[] = [];
    const stored = parseVaultAppearanceSettings(
      [
        {
          relativePath: VAULT_APPEARANCE_SETTINGS_PATH,
          content: serializeVaultAppearance(
            extractVaultAppearanceSettings({ ...local, theme: "one-dark-pro" }),
          ),
        },
      ],
      findings,
    );

    const merged = applyVaultAppearanceSettings(local, stored);

    expect(merged.theme).toBe("one-dark-pro");
    // Machine-scoped fields are untouched by the merge.
    expect(merged.recentUniverses).toBe(local.recentUniverses);
    expect(merged.sessions).toBe(local.sessions);
  });

  it("leaves settings untouched when there is nothing stored yet", () => {
    const local = baseSettings();
    expect(applyVaultAppearanceSettings(local, undefined)).toBe(local);
  });
});
