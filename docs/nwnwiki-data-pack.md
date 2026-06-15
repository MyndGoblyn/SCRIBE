# NWNWiki Data Pack

SCRIBE keeps the NWNWiki archive in a separate generated SQLite data pack:

```powershell
pnpm import:nwnwiki
```

The default output is `data-packs/nwnwiki.sqlite`. This file is ignored by git so the repository stays clean; if the file exists during `pnpm dist:win` or `pnpm release:win`, the installer bundles it as an app resource. On first launch after install, SCRIBE copies that bundled pack into the user's app data folder.

The GitHub tag release workflow runs the importer before building the installer, so normal version tags produce a release installer with the generated pack included.

For a fast smoke test:

```powershell
pnpm import:nwnwiki -- --limit 25
```

Useful options:

- `--out <path>` writes to a custom SQLite path.
- `--limit <count>` imports only the first N pages.
- `--namespace <id>` changes the MediaWiki namespace, defaulting to article namespace `0`.
- `--delay-ms <ms>` controls delay between API calls.
- `--chunk-size <count>` controls page detail batch size, capped at 50.

The importer uses the MediaWiki Action API at `https://nwn.fandom.com/api.php`. It stores each page's raw wikitext, cleaned plain text, source URL, revision id, fetch timestamp, categories, and license metadata. Search uses SQLite FTS5 when available and falls back to normal text matching in the app.

## Licensing Notes

Fandom's licensing page says Fandom community wiki text is generally licensed under Creative Commons Attribution-ShareAlike 3.0 unless a specific wiki states otherwise. The generated pack records `CC BY-SA 3.0` and page source URLs for attribution. Before sharing an installer that contains a full data pack, confirm the NWNWiki edit page or footer has not declared a different license.

Reference links:

- https://www.fandom.com/licensing
- https://creativecommons.org/licenses/by-sa/3.0/
- https://www.mediawiki.org/wiki/API:Action_API

Do not assume uploaded images or other non-text media are covered by the same terms. The current importer archives text only.
