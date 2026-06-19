import React, { useState, useEffect } from "react";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import Fuse from "fuse.js";
import type { GraphNode } from "../utils/graphData";

export interface GraphControlsProps {
  nodes: GraphNode[];
  availableTypes: string[];
  availableTags: string[];
  mode: "global" | "local";
  depth: number;
  filterTypes: string[];
  filterTags: string[];
  showWikilinks: boolean;
  showHierarchy: boolean;
  showTagRelations: boolean;
  onModeChange: (mode: "global" | "local") => void;
  onDepthChange: (depth: number) => void;
  onFilterTypesChange: (types: string[]) => void;
  onFilterTagsChange: (tags: string[]) => void;
  onShowWikilinksChange: (show: boolean) => void;
  onShowHierarchyChange: (show: boolean) => void;
  onShowTagRelationsChange: (show: boolean) => void;
  onSearchResultsChange: (nodeIds: Set<string>) => void;
}

/**
 * Control panel for graph view with filters, search, and view options.
 */
export function GraphControls({
  nodes,
  availableTypes,
  availableTags,
  mode,
  depth,
  filterTypes,
  filterTags,
  showWikilinks,
  showHierarchy,
  showTagRelations,
  onModeChange,
  onDepthChange,
  onFilterTypesChange,
  onFilterTagsChange,
  onShowWikilinksChange,
  onShowHierarchyChange,
  onShowTagRelationsChange,
  onSearchResultsChange,
}: GraphControlsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Fuse.js instance for search
  const fuse = React.useMemo(
    () =>
      new Fuse(nodes, {
        keys: ["label", "type", "tags"],
        threshold: 0.3,
        includeScore: true,
      }),
    [nodes]
  );

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      onSearchResultsChange(new Set());
      return;
    }

    const results = fuse.search(searchQuery);
    const resultNodes = results.map((result) => result.item);
    setSearchResults(resultNodes);
    onSearchResultsChange(new Set(resultNodes.map((node) => node.id)));
  }, [searchQuery, fuse, onSearchResultsChange]);

  // Toggle type filter
  const handleTypeToggle = (type: string) => {
    if (filterTypes.includes(type)) {
      onFilterTypesChange(filterTypes.filter((t) => t !== type));
    } else {
      onFilterTypesChange([...filterTypes, type]);
    }
  };

  // Toggle tag filter
  const handleTagToggle = (tag: string) => {
    if (filterTags.includes(tag)) {
      onFilterTagsChange(filterTags.filter((t) => t !== tag));
    } else {
      onFilterTagsChange([...filterTags, tag]);
    }
  };

  const nodeCount = nodes.length;
  const linkCount = nodes.reduce((sum, node) => sum + node.degree, 0) / 2; // Approximate

  return (
    <div className="graph-controls">
      <div className="graph-controls-section">
        <h3 className="graph-controls-title">Graph View</h3>
        <div className="graph-stats">
          <span className="stat">
            <strong>{nodeCount}</strong> nodes
          </span>
          <span className="stat">
            <strong>{Math.round(linkCount)}</strong> links
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="graph-controls-section">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="search-clear"
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchResults.length > 0 && (
          <p className="search-results-info">
            Found {searchResults.length} node{searchResults.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* View Mode */}
      <div className="graph-controls-section">
        <label className="control-label">View Mode</label>
        <div className="button-group">
          <button
            className={`btn-group-item ${mode === "global" ? "active" : ""}`}
            onClick={() => onModeChange("global")}
            type="button"
          >
            Global
          </button>
          <button
            className={`btn-group-item ${mode === "local" ? "active" : ""}`}
            onClick={() => onModeChange("local")}
            type="button"
          >
            Local
          </button>
        </div>
      </div>

      {/* Depth (for local mode) */}
      {mode === "local" && (
        <div className="graph-controls-section">
          <label className="control-label">
            Depth: <strong>{depth}</strong>
          </label>
          <input
            type="range"
            min="1"
            max="3"
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="slider"
          />
        </div>
      )}

      {/* Relationship Types */}
      <div className="graph-controls-section">
        <label className="control-label">Relationships</label>
        <div className="checkbox-list">
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={showWikilinks}
              onChange={(e) => onShowWikilinksChange(e.target.checked)}
            />
            <span>Wikilinks</span>
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={showHierarchy}
              onChange={(e) => onShowHierarchyChange(e.target.checked)}
            />
            <span>Hierarchy</span>
          </label>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={showTagRelations}
              onChange={(e) => onShowTagRelationsChange(e.target.checked)}
            />
            <span>Shared Tags</span>
          </label>
        </div>
      </div>

      {/* Type Filter */}
      <div className="graph-controls-section">
        <button
          className="filter-header"
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          type="button"
        >
          {showTypeFilter ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
          <span className="control-label">
            Filter by Type
            {filterTypes.length > 0 && (
              <span className="filter-count">({filterTypes.length})</span>
            )}
          </span>
        </button>
        {showTypeFilter && (
          <div className="checkbox-list">
            {availableTypes.map((type) => (
              <label key={type} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filterTypes.includes(type)}
                  onChange={() => handleTypeToggle(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Tag Filter */}
      <div className="graph-controls-section">
        <button
          className="filter-header"
          onClick={() => setShowTagFilter(!showTagFilter)}
          type="button"
        >
          {showTagFilter ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
          <span className="control-label">
            Filter by Tag
            {filterTags.length > 0 && (
              <span className="filter-count">({filterTags.length})</span>
            )}
          </span>
        </button>
        {showTagFilter && (
          <div className="checkbox-list">
            {availableTags.slice(0, 20).map((tag) => (
              <label key={tag} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filterTags.includes(tag)}
                  onChange={() => handleTagToggle(tag)}
                />
                <span>{tag}</span>
              </label>
            ))}
            {availableTags.length > 20 && (
              <p className="muted text-xs">
                Showing 20 of {availableTags.length} tags
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
