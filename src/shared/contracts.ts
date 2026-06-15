import { z } from 'zod';

export const abilityKeys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;

export const CharacterStatusSchema = z.enum(['planned', 'active', 'paused', 'retired', 'archived']);
export const BuildStatusSchema = z.enum(['draft', 'locked', 'archived']);
export const SourceTypeSchema = z.enum([
  'vanilla',
  'srd',
  'wiki',
  'server_wiki',
  'manual_entry',
  'homebrew',
  'imported_pack'
]);
export const ContentTypeSchema = z.enum([
  'race',
  'subrace',
  'class',
  'subclass',
  'prestige_class',
  'feat',
  'skill',
  'spell',
  'domain',
  'deity',
  'weapon',
  'armor',
  'item_property',
  'enemy',
  'condition',
  'background',
  'rule',
  'formula',
  'server_override'
]);
export const FeatSourceSchema = z.enum([
  'selected',
  'human_bonus',
  'racial_grant',
  'class_bonus',
  'class_grant',
  'epic_bonus',
  'server_grant',
  'custom',
  'homebrew_grant',
  'manual_override'
]);

export const AbilityScoresSchema = z.object({
  strength: z.coerce.number().int().min(1).max(99).default(10),
  dexterity: z.coerce.number().int().min(1).max(99).default(10),
  constitution: z.coerce.number().int().min(1).max(99).default(10),
  intelligence: z.coerce.number().int().min(1).max(99).default(10),
  wisdom: z.coerce.number().int().min(1).max(99).default(10),
  charisma: z.coerce.number().int().min(1).max(99).default(10)
});

export const CharacterInputSchema = z.object({
  name: z.string().trim().min(1),
  rulesetId: z.string().trim().min(1),
  serverProfileId: z.string().trim().nullable().optional(),
  campaignProfileId: z.string().trim().nullable().optional(),
  buildId: z.string().trim().nullable().optional(),
  raceName: z.string().trim().optional().default(''),
  subraceName: z.string().trim().optional().default(''),
  classSummary: z.string().trim().optional().default(''),
  alignment: z.string().trim().optional().default(''),
  deity: z.string().trim().optional().default(''),
  background: z.string().trim().optional().default(''),
  currentLevel: z.coerce.number().int().min(1).max(60).default(1),
  plannedFinalLevel: z.coerce.number().int().min(1).max(60).nullable().optional(),
  status: CharacterStatusSchema.default('planned'),
  abilityScores: AbilityScoresSchema.default({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  }),
  notes: z.string().trim().optional().default('')
});

export const BuildInputSchema = z.object({
  name: z.string().trim().min(1),
  rulesetId: z.string().trim().min(1),
  serverProfileId: z.string().trim().nullable().optional(),
  intendedRole: z.string().trim().optional().default(''),
  intendedGame: z.string().trim().optional().default(''),
  raceName: z.string().trim().optional().default(''),
  classSummary: z.string().trim().optional().default(''),
  levelCap: z.coerce.number().int().min(1).max(60).default(40),
  status: BuildStatusSchema.default('draft'),
  tags: z.array(z.string().trim()).default([]),
  notes: z.string().trim().optional().default('')
});

export const FeatSelectionInputSchema = z.object({
  id: z.string().optional(),
  featName: z.string().trim().min(1),
  source: FeatSourceSchema.default('selected'),
  notes: z.string().trim().optional().default('')
});

export const BuildLevelInputSchema = z.object({
  buildId: z.string().trim().min(1),
  levelNumber: z.coerce.number().int().min(1).max(60),
  className: z.string().trim().optional().default(''),
  hitPointsGained: z.coerce.number().int().min(0).max(999).nullable().optional(),
  baseAttackBonus: z.coerce.number().int().min(0).max(99).nullable().optional(),
  fortitudeSave: z.coerce.number().int().min(0).max(99).nullable().optional(),
  reflexSave: z.coerce.number().int().min(0).max(99).nullable().optional(),
  willSave: z.coerce.number().int().min(0).max(99).nullable().optional(),
  skillPointsAvailable: z.coerce.number().int().min(0).max(999).nullable().optional(),
  skillAllocation: z.string().trim().optional().default(''),
  abilityIncrease: z.string().trim().optional().default(''),
  spellSelections: z.string().trim().optional().default(''),
  equipmentRecommendation: z.string().trim().optional().default(''),
  classFeatureNotes: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
  validationWarnings: z.array(z.string().trim()).default([]),
  featSelections: z.array(FeatSelectionInputSchema).default([])
});

export const ContentEntryInputSchema = z.object({
  name: z.string().trim().min(1),
  type: ContentTypeSchema,
  rulesetId: z.string().trim().min(1),
  sourceId: z.string().trim().nullable().optional(),
  description: z.string().trim().optional().default(''),
  mechanics: z.string().trim().optional().default(''),
  prerequisites: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).default([]),
  visibility: z.string().trim().optional().default('private'),
  exportAllowed: z.boolean().default(false),
  notes: z.string().trim().optional().default('')
});

export const ServerProfileInputSchema = z.object({
  name: z.string().trim().min(1),
  rulesetId: z.string().trim().min(1),
  serverType: z.string().trim().optional().default('persistent_world'),
  website: z.string().trim().optional().default(''),
  wiki: z.string().trim().optional().default(''),
  discord: z.string().trim().optional().default(''),
  levelCap: z.coerce.number().int().min(1).max(60).default(40),
  notes: z.string().trim().optional().default('')
});

export const ResourceLinkInputSchema = z.object({
  serverProfileId: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1),
  url: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('Personal Notes'),
  summary: z.string().trim().optional().default(''),
  tags: z.array(z.string().trim()).default([]),
  relatedEntity: z.string().trim().optional().default(''),
  lastCheckedAt: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default('')
});

export type AbilityScores = z.infer<typeof AbilityScoresSchema>;
export type CharacterStatus = z.infer<typeof CharacterStatusSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export type FeatSource = z.infer<typeof FeatSourceSchema>;
export type CharacterInput = z.infer<typeof CharacterInputSchema>;
export type BuildInput = z.infer<typeof BuildInputSchema>;
export type BuildLevelInput = z.infer<typeof BuildLevelInputSchema>;
export type FeatSelectionInput = z.infer<typeof FeatSelectionInputSchema>;
export type ContentEntryInput = z.infer<typeof ContentEntryInputSchema>;
export type ServerProfileInput = z.infer<typeof ServerProfileInputSchema>;
export type ResourceLinkInput = z.infer<typeof ResourceLinkInputSchema>;

export interface Ruleset {
  id: string;
  key: string;
  name: string;
  system: string;
  levelCap: number;
  abilityModifierFormula: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  version: string;
  licenseNote: string;
  attributionRequired: boolean;
  exportAllowed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerProfile {
  id: string;
  name: string;
  rulesetId: string;
  serverType: string;
  website: string;
  wiki: string;
  discord: string;
  levelCap: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  rulesetId: string;
  serverProfileId: string | null;
  campaignProfileId: string | null;
  buildId: string | null;
  raceName: string;
  subraceName: string;
  classSummary: string;
  alignment: string;
  deity: string;
  background: string;
  currentLevel: number;
  plannedFinalLevel: number | null;
  status: CharacterStatus;
  abilityScores: AbilityScores;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Build {
  id: string;
  name: string;
  rulesetId: string;
  serverProfileId: string | null;
  intendedRole: string;
  intendedGame: string;
  raceName: string;
  classSummary: string;
  levelCap: number;
  status: BuildStatus;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildLevel {
  id: string;
  buildId: string;
  levelNumber: number;
  className: string;
  hitPointsGained: number | null;
  baseAttackBonus: number | null;
  fortitudeSave: number | null;
  reflexSave: number | null;
  willSave: number | null;
  skillPointsAvailable: number | null;
  skillAllocation: string;
  abilityIncrease: string;
  spellSelections: string;
  equipmentRecommendation: string;
  classFeatureNotes: string;
  notes: string;
  validationWarnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeatSelection {
  id: string;
  buildLevelId: string;
  featName: string;
  source: FeatSource;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentEntry {
  id: string;
  name: string;
  type: ContentType;
  rulesetId: string;
  sourceId: string | null;
  description: string;
  mechanics: string;
  prerequisites: string;
  tags: string[];
  visibility: string;
  exportAllowed: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceLink {
  id: string;
  serverProfileId: string | null;
  title: string;
  url: string;
  category: string;
  summary: string;
  tags: string[];
  relatedEntity: string;
  lastCheckedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  rulesets: Ruleset[];
  sources: Source[];
  serverProfiles: ServerProfile[];
  characters: Character[];
  builds: Build[];
  buildLevels: BuildLevel[];
  featSelections: FeatSelection[];
  contentEntries: ContentEntry[];
  resourceLinks: ResourceLink[];
  dbPath: string;
}

export interface WikiLibrarySummary {
  articleCount: number;
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
  updatedAt: string | null;
  hasLibrary: boolean;
}

export interface WikiSearchResult {
  pageId: number;
  title: string;
  snippet: string;
  sourceUrl: string;
  touchedAt: string;
}

export interface WikiPageDetail extends WikiSearchResult {
  revisionId: number;
  fetchedAt: string;
  licenseName: string;
  licenseUrl: string;
  categories: string[];
  plainText: string;
}

export interface SaveMarkdownResult {
  canceled: boolean;
  filePath?: string;
}

export type UpdateState =
  | 'idle'
  | 'disabled'
  | 'checking'
  | 'available'
  | 'not_available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateStatus {
  state: UpdateState;
  message: string;
  version?: string;
  percent?: number;
  updatedAt: string;
}
