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
  UpdateStatus
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
    getUpdateStatus: () => unsupported(previewUpdateStatus),
    checkForUpdates: () => unsupported(previewUpdateStatus),
    installUpdate: () => unsupported(undefined),
    onUpdateStatus: () => () => undefined
  };
}
