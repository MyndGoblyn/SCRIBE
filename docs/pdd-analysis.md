# SCRIBE PDD Analysis

## Product Direction

SCRIBE is a local-first desktop companion for character planning, build theorycrafting, leveling guides, rules references, and custom/server content. The PDD is strongly NWN:EE-first for the MVP, with D&D 3.5e and D&D 5e expansion deferred to v1 once the core planner is stable.

## MVP Spine

The MVP should prove these workflows before chasing full rules coverage:

- Create and edit characters.
- Create and edit reusable builds.
- Build a full level-by-level plan.
- Label feats and features by source, especially selected vs granted.
- Assign and compare planned build state against actual character progress.
- Track local custom content, server profiles, and source/provenance metadata.
- Calculate common values transparently: ability modifiers, saves, and spell DCs.
- Search across characters, builds, rules content, and resources.
- Export a readable Markdown guide.

## First Development Slice

This repository begins with the PDD's recommended stack shape:

- Electron desktop shell.
- React and TypeScript frontend.
- Local SQLite-compatible database via `sql.js`, persisted as an application data file.
- Zod schemas shared by the renderer and main process.
- SQL migrations and seeded NWN:EE rules/source records.
- Early calculation helpers with unit tests.

Native SQLite bindings can be revisited after the product model settles. The current database file is still a SQLite database, but avoids native module friction during early Electron development.

## Important Product Decisions

- Start NWN:EE-first, but keep the ruleset model multi-profile from day one.
- Treat provenance as core infrastructure, not a later compliance chore.
- Store level choices independently from characters so a build can be reused.
- Keep calculations explainable with component traces as the future direction.
- Keep export safety visible in the model even before shared packs exist.

## Open Questions To Resolve Soon

- Should portraits/images be stored in the database, the filesystem, or both?
- Should D&D 3.5e and 5e be visible as disabled seeds during MVP or hidden until v1?
- Should the first NWN data pack be hand-curated JSON, imported from structured community data, or entered through the app?
- Should Markdown export save directly, copy to clipboard, or support both?
- Should build locking be present in the MVP UI or only in the schema initially?
