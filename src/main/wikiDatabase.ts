import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import type { WikiLibrarySummary, WikiPageDetail, WikiSearchResult } from '../shared/contracts';

type SqlValue = string | number | Uint8Array | null;
type Row = Record<string, SqlValue>;

const defaultSourceName = 'NWNWiki';
const defaultSourceUrl = 'https://nwn.fandom.com/wiki/';
const defaultLicenseName = 'CC BY-SA 3.0';
const defaultLicenseUrl = 'https://creativecommons.org/licenses/by-sa/3.0/';

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

export class WikiDatabase {
  private sql: SqlJsStatic | null = null;
  private db: Database | null = null;
  private ftsAvailable = false;

  constructor(
    private readonly dbPath: string,
    private readonly bundledDbPath: string | null = null
  ) {}

  async init(): Promise<void> {
    this.copyBundledLibraryIfNeeded();

    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm').replace('app.asar', 'app.asar.unpacked');
    this.sql = await initSqlJs({
      locateFile: () => wasmPath
    });

    const bytes = fs.existsSync(this.dbPath) ? fs.readFileSync(this.dbPath) : undefined;
    this.db = bytes ? new this.sql.Database(bytes) : new this.sql.Database();
    this.assertDb().exec(schemaSql);
    this.ftsAvailable = this.ensureFts();
    this.seedMetadata();
    this.persist();
  }

  getSummary(): WikiLibrarySummary {
    const articleCount = this.countRows('wiki_pages');

    return {
      articleCount,
      sourceName: this.getMetadata('source_name') ?? defaultSourceName,
      sourceUrl: this.getMetadata('source_url') ?? defaultSourceUrl,
      licenseName: this.getMetadata('license_name') ?? defaultLicenseName,
      licenseUrl: this.getMetadata('license_url') ?? defaultLicenseUrl,
      updatedAt: this.getMetadata('updated_at') ?? this.getMetadata('imported_at'),
      hasLibrary: articleCount > 0
    };
  }

  search(query: string, limit = 12): WikiSearchResult[] {
    const cleanedQuery = query.trim();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    if (cleanedQuery.length < 2) {
      return [];
    }

    if (this.ftsAvailable) {
      const ftsQuery = toFtsQuery(cleanedQuery);
      if (ftsQuery) {
        try {
          return this.query(
            `SELECT
              p.page_id,
              p.title,
              snippet(wiki_pages_fts, 1, '', '', '...', 28) AS snippet,
              p.source_url,
              p.touched_at
            FROM wiki_pages_fts
            JOIN wiki_pages p ON p.page_id = wiki_pages_fts.page_id
            WHERE wiki_pages_fts MATCH ?
            ORDER BY bm25(wiki_pages_fts)
            LIMIT ?`,
            [ftsQuery, safeLimit]
          ).map(rowToSearchResult);
        } catch {
          this.ftsAvailable = false;
        }
      }
    }

    const likeQuery = `%${cleanedQuery.toLowerCase()}%`;
    return this.query(
      `SELECT page_id, title, plain_text, source_url, touched_at
       FROM wiki_pages
       WHERE lower(title) LIKE ? OR lower(plain_text) LIKE ?
       ORDER BY title
       LIMIT ?`,
      [likeQuery, likeQuery, safeLimit]
    ).map((row) => ({
      pageId: Number(row.page_id),
      title: String(row.title),
      snippet: extractSnippet(String(row.plain_text), cleanedQuery),
      sourceUrl: String(row.source_url),
      touchedAt: String(row.touched_at)
    }));
  }

  getPage(pageId: number): WikiPageDetail | null {
    const row = this.queryOne(
      `SELECT page_id, title, revision_id, touched_at, fetched_at, source_url,
        license_name, license_url, categories_json, plain_text
       FROM wiki_pages
       WHERE page_id = ?`,
      [pageId]
    );

    if (!row) {
      return null;
    }

    return {
      pageId: Number(row.page_id),
      title: String(row.title),
      revisionId: Number(row.revision_id),
      touchedAt: String(row.touched_at),
      fetchedAt: String(row.fetched_at),
      sourceUrl: String(row.source_url),
      licenseName: String(row.license_name),
      licenseUrl: String(row.license_url),
      categories: jsonParse(row.categories_json, []),
      snippet: '',
      plainText: String(row.plain_text)
    };
  }

  private copyBundledLibraryIfNeeded(): void {
    if (!this.bundledDbPath || !fs.existsSync(this.bundledDbPath)) {
      return;
    }

    const shouldCopy =
      !fs.existsSync(this.dbPath) ||
      fs.statSync(this.dbPath).size < 1024 * 1024 ||
      fs.statSync(this.bundledDbPath).mtimeMs > fs.statSync(this.dbPath).mtimeMs;

    if (!shouldCopy) {
      return;
    }

    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.copyFileSync(this.bundledDbPath, this.dbPath);
  }

  private ensureFts(): boolean {
    try {
      this.assertDb().exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS wiki_pages_fts USING fts5(
          title,
          plain_text,
          page_id UNINDEXED
        );
      `);

      if (this.countRows('wiki_pages') > 0 && this.countRows('wiki_pages_fts') === 0) {
        this.assertDb().exec(`
          INSERT INTO wiki_pages_fts (title, plain_text, page_id)
          SELECT title, plain_text, page_id FROM wiki_pages;
        `);
      }

      return true;
    } catch {
      return false;
    }
  }

  private seedMetadata(): void {
    const defaults: Record<string, string> = {
      source_name: defaultSourceName,
      source_url: defaultSourceUrl,
      license_name: defaultLicenseName,
      license_url: defaultLicenseUrl
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = this.queryOne('SELECT key FROM metadata WHERE key = ?', [key]);
      if (!existing) {
        this.exec('INSERT INTO metadata (key, value) VALUES (?, ?)', [key, value]);
      }
    }
  }

  private getMetadata(key: string): string | null {
    const row = this.queryOne('SELECT value FROM metadata WHERE key = ?', [key]);
    return typeof row?.value === 'string' && row.value.length > 0 ? row.value : null;
  }

  private countRows(table: string): number {
    const row = this.queryOne(`SELECT COUNT(*) AS count FROM ${table}`);
    return Number(row?.count ?? 0);
  }

  private exec(sql: string, params: SqlValue[] = []): void {
    this.assertDb().run(sql, params);
  }

  private query<T extends Row = Row>(sql: string, params: SqlValue[] = []): T[] {
    const stmt = this.assertDb().prepare(sql);
    const rows: T[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  private queryOne<T extends Row = Row>(sql: string, params: SqlValue[] = []): T | undefined {
    return this.query<T>(sql, params)[0];
  }

  private persist(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = this.assertDb().export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  private assertDb(): Database {
    if (!this.db) {
      throw new Error('NWNWiki database has not been initialized.');
    }
    return this.db;
  }
}

export function createWikiDatabase(dbPath: string, bundledDbPath: string | null = null): WikiDatabase {
  return new WikiDatabase(dbPath, bundledDbPath);
}

function rowToSearchResult(row: Row): WikiSearchResult {
  return {
    pageId: Number(row.page_id),
    title: String(row.title),
    snippet: String(row.snippet),
    sourceUrl: String(row.source_url),
    touchedAt: String(row.touched_at)
  };
}

function toFtsQuery(query: string): string {
  const terms = query.match(/[A-Za-z0-9_']+/g) ?? [];
  return terms.map((term) => `"${term.replace(/"/g, '""')}"`).join(' AND ');
}

function extractSnippet(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index < 0) {
    return text.slice(0, 240);
  }

  const start = Math.max(0, index - 90);
  const end = Math.min(text.length, index + query.length + 150);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function jsonParse<T>(value: SqlValue, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
