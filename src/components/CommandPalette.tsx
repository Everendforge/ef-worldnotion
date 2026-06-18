import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import {
  FileText,
  Hash,
  Terminal,
  ChevronRight,
  Clock,
  Star,
  Search,
  X,
} from "lucide-react";
import {
  CommandPaletteMode,
  CommandPaletteResult,
  FileResult,
  CommandResult,
  HeaderResult,
  TagResult,
  EditorCommandId,
  FileAccessStats,
} from "../editorTypes";
import { getFileFrequencyScore } from "../utils/fileAccessStats";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: CommandPaletteMode;
  fileResults: FileResult[];
  commandResults: CommandResult[];
  headerResults: HeaderResult[];
  tagResults: TagResult[];
  recentFiles?: string[];
  favorites?: string[];
  fileAccessStats?: FileAccessStats[];
  quickSwitcherMode?: boolean;
  onSelectFile: (path: string) => void;
  onSelectCommand: (commandId: EditorCommandId) => void;
  onSelectHeader: (line: number) => void;
  onSelectTag: (tag: string) => void;
}

const FUSE_OPTIONS_FILES: IFuseOptions<FileResult> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "path", weight: 1 },
    { name: "tags", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
};

const FUSE_OPTIONS_COMMANDS: IFuseOptions<CommandResult> = {
  keys: [
    { name: "title", weight: 2 },
    { name: "subtitle", weight: 1 },
    { name: "group", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
};

const FUSE_OPTIONS_HEADERS: IFuseOptions<HeaderResult> = {
  keys: ["title"],
  threshold: 0.3,
  includeScore: true,
};

const FUSE_OPTIONS_TAGS: IFuseOptions<TagResult> = {
  keys: ["tag", "title"],
  threshold: 0.3,
  includeScore: true,
};

function getResultIcon(result: CommandPaletteResult) {
  switch (result.type) {
    case "file":
      return <FileText className="result-icon" size={18} />;
    case "command":
      return <Terminal className="result-icon" size={18} />;
    case "header":
      return <Hash className="result-icon" size={18} />;
    case "tag":
      return <Hash className="result-icon" size={18} />;
  }
}

export function CommandPalette({
  isOpen,
  onClose,
  mode = "files",
  fileResults,
  commandResults,
  headerResults,
  tagResults,
  recentFiles = [],
  favorites = [],
  fileAccessStats,
  quickSwitcherMode = false,
  onSelectFile,
  onSelectCommand,
  onSelectHeader,
  onSelectTag,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<CommandPaletteMode>(mode);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Detect mode from query prefix (disabled in Quick Switcher mode)
  useEffect(() => {
    if (quickSwitcherMode) {
      setActiveMode("files");
      return;
    }
    
    if (query.startsWith("@")) {
      setActiveMode("headers");
    } else if (query.startsWith("#")) {
      setActiveMode("tags");
    } else if (query.startsWith(">")) {
      setActiveMode("commands");
    } else if (!query.startsWith("@") && !query.startsWith("#") && !query.startsWith(">")) {
      setActiveMode("files");
    }
  }, [query, quickSwitcherMode]);

  // Get search query without prefix
  const searchQuery = useMemo(() => {
    if (query.startsWith("@") || query.startsWith("#") || query.startsWith(">")) {
      return query.slice(1).trim();
    }
    return query;
  }, [query]);

  // Perform fuzzy search
  const results = useMemo(() => {
    let items: CommandPaletteResult[] = [];

    switch (activeMode) {
      case "files": {
        if (!searchQuery) {
          // En Quick Switcher mode o sin query, mostrar por frecuencia
          if (quickSwitcherMode && fileAccessStats && fileAccessStats.length > 0) {
            items = [...fileResults]
              .map((file) => ({
                file,
                score: getFileFrequencyScore(fileAccessStats, file.path),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 15)
              .map((item) => item.file);
          } else if (quickSwitcherMode) {
            // Si no hay stats aún, mostrar todos los archivos limitados
            items = fileResults.slice(0, 15);
          } else if (fileAccessStats && fileAccessStats.length > 0) {
            items = [...fileResults]
              .map((file) => ({
                file,
                score: getFileFrequencyScore(fileAccessStats, file.path),
              }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 15)
              .map((item) => item.file);
          } else {
            // Fallback a recientes y favoritos
            const recentItems = fileResults.filter((f) => recentFiles.includes(f.path)).slice(0, 5);
            const favoriteItems = fileResults.filter((f) => favorites.includes(f.path)).slice(0, 5);
            items = [...recentItems, ...favoriteItems];
          }
        } else {
          // Con query, usar fuzzy search pero ajustar scores por frecuencia
          const fuse = new Fuse(fileResults, FUSE_OPTIONS_FILES);
          const searchResults = fuse.search(searchQuery);
          
          if (fileAccessStats) {
            // Combinar Fuse score con frecuencia
            items = searchResults
              .map((result) => {
                const fuseScore = 1 - (result.score || 0); // Invertir (mayor es mejor)
                const freqScore = getFileFrequencyScore(fileAccessStats, result.item.path);
                // 60% fuzzy match, 40% frecuencia
                const combinedScore = fuseScore * 0.6 + freqScore * 0.4;
                return { item: result.item, combinedScore };
              })
              .sort((a, b) => b.combinedScore - a.combinedScore)
              .map((r) => r.item);
          } else {
            items = searchResults.map((result) => result.item);
          }
        }
        break;
      }
      case "commands": {
        if (!searchQuery) {
          items = commandResults;
        } else {
          const fuse = new Fuse(commandResults, FUSE_OPTIONS_COMMANDS);
          items = fuse.search(searchQuery).map((result) => result.item);
        }
        break;
      }
      case "headers": {
        if (!searchQuery) {
          items = headerResults;
        } else {
          const fuse = new Fuse(headerResults, FUSE_OPTIONS_HEADERS);
          items = fuse.search(searchQuery).map((result) => result.item);
        }
        break;
      }
      case "tags": {
        if (!searchQuery) {
          items = tagResults;
        } else {
          const fuse = new Fuse(tagResults, FUSE_OPTIONS_TAGS);
          items = fuse.search(searchQuery).map((result) => result.item);
        }
        break;
      }
    }

    return items.slice(0, quickSwitcherMode ? 15 : 8);
  }, [
    activeMode,
    searchQuery,
    fileResults,
    commandResults,
    headerResults,
    tagResults,
    recentFiles,
    favorites,
    fileAccessStats,
    quickSwitcherMode,
  ]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to ensure focus happens after render
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (result: CommandPaletteResult) => {
      switch (result.type) {
        case "file":
          onSelectFile(result.path);
          break;
        case "command":
          onSelectCommand(result.commandId);
          break;
        case "header":
          onSelectHeader(result.line);
          break;
        case "tag":
          onSelectTag(result.tag);
          break;
      }
      onClose();
    },
    [onSelectFile, onSelectCommand, onSelectHeader, onSelectTag, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [results, selectedIndex, handleSelect, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette">
        <div className="command-palette-header">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            autoFocus
            placeholder={
              activeMode === "files"
                ? "Search files... (@ for headers, # for tags, > for commands)"
                : activeMode === "headers"
                  ? "Search headers in current file..."
                  : activeMode === "tags"
                    ? "Search tags..."
                    : "Search commands..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              className="clear-button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="command-palette-results" ref={resultsRef}>
          {results.length === 0 ? (
            <div className="no-results">
              No results found
              {activeMode === "files" && query && (
                <div className="no-results-hint">
                  Try @ for headers, # for tags, or &gt; for commands
                </div>
              )}
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                className={`command-palette-result ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="result-icon-container">{getResultIcon(result)}</div>
                <div className="result-content">
                  <div className="result-title">
                    {result.title}
                    {result.type === "file" &&
                      recentFiles.includes((result as FileResult).path) && (
                        <Clock className="recent-indicator" size={14} />
                      )}
                    {result.type === "file" &&
                      favorites.includes((result as FileResult).path) && (
                        <Star className="favorite-indicator" size={14} />
                      )}
                  </div>
                  {result.subtitle && <div className="result-subtitle">{result.subtitle}</div>}
                  {result.type === "command" && result.shortcut && (
                    <div className="result-shortcut">{result.shortcut}</div>
                  )}
                </div>
                <ChevronRight className="result-arrow" size={16} />
              </button>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="palette-mode-indicator">
            {activeMode === "files" && <span>📄 Files</span>}
            {activeMode === "headers" && <span>📑 Headers</span>}
            {activeMode === "tags" && <span>🏷️ Tags</span>}
            {activeMode === "commands" && <span>⌘ Commands</span>}
          </div>
          <div className="palette-hints">
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate • <kbd>↵</kbd> to select • <kbd>esc</kbd> to
            close
          </div>
        </div>
      </div>
    </div>
  );
}
