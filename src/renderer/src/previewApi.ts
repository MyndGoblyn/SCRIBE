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
  WikiLibrarySummary,
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
      abilityScores: {
        strength: 16,
        dexterity: 13,
        constitution: 14,
        intelligence: 12,
        wisdom: 10,
        charisma: 8
      },
      levelCap: 40,
      status: 'draft',
      tags: ['PvE', 'Weapon Master'],
      notes: 'Preview build for browser visual QA.',
      createdAt: now,
      updatedAt: now
    }
  ],
  buildLevels: [
    {
      id: 'preview-level-1',
      buildId: 'preview-build',
      levelNumber: 1,
      className: 'Fighter',
      hitPointsGained: 10,
      baseAttackBonus: 1,
      fortitudeSave: 2,
      reflexSave: 0,
      willSave: 0,
      skillPointsAvailable: 16,
      skillAllocation: 'Discipline +4, Tumble +2, Persuade +2',
      abilityIncrease: '',
      spellSelections: '',
      equipmentRecommendation: 'Greatsword and medium armor',
      classFeatureNotes: 'Weapon and armor proficiency; Bonus feat',
      notes: 'Opening martial chassis.',
      validationWarnings: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preview-level-2',
      buildId: 'preview-build',
      levelNumber: 2,
      className: 'Fighter',
      hitPointsGained: 10,
      baseAttackBonus: 2,
      fortitudeSave: 3,
      reflexSave: 0,
      willSave: 0,
      skillPointsAvailable: 4,
      skillAllocation: 'Discipline +1, Tumble +1',
      abilityIncrease: '',
      spellSelections: '',
      equipmentRecommendation: '',
      classFeatureNotes: 'Bonus feat',
      notes: '',
      validationWarnings: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preview-level-3',
      buildId: 'preview-build',
      levelNumber: 3,
      className: 'Rogue',
      hitPointsGained: 6,
      baseAttackBonus: 2,
      fortitudeSave: 3,
      reflexSave: 2,
      willSave: 0,
      skillPointsAvailable: 10,
      skillAllocation: 'Tumble +5, Use Magic Device +3, Open Lock +2',
      abilityIncrease: '',
      spellSelections: '',
      equipmentRecommendation: 'Trap kit and utility gear',
      classFeatureNotes: 'Sneak attack; Trapfinding',
      notes: 'Utility dip before Weapon Master requirements.',
      validationWarnings: ['Confirm skill ranks against final server rules.'],
      createdAt: now,
      updatedAt: now
    }
  ],
  featSelections: [
    {
      id: 'preview-feat-1',
      buildLevelId: 'preview-level-1',
      featName: 'Power Attack',
      source: 'selected',
      notes: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preview-feat-2',
      buildLevelId: 'preview-level-1',
      featName: 'Cleave',
      source: 'human_bonus',
      notes: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preview-feat-3',
      buildLevelId: 'preview-level-2',
      featName: 'Weapon Focus',
      source: 'class_bonus',
      notes: '',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'preview-feat-4',
      buildLevelId: 'preview-level-3',
      featName: 'Server Weapon Training',
      source: 'server_grant',
      notes: 'Preview server feature.',
      createdAt: now,
      updatedAt: now
    }
  ],
  contentEntries: [],
  resourceLinks: [],
  dbPath: 'Preview mode'
};

const previewUpdateStatus: UpdateStatus = {
  state: 'disabled',
  message: 'Update checks run in packaged installer builds.',
  updatedAt: now
};

const previewWikiSummary: WikiLibrarySummary = {
  articleCount: 3,
  sourceName: 'NWNWiki',
  sourceUrl: 'https://nwn.fandom.com/wiki/',
  licenseName: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  updatedAt: now,
  hasLibrary: true
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
    plainText: `Weapon master is a prestige class focused on melee critical hits and specialization with a chosen weapon. This preview page demonstrates offline wiki search layout.

Requirements

Base attack bonus +5
Weapon Focus in the chosen melee weapon
Whirlwind Attack
Intimidate 4 ranks

Class features

Ki damage improves the critical multiplier of the chosen weapon.
Increased multiplier and superior weapon focus reward high-accuracy martial builds.

Level progression

Lvl | BAB | Fort | Ref | Will | Feats
1st | +1 | +0 | +0 | +2 | Ki damage
2nd | +2 | +0 | +0 | +3 | Increased multiplier
3rd | +3 | +1 | +1 | +3 | Superior weapon focus`
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
    plainText: `Bard song grants allies bonuses that improve with bard level and perform skill investment.

Progression

Bard level | Perform rank | Attack bonus | Damage bonus | Skill bonus
1 | 3 | +1 | +0 | +1
6 | 9 | +1 | +1 | +2
11 | 14 | +2 | +1 | +3`
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
    deleteBuild: () => unsupported(undefined),
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
