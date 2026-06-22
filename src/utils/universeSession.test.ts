import { describe, expect, it } from "vitest";
import { loadSettings } from "../settings";
import type { VaultIndex } from "../domain";
import { profileForRecent, rememberUniverse, universeDisplayName } from "./universeSession";

function vaultIndex(rootPath: string, universeProfile?: VaultIndex["universeProfile"]): VaultIndex {
  return {
    rootPath,
    files: [],
    directories: [],
    markdownFiles: [],
    templates: [],
    universeProfile,
    universes: [],
    tree: [],
    entities: [],
    findings: [],
    readErrors: [],
    typeCounts: {},
  };
}

describe("universe session helpers", () => {
  it("derives display names and recent profiles from universe metadata or root path", () => {
    expect(universeDisplayName()).toBe("Universe");
    expect(universeDisplayName(vaultIndex("C:/Vaults/Demo"))).toBe("Demo");
    expect(universeDisplayName(vaultIndex("browser:Stories", { name: "Ever Archive" }))).toBe("Ever Archive");

    expect(profileForRecent(vaultIndex("C:/Vaults/Demo"))).toEqual({
      name: "Demo",
      icon: { type: "preset", value: "book" },
    });
    expect(profileForRecent(vaultIndex("C:/Vaults/Demo", { name: "Demo", icon: { type: "image", value: "icon.png" } }))).toEqual({
      name: "Demo",
      icon: { type: "image", value: "icon.png" },
    });
  });

  it("deduplicates recent universes, keeps the newest first, and stores profiles by path", () => {
    const settings = {
      ...loadSettings(),
      recentUniverse: "B",
      recentUniverses: ["A", "B", "C", "D", "E", "F", "G", "H"],
      recentUniverseProfiles: { A: { name: "Alpha" } },
    };

    const next = rememberUniverse(settings, "C", { name: "Gamma", icon: { type: "preset", value: "spark" } });

    expect(next.recentUniverse).toBe("C");
    expect(next.recentUniverses).toEqual(["C", "A", "B", "D", "E", "F", "G", "H"]);
    expect(next.recentUniverseProfiles).toEqual({
      A: { name: "Alpha" },
      C: { name: "Gamma", icon: { type: "preset", value: "spark" } },
    });
  });

  it("caps recent universes at eight and preserves profiles when no new profile is supplied", () => {
    const settings = {
      ...loadSettings(),
      recentUniverses: ["A", "B", "C", "D", "E", "F", "G", "H"],
      recentUniverseProfiles: { A: { name: "Alpha" } },
    };

    const next = rememberUniverse(settings, "I");

    expect(next.recentUniverses).toEqual(["I", "A", "B", "C", "D", "E", "F", "G"]);
    expect(next.recentUniverseProfiles).toBe(settings.recentUniverseProfiles);
  });
});
