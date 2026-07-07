import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../utils/appEnvironment";

/**
 * Valida contra el backend qué universos recientes ya no existen en disco,
 * para marcarlos en el dashboard. Expone el setter porque otras rutas
 * (abrir/eliminar un reciente) ajustan el conjunto directamente.
 */
export function useMissingRecentPaths(recentUniverses: string[]) {
  const [missingRecentPaths, setMissingRecentPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    const recentPaths = recentUniverses.filter((path) => !path.startsWith("browser:"));
    if (!recentPaths.length || !isTauriRuntime()) {
      setMissingRecentPaths(new Set());
      return;
    }

    let cancelled = false;
    Promise.all(
      recentPaths.map(async (path) => {
        const exists = await invoke<boolean>("path_exists", { path }).catch(() => false);
        return [path, exists] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      setMissingRecentPaths(new Set(results.filter(([, exists]) => !exists).map(([path]) => path)));
    });

    return () => {
      cancelled = true;
    };
  }, [recentUniverses.join("|")]);

  return { missingRecentPaths, setMissingRecentPaths };
}
