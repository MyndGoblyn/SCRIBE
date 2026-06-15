# SCRIBE Release And Update Workflow

SCRIBE uses `electron-builder` plus `electron-updater` for Windows installer creation and automatic update checks.

## Important Update Model

Installed apps do not update from ordinary Git commits. They update from installer artifacts and update metadata attached to GitHub Releases. The clean release flow is:

1. Make code changes.
2. Run `pnpm verify`.
3. Bump `package.json` version.
4. Commit the change.
5. Push a tag matching the version, for example `v0.1.1`.
6. GitHub Actions builds the Windows installer with the built-in NWNWiki library and uploads `latest.yml`, the installer `.exe`, and the `.blockmap` to the GitHub Release.
7. Installed SCRIBE apps check the GitHub Release feed and download the newer version.

## Local Installer Build

```bash
pnpm dist:win
```

The installer is written to `dist/`.

## Publishing From A Developer Machine

SCRIBE defaults to the GitHub release feed at `MyndGoblyn/SCRIBE`. To publish to another fork or temporary release repo, set one of these repository configurations:

```bash
GITHUB_REPOSITORY=owner/repo
```

or:

```bash
GH_OWNER=owner
GH_REPO=repo
```

Set a GitHub token with release permissions:

```bash
GH_TOKEN=...
```

Then run:

```bash
pnpm release:win
```

The preferred release path is still a pushed version tag, because the GitHub Actions workflow explicitly creates the release and uploads the updater metadata.

## Private Distribution Note

For smooth automatic updates, prefer a public or release-only GitHub repository for installer artifacts, even if SCRIBE itself is shared privately. A private GitHub release feed generally requires credentials at runtime, and shipping a secret token inside a desktop app is not safe.

## Cleanup Step

Before committing or handing off work, run:

```bash
pnpm clean:workspace
git status --short
```

Generated build output and installer artifacts are ignored by Git. Commit only source, configuration, docs, and intentional assets.
