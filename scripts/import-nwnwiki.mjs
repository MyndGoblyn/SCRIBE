import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { wikiTextToPlainText } from './wiki-text.mjs';

const require = createRequire(import.meta.url);
const defaultApiUrl = 'https://nwn.fandom.com/api.php';
const defaultSourceUrl = 'https://nwn.fandom.com/wiki/';
const defaultLicenseName = 'CC BY-SA 3.0';
const defaultLicenseUrl = 'https://creativecommons.org/licenses/by-sa/3.0/';
const userAgent = 'SCRIBE/0.1.4 built-in NWNWiki importer';

const schemaSql = `
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wiki_pages (
  page_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  namespace_id INTEGER NOT NULL DEFAULT 0,
  revision_id INTEGER NOT NULL DEFAULT 0,
  touched_at TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  license_name TEXT NOT NULL DEFAULT '${defaultLicenseName}',
  license_url TEXT NOT NULL DEFAULT '${defaultLicenseUrl}',
  categories_json TEXT NOT NULL DEFAULT '[]',
  wikitext TEXT NOT NULL DEFAULT '',
  plain_text TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_title ON wiki_pages(title);
`;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const outPath = path.resolve(options.out ?? path.join(process.cwd(), 'wiki', 'nwnwiki.sqlite'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`)
  });

  const db = fs.existsSync(outPath) ? new SQL.Database(fs.readFileSync(outPath)) : new SQL.Database();
  db.exec(schemaSql);
  const ftsAvailable = ensureFts(db);
  if (!ftsAvailable) {
    console.log('SQLite FTS5 is unavailable in this sql.js build; the app will use fallback text search.');
  }
  seedMetadata(db, {
    source_name: 'NWNWiki',
    source_url: defaultSourceUrl,
    license_name: defaultLicenseName,
    license_url: defaultLicenseUrl,
    api_url: options.apiUrl,
    namespace_id: String(options.namespace)
  });

  console.log(`Fetching page list from ${options.apiUrl}`);
  const pages = await fetchAllPages(options);
  console.log(`Discovered ${pages.length.toLocaleString()} page${pages.length === 1 ? '' : 's'} to import.`);

  const startedAt = new Date().toISOString();
  seedMetadata(db, { import_started_at: startedAt });

  let imported = 0;
  for (const chunk of chunkArray(pages, options.chunkSize)) {
    const details = await fetchPageDetails(options, chunk.map((page) => page.pageid));
    upsertPages(db, details, ftsAvailable);
    imported += details.length;
    saveDatabase(db, outPath);
    console.log(`Imported ${imported.toLocaleString()} / ${pages.length.toLocaleString()} pages`);
    await sleep(options.delayMs);
  }

  seedMetadata(db, { updated_at: new Date().toISOString(), imported_at: new Date().toISOString() });
  db.exec('VACUUM;');
  saveDatabase(db, outPath);
  console.log(`NWNWiki library written to ${outPath}`);
}

async function fetchAllPages(options) {
  const pages = [];
  let continuation = {};

  while (true) {
    const data = await apiGet(options.apiUrl, {
      action: 'query',
      list: 'allpages',
      apnamespace: String(options.namespace),
      aplimit: '500',
      format: 'json',
      formatversion: '2',
      ...continuation
    });

    pages.push(...(data.query?.allpages ?? []));
    if (options.limit && pages.length >= options.limit) {
      return pages.slice(0, options.limit);
    }

    if (!data.continue) {
      return pages;
    }

    continuation = data.continue;
    await sleep(options.delayMs);
  }
}

async function fetchPageDetails(options, pageIds) {
  const data = await apiGet(options.apiUrl, {
    action: 'query',
    prop: 'revisions|info|categories',
    pageids: pageIds.join('|'),
    inprop: 'url',
    cllimit: 'max',
    rvprop: 'ids|timestamp|content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2'
  });

  return (data.query?.pages ?? []).filter((page) => !page.missing).map(normalizePage);
}

async function apiGet(apiUrl, params) {
  const url = new URL(apiUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`NWNWiki API request failed with ${response.status}: ${url.toString()}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`NWNWiki API error ${data.error.code}: ${data.error.info}`);
  }
  return data;
}

function normalizePage(page) {
  const revision = page.revisions?.[0] ?? {};
  const wikitext =
    revision.slots?.main?.content ??
    revision.slots?.main?.['*'] ??
    revision.content ??
    revision['*'] ??
    '';
  const sourceUrl = page.fullurl ?? `${defaultSourceUrl}${encodeURIComponent(page.title).replace(/%20/g, '_')}`;
  const categories = (page.categories ?? [])
    .map((category) => String(category.title ?? '').replace(/^Category:/, '').trim())
    .filter(Boolean);

  return {
    pageId: Number(page.pageid),
    title: String(page.title ?? ''),
    namespaceId: Number(page.ns ?? 0),
    revisionId: Number(revision.revid ?? 0),
    touchedAt: String(revision.timestamp ?? page.touched ?? ''),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    categories,
    wikitext: String(wikitext),
    plainText: wikiTextToPlainText(wikitext)
  };
}

function upsertPages(db, pages, ftsAvailable) {
  const pageStatement = db.prepare(`
    INSERT INTO wiki_pages (
      page_id, title, namespace_id, revision_id, touched_at, fetched_at, source_url,
      license_name, license_url, categories_json, wikitext, plain_text
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(page_id) DO UPDATE SET
      title = excluded.title,
      namespace_id = excluded.namespace_id,
      revision_id = excluded.revision_id,
      touched_at = excluded.touched_at,
      fetched_at = excluded.fetched_at,
      source_url = excluded.source_url,
      license_name = excluded.license_name,
      license_url = excluded.license_url,
      categories_json = excluded.categories_json,
      wikitext = excluded.wikitext,
      plain_text = excluded.plain_text
  `);
  const ftsDeleteStatement = ftsAvailable ? db.prepare('DELETE FROM wiki_pages_fts WHERE page_id = ?') : null;
  const ftsInsertStatement = ftsAvailable ? db.prepare('INSERT INTO wiki_pages_fts (title, plain_text, page_id) VALUES (?, ?, ?)') : null;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const page of pages) {
      pageStatement.run([
        page.pageId,
        page.title,
        page.namespaceId,
        page.revisionId,
        page.touchedAt,
        page.fetchedAt,
        page.sourceUrl,
        defaultLicenseName,
        defaultLicenseUrl,
        JSON.stringify(page.categories),
        page.wikitext,
        page.plainText
      ]);
      ftsDeleteStatement?.run([page.pageId]);
      ftsInsertStatement?.run([page.title, page.plainText, page.pageId]);
    }
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  } finally {
    pageStatement.free();
    ftsDeleteStatement?.free();
    ftsInsertStatement?.free();
  }
}

function ensureFts(db) {
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS wiki_pages_fts USING fts5(
        title,
        plain_text,
        page_id UNINDEXED
      );
    `);
    return true;
  } catch {
    return false;
  }
}

function seedMetadata(db, values) {
  const statement = db.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  try {
    for (const [key, value] of Object.entries(values)) {
      statement.run([key, String(value)]);
    }
  } finally {
    statement.free();
  }
}

function saveDatabase(db, outPath) {
  fs.writeFileSync(outPath, Buffer.from(db.export()));
}

function parseArgs(args) {
  const options = {
    apiUrl: defaultApiUrl,
    namespace: 0,
    limit: null,
    delayMs: 100,
    chunkSize: 25,
    out: null,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === '--') {
      continue;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--api-url' && next) {
      options.apiUrl = next;
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--namespace' && next) {
      options.namespace = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--delay-ms' && next) {
      options.delayMs = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--chunk-size' && next) {
      options.chunkSize = Number.parseInt(next, 10);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.namespace) || options.namespace < 0) {
    throw new Error('--namespace must be a non-negative integer.');
  }
  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('--limit must be a positive integer.');
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0) {
    throw new Error('--delay-ms must be a non-negative integer.');
  }
  if (!Number.isInteger(options.chunkSize) || options.chunkSize < 1 || options.chunkSize > 50) {
    throw new Error('--chunk-size must be between 1 and 50.');
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: pnpm import:nwnwiki -- [options]

Options:
  --out <path>          SQLite output path. Default: wiki/nwnwiki.sqlite
  --limit <count>       Import only the first N pages for smoke testing.
  --namespace <id>      MediaWiki namespace id. Default: 0
  --delay-ms <ms>       Delay between API calls. Default: 100
  --chunk-size <count>  Page details per request, 1-50. Default: 25
  --api-url <url>       MediaWiki API endpoint. Default: ${defaultApiUrl}
`);
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
