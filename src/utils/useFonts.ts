import { useEffect, useState } from "react";

// Common web-safe fonts that work across all platforms
const COMMON_FONTS = [
  "Arial, sans-serif",
  "Helvetica, Arial, sans-serif",
  "Times New Roman, Times, serif",
  "Georgia, serif",
  "Courier New, Courier, monospace",
  "Verdana, sans-serif",
  "Palatino Linotype, Palatino, serif",
  "Garamond, serif",
  "Trebuchet MS, sans-serif",
  "Impact, sans-serif",
  "Comic Sans MS, cursive",
];

// Popular system fonts
const SYSTEM_FONTS = [
  // macOS
  "SF Pro Display, -apple-system, sans-serif",
  "SF Pro Text, -apple-system, sans-serif",
  "Avenir, sans-serif",
  "Menlo, monospace",
  "Monaco, monospace",
  
  // Windows
  "Segoe UI, sans-serif",
  "Calibri, sans-serif",
  "Cambria, serif",
  "Consolas, monospace",
  "Candara, sans-serif",
  
  // Linux
  "Ubuntu, sans-serif",
  "Roboto, sans-serif",
  "Noto Sans, sans-serif",
  "Liberation Sans, sans-serif",
  
  // Generic
  "Inter, sans-serif",
  "system-ui, sans-serif",
];

// Type for the Font Access API (currently experimental)
interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

// Extended Navigator type for Font Access API
interface NavigatorWithFonts {
  queryLocalFonts?: () => Promise<FontData[]>;
}

export function useFonts() {
  const [fonts, setFonts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        const allFonts = new Set<string>();
        
        // Add common and system fonts first
        [...COMMON_FONTS, ...SYSTEM_FONTS].forEach(font => allFonts.add(font));

        // Try to query local fonts using the Font Access API (Chrome/Edge only)
        const nav = navigator as NavigatorWithFonts;
        
        if (nav.queryLocalFonts) {
          try {
            // Query local fonts
            const localFonts = await nav.queryLocalFonts();
            
            // Group fonts by family and deduplicate
            const fontFamilies = new Set<string>();
            localFonts.forEach((font) => {
              if (font.family) {
                fontFamilies.add(font.family);
              }
            });

            // Add local fonts with fallbacks
            fontFamilies.forEach((family) => {
              // Clean up the font name and add appropriate fallback
              const cleanFamily = family.trim();
              if (cleanFamily) {
                // Determine fallback based on common font characteristics
                const isMonospace = cleanFamily.toLowerCase().includes("mono") || 
                                   cleanFamily.toLowerCase().includes("code") ||
                                   cleanFamily.toLowerCase().includes("console");
                const isSerif = cleanFamily.toLowerCase().includes("serif") ||
                               cleanFamily.toLowerCase().includes("times") ||
                               cleanFamily.toLowerCase().includes("garamond");
                
                const fallback = isMonospace ? "monospace" : isSerif ? "serif" : "sans-serif";
                allFonts.add(`"${cleanFamily}", ${fallback}`);
              }
            });

            console.log(`Loaded ${fontFamilies.size} local fonts`);
          } catch (err) {
            console.warn("Could not access local fonts:", err);
            // Continue with common/system fonts only
          }
        }

        // Convert to sorted array
        const sortedFonts = Array.from(allFonts).sort((a, b) => {
          // Extract the first font name for sorting
          const nameA = a.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
          const nameB = b.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setFonts(sortedFonts);
        setLoading(false);
      } catch (err) {
        console.error("Error loading fonts:", err);
        setError(err instanceof Error ? err.message : "Failed to load fonts");
        // Fallback to just common fonts
        setFonts([...COMMON_FONTS, ...SYSTEM_FONTS]);
        setLoading(false);
      }
    }

    loadFonts();
  }, []);

  return { fonts, loading, error };
}
