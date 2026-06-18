import type { FileAccessStats, WorkspaceSession } from "../editorTypes";

const MAX_STATS_ENTRIES = 100;
const STATS_EXPIRY_DAYS = 30;

/**
 * Incrementa el contador de acceso de un archivo en las estadísticas
 */
export function incrementFileAccess(
  session: WorkspaceSession,
  filePath: string
): FileAccessStats[] {
  const stats = session.fileAccessStats || [];
  const now = Date.now();
  
  // Buscar si ya existe entrada para este archivo
  const existingIndex = stats.findIndex(s => s.path === filePath);
  
  let updatedStats: FileAccessStats[];
  if (existingIndex >= 0) {
    // Actualizar entrada existente
    updatedStats = [...stats];
    updatedStats[existingIndex] = {
      path: filePath,
      count: updatedStats[existingIndex].count + 1,
      lastAccessed: now
    };
  } else {
    // Crear nueva entrada
    updatedStats = [
      ...stats,
      {
        path: filePath,
        count: 1,
        lastAccessed: now
      }
    ];
  }
  
  // Limpiar entradas antiguas y limitar tamaño
  return cleanupStats(updatedStats);
}

/**
 * Obtiene el score de frecuencia para un archivo (0-1)
 * Considera tanto la cantidad de accesos como la recencia
 */
export function getFileFrequencyScore(
  stats: FileAccessStats[] | undefined,
  filePath: string
): number {
  if (!stats || stats.length === 0) return 0;
  
  const stat = stats.find(s => s.path === filePath);
  if (!stat) return 0;
  
  // Encontrar el máximo de accesos para normalizar
  const maxCount = Math.max(...stats.map(s => s.count));
  
  // Score basado en cantidad de accesos (0-1)
  const countScore = stat.count / maxCount;
  
  // Score basado en recencia (0-1)
  const now = Date.now();
  const daysSinceAccess = (now - stat.lastAccessed) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceAccess / STATS_EXPIRY_DAYS);
  
  // Combinar scores: 70% frecuencia, 30% recencia
  return countScore * 0.7 + recencyScore * 0.3;
}

/**
 * Obtiene los archivos más frecuentes ordenados por score
 */
export function getMostFrequentFiles(
  stats: FileAccessStats[] | undefined,
  limit: number = 10
): string[] {
  if (!stats || stats.length === 0) return [];
  
  return [...stats]
    .map(stat => ({
      path: stat.path,
      score: getFileFrequencyScore(stats, stat.path)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.path);
}

/**
 * Limpia estadísticas antiguas y limita el tamaño
 */
function cleanupStats(stats: FileAccessStats[]): FileAccessStats[] {
  const now = Date.now();
  const expiryMs = STATS_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  
  // Filtrar entradas expiradas
  const validStats = stats.filter(stat => {
    const age = now - stat.lastAccessed;
    return age < expiryMs;
  });
  
  // Limitar tamaño manteniendo los más frecuentes
  if (validStats.length > MAX_STATS_ENTRIES) {
    return validStats
      .sort((a, b) => {
        // Ordenar por count primero, luego por recencia
        if (b.count !== a.count) return b.count - a.count;
        return b.lastAccessed - a.lastAccessed;
      })
      .slice(0, MAX_STATS_ENTRIES);
  }
  
  return validStats;
}
