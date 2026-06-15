import type {
  AppData,
  Build,
  BuildInput,
  BuildLevel,
  BuildLevelInput,
  Character,
  CharacterInput,
  ContentEntry,
  ContentEntryInput,
  ResourceLink,
  ResourceLinkInput,
  SaveMarkdownResult,
  ServerProfile,
  ServerProfileInput,
  UpdateStatus,
  WikiImportSummary,
  WikiPageDetail,
  WikiSearchResult
} from '../../shared/contracts';

type ScribeApi = Window['scribe'];

const now = new Date().toISOString();
const previewRulesetId = 'preview-nwn-ee';
const previewSourceId = 'preview-manual';

const previewData: AppData = {
  rulesets: [
    {
      id: previewRulesetId,
      key: 'nwn-ee-vanilla',
      name: 'Neverwinter Nights: Enhanced Edition - Vanilla',
      system: 'nwn-ee',
      levelCap: 40,
      abilityModifierFormula: 'floor((score - 10) / 2)',
      description: 'Preview ruleset for browser visual QA.',
      createdAt: now,
      updatedAt: now
    }
  ],
  sources: [
    {
      id: previewSourceId,
      name: 'Manual Entry',
      type: 'manual_entry',
      url: '',
      version: 'preview',
      licenseNote: '',
      attributionRequired: false,
      exportAllowed: true,
      notes: '',
      createdAt: now,
      updatedAt: now
    }
  ],
  serverProfiles: [],
  characters: [
    {
      id: 'preview-character',
      name: 'Aurelian Quill',
      rulesetId: previewRulesetId,
      serverProfileId: null,
      campaignProfileId: null,
      buildId: 'preview-build',
      raceName: 'Human',
      subraceName: '',
      classSummary: 'Fighter 12 / Weapon Master 7 / Rogue 1',
      alignment: 'Lawful Neutral',
      deity: '',
      background: '',
      currentLevel: 7,
      plannedFinalLevel: 40,
      status: 'active',
      abilityScores: {
        strength: 16,
        dexterity: 13,
        constitution: 14,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      },
      notes: 'Preview character for browser visual QA.',
      createdAt: now,
      updatedAt: now
    }
  ],
  builds: [
    {
      id: 'preview-build',
      name: 'Sapphire Duelist',
      rulesetId: previewRulesetId,
      serverProfileId: null,
      intendedRole: 'Melee DPS',
      intendedGame: 'NWN:EE',
      raceName: 'Human',
      classSummary: 'Fighter 12 / Weapon Master 7 / Rogue 1',
      levelCap: 40,
      status: 'draft',
      tags: ['PvE', 'Weapon Master'],
      notes: 'Preview build for browser visual QA.',
      createdAt: now,
      updatedAt: now
    }
  ],
  buildLevels: [],
  featSelections: [],
  contentEntries: [],
  resourceLinks: [],
  dbPath: 'Preview mode'
};

const previewUpdateStatus: UpdateStatus = {
  state: 'disabled',
  message: 'Update checks run in packaged installer builds.',
  updatedAt: now
};

const previewWikiSummary: WikiImportSummary = {
  pageCount: 3,
  indexedPageCount: 3,
  sourceName: 'NWNWiki',
  sourceUrl: 'https://nwn.fandom.com/wiki/',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  importedAt: now,
  dbPath: 'Preview mode',
  hasDataPack: true
};

const previewWikiPages: WikiPageDetail[] = [
  {
    pageId: 1,
    title: 'Weapon master',
    snippet: '',
    revisionId: 101,
    touchedAt: now,
    fetchedAt: now,
    sourceUrl: 'https://nwn.fandom.com/wiki/Weapon_master',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    categories: ['Prestige classes'],
    plainText:
      'Weapon master is a prestige class focused on melee critical hits and specialization with a chosen weapon. This preview page demonstrates offline wiki search layout.'
  },
  {
    pageId: 2,
    title: 'Bard song',
    snippet: '',
    revisionId: 102,
    touchedAt: now,
    fetchedAt: now,
    sourceUrl: 'https://nwn.fandom.com/wiki/Bard_song',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    categories: ['Class abilities'],
    plainText: 'Bard song grants allies bonuses that improve with bard level and perform skill investment.'
  },
  {
    pageId: 3,
    title: 'Epic spell focus',
    snippet: '',
    revisionId: 103,
    touchedAt: now,
    fetchedAt: now,
    sourceUrl: 'https://nwn.fandom.com/wiki/Epic_spell_focus',
    licenseName: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    categories: ['Feats', 'Epic feats'],
    plainText: 'Epic spell focus increases spell difficulty class for one school of magic.'
  }
];

function searchPreviewWiki(query: string, limit = 12): WikiSearchResult[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  return previewWikiPages
    .filter((page) => `${page.title} ${page.plainText}`.toLowerCase().includes(needle))
    .slice(0, limit)
    .map((page) => ({
      pageId: page.pageId,
      title: page.title,
      snippet: page.plainText.slice(0, 180),
      sourceUrl: page.sourceUrl,
      touchedAt: page.touchedAt
    }));
}

function unsupported<T>(fallback: T): Promise<T> {
  return Promise.resolve(fallback);
}

export function getScribeApi(): ScribeApi {
  if (window.scribe) {
    return window.scribe;
  }

  if (!import.meta.env.DEV) {
    throw new Error('SCRIBE preload API is unavailable.');
  }

  return {
    getAppData: () => unsupported(previewData),
    createCharacter: (input: CharacterInput) => unsupported({ ...previewData.characters[0], ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Character),
    updateCharacter: (id: string, input: CharacterInput) => unsupported({ ...previewData.characters[0], ...input, id, createdAt: now, updatedAt: now } as Character),
    createBuild: (input: BuildInput) => unsupported({ ...previewData.builds[0], ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as Build),
    updateBuild: (id: string, input: BuildInput) => unsupported({ ...previewData.builds[0], ...input, id, createdAt: now, updatedAt: now } as Build),
    upsertBuildLevel: (input: BuildLevelInput) =>
      unsupported({
        ...input,
        id: crypto.randomUUID(),
        className: input.className ?? '',
        validationWarnings: input.validationWarnings ?? [],
        createdAt: now,
        updatedAt: now
      } as BuildLevel),
    createContentEntry: (input: ContentEntryInput) => unsupported({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as ContentEntry),
    createServerProfile: (input: ServerProfileInput) => unsupported({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as ServerProfile),
    createResourceLink: (input: ResourceLinkInput) => unsupported({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now } as ResourceLink),
    buildMarkdown: () => unsupported('# Sapphire Duelist\n\nPreview Markdown export.'),
    saveBuildMarkdown: () => unsupported({ canceled: true } as SaveMarkdownResult),
    getNwnWikiSummary: () => unsupported(previewWikiSummary),
    searchNwnWiki: (query: string, limit?: number) => unsupported(searchPreviewWiki(query, limit)),
    getNwnWikiPage: (pageId: number) => unsupported(previewWikiPages.find((page) => page.pageId === pageId) ?? null),
    getUpdateStatus: () => unsupported(previewUpdateStatus),
    checkForUpdates: () => unsupported(previewUpdateStatus),
    installUpdate: () => unsupported(undefined),
    onUpdateStatus: () => () => undefined
  };
}
