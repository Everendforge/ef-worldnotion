export type LocaleNames = Record<string, string>;

export const COMMON_LOCALES = [
  "es-419",
  "es-ES",
  "es-MX",
  "es-PE",
  "en-US",
  "en-GB",
  "pt-BR",
  "pt-PT",
  "fr-FR",
  "de-DE",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-Hans",
  "zh-Hant",
  "ar",
  "ru",
  "pl",
  "tr",
  "hi",
  "id",
  "nl",
  "sv",
  "uk",
] as const;

export function canonicalLocale(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) return "und";
  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? "und";
  } catch {
    return "und";
  }
}

export function normalizeLocaleList(primaryLocale: string, locales: string[]): string[] {
  const primary = canonicalLocale(primaryLocale);
  return Array.from(new Set([primary, ...locales.map(canonicalLocale)]));
}

export function normalizeLocaleNames(
  localeNames: LocaleNames | undefined,
  locales: string[],
): LocaleNames | undefined {
  if (!localeNames) return undefined;
  const allowed = new Set(locales.map(canonicalLocale));
  const normalized = Object.fromEntries(
    Object.entries(localeNames)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([locale, name]) => [canonicalLocale(locale), name.trim()] as const)
      .filter(([locale, name]) => allowed.has(locale) && name.length > 0),
  );
  return Object.keys(normalized).length ? normalized : undefined;
}

export function localeDisplayName(locale: string, localeNames?: LocaleNames): string {
  const code = canonicalLocale(locale);
  if (localeNames?.[code]) return localeNames[code];
  try {
    return new Intl.DisplayNames(["es"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function localeOptions(locales: string[], localeNames?: LocaleNames): string[] {
  return Array.from(new Set([...COMMON_LOCALES, ...locales.map(canonicalLocale)])).sort(
    (left, right) =>
      localeDisplayName(left, localeNames).localeCompare(
        localeDisplayName(right, localeNames),
        "es",
      ),
  );
}

export function customLocaleId(name: string, existingLocales: string[]): string {
  const slug =
    name
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "language";
  const existing = new Set(existingLocales.map(canonicalLocale));
  let suffix = 1;
  let candidate = `und-x-${slug}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `und-x-${slug}-${suffix}`;
  }
  return candidate;
}
