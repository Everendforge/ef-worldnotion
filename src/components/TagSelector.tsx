import { useState, useRef, useEffect } from "react";
import { X, Hash, ChevronRight } from "lucide-react";
import type { TagHierarchyNode, TaxonomyConfig } from "../editorTypes";

type TagSelectorProps = {
  selectedTags: string[];
  taxonomyConfig?: TaxonomyConfig;
  onChange: (tags: string[]) => void;
};

type TagSuggestion = {
  fullPath: string;
  label: string;
  depth: number;
  color?: string;
};

function flattenTagHierarchy(nodes: TagHierarchyNode[], depth = 0): TagSuggestion[] {
  const result: TagSuggestion[] = [];
  
  nodes.forEach((node) => {
    result.push({
      fullPath: node.fullPath,
      label: node.label,
      depth,
      color: node.color,
    });
    
    if (node.children.length > 0) {
      result.push(...flattenTagHierarchy(node.children, depth + 1));
    }
  });
  
  return result;
}

export function TagSelector({ selectedTags, taxonomyConfig, onChange }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = taxonomyConfig
    ? flattenTagHierarchy(taxonomyConfig.tags.rootNodes)
    : [];

  const suggestions = inputValue.trim()
    ? allTags.filter(
        (tag) =>
          tag.fullPath.toLowerCase().includes(inputValue.toLowerCase()) ||
          tag.label.toLowerCase().includes(inputValue.toLowerCase())
      )
    : allTags;

  const filteredSuggestions = suggestions.filter(
    (tag) => !selectedTags.includes(tag.fullPath)
  );

  useEffect(() => {
    setFocusedIndex(0);
  }, [inputValue]);

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredSuggestions.length > 0) {
      e.preventDefault();
      handleAddTag(filteredSuggestions[focusedIndex].fullPath);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      selectedTags.length > 0
    ) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    } else if (
      e.key === "," ||
      (e.key === "Enter" && taxonomyConfig?.tags.allowCustomTags)
    ) {
      // Create custom tag with slash notation
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed) {
        handleAddTag(trimmed);
      }
    }
  };

  const getTagColor = (tagPath: string): string | undefined => {
    const suggestion = allTags.find((t) => t.fullPath === tagPath);
    return suggestion?.color;
  };

  const getTagDisplay = (tagPath: string): string => {
    // For hierarchical tags, show just the last part
    const parts = tagPath.split("/");
    return parts[parts.length - 1];
  };

  return (
    <div className="tag-selector">
      <div className="tag-chips">
        {selectedTags.map((tag) => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              className="tag-chip"
              style={color ? { borderColor: color, backgroundColor: `${color}20` } : undefined}
            >
              <Hash size={12} />
              {getTagDisplay(tag)}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
          className="tag-input"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
            <button
              key={suggestion.fullPath}
              type="button"
              className={`tag-suggestion ${index === focusedIndex ? "focused" : ""}`}
              onClick={() => handleAddTag(suggestion.fullPath)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <div
                className="tag-suggestion-content"
                style={{ paddingLeft: `${suggestion.depth * 12}px` }}
              >
                {suggestion.depth > 0 && <ChevronRight size={12} className="tag-indent" />}
                {suggestion.color && (
                  <span
                    className="tag-color-dot"
                    style={{ backgroundColor: suggestion.color }}
                  />
                )}
                <span className="tag-suggestion-label">{suggestion.label}</span>
                <span className="tag-suggestion-path">{suggestion.fullPath}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {taxonomyConfig?.tags.allowCustomTags && (
        <p className="tag-selector-hint">
          Type tag name and press Enter to create custom tags. Use / for hierarchy (e.g., "character/protagonist").
        </p>
      )}
    </div>
  );
}
