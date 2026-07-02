import type { AppSettingsV4, RecentUniverseProfile } from "../editorTypes";
import type { VaultIndex } from "../domain";
import { pathName } from "./pathUtils";

export function universeDisplayName(index?: VaultIndex): string {
  if (!index) return "Universe";
  return index.universeProfile?.name ?? pathName(index.rootPath);
}

export function profileForRecent(index: VaultIndex): RecentUniverseProfile {
  return {
    name: universeDisplayName(index),
    icon: index.universeProfile?.icon ?? { type: "preset", value: "book" },
  };
}

export function rememberUniverse(
  settings: AppSettingsV4,
  rootPath: string,
  profile?: RecentUniverseProfile,
): AppSettingsV4 {
  const recentUniverses = [
    rootPath,
    ...settings.recentUniverses.filter((candidate) => candidate !== rootPath),
  ].slice(0, 8);

  return {
    ...settings,
    recentUniverse: rootPath,
    recentUniverses,
    recentUniverseProfiles: profile
      ? { ...settings.recentUniverseProfiles, [rootPath]: profile }
      : settings.recentUniverseProfiles,
  };
}
