import { autocompletion, Completion, CompletionContext } from "@codemirror/autocomplete";
import type { Entity } from "../domain";
import Fuse from "fuse.js";

export interface WikilinkAutocompleteOptions {
  entities: Entity[];
  onSelectWikilink?: (entityId: string, entityName: string) => void;
}

/**
 * Create a CodeMirror autocomplete extension for wikilinks.
 * Triggers when user types `[[` and provides fuzzy-search suggestions
 * based on entity names and aliases.
 */
export function wikilinkAutocomplete(options: WikilinkAutocompleteOptions) {
  // Create Fuse.js instance for fuzzy searching entities
  const createFuse = (entities: Entity[]) => {
    return new Fuse(entities, {
      keys: [
        { name: "name", weight: 2 },
        { name: "aliases", weight: 1.5 },
        { name: "type", weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1,
    });
  };

  let fuse = createFuse(options.entities);

  // Update fuse when entities change
  const updateEntities = (entities: Entity[]) => {
    fuse = createFuse(entities);
  };

  const completionSource = async (context: CompletionContext) => {
    // Get the text before the cursor
    const line = context.state.doc.lineAt(context.pos);
    const textBeforeCursor = line.text.slice(0, context.pos - line.from);

    // Check if we're inside a wikilink (after [[)
    const wikilinkMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);
    
    if (!wikilinkMatch) {
      return null;
    }

    const searchText = wikilinkMatch[1] || "";
    const from = context.pos - searchText.length;
    
    // If no search text, show all entities (limited)
    let suggestions: Completion[];
    
    if (searchText.trim() === "") {
      // Show recent or all entities (limited to 50)
      suggestions = options.entities.slice(0, 50).map((entity) => ({
        label: entity.name,
        type: "wikilink",
        detail: `${entity.type}${entity.path ? ` • ${entity.path}` : ""}`,
        info: entity.body ? entity.body.slice(0, 200) : undefined,
        apply: (view, _completion, from, to) => {
          view.dispatch({
            changes: { from, to, insert: entity.name + "]]" },
          });
          options.onSelectWikilink?.(entity.id, entity.name);
        },
      }));
    } else {
      // Fuzzy search entities
      const results = fuse.search(searchText);
      
      suggestions = results.slice(0, 20).map((result) => {
        const entity = result.item;
        const isAliasMatch = result.matches?.some(
          (match) => match.key === "aliases"
        );

        return {
          label: entity.name,
          type: "wikilink",
          detail: `${entity.type}${entity.path ? ` • ${entity.path}` : ""}${
            isAliasMatch ? " (alias)" : ""
          }`,
          info: entity.body ? entity.body.slice(0, 200) : undefined,
          apply: (view, _completion, from, to) => {
            // If alias matched, offer to use alias syntax
            const insertText = isAliasMatch && result.matches?.[0]?.value
              ? `${entity.name}|${result.matches[0].value}]]`
              : `${entity.name}]]`;
            
            view.dispatch({
              changes: { from, to, insert: insertText },
            });
            options.onSelectWikilink?.(entity.id, entity.name);
          },
          boost: result.score ? 1 - result.score : 0,
        };
      });
    }

    return {
      from,
      options: suggestions,
      validFor: /^[^\]]*$/,
    };
  };

  return {
    extension: autocompletion({
      override: [completionSource],
      activateOnTyping: true,
      icons: false,
      maxRenderedOptions: 20,
      defaultKeymap: true,
    }),
    updateEntities,
  };
}
