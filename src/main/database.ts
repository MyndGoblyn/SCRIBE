import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import {
  BuildInputSchema,
  BuildLevelInputSchema,
  CharacterInputSchema,
  ContentEntryInputSchema,
  ResourceLinkInputSchema,
  ServerProfileInputSchema,
  type AppData,
  type Build,
  type BuildInput,
  type BuildLevel,
  type BuildLevelInput,
  type Character,
  type CharacterInput,
  type ContentEntry,
  type ContentEntryInput,
  type FeatSelection,
  type ResourceLink,
  type ResourceLinkInput,
  type Ruleset,
  type SaveMarkdownResult,
  type ServerProfile,
  type ServerProfileInput,
  type Source
} from '../shared/contracts';

type SqlValue = string | number | Uint8Array | null;
type Row = Record<string, SqlValue>;

const defaultAbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10
};

const schemaSql = `
CREATE TABLE IF NOT EXISTS rulesets (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  system TEXT NOT NULL,
  level_cap INTEGER NOT NULL,
  ability_modifier_formula TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  license_note TEXT NOT NULL DEFAULT '',
  attribution_required INTEGER NOT NULL DEFAULT 0,
  export_allowed INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS server_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  server_type TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  wiki TEXT NOT NULL DEFAULT '',
  discord TEXT NOT NULL DEFAULT '',
  level_cap INTEGER NOT NULL DEFAULT 40,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ruleset_id) REFERENCES rulesets(id)
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  server_profile_id TEXT,
  campaign_profile_id TEXT,
  build_id TEXT,
  race_name TEXT NOT NULL DEFAULT '',
  subrace_name TEXT NOT NULL DEFAULT '',
  class_summary TEXT NOT NULL DEFAULT '',
  alignment TEXT NOT NULL DEFAULT '',
  deity TEXT NOT NULL DEFAULT '',
  background TEXT NOT NULL DEFAULT '',
  current_level INTEGER NOT NULL DEFAULT 1,
  planned_final_level INTEGER,
  status TEXT NOT NULL DEFAULT 'planned',
  ability_scores_json TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ruleset_id) REFERENCES rulesets(id),
  FOREIGN KEY (server_profile_id) REFERENCES server_profiles(id),
  FOREIGN KEY (build_id) REFERENCES builds(id)
);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  server_profile_id TEXT,
  intended_role TEXT NOT NULL DEFAULT '',
  intended_game TEXT NOT NULL DEFAULT '',
  race_name TEXT NOT NULL DEFAULT '',
  class_summary TEXT NOT NULL DEFAULT '',
  ability_scores_json TEXT NOT NULL DEFAULT '{"strength":10,"dexterity":10,"constitution":10,"intelligence":10,"wisdom":10,"charisma":10}',
  level_cap INTEGER NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'draft',
  tags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ruleset_id) REFERENCES rulesets(id),
  FOREIGN KEY (server_profile_id) REFERENCES server_profiles(id)
);

CREATE TABLE IF NOT EXISTS build_levels (
  id TEXT PRIMARY KEY,
  build_id TEXT NOT NULL,
  level_number INTEGER NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  hit_points_gained INTEGER,
  base_attack_bonus INTEGER,
  fortitude_save INTEGER,
  reflex_save INTEGER,
  will_save INTEGER,
  skill_points_available INTEGER,
  skill_allocation TEXT NOT NULL DEFAULT '',
  ability_increase TEXT NOT NULL DEFAULT '',
  spell_selections TEXT NOT NULL DEFAULT '',
  equipment_recommendation TEXT NOT NULL DEFAULT '',
  class_feature_notes TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  validation_warnings_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(build_id, level_number),
  FOREIGN KEY (build_id) REFERENCES builds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feat_selections (
  id TEXT PRIMARY KEY,
  build_level_id TEXT NOT NULL,
  feat_name TEXT NOT NULL,
  source TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (build_level_id) REFERENCES build_levels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  ruleset_id TEXT NOT NULL,
  source_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  mechanics TEXT NOT NULL DEFAULT '',
  prerequisites TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'private',
  export_allowed INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (ruleset_id) REFERENCES rulesets(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

CREATE TABLE IF NOT EXISTS resource_links (
  id TEXT PRIMARY KEY,
  server_profile_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  related_entity TEXT NOT NULL DEFAULT '',
  last_checked_at TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (server_profile_id) REFERENCES server_profiles(id)
);
`;

const seedRulesets = [
  {
    key: 'nwn-ee-vanilla',
    name: 'Neverwinter Nights: Enhanced Edition - Vanilla',
    system: 'nwn-ee',
    levelCap: 40,
    description: 'Baseline NWN:EE rules profile for character planning and build validation.'
  },
  {
    key: 'nwn-ee-custom-server',
    name: 'Neverwinter Nights: Enhanced Edition - Custom Server',
    system: 'nwn-ee',
    levelCap: 40,
    description: 'Server-scoped NWN:EE profile for overrides, custom content, and local resource links.'
  },
  {
    key: 'dnd-35e',
    name: 'Dungeons & Dragons 3.5e',
    system: 'dnd-35e',
    levelCap: 20,
    description: 'Tabletop 3.5e profile reserved for v1 expansion.'
  },
  {
    key: 'dnd-5e-2014',
    name: 'Dungeons & Dragons 5e 2014',
    system: 'dnd-5e',
    levelCap: 20,
    description: '5e 2014 profile reserved for v1 expansion.'
  },
  {
    key: 'dnd-5e-2024',
    name: 'Dungeons & Dragons 5e 2024',
    system: 'dnd-5e',
    levelCap: 20,
    description: '5e 2024 profile reserved for v1 expansion.'
  },
  {
    key: 'custom-homebrew',
    name: 'Custom/Homebrew Ruleset',
    system: 'custom',
    levelCap: 20,
    description: 'Flexible profile for campaign or homebrew rules.'
  }
];

const seedSources = [
  {
    name: 'Manual Entry',
    type: 'manual_entry',
    version: 'local',
    licenseNote: 'User-authored local data.',
    attributionRequired: false,
    exportAllowed: true,
    notes: 'Default source for hand-entered records.'
  },
  {
    name: 'NWN:EE Vanilla',
    type: 'vanilla',
    version: 'MVP seed',
    licenseNote: 'Structured mechanics placeholder for local planning.',
    attributionRequired: false,
    exportAllowed: false,
    notes: 'Use provenance fields when importing or curating official/wiki-derived data.'
  }
];

function nowIso(): string {
  return new Date().toISOString();
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

function boolFromDb(value: SqlValue): boolean {
  return value === 1 || value === '1' || value === true.toString();
}

function nullableString(value: SqlValue): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function formatAbilityScores(scores: Build['abilityScores']): string {
  return [
    `STR ${scores.strength}`,
    `DEX ${scores.dexterity}`,
    `CON ${scores.constitution}`,
    `INT ${scores.intelligence}`,
    `WIS ${scores.wisdom}`,
    `CHA ${scores.charisma}`
  ].join(', ');
}

export class ScribeDatabase {
  private sql: SqlJsStatic | null = null;
  private db: Database | null = null;

  constructor(private readonly dbPath: string) {}

  async init(): Promise<void> {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm').replace('app.asar', 'app.asar.unpacked');
    this.sql = await initSqlJs({
      locateFile: () => wasmPath
    });

    const bytes = fs.existsSync(this.dbPath) ? fs.readFileSync(this.dbPath) : undefined;
    this.db = bytes ? new this.sql.Database(bytes) : new this.sql.Database();
    this.assertDb().exec(schemaSql);
    this.migrate();
    this.seed();
    this.persist();
  }

  getPath(): string {
    return this.dbPath;
  }

  getAppData(): AppData {
    return {
      rulesets: this.listRulesets(),
      sources: this.listSources(),
      serverProfiles: this.listServerProfiles(),
      characters: this.listCharacters(),
      builds: this.listBuilds(),
      buildLevels: this.listBuildLevels(),
      featSelections: this.listFeatSelections(),
      contentEntries: this.listContentEntries(),
      resourceLinks: this.listResourceLinks(),
      dbPath: this.dbPath
    };
  }

  createCharacter(input: CharacterInput): Character {
    const parsed = CharacterInputSchema.parse(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.exec(
      `INSERT INTO characters (
        id, name, ruleset_id, server_profile_id, campaign_profile_id, build_id, race_name, subrace_name,
        class_summary, alignment, deity, background, current_level, planned_final_level, status,
        ability_scores_json, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.name,
        parsed.rulesetId,
        parsed.serverProfileId ?? null,
        parsed.campaignProfileId ?? null,
        parsed.buildId ?? null,
        parsed.raceName,
        parsed.subraceName,
        parsed.classSummary,
        parsed.alignment,
        parsed.deity,
        parsed.background,
        parsed.currentLevel,
        parsed.plannedFinalLevel ?? null,
        parsed.status,
        JSON.stringify(parsed.abilityScores),
        parsed.notes,
        timestamp,
        timestamp
      ]
    );
    this.persist();
    return this.getCharacter(id);
  }

  updateCharacter(id: string, input: CharacterInput): Character {
    const parsed = CharacterInputSchema.parse(input);
    this.exec(
      `UPDATE characters SET
        name = ?, ruleset_id = ?, server_profile_id = ?, campaign_profile_id = ?, build_id = ?,
        race_name = ?, subrace_name = ?, class_summary = ?, alignment = ?, deity = ?, background = ?,
        current_level = ?, planned_final_level = ?, status = ?, ability_scores_json = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        parsed.name,
        parsed.rulesetId,
        parsed.serverProfileId ?? null,
        parsed.campaignProfileId ?? null,
        parsed.buildId ?? null,
        parsed.raceName,
        parsed.subraceName,
        parsed.classSummary,
        parsed.alignment,
        parsed.deity,
        parsed.background,
        parsed.currentLevel,
        parsed.plannedFinalLevel ?? null,
        parsed.status,
        JSON.stringify(parsed.abilityScores),
        parsed.notes,
        nowIso(),
        id
      ]
    );
    this.persist();
    return this.getCharacter(id);
  }

  createBuild(input: BuildInput): Build {
    const parsed = BuildInputSchema.parse(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.exec(
      `INSERT INTO builds (
        id, name, ruleset_id, server_profile_id, intended_role, intended_game, race_name, class_summary,
        ability_scores_json, level_cap, status, tags_json, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.name,
        parsed.rulesetId,
        parsed.serverProfileId ?? null,
        parsed.intendedRole,
        parsed.intendedGame,
        parsed.raceName,
        parsed.classSummary,
        JSON.stringify(parsed.abilityScores),
        parsed.levelCap,
        parsed.status,
        JSON.stringify(parsed.tags),
        parsed.notes,
        timestamp,
        timestamp
      ]
    );
    this.persist();
    return this.getBuild(id);
  }

  updateBuild(id: string, input: BuildInput): Build {
    const parsed = BuildInputSchema.parse(input);
    this.exec(
      `UPDATE builds SET
        name = ?, ruleset_id = ?, server_profile_id = ?, intended_role = ?, intended_game = ?,
        race_name = ?, class_summary = ?, ability_scores_json = ?, level_cap = ?, status = ?, tags_json = ?, notes = ?, updated_at = ?
      WHERE id = ?`,
      [
        parsed.name,
        parsed.rulesetId,
        parsed.serverProfileId ?? null,
        parsed.intendedRole,
        parsed.intendedGame,
        parsed.raceName,
        parsed.classSummary,
        JSON.stringify(parsed.abilityScores),
        parsed.levelCap,
        parsed.status,
        JSON.stringify(parsed.tags),
        parsed.notes,
        nowIso(),
        id
      ]
    );
    this.persist();
    return this.getBuild(id);
  }

  deleteBuild(id: string): void {
    const build = this.getBuild(id);
    this.exec('UPDATE characters SET build_id = NULL, updated_at = ? WHERE build_id = ?', [nowIso(), build.id]);
    this.exec('DELETE FROM feat_selections WHERE build_level_id IN (SELECT id FROM build_levels WHERE build_id = ?)', [build.id]);
    this.exec('DELETE FROM build_levels WHERE build_id = ?', [build.id]);
    this.exec('DELETE FROM builds WHERE id = ?', [build.id]);
    this.persist();
  }

  upsertBuildLevel(input: BuildLevelInput): BuildLevel {
    const parsed = BuildLevelInputSchema.parse(input);
    const existing = this.queryOne<Row>(
      'SELECT id FROM build_levels WHERE build_id = ? AND level_number = ?',
      [parsed.buildId, parsed.levelNumber]
    );
    const timestamp = nowIso();
    const id = typeof existing?.id === 'string' ? existing.id : randomUUID();

    if (existing) {
      this.exec(
        `UPDATE build_levels SET
          class_name = ?, hit_points_gained = ?, base_attack_bonus = ?, fortitude_save = ?,
          reflex_save = ?, will_save = ?, skill_points_available = ?, skill_allocation = ?,
          ability_increase = ?, spell_selections = ?, equipment_recommendation = ?,
          class_feature_notes = ?, notes = ?, validation_warnings_json = ?, updated_at = ?
        WHERE id = ?`,
        [
          parsed.className,
          parsed.hitPointsGained ?? null,
          parsed.baseAttackBonus ?? null,
          parsed.fortitudeSave ?? null,
          parsed.reflexSave ?? null,
          parsed.willSave ?? null,
          parsed.skillPointsAvailable ?? null,
          parsed.skillAllocation,
          parsed.abilityIncrease,
          parsed.spellSelections,
          parsed.equipmentRecommendation,
          parsed.classFeatureNotes,
          parsed.notes,
          JSON.stringify(parsed.validationWarnings),
          timestamp,
          id
        ]
      );
    } else {
      this.exec(
        `INSERT INTO build_levels (
          id, build_id, level_number, class_name, hit_points_gained, base_attack_bonus, fortitude_save,
          reflex_save, will_save, skill_points_available, skill_allocation, ability_increase,
          spell_selections, equipment_recommendation, class_feature_notes, notes,
          validation_warnings_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          parsed.buildId,
          parsed.levelNumber,
          parsed.className,
          parsed.hitPointsGained ?? null,
          parsed.baseAttackBonus ?? null,
          parsed.fortitudeSave ?? null,
          parsed.reflexSave ?? null,
          parsed.willSave ?? null,
          parsed.skillPointsAvailable ?? null,
          parsed.skillAllocation,
          parsed.abilityIncrease,
          parsed.spellSelections,
          parsed.equipmentRecommendation,
          parsed.classFeatureNotes,
          parsed.notes,
          JSON.stringify(parsed.validationWarnings),
          timestamp,
          timestamp
        ]
      );
    }

    this.exec('DELETE FROM feat_selections WHERE build_level_id = ?', [id]);
    for (const feat of parsed.featSelections) {
      const featTimestamp = nowIso();
      this.exec(
        `INSERT INTO feat_selections (id, build_level_id, feat_name, source, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), id, feat.featName, feat.source, feat.notes ?? '', featTimestamp, featTimestamp]
      );
    }

    this.persist();
    return this.getBuildLevel(id);
  }

  createContentEntry(input: ContentEntryInput): ContentEntry {
    const parsed = ContentEntryInputSchema.parse(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.exec(
      `INSERT INTO content_entries (
        id, name, type, ruleset_id, source_id, description, mechanics, prerequisites, tags_json,
        visibility, export_allowed, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.name,
        parsed.type,
        parsed.rulesetId,
        parsed.sourceId ?? null,
        parsed.description,
        parsed.mechanics,
        parsed.prerequisites,
        JSON.stringify(parsed.tags),
        parsed.visibility,
        parsed.exportAllowed ? 1 : 0,
        parsed.notes,
        timestamp,
        timestamp
      ]
    );
    this.persist();
    return this.getContentEntry(id);
  }

  createServerProfile(input: ServerProfileInput): ServerProfile {
    const parsed = ServerProfileInputSchema.parse(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.exec(
      `INSERT INTO server_profiles (
        id, name, ruleset_id, server_type, website, wiki, discord, level_cap, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.name,
        parsed.rulesetId,
        parsed.serverType,
        parsed.website,
        parsed.wiki,
        parsed.discord,
        parsed.levelCap,
        parsed.notes,
        timestamp,
        timestamp
      ]
    );
    this.persist();
    return this.getServerProfile(id);
  }

  createResourceLink(input: ResourceLinkInput): ResourceLink {
    const parsed = ResourceLinkInputSchema.parse(input);
    const id = randomUUID();
    const timestamp = nowIso();
    this.exec(
      `INSERT INTO resource_links (
        id, server_profile_id, title, url, category, summary, tags_json, related_entity,
        last_checked_at, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.serverProfileId ?? null,
        parsed.title,
        parsed.url,
        parsed.category,
        parsed.summary,
        JSON.stringify(parsed.tags),
        parsed.relatedEntity,
        parsed.lastCheckedAt,
        parsed.notes,
        timestamp,
        timestamp
      ]
    );
    this.persist();
    return this.getResourceLink(id);
  }

  buildMarkdown(buildId: string): string {
    const build = this.getBuild(buildId);
    const ruleset = this.listRulesets().find((item) => item.id === build.rulesetId);
    const levels = this.listBuildLevels()
      .filter((level) => level.buildId === build.id)
      .sort((a, b) => a.levelNumber - b.levelNumber);
    const feats = this.listFeatSelections();
    const lines = [
      `# ${build.name}`,
      '',
      `- Ruleset: ${ruleset?.name ?? 'Unknown'}`,
      `- Intended role: ${build.intendedRole || 'Unspecified'}`,
      `- Intended game/server: ${build.intendedGame || 'Unspecified'}`,
      `- Race/species: ${build.raceName || 'Unspecified'}`,
      `- Class split: ${build.classSummary || 'Unspecified'}`,
      `- Ability scores: ${formatAbilityScores(build.abilityScores)}`,
      `- Final level: ${build.levelCap}`,
      `- Status: ${build.status}`,
      '',
      '## Notes',
      '',
      build.notes || 'No build notes yet.',
      '',
      '## Leveling Guide',
      ''
    ];

    for (let levelNumber = 1; levelNumber <= build.levelCap; levelNumber += 1) {
      const level = levels.find((entry) => entry.levelNumber === levelNumber);
      if (!level) {
        lines.push(`### Level ${levelNumber}`, '', '- Class: Unplanned', '');
        continue;
      }

      const levelFeats = feats.filter((feat) => feat.buildLevelId === level.id);
      lines.push(`### Level ${level.levelNumber}`, '', `- Class: ${level.className || 'Unplanned'}`);
      if (level.hitPointsGained !== null) lines.push(`- Hit points gained: ${level.hitPointsGained}`);
      if (level.baseAttackBonus !== null) lines.push(`- Base attack bonus: ${level.baseAttackBonus}`);
      if (level.abilityIncrease) lines.push(`- Ability increase: ${level.abilityIncrease}`);
      if (level.skillAllocation) lines.push(`- Skills: ${level.skillAllocation}`);
      if (levelFeats.length > 0) {
        for (const feat of levelFeats) {
          lines.push(`- ${featSourceLabel(feat.source)}: ${feat.featName}${feat.notes ? ` (${feat.notes})` : ''}`);
        }
      }
      if (level.spellSelections) lines.push(`- Spells: ${level.spellSelections}`);
      if (level.equipmentRecommendation) lines.push(`- Equipment: ${level.equipmentRecommendation}`);
      if (level.classFeatureNotes) lines.push(`- Automatic features: ${level.classFeatureNotes}`);
      if (level.validationWarnings.length > 0) {
        for (const warning of level.validationWarnings) {
          lines.push(`- Warning: ${warning}`);
        }
      }
      if (level.notes) lines.push(`- Notes: ${level.notes}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  saveBuildMarkdown(buildId: string, filePath: string): SaveMarkdownResult {
    const markdown = this.buildMarkdown(buildId);
    fs.writeFileSync(filePath, markdown, 'utf8');
    return { canceled: false, filePath };
  }

  private listRulesets(): Ruleset[] {
    return this.query('SELECT * FROM rulesets ORDER BY name').map((row) => ({
      id: String(row.id),
      key: String(row.key),
      name: String(row.name),
      system: String(row.system),
      levelCap: Number(row.level_cap),
      abilityModifierFormula: String(row.ability_modifier_formula),
      description: String(row.description),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listSources(): Source[] {
    return this.query('SELECT * FROM sources ORDER BY name').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: row.type as Source['type'],
      url: String(row.url),
      version: String(row.version),
      licenseNote: String(row.license_note),
      attributionRequired: boolFromDb(row.attribution_required),
      exportAllowed: boolFromDb(row.export_allowed),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listServerProfiles(): ServerProfile[] {
    return this.query('SELECT * FROM server_profiles ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      rulesetId: String(row.ruleset_id),
      serverType: String(row.server_type),
      website: String(row.website),
      wiki: String(row.wiki),
      discord: String(row.discord),
      levelCap: Number(row.level_cap),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listCharacters(): Character[] {
    return this.query('SELECT * FROM characters ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      rulesetId: String(row.ruleset_id),
      serverProfileId: nullableString(row.server_profile_id),
      campaignProfileId: nullableString(row.campaign_profile_id),
      buildId: nullableString(row.build_id),
      raceName: String(row.race_name),
      subraceName: String(row.subrace_name),
      classSummary: String(row.class_summary),
      alignment: String(row.alignment),
      deity: String(row.deity),
      background: String(row.background),
      currentLevel: Number(row.current_level),
      plannedFinalLevel: row.planned_final_level === null ? null : Number(row.planned_final_level),
      status: row.status as Character['status'],
      abilityScores: jsonParse(row.ability_scores_json, defaultAbilityScores),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listBuilds(): Build[] {
    return this.query('SELECT * FROM builds ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      rulesetId: String(row.ruleset_id),
      serverProfileId: nullableString(row.server_profile_id),
      intendedRole: String(row.intended_role),
      intendedGame: String(row.intended_game),
      raceName: String(row.race_name),
      classSummary: String(row.class_summary),
      abilityScores: jsonParse(row.ability_scores_json, defaultAbilityScores),
      levelCap: Number(row.level_cap),
      status: row.status as Build['status'],
      tags: jsonParse(row.tags_json, []),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listBuildLevels(): BuildLevel[] {
    return this.query('SELECT * FROM build_levels ORDER BY level_number ASC').map((row) => ({
      id: String(row.id),
      buildId: String(row.build_id),
      levelNumber: Number(row.level_number),
      className: String(row.class_name),
      hitPointsGained: row.hit_points_gained === null ? null : Number(row.hit_points_gained),
      baseAttackBonus: row.base_attack_bonus === null ? null : Number(row.base_attack_bonus),
      fortitudeSave: row.fortitude_save === null ? null : Number(row.fortitude_save),
      reflexSave: row.reflex_save === null ? null : Number(row.reflex_save),
      willSave: row.will_save === null ? null : Number(row.will_save),
      skillPointsAvailable: row.skill_points_available === null ? null : Number(row.skill_points_available),
      skillAllocation: String(row.skill_allocation),
      abilityIncrease: String(row.ability_increase),
      spellSelections: String(row.spell_selections),
      equipmentRecommendation: String(row.equipment_recommendation),
      classFeatureNotes: String(row.class_feature_notes),
      notes: String(row.notes),
      validationWarnings: jsonParse(row.validation_warnings_json, []),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listFeatSelections(): FeatSelection[] {
    return this.query('SELECT * FROM feat_selections ORDER BY created_at ASC').map((row) => ({
      id: String(row.id),
      buildLevelId: String(row.build_level_id),
      featName: String(row.feat_name),
      source: row.source as FeatSelection['source'],
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listContentEntries(): ContentEntry[] {
    return this.query('SELECT * FROM content_entries ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: row.type as ContentEntry['type'],
      rulesetId: String(row.ruleset_id),
      sourceId: nullableString(row.source_id),
      description: String(row.description),
      mechanics: String(row.mechanics),
      prerequisites: String(row.prerequisites),
      tags: jsonParse(row.tags_json, []),
      visibility: String(row.visibility),
      exportAllowed: boolFromDb(row.export_allowed),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private listResourceLinks(): ResourceLink[] {
    return this.query('SELECT * FROM resource_links ORDER BY updated_at DESC').map((row) => ({
      id: String(row.id),
      serverProfileId: nullableString(row.server_profile_id),
      title: String(row.title),
      url: String(row.url),
      category: String(row.category),
      summary: String(row.summary),
      tags: jsonParse(row.tags_json, []),
      relatedEntity: String(row.related_entity),
      lastCheckedAt: String(row.last_checked_at),
      notes: String(row.notes),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  private getCharacter(id: string): Character {
    const row = this.listCharacters().find((item) => item.id === id);
    if (!row) throw new Error(`Character not found: ${id}`);
    return row;
  }

  private getBuild(id: string): Build {
    const row = this.listBuilds().find((item) => item.id === id);
    if (!row) throw new Error(`Build not found: ${id}`);
    return row;
  }

  private getBuildLevel(id: string): BuildLevel {
    const row = this.listBuildLevels().find((item) => item.id === id);
    if (!row) throw new Error(`Build level not found: ${id}`);
    return row;
  }

  private getContentEntry(id: string): ContentEntry {
    const row = this.listContentEntries().find((item) => item.id === id);
    if (!row) throw new Error(`Content entry not found: ${id}`);
    return row;
  }

  private getServerProfile(id: string): ServerProfile {
    const row = this.listServerProfiles().find((item) => item.id === id);
    if (!row) throw new Error(`Server profile not found: ${id}`);
    return row;
  }

  private getResourceLink(id: string): ResourceLink {
    const row = this.listResourceLinks().find((item) => item.id === id);
    if (!row) throw new Error(`Resource link not found: ${id}`);
    return row;
  }

  private migrate(): void {
    if (!this.hasColumn('builds', 'ability_scores_json')) {
      this.exec(
        `ALTER TABLE builds ADD COLUMN ability_scores_json TEXT NOT NULL DEFAULT '${JSON.stringify(defaultAbilityScores)}'`
      );
    }
  }

  private hasColumn(tableName: string, columnName: string): boolean {
    return this.query(`PRAGMA table_info(${tableName})`).some((row) => row.name === columnName);
  }

  private seed(): void {
    const timestamp = nowIso();
    for (const ruleset of seedRulesets) {
      const existing = this.queryOne<Row>('SELECT id FROM rulesets WHERE key = ?', [ruleset.key]);
      if (!existing) {
        this.exec(
          `INSERT INTO rulesets (
            id, key, name, system, level_cap, ability_modifier_formula, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            ruleset.key,
            ruleset.name,
            ruleset.system,
            ruleset.levelCap,
            'floor((score - 10) / 2)',
            ruleset.description,
            timestamp,
            timestamp
          ]
        );
      }
    }

    for (const source of seedSources) {
      const existing = this.queryOne<Row>('SELECT id FROM sources WHERE name = ?', [source.name]);
      if (!existing) {
        this.exec(
          `INSERT INTO sources (
            id, name, type, url, version, license_note, attribution_required, export_allowed,
            notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            source.name,
            source.type,
            '',
            source.version,
            source.licenseNote,
            source.attributionRequired ? 1 : 0,
            source.exportAllowed ? 1 : 0,
            source.notes,
            timestamp,
            timestamp
          ]
        );
      }
    }
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
      throw new Error('SCRIBE database has not been initialized.');
    }
    return this.db;
  }
}

export function createDatabase(dbPath: string): ScribeDatabase {
  return new ScribeDatabase(dbPath);
}

function featSourceLabel(source: FeatSelection['source']): string {
  const labels: Record<FeatSelection['source'], string> = {
    selected: 'Selected Feat',
    human_bonus: 'Human Bonus Feat',
    racial_grant: 'Race-Granted Feat',
    class_bonus: 'Class Bonus Feat',
    class_grant: 'Class-Granted Feature',
    epic_bonus: 'Epic Bonus Feat',
    server_grant: 'Server-Granted Feature',
    custom: 'Custom Feature',
    homebrew_grant: 'Homebrew Grant',
    manual_override: 'Manual Override'
  };

  return labels[source];
}
