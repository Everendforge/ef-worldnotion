# WorldNotion Quality Audit

## Current Baseline

WorldNotion now has a repeatable quality baseline:

- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `cargo test` from `src-tauri`

The frontend test suite starts with domain, settings, path utilities, and Markdown preview coverage. The Tauri suite starts with path and filename validation coverage.

## Refactor Direction

Use [ENGINEERING-PRINCIPLES.md](ENGINEERING-PRINCIPLES.md) as the durable engineering standard for WorldNotion and related Everend Forge suite work.

Keep refactors incremental and behavior-preserving:

- Move pure helpers out of `App.tsx` before changing behavior.
- Keep runtime and keyboard environment helpers out of the app component; Tauri/browser capability checks, platform-specific labels, and shortcut matching now live in `src/utils/appEnvironment.ts` with Vitest coverage.
- Keep recent-universe session helpers out of the app component; universe display names, recent profile derivation, deduplication, ordering, and the eight-item cap now live in `src/utils/universeSession.ts` with Vitest coverage.
- Keep explorer sidebar selectors out of the app component; visible tree search, hidden `.everend` expansion, valid favorites, ecosystem tag groups, and entity tag colors now live in `src/utils/explorerSelectors.ts` with Vitest coverage.
- Keep inspector live-entity projection out of the app component; unsaved tab frontmatter/body projection, base-field fallbacks, custom properties, and malformed-frontmatter fallback now live in `src/utils/liveEntity.ts` with Vitest coverage.
- Keep universe workspace restoration decisions out of the app component; live tab remapping, dirty-tab preservation, persisted session restore, preferred/active/selected path priority, and missing-file pruning now live in `src/utils/universeApply.ts` with Vitest coverage.
- Keep editor persistence rules shared across save flows; Tauri `save_file` payload creation and saved-tab state updates now live in `src/utils/editorPersistence.ts` with Vitest coverage for normal saves and save-before-close reuse.
- Keep file-access statistics updates centralized; session-level access increments and minimal session creation now live in `src/utils/fileAccessStats.ts` with Vitest coverage and are reused by tab activation/open flows.
- Keep explorer path targeting in shared utilities; reveal-path resolution and active creation folder selection now live in `src/utils/pathUtils.ts` with Vitest coverage.
- Keep folder-note metadata in content helpers; folder description path/name/existence checks now live in `src/utils/contentTemplates.ts` with Vitest coverage and are reused by the empty-folder editor state.
- Keep `App.tsx` focused on app orchestration; extracted shell components now include explorer tree nodes, inspector panel, universe icon rendering, and lazy panel fallbacks.
- Keep tab/session behavior in pure utilities where possible; open-tab creation, session serialization, path-change updates, dirty-tab filtering, pending close queues, adjacent tab selection, and bulk-close rules now live in `src/utils/tabUtils.ts` with Vitest coverage.
- Keep Markdown editing transforms separate from CodeMirror wiring; entity frontmatter serialization, selection wrappers, wikilink/link insertions, heading transforms, and list transforms now live in `src/utils/markdownEditing.ts` with Vitest coverage.
- Keep editor display-derived state outside the app component; write/source display text, outline extraction from the displayed editor value, and current-header lookup now live in `src/utils/editorDerivedState.ts` with Vitest coverage.
- Keep wikilink resolution separate from editor rendering; entity id/name/file-title/alias lookup and loose Markdown file-title fallback now live in `src/utils/wikilinkResolver.ts` with Vitest coverage for Obsidian-style navigation behavior.
- Keep Markdown/frontmatter parsing separate from vault indexing; frontmatter parsing, markdown splitting/joining, slug generation, lookup-key normalization, and wikilink extraction now live in `src/utils/markdownFrontmatter.ts` with Vitest coverage while `domain.ts` reexports the existing public helpers.
- Keep Markdown entity indexing separate from vault orchestration; frontmatter-derived entities, custom properties, duplicate ids, wikilink/backlink resolution, parent/child reference checks, taxonomy validation, and type counts now live in `src/utils/entityIndex.ts` with Vitest coverage.
- Keep legacy taxonomy YAML compatibility isolated from vault orchestration; starter taxonomy defaults, `.everend/taxonomy.yaml` parsing, YAML serialization, default templates, and type-definition helpers now live in `src/utils/legacyTaxonomy.ts` with Vitest coverage.
- Keep taxonomy generation separate from vault indexing; default taxonomy config, taxonomy generation from entities, and slash-tag hierarchy merging now live in `src/utils/taxonomyConfig.ts` with Vitest coverage while `domain.ts` reexports the existing public helpers.
- Keep taxonomy validation separate from vault indexing; tag/type/status/custom-field validation now lives in `src/utils/taxonomyValidation.ts` with Vitest coverage while `domain.ts` reexports `validateAgainstTaxonomy`.
- Keep tree construction separate from vault indexing; folder tree building, folder-note description detection, hidden `.everend` filtering, and hidden root-note suppression now live in `src/utils/treeBuilder.ts` with Vitest coverage while `domain.ts` reexports `buildTree`.
- Keep universe detection separate from vault orchestration; top-level universe folder discovery, hidden `.everend` filtering, and per-universe entity counts now live in `src/utils/universeDetection.ts` with Vitest coverage.
- Keep vault metadata parsing separate from vault indexing; `.everend` templates, universe profile JSON, and taxonomy config JSON now live in `src/utils/vaultMetadata.ts` with Vitest coverage while `domain.ts` consumes those helpers.
- Keep vault operation rules testable before filesystem calls; folder-note rename planning, rename/move path changes, unsafe move detection, dirty-tab impact checks, and favorite cleanup now live in `src/utils/vaultOperations.ts` with Vitest coverage.
- Keep command routing declarative; editor command ids and native menu ids now map through `src/utils/editorCommandActions.ts`, covering command classifications with Vitest. Search, replace/open-search, find next/previous, and outline toggling are now routed through implemented actions.
- Keep vault, frontmatter, and `.everend` formats compatible with Everend Spec and Obsidian-style Markdown.
- Prefer tests around extracted domain helpers before modifying their behavior.
- Keep browser filesystem support and Tauri filesystem support separate at module boundaries.
- Keep rarely opened panels lazy-loaded so the initial app shell does not pay for editor, graph, settings, or command-palette code up front.
- Keep CodeMirror imports out of the app shell; editor search, folding, and programmatic scrolling now load CodeMirror modules on demand.
- Keep visualization code typed at integration boundaries; `GraphView` now types its D3 simulation and preserves valid zero-valued canvas coordinates.

## Security Notes

Markdown preview output is rendered through a sanitized `remark-html` pipeline before being passed to React. Wikilinks are post-processed with escaped text and attributes.

Tauri filesystem commands should continue using normalized relative paths and `ensure_inside` before writes, renames, moves, duplicates, and trash operations.

Browser filesystem helpers now validate relative paths before directory/file lookup, writes, deletes, copies, moves, and renames. They reject absolute paths, traversal segments, empty path segments, backslash-separated paths, null bytes, and hidden segments other than `.everend`.

## Bundle Notes

The first bundle split moved `CodeMirrorEditor`, graph visualization, settings, command palette, metadata, backlinks, and taxonomy migration into lazy chunks. A follow-up pass removed static CodeMirror imports from `App.tsx` by loading search, folding, find next/previous, and scroll helpers on demand. The initial JavaScript chunk is now around 401 kB, below Vite's default warning threshold, with no bundle-size warning in the production build.
