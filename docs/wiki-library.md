# Built-In Wiki Library

SCRIBE includes NWNWiki text as a built-in searchable library in release installers.

The source build step is:

```powershell
pnpm import:nwnwiki
```

The generated SQLite file is written to `wiki/nwnwiki.sqlite`. Git ignores the SQLite file so the repository stays clean, but installer builds run the import before packaging and bundle the generated wiki automatically.

For a quick importer smoke test:

```powershell
pnpm import:nwnwiki -- --limit 25
```

Useful options:

- `--out <path>` writes to a custom SQLite path.
- `--limit <count>` imports only the first N pages.
- `--namespace <id>` changes the MediaWiki namespace, defaulting to article namespace `0`.
- `--delay-ms <ms>` controls delay between API calls.
- `--chunk-size <count>` controls page detail batch size, capped at 50.

The importer uses the MediaWiki Action API at `https://nwn.fandom.com/api.php`. It stores raw wikitext, cleaned searchable text, source URL, revision id, fetch timestamp, categories, and license metadata.

## Licensing Notes

Fandom's licensing page says Fandom community wiki text is generally licensed under Creative Commons Attribution-ShareAlike 3.0 unless a specific wiki states otherwise. SCRIBE records `CC BY-SA 3.0` and source URLs for attribution. Before sharing an installer that contains the wiki library, confirm the NWNWiki edit page or footer has not declared a different license.

Reference links:

- https://www.fandom.com/licensing
- https://creativecommons.org/licenses/by-sa/3.0/
- https://www.mediawiki.org/wiki/API:Action_API

The current importer archives text only. Do not assume uploaded images or other non-text media are covered by the same terms.
