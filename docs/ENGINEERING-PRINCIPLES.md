# WorldNotion Engineering Principles

This document defines the engineering direction for WorldNotion and should be treated as the default standard for future Everend Forge suite work that touches vaults, Markdown, taxonomy, local files, or editor workflows.

## Product Invariants

- Preserve vault portability. Markdown files, frontmatter, wikilinks, `.everend` metadata, and Obsidian-compatible behavior must remain readable outside WorldNotion.
- Preserve Everend Spec compatibility. Do not change vault format, frontmatter shape, taxonomy data, or `.everend` files without an explicit migration plan and tests.
- Prefer incremental refactors. Behavior-preserving extraction plus tests is preferred over large rewrites.
- Keep user data local and recoverable. File writes, moves, renames, duplicates, and deletes must be explicit, validated, and reversible where the platform supports it.

## Architecture Direction

- Keep `App.tsx` as orchestration and high-level layout only. It may wire React state, invoke handlers, and render shell composition, but it should not own domain rules.
- Put pure rules in `src/utils/*` with focused tests. Examples: path changes, tab sessions, editor transforms, wikilink resolution, taxonomy validation, vault indexing, and filesystem planning.
- Keep domain indexing separate from UI. `domain.ts` should remain a public facade/orchestrator, not a dumping ground for parsing, validation, rendering, and filesystem behavior.
- Keep IO boundaries explicit. Browser filesystem helpers, Tauri commands, markdown parsing, React components, and editor behavior should stay separated by module boundaries.
- Prefer small, named helpers over inline logic in JSX. Derived UI state should be selector-like and testable.
- Avoid introducing abstractions before they remove real duplication, isolate risk, or clarify ownership.

## Security And Data Safety

- Never render untrusted Markdown HTML directly. Markdown preview must use an explicit sanitized pipeline.
- Validate paths before filesystem operations. Reject traversal, absolute paths where relative paths are expected, null bytes, empty path segments, unsafe hidden segments, and platform-specific separator surprises.
- All destructive or mutating operations must pass through consistent validation and produce user-facing errors that explain what failed.
- Preserve conflict checks for save operations. Expected modified timestamps or equivalent freshness checks should remain in place where supported.
- Avoid debug logging of vault contents, file paths, or user text unless needed for an intentional diagnostic path.

## Testing Standard

- Every extracted pure helper should receive Vitest coverage in the same round.
- Test behavior that protects compatibility first: frontmatter, wikilinks, backlinks, taxonomy validation, path moves/renames, templates, session restore, settings persistence, and filesystem path validation.
- Component tests should cover critical user-facing flows when behavior cannot be tested as pure logic.
- Keep the baseline green after each logical round:
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run build`
  - `cargo test` from `src-tauri`

If the local `npm` wrapper is broken, run the equivalent local binaries directly:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/vitest/vitest.mjs run
node ./node_modules/vite/bin/vite.js build
```

## Refactor Stop Criteria

Continue decoupling while a module still mixes unrelated responsibilities, has duplicated rules, or cannot be tested without mounting most of the app.

Pause extraction when:

- The remaining code is mostly wiring and layout.
- Further splitting would hide simple flow behind premature abstraction.
- Tests cover the risky behavior and future changes can be made locally.
- The next meaningful risk is better handled by manual QA or product validation.

For `App.tsx`, the target is not a specific line count. A practical near-term goal is to reduce it until it primarily coordinates state, handlers, and layout. If it remains over roughly 1500-1800 lines but is mostly clear orchestration, further extraction should be justified by concrete risk or duplication.

## Future Suite Guidance

New Everend Forge suite apps should start with these defaults:

- Define file/data invariants before building UI flows.
- Keep local data formats stable and documented.
- Put parsing, validation, and migration logic behind tested modules.
- Treat filesystem operations as security-sensitive.
- Build reusable domain utilities before copying behavior across apps.
- Document architectural decisions when they establish a pattern other apps should follow.
