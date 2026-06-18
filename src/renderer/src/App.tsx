import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  Archive,
  BookOpen,
  Calculator,
  Check,
  CircleHelp,
  Database,
  Download,
  FileText,
  Home,
  Layers3,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  UserRound,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  abilityKeys,
  type AppData,
  type Build,
  type BuildInput,
  type BuildLevel,
  type BuildLevelInput,
  type Character,
  type CharacterInput,
  type ContentEntryInput,
  type FeatSelection,
  type FeatSelectionInput,
  type FeatSource,
  type ResourceLinkInput,
  type ServerProfileInput,
  type UpdateStatus,
  type WikiLibrarySummary,
  type WikiPageDetail,
  type WikiSearchResult
} from '../../shared/contracts';
import {
  calculateAbilityModifier,
  calculateFiveESpellDc,
  calculateNwnSpellDc,
  calculateSavingThrow
} from '../../shared/calculations';
import { getScribeApi } from './previewApi';
import { SourceBadge } from './components/SourceBadge';
import { WikiArticle } from './components/WikiArticle';
import scribeEmblemUrl from './assets/scribe-emblem.png';
import scribeLogoUrl from './assets/scribe-logo.png';
import {
  classAbbreviation,
  adjustSkillAllocation,
  estimateSkillPoints,
  formatFeatSourceLabel,
  getAutoLevelMetrics,
  getBuildLevelGuideSections,
  getBuildForgeSteps,
  getBuildHealth,
  getSkillAllocationPoints,
  type BuildLevelGuideSection,
  type BuildForgeStep,
  type BuildHealth,
  type SkillPointEstimate
} from './features/buildForgeModel';
import { getCharacterDossier, type CharacterDossier } from './features/characterDossier';

const scribeApi = getScribeApi();

type View =
  | 'dashboard'
  | 'characters'
  | 'builds'
  | 'leveling'
  | 'wiki'
  | 'rules'
  | 'equipment'
  | 'servers'
  | 'custom'
  | 'calculations'
  | 'export'
  | 'help'
  | 'settings';

type NavItem = { id: View; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: Home }]
  },
  {
    label: 'Creation',
    items: [
      { id: 'characters', label: 'Character Records', icon: UserRound },
      { id: 'builds', label: 'Build Forge', icon: Layers3 }
    ]
  },
  {
    label: 'Reference',
    items: [
      { id: 'wiki', label: 'Compendium', icon: BookOpen },
      { id: 'rules', label: 'Server Rules', icon: FileText },
      { id: 'equipment', label: 'Equipment', icon: Shield },
      { id: 'calculations', label: 'Calculations', icon: Calculator }
    ]
  },
  {
    label: 'Output',
    items: [{ id: 'export', label: 'Import / Export', icon: Download }]
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help', icon: CircleHelp }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

const featSources: Array<{ value: FeatSource; label: string }> = [
  { value: 'selected', label: 'Selected Feat' },
  { value: 'human_bonus', label: 'Human Bonus Feat' },
  { value: 'racial_grant', label: 'Race-Granted Feat' },
  { value: 'class_bonus', label: 'Class Bonus Feat' },
  { value: 'class_grant', label: 'Class-Granted Feature' },
  { value: 'epic_bonus', label: 'Epic Bonus Feat' },
  { value: 'server_grant', label: 'Server-Granted Feature' },
  { value: 'custom', label: 'Custom Feature' },
  { value: 'homebrew_grant', label: 'Homebrew Grant' },
  { value: 'manual_override', label: 'Manual Override' }
];

const contentTypes = [
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
] as const;

const nwnClassOptions = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Wizard',
  'Arcane Archer',
  'Assassin',
  'Blackguard',
  'Champion of Torm',
  'Dwarven Defender',
  'Harper Scout',
  'Pale Master',
  'Red Dragon Disciple',
  'Shadowdancer',
  'Shifter',
  'Weapon Master'
];

const abilityIncreaseOptions = [
  { value: '', label: 'None' },
  { value: '+STR', label: '+STR' },
  { value: '+DEX', label: '+DEX' },
  { value: '+CON', label: '+CON' },
  { value: '+INT', label: '+INT' },
  { value: '+WIS', label: '+WIS' },
  { value: '+CHA', label: '+CHA' }
];

const nwnSkillOptions = [
  'Animal Empathy',
  'Appraise',
  'Bluff',
  'Concentration',
  'Craft Armor',
  'Craft Trap',
  'Craft Weapon',
  'Disable Trap',
  'Discipline',
  'Heal',
  'Hide',
  'Intimidate',
  'Listen',
  'Lore',
  'Move Silently',
  'Open Lock',
  'Parry',
  'Perform',
  'Persuade',
  'Pick Pocket',
  'Search',
  'Set Trap',
  'Spellcraft',
  'Spot',
  'Taunt',
  'Tumble',
  'Use Magic Device'
];

const nwnFeatOptions: Array<{ name: string; category: string; detail: string }> = [
  { name: 'Alertness', category: 'General', detail: 'Awareness feat often used for Shifter routes.' },
  { name: 'Ambidexterity', category: 'General', detail: 'Reduces dual-wielding penalties.' },
  { name: 'Armor Skin', category: 'Epic', detail: 'Epic armor class improvement.' },
  { name: 'Blind Fight', category: 'General', detail: 'Improves attacks against concealed targets.' },
  { name: 'Cleave', category: 'General', detail: 'Follow-up attack after dropping a target.' },
  { name: 'Combat Casting', category: 'General', detail: 'Concentration support while threatened.' },
  { name: 'Dodge', category: 'General', detail: 'Prerequisite for Mobility and Spring Attack.' },
  { name: 'Empower Spell', category: 'Metamagic', detail: 'Raises spell output at higher slot cost.' },
  { name: 'Epic Prowess', category: 'Epic', detail: 'Epic attack bonus feat.' },
  { name: 'Epic Spell Focus', category: 'Epic', detail: 'Improves one spell school difficulty class.' },
  { name: 'Epic Toughness', category: 'Epic', detail: 'Adds a large hit point buffer.' },
  { name: 'Epic Weapon Focus', category: 'Epic', detail: 'Epic attack bonus with a chosen weapon.' },
  { name: 'Epic Weapon Specialization', category: 'Epic', detail: 'Epic damage bonus with a chosen weapon.' },
  { name: 'Expertise', category: 'General', detail: 'Defensive combat mode and prerequisite path feat.' },
  { name: 'Great Cleave', category: 'General', detail: 'Extends Cleave chaining.' },
  { name: 'Great Fortitude', category: 'General', detail: 'Fortitude save feat.' },
  { name: 'Great Strength I', category: 'Epic', detail: 'Epic strength increase.' },
  { name: 'Great Strength II', category: 'Epic', detail: 'Epic strength increase.' },
  { name: 'Great Strength III', category: 'Epic', detail: 'Epic strength increase.' },
  { name: 'Great Strength IV', category: 'Epic', detail: 'Epic strength increase.' },
  { name: 'Greater Spell Focus', category: 'General', detail: 'Improves one spell school difficulty class.' },
  { name: 'Greater Weapon Focus', category: 'Fighter', detail: 'Fighter attack bonus with a chosen weapon.' },
  { name: 'Greater Weapon Specialization', category: 'Fighter', detail: 'Fighter damage bonus with a chosen weapon.' },
  { name: 'Improved Critical', category: 'General', detail: 'Improves threat range with a chosen weapon.' },
  { name: 'Improved Knockdown', category: 'General', detail: 'Stronger knockdown control option.' },
  { name: 'Improved Power Attack', category: 'General', detail: 'Higher damage tradeoff mode.' },
  { name: 'Improved Two-Weapon Fighting', category: 'General', detail: 'Additional off-hand attack.' },
  { name: 'Iron Will', category: 'General', detail: 'Will save feat.' },
  { name: 'Lightning Reflexes', category: 'General', detail: 'Reflex save feat.' },
  { name: 'Mobility', category: 'General', detail: 'Prerequisite for Spring Attack.' },
  { name: 'Overwhelming Critical', category: 'Epic', detail: 'Epic critical damage route feat.' },
  { name: 'Power Attack', category: 'General', detail: 'Damage tradeoff mode and martial prerequisite.' },
  { name: 'Skill Focus', category: 'General', detail: 'Improves one selected skill.' },
  { name: 'Spell Focus', category: 'General', detail: 'Improves one spell school difficulty class.' },
  { name: 'Spring Attack', category: 'General', detail: 'Prerequisite for Weapon Master.' },
  { name: 'Toughness', category: 'General', detail: 'Hit point feat.' },
  { name: 'Two-Weapon Fighting', category: 'General', detail: 'Dual-wielding route feat.' },
  { name: 'Weapon Finesse', category: 'General', detail: 'Dexterity attack route for light weapons.' },
  { name: 'Weapon Focus', category: 'General', detail: 'Attack bonus with a chosen weapon.' },
  { name: 'Weapon Specialization', category: 'Fighter', detail: 'Fighter damage bonus with a chosen weapon.' },
  { name: 'Weapon of Choice', category: 'Class Choice', detail: 'Weapon Master chosen weapon record.' },
  { name: 'Whirlwind Attack', category: 'General', detail: 'Key Weapon Master prerequisite.' }
];

const spellSchools = ['All', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation', 'Invocation', 'Epic'] as const;
const spellTraditions = ['All', 'Arcane', 'Divine', 'Warlock', 'Epic'] as const;

const nwnSpellOptions: Array<{ name: string; tradition: (typeof spellTraditions)[number]; school: (typeof spellSchools)[number]; level: string; detail: string }> = [
  { name: 'Mage Armor', tradition: 'Arcane', school: 'Conjuration', level: '1', detail: 'Armor bonus staple for early arcane defense.' },
  { name: 'Magic Missile', tradition: 'Arcane', school: 'Evocation', level: '1', detail: 'Reliable force damage.' },
  { name: 'Shield', tradition: 'Arcane', school: 'Abjuration', level: '1', detail: 'Defensive arcane buff.' },
  { name: 'Identify', tradition: 'Arcane', school: 'Divination', level: '1', detail: 'Item identification support.' },
  { name: 'Ghostly Visage', tradition: 'Arcane', school: 'Illusion', level: '2', detail: 'Damage reduction and concealment utility.' },
  { name: 'Melf Acid Arrow', tradition: 'Arcane', school: 'Conjuration', level: '2', detail: 'Damage over time acid spell.' },
  { name: 'Cat Grace', tradition: 'Arcane', school: 'Transmutation', level: '2', detail: 'Dexterity buff.' },
  { name: 'Fireball', tradition: 'Arcane', school: 'Evocation', level: '3', detail: 'Area fire damage.' },
  { name: 'Haste', tradition: 'Arcane', school: 'Transmutation', level: '3', detail: 'Major speed and action economy buff.' },
  { name: 'Displacement', tradition: 'Arcane', school: 'Illusion', level: '3', detail: 'Concealment defense.' },
  { name: 'Stoneskin', tradition: 'Arcane', school: 'Abjuration', level: '4', detail: 'Damage reduction buff.' },
  { name: 'Isaac Lesser Missile Storm', tradition: 'Arcane', school: 'Evocation', level: '4', detail: 'Single-target missile burst.' },
  { name: 'Cloudkill', tradition: 'Arcane', school: 'Conjuration', level: '5', detail: 'Area poison cloud.' },
  { name: 'Greater Spell Breach', tradition: 'Arcane', school: 'Abjuration', level: '6', detail: 'Removes enemy magical protections.' },
  { name: 'Delayed Blast Fireball', tradition: 'Arcane', school: 'Evocation', level: '7', detail: 'High-level area fire damage.' },
  { name: 'Horrid Wilting', tradition: 'Arcane', school: 'Necromancy', level: '8', detail: 'Large area negative energy damage.' },
  { name: 'Mordenkainen Disjunction', tradition: 'Arcane', school: 'Abjuration', level: '9', detail: 'High-end breach and dispel option.' },
  { name: 'Heal', tradition: 'Divine', school: 'Conjuration', level: '6', detail: 'Major restoration spell.' },
  { name: 'Bless', tradition: 'Divine', school: 'Enchantment', level: '1', detail: 'Party attack and save support.' },
  { name: 'Divine Favor', tradition: 'Divine', school: 'Evocation', level: '1', detail: 'Personal combat buff.' },
  { name: 'Aid', tradition: 'Divine', school: 'Enchantment', level: '2', detail: 'Temporary hit points and morale support.' },
  { name: 'Bull Strength', tradition: 'Divine', school: 'Transmutation', level: '2', detail: 'Strength buff.' },
  { name: 'Prayer', tradition: 'Divine', school: 'Enchantment', level: '3', detail: 'Party buff and enemy debuff.' },
  { name: 'Death Ward', tradition: 'Divine', school: 'Necromancy', level: '4', detail: 'Protection from death effects.' },
  { name: 'Divine Power', tradition: 'Divine', school: 'Evocation', level: '4', detail: 'Cleric combat transformation buff.' },
  { name: 'True Seeing', tradition: 'Divine', school: 'Divination', level: '5', detail: 'Counters concealment and illusions.' },
  { name: 'Greater Sanctuary', tradition: 'Divine', school: 'Abjuration', level: '7', detail: 'Powerful defensive sanctuary.' },
  { name: 'Aura of Vitality', tradition: 'Divine', school: 'Transmutation', level: '7', detail: 'Party ability buff.' },
  { name: 'Dark One Own Luck', tradition: 'Warlock', school: 'Invocation', level: 'Least', detail: 'Warlock save support invocation.' },
  { name: 'Flee the Scene', tradition: 'Warlock', school: 'Invocation', level: 'Lesser', detail: 'Teleportation-style mobility invocation.' },
  { name: 'Chilling Tentacles', tradition: 'Warlock', school: 'Invocation', level: 'Greater', detail: 'Control and damage invocation.' },
  { name: 'Dark Foresight', tradition: 'Warlock', school: 'Invocation', level: 'Dark', detail: 'High-end defensive invocation.' },
  { name: 'Epic Mage Armor', tradition: 'Epic', school: 'Epic', level: 'Epic', detail: 'Epic defensive spell.' },
  { name: 'Epic Warding', tradition: 'Epic', school: 'Epic', level: 'Epic', detail: 'Epic damage absorption spell.' },
  { name: 'Hellball', tradition: 'Epic', school: 'Epic', level: 'Epic', detail: 'Epic mixed elemental blast.' },
  { name: 'Mummy Dust', tradition: 'Epic', school: 'Epic', level: 'Epic', detail: 'Epic summon spell.' }
];

const defaultAbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10
};

const defaultCharacterForm: CharacterInput = {
  name: '',
  rulesetId: '',
  serverProfileId: null,
  campaignProfileId: null,
  buildId: null,
  raceName: '',
  subraceName: '',
  classSummary: '',
  alignment: '',
  deity: '',
  background: '',
  currentLevel: 1,
  plannedFinalLevel: 40,
  status: 'planned',
  abilityScores: defaultAbilityScores,
  notes: ''
};

const defaultBuildForm: BuildInput = {
  name: '',
  rulesetId: '',
  serverProfileId: null,
  intendedRole: '',
  intendedGame: '',
  raceName: '',
  classSummary: '',
  levelCap: 40,
  status: 'draft',
  tags: [],
  notes: ''
};

const defaultContentForm: ContentEntryInput = {
  name: '',
  type: 'feat',
  rulesetId: '',
  sourceId: null,
  description: '',
  mechanics: '',
  prerequisites: '',
  tags: [],
  visibility: 'private',
  exportAllowed: false,
  notes: ''
};

const defaultServerForm: ServerProfileInput = {
  name: '',
  rulesetId: '',
  serverType: 'persistent_world',
  website: '',
  wiki: '',
  discord: '',
  levelCap: 40,
  notes: ''
};

const defaultResourceForm: ResourceLinkInput = {
  serverProfileId: null,
  title: '',
  url: '',
  category: 'Personal Notes',
  summary: '',
  tags: [],
  relatedEntity: '',
  lastCheckedAt: '',
  notes: ''
};

const emptyLevelForm: BuildLevelInput = {
  buildId: '',
  levelNumber: 1,
  className: '',
  hitPointsGained: null,
  baseAttackBonus: null,
  fortitudeSave: null,
  reflexSave: null,
  willSave: null,
  skillPointsAvailable: null,
  skillAllocation: '',
  abilityIncrease: '',
  spellSelections: '',
  equipmentRecommendation: '',
  classFeatureNotes: '',
  notes: '',
  validationWarnings: [],
  featSelections: []
};

function cloneCharacterForm(rulesetId = ''): CharacterInput {
  return {
    ...defaultCharacterForm,
    rulesetId,
    abilityScores: { ...defaultAbilityScores }
  };
}

function cloneBuildForm(rulesetId = ''): BuildInput {
  return { ...defaultBuildForm, rulesetId, tags: [] };
}

function cloneContentForm(rulesetId = '', sourceId: string | null = null): ContentEntryInput {
  return { ...defaultContentForm, rulesetId, sourceId, tags: [] };
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

function maybeNull(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value : null;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(
    new Date(value)
  );
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function App(): ReactElement {
  const [data, setData] = useState<AppData | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: 'idle',
    message: 'Update service is waiting to start.',
    updatedAt: new Date().toISOString()
  });
  const [wikiSummary, setWikiSummary] = useState<WikiLibrarySummary | null>(null);
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiSearchResults, setWikiSearchResults] = useState<WikiSearchResult[]>([]);
  const [selectedWikiPage, setSelectedWikiPage] = useState<WikiPageDetail | null>(null);
  const [wikiBusy, setWikiBusy] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const [compendiumDrawerOpen, setCompendiumDrawerOpen] = useState(false);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [characterForm, setCharacterForm] = useState<CharacterInput>(cloneCharacterForm());
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [buildForm, setBuildForm] = useState<BuildInput>(cloneBuildForm());
  const [buildTagsText, setBuildTagsText] = useState('');
  const [selectedLevelNumber, setSelectedLevelNumber] = useState(1);
  const [levelForm, setLevelForm] = useState<BuildLevelInput>(emptyLevelForm);
  const [newFeat, setNewFeat] = useState<FeatSelectionInput>({ featName: '', source: 'selected', notes: '' });
  const [contentForm, setContentForm] = useState<ContentEntryInput>(cloneContentForm());
  const [contentTagsText, setContentTagsText] = useState('');
  const [serverForm, setServerForm] = useState<ServerProfileInput>(defaultServerForm);
  const [resourceForm, setResourceForm] = useState<ResourceLinkInput>(defaultResourceForm);
  const [resourceTagsText, setResourceTagsText] = useState('');
  const [exportBuildId, setExportBuildId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [calcScores, setCalcScores] = useState(defaultAbilityScores);
  const [spellLevel, setSpellLevel] = useState(3);
  const [proficiencyBonus, setProficiencyBonus] = useState(3);

  const defaultRulesetId = useMemo(() => {
    if (!data?.rulesets.length) return '';
    return data.rulesets.find((ruleset) => ruleset.key === 'nwn-ee-vanilla')?.id ?? data.rulesets[0].id;
  }, [data]);

  const manualSourceId = useMemo(() => {
    return data?.sources.find((source) => source.name === 'Manual Entry')?.id ?? data?.sources[0]?.id ?? null;
  }, [data]);

  const selectedBuild = useMemo(() => {
    return data?.builds.find((build) => build.id === selectedBuildId) ?? null;
  }, [data, selectedBuildId]);

  const selectedLevel = useMemo(() => {
    return data?.buildLevels.find((level) => level.buildId === selectedBuildId && level.levelNumber === selectedLevelNumber);
  }, [data, selectedBuildId, selectedLevelNumber]);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!data || needle.length < 2) return [];
    const rows = [
      ...data.characters.map((item) => ({
        type: 'Character',
        title: item.name,
        detail: `${item.raceName || 'No race'} - ${item.classSummary || 'No class split'}`
      })),
      ...data.builds.map((item) => ({
        type: 'Build Plan',
        title: item.name,
        detail: `${item.intendedRole || 'No role'} - ${item.classSummary || 'No class split'}`
      })),
      ...data.contentEntries.map((item) => ({
        type: formatLabel(item.type),
        title: item.name,
        detail: item.mechanics || item.description || item.prerequisites
      })),
      ...data.resourceLinks.map((item) => ({
        type: item.category || 'Resource',
        title: item.title,
        detail: item.summary || item.url
      }))
    ];

    return rows
      .filter((row) => `${row.type} ${row.title} ${row.detail}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [data, query]);

  async function refresh(): Promise<void> {
    const nextData = await scribeApi.getAppData();
    setData(nextData);
    if (!selectedBuildId && nextData.builds[0]) {
      setSelectedBuildId(nextData.builds[0].id);
      setExportBuildId(nextData.builds[0].id);
    }
  }

  async function runAction(action: () => Promise<void>, successMessage: string): Promise<void> {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
      setNotice(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function refreshWikiSummary(): Promise<void> {
    const summary = await scribeApi.getNwnWikiSummary();
    setWikiSummary(summary);
  }

  async function searchNwnWiki(nextQuery = wikiSearchQuery): Promise<void> {
    const trimmedQuery = nextQuery.trim();
    setWikiSearchQuery(nextQuery);
    setWikiError('');
    setSelectedWikiPage(null);

    if (trimmedQuery.length < 2) {
      setWikiSearchResults([]);
      return;
    }

    setWikiBusy(true);
    try {
      const results = await scribeApi.searchNwnWiki(trimmedQuery, 15);
      setWikiSearchResults(results);
    } catch (err) {
      setWikiError(err instanceof Error ? err.message : String(err));
    } finally {
      setWikiBusy(false);
    }
  }

  async function openWikiPage(pageId: number): Promise<void> {
    setWikiBusy(true);
    setWikiError('');
    try {
      const page = await scribeApi.getNwnWikiPage(pageId);
      setSelectedWikiPage(page);
      if (!page) {
        setWikiError('NWNWiki article not found.');
      }
    } catch (err) {
      setWikiError(err instanceof Error ? err.message : String(err));
    } finally {
      setWikiBusy(false);
    }
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    void refreshWikiSummary().catch((err) => setWikiError(err instanceof Error ? err.message : String(err)));

    const splashTimer = window.setTimeout(() => setShowSplash(false), 5000);
    const removeUpdaterListener = scribeApi.onUpdateStatus((status) => setUpdateStatus(status));
    void scribeApi.getUpdateStatus().then(setUpdateStatus).catch(() => undefined);

    return () => {
      window.clearTimeout(splashTimer);
      removeUpdaterListener();
    };
  }, []);

  useEffect(() => {
    if (activeView !== 'wiki') {
      return undefined;
    }

    const searchTimer = window.setTimeout(() => {
      void searchNwnWiki(wikiSearchQuery);
    }, 250);

    return () => window.clearTimeout(searchTimer);
  }, [activeView, wikiSearchQuery]);

  useEffect(() => {
    if (!defaultRulesetId) return;
    setCharacterForm((form) => (form.rulesetId ? form : cloneCharacterForm(defaultRulesetId)));
    setBuildForm((form) => (form.rulesetId ? form : cloneBuildForm(defaultRulesetId)));
    setContentForm((form) => (form.rulesetId ? form : cloneContentForm(defaultRulesetId, manualSourceId)));
    setServerForm((form) => (form.rulesetId ? form : { ...defaultServerForm, rulesetId: defaultRulesetId }));
  }, [defaultRulesetId, manualSourceId]);

  useEffect(() => {
    if (!selectedBuild) {
      setLevelForm(emptyLevelForm);
      return;
    }

    const featSelections =
      selectedLevel && data
        ? data.featSelections
            .filter((feat) => feat.buildLevelId === selectedLevel.id)
            .map((feat) => ({ id: feat.id, featName: feat.featName, source: feat.source, notes: feat.notes }))
        : [];

    setLevelForm({
      buildId: selectedBuild.id,
      levelNumber: selectedLevelNumber,
      className: selectedLevel?.className ?? '',
      hitPointsGained: selectedLevel?.hitPointsGained ?? null,
      baseAttackBonus: selectedLevel?.baseAttackBonus ?? null,
      fortitudeSave: selectedLevel?.fortitudeSave ?? null,
      reflexSave: selectedLevel?.reflexSave ?? null,
      willSave: selectedLevel?.willSave ?? null,
      skillPointsAvailable: selectedLevel?.skillPointsAvailable ?? null,
      skillAllocation: selectedLevel?.skillAllocation ?? '',
      abilityIncrease: selectedLevel?.abilityIncrease ?? '',
      spellSelections: selectedLevel?.spellSelections ?? '',
      equipmentRecommendation: selectedLevel?.equipmentRecommendation ?? '',
      classFeatureNotes: selectedLevel?.classFeatureNotes ?? '',
      notes: selectedLevel?.notes ?? '',
      validationWarnings: selectedLevel?.validationWarnings ?? [],
      featSelections
    });
  }, [data, selectedBuild, selectedLevel, selectedLevelNumber]);

  if (!data) {
    return (
      <main className="loading-screen">
        <Database size={30} />
        <span>Opening SCRIBE workspace...</span>
      </main>
    );
  }

  const rulesetName = (id: string): string => data.rulesets.find((ruleset) => ruleset.id === id)?.name ?? 'Unknown ruleset';
  const sourceName = (id: string | null): string => data.sources.find((source) => source.id === id)?.name ?? 'No source';

  function resetCharacterForm(): void {
    setSelectedCharacterId(null);
    setCharacterForm(cloneCharacterForm(defaultRulesetId));
  }

  function editCharacter(character: Character): void {
    setSelectedCharacterId(character.id);
    setCharacterForm({
      name: character.name,
      rulesetId: character.rulesetId,
      serverProfileId: character.serverProfileId,
      campaignProfileId: character.campaignProfileId,
      buildId: character.buildId,
      raceName: character.raceName,
      subraceName: character.subraceName,
      classSummary: character.classSummary,
      alignment: character.alignment,
      deity: character.deity,
      background: character.background,
      currentLevel: character.currentLevel,
      plannedFinalLevel: character.plannedFinalLevel,
      status: character.status,
      abilityScores: { ...character.abilityScores },
      notes: character.notes
    });
  }

  function resetBuildForm(): void {
    setSelectedBuildId(null);
    setBuildForm(cloneBuildForm(defaultRulesetId));
    setBuildTagsText('');
  }

  function editBuild(build: Build): void {
    setSelectedBuildId(build.id);
    setBuildForm({
      name: build.name,
      rulesetId: build.rulesetId,
      serverProfileId: build.serverProfileId,
      intendedRole: build.intendedRole,
      intendedGame: build.intendedGame,
      raceName: build.raceName,
      classSummary: build.classSummary,
      levelCap: build.levelCap,
      status: build.status,
      tags: build.tags,
      notes: build.notes
    });
    setBuildTagsText(tagsToText(build.tags));
  }

  async function previewMarkdown(buildId = exportBuildId): Promise<void> {
    if (!buildId) return;
    const nextMarkdown = await scribeApi.buildMarkdown(buildId);
    setMarkdown(nextMarkdown);
  }

  const buildLevelCount = (buildId: string): number => data.buildLevels.filter((level) => level.buildId === buildId).length;
  const warningCount = data.buildLevels.reduce((total, level) => total + level.validationWarnings.length, 0);
  const incompleteLevelCount = data.builds.reduce((total, build) => total + Math.max(build.levelCap - buildLevelCount(build.id), 0), 0);
  const activeNavItem = navItems.find((item) => item.id === activeView);
  const activeNavGroup = navGroups.find((group) => group.items.some((item) => item.id === activeView));

  return (
    <div className="app-shell">
      {showSplash && <SplashScreen />}
      <aside className="sidebar">
        <div className="brand">
          <img src={scribeEmblemUrl} alt="" />
          <div>
            <strong>SCRIBE</strong>
            <span>Compendium & Build Forge</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {navGroups.map((group) => (
            <section className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-view={item.id}
                    className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                    onClick={() => setActiveView(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeNavGroup?.label ?? 'Workspace'}</p>
            <h1>{activeNavItem?.label ?? 'SCRIBE'}</h1>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspace records" />
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              type="button"
              onClick={() => setCompendiumDrawerOpen(true)}
              title="Open Compendium drawer"
              aria-label="Open Compendium drawer"
            >
              <BookOpen size={18} />
            </button>
            <button className="icon-button" type="button" onClick={() => void refresh()} title="Refresh workspace" aria-label="Refresh workspace">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && <div className="banner error">{error}</div>}
        {notice && <div className="banner success">{notice}</div>}

        {query.trim().length >= 2 && (
          <section className="search-results" aria-label="Search results">
            {searchResults.length === 0 ? (
              <p>No matches yet.</p>
            ) : (
              searchResults.map((result) => (
                <div className="result-row" key={`${result.type}-${result.title}`}>
                  <span>{result.type}</span>
                  <strong>{result.title}</strong>
                  <p>{result.detail}</p>
                </div>
              ))
            )}
          </section>
        )}

        <section className="content-scroll">
          {activeView === 'dashboard' && (
            <Dashboard
              data={data}
              incompleteLevelCount={incompleteLevelCount}
              warningCount={warningCount}
              setActiveView={setActiveView}
              rulesetName={rulesetName}
            />
          )}

          {activeView === 'characters' && (
            <CharactersView
              data={data}
              characterForm={characterForm}
              setCharacterForm={setCharacterForm}
              selectedCharacterId={selectedCharacterId}
              resetCharacterForm={resetCharacterForm}
              editCharacter={editCharacter}
              rulesetName={rulesetName}
              openCompendium={() => setCompendiumDrawerOpen(true)}
              busy={busy}
              onSubmit={() =>
                runAction(async () => {
                  const payload = {
                    ...characterForm,
                    serverProfileId: maybeNull(characterForm.serverProfileId),
                    campaignProfileId: maybeNull(characterForm.campaignProfileId),
                    buildId: maybeNull(characterForm.buildId)
                  };
                  if (selectedCharacterId) {
                    await scribeApi.updateCharacter(selectedCharacterId, payload);
                  } else {
                    await scribeApi.createCharacter(payload);
                  }
                  resetCharacterForm();
                }, selectedCharacterId ? 'Character updated.' : 'Character created.')
              }
            />
          )}

          {activeView === 'builds' && (
            <BuildsView
              data={data}
              mode="builds"
              selectedBuildId={selectedBuildId}
              setSelectedBuildId={setSelectedBuildId}
              selectedLevelNumber={selectedLevelNumber}
              setSelectedLevelNumber={setSelectedLevelNumber}
              buildForm={buildForm}
              setBuildForm={setBuildForm}
              buildTagsText={buildTagsText}
              setBuildTagsText={setBuildTagsText}
              resetBuildForm={resetBuildForm}
              editBuild={editBuild}
              levelForm={levelForm}
              setLevelForm={setLevelForm}
              newFeat={newFeat}
              setNewFeat={setNewFeat}
              rulesetName={rulesetName}
              openCompendium={() => setCompendiumDrawerOpen(true)}
              busy={busy}
              onDeleteBuild={(build) =>
                runAction(async () => {
                  await scribeApi.deleteBuild(build.id);
                  if (selectedBuildId === build.id) {
                    setSelectedBuildId(null);
                    setExportBuildId(null);
                    resetBuildForm();
                  }
                }, `Deleted ${build.name}.`)
              }
              onBuildSubmit={() =>
                runAction(async () => {
                  const payload = {
                    ...buildForm,
                    serverProfileId: maybeNull(buildForm.serverProfileId),
                    tags: splitTags(buildTagsText)
                  };
                  if (selectedBuildId && data.builds.some((build) => build.id === selectedBuildId)) {
                    await scribeApi.updateBuild(selectedBuildId, payload);
                  } else {
                    const build = await scribeApi.createBuild(payload);
                    setSelectedBuildId(build.id);
                    setExportBuildId(build.id);
                  }
                  resetBuildForm();
                }, selectedBuildId ? 'Build Plan saved.' : 'Build Plan created.')
              }
              onLevelSubmit={() =>
                runAction(async () => {
                  await scribeApi.upsertBuildLevel(levelForm);
                }, `Level ${levelForm.levelNumber} saved.`)
              }
            />
          )}

          {activeView === 'wiki' && (
            <WikiView
              wikiSummary={wikiSummary}
              wikiSearchQuery={wikiSearchQuery}
              setWikiSearchQuery={setWikiSearchQuery}
              wikiSearchResults={wikiSearchResults}
              selectedWikiPage={selectedWikiPage}
              wikiBusy={wikiBusy}
              wikiError={wikiError}
              onWikiSearch={() => void searchNwnWiki()}
              onWikiPageSelect={(pageId) => void openWikiPage(pageId)}
            />
          )}

          {activeView === 'rules' && (
            <div className="stack">
              <ServersView
                data={data}
                serverForm={serverForm}
                setServerForm={setServerForm}
                resourceForm={resourceForm}
                setResourceForm={setResourceForm}
                resourceTagsText={resourceTagsText}
                setResourceTagsText={setResourceTagsText}
                rulesetName={rulesetName}
                busy={busy}
                onServerSubmit={() =>
                  runAction(async () => {
                    await scribeApi.createServerProfile(serverForm);
                    setServerForm({ ...defaultServerForm, rulesetId: defaultRulesetId });
                  }, 'Server profile created.')
                }
                onResourceSubmit={() =>
                  runAction(async () => {
                    await scribeApi.createResourceLink({
                      ...resourceForm,
                      serverProfileId: maybeNull(resourceForm.serverProfileId),
                      tags: splitTags(resourceTagsText)
                    });
                    setResourceForm(defaultResourceForm);
                    setResourceTagsText('');
                  }, 'Resource link stored.')
                }
              />
              <RulesView
                data={data}
                contentForm={contentForm}
                setContentForm={setContentForm}
                contentTagsText={contentTagsText}
                setContentTagsText={setContentTagsText}
                rulesetName={rulesetName}
                sourceName={sourceName}
                busy={busy}
                onSubmit={() =>
                  runAction(async () => {
                    await scribeApi.createContentEntry({
                      ...contentForm,
                      sourceId: maybeNull(contentForm.sourceId),
                      tags: splitTags(contentTagsText)
                    });
                    setContentForm(cloneContentForm(defaultRulesetId, manualSourceId));
                    setContentTagsText('');
                  }, 'Server rule entry added.')
                }
              />
            </div>
          )}

          {activeView === 'servers' && (
            <ServersView
              data={data}
              serverForm={serverForm}
              setServerForm={setServerForm}
              resourceForm={resourceForm}
              setResourceForm={setResourceForm}
              resourceTagsText={resourceTagsText}
              setResourceTagsText={setResourceTagsText}
              rulesetName={rulesetName}
              busy={busy}
              onServerSubmit={() =>
                runAction(async () => {
                  await scribeApi.createServerProfile(serverForm);
                  setServerForm({ ...defaultServerForm, rulesetId: defaultRulesetId });
                }, 'Server profile created.')
              }
              onResourceSubmit={() =>
                runAction(async () => {
                  await scribeApi.createResourceLink({
                    ...resourceForm,
                    serverProfileId: maybeNull(resourceForm.serverProfileId),
                    tags: splitTags(resourceTagsText)
                  });
                  setResourceForm(defaultResourceForm);
                  setResourceTagsText('');
                }, 'Resource link stored.')
              }
            />
          )}

          {activeView === 'equipment' && (
            <PlaceholderView
              icon={Archive}
              title="Manual Equipment Tracker"
              body="The database foundation is ready for equipment records. The next slice should add item CRUD, gear sets, slot-aware assignment, and stat-impact traces."
            />
          )}

          {activeView === 'calculations' && (
            <CalculationsView
              calcScores={calcScores}
              setCalcScores={setCalcScores}
              spellLevel={spellLevel}
              setSpellLevel={setSpellLevel}
              proficiencyBonus={proficiencyBonus}
              setProficiencyBonus={setProficiencyBonus}
            />
          )}

          {activeView === 'export' && (
            <ExportView
              data={data}
              exportBuildId={exportBuildId}
              setExportBuildId={setExportBuildId}
              markdown={markdown}
              busy={busy}
              previewMarkdown={previewMarkdown}
              saveMarkdown={(buildId) =>
                runAction(async () => {
                  const result = await scribeApi.saveBuildMarkdown(buildId);
                  if (result.canceled) {
                    setNotice('Export canceled.');
                    return;
                  }
                  setNotice(`Saved Markdown guide to ${result.filePath}`);
                }, 'Markdown export complete.')
              }
            />
          )}

          {activeView === 'help' && <HelpView setActiveView={setActiveView} />}

          {activeView === 'settings' && (
            <SettingsView
              data={data}
              defaultRulesetId={defaultRulesetId}
              rulesetName={rulesetName}
              updateStatus={updateStatus}
              checkForUpdates={() =>
                runAction(async () => {
                  const status = await scribeApi.checkForUpdates();
                  setUpdateStatus(status);
                }, 'Update check complete.')
              }
              installUpdate={() =>
                runAction(async () => {
                  await scribeApi.installUpdate();
                }, 'Restarting to install update.')
              }
            />
          )}
        </section>
      </main>
      <CompendiumDrawer
        open={compendiumDrawerOpen}
        onClose={() => setCompendiumDrawerOpen(false)}
        wikiSummary={wikiSummary}
        wikiSearchQuery={wikiSearchQuery}
        setWikiSearchQuery={setWikiSearchQuery}
        wikiSearchResults={wikiSearchResults}
        selectedWikiPage={selectedWikiPage}
        wikiBusy={wikiBusy}
        wikiError={wikiError}
        onWikiSearch={() => void searchNwnWiki()}
        onWikiPageSelect={(pageId) => void openWikiPage(pageId)}
        onOpenFullCompendium={() => {
          setActiveView('wiki');
          setCompendiumDrawerOpen(false);
        }}
      />
    </div>
  );
}

function SplashScreen(): ReactElement {
  return (
    <div className="splash-screen" aria-label="SCRIBE loading">
      <div className="splash-glow" />
      <img className="splash-logo" src={scribeLogoUrl} alt="SCRIBE" />
      <div className="splash-line" />
    </div>
  );
}

function Dashboard({
  data,
  incompleteLevelCount,
  warningCount,
  setActiveView,
  rulesetName
}: {
  data: AppData;
  incompleteLevelCount: number;
  warningCount: number;
  setActiveView: (view: View) => void;
  rulesetName: (id: string) => string;
}): ReactElement {
  return (
    <div className="stack">
      <div className="metric-grid">
        <Metric label="Characters" value={data.characters.length} />
        <Metric label="Build Plans" value={data.builds.length} />
        <Metric label="Open Levels" value={incompleteLevelCount} />
        <Metric label="Warnings" value={warningCount} tone={warningCount > 0 ? 'warn' : 'ok'} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Quick Create</h2>
            <p>Jump into the core SCRIBE flows for character tracking and reusable guide creation.</p>
          </div>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => setActiveView('characters')}>
            <Plus size={16} />
            Character Record
          </button>
          <button type="button" onClick={() => setActiveView('builds')}>
            <Plus size={16} />
            Build Forge
          </button>
          <button type="button" onClick={() => setActiveView('rules')}>
            <FileText size={16} />
            Server Rules
          </button>
          <button type="button" className="ghost" onClick={() => setActiveView('help')}>
            <CircleHelp size={16} />
            Help
          </button>
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Recent Characters</h2>
          </div>
          <div className="list">
            {data.characters.length === 0 ? (
              <EmptyLine text="No characters yet." />
            ) : (
              data.characters.slice(0, 5).map((character) => (
                <div className="list-row" key={character.id}>
                  <strong>{character.name}</strong>
                  <span>
                    Level {character.currentLevel} - {character.status}
                  </span>
                  <p>{character.classSummary || rulesetName(character.rulesetId)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Active Build Plans</h2>
          </div>
          <div className="list">
            {data.builds.length === 0 ? (
              <EmptyLine text="No build plans yet." />
            ) : (
              data.builds.slice(0, 5).map((build) => (
                <div className="list-row" key={build.id}>
                  <strong>{build.name}</strong>
                  <span>
                    {build.status} - Level {build.levelCap}
                  </span>
                  <p>{build.classSummary || build.intendedRole || rulesetName(build.rulesetId)}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Local Database</h2>
            <p>{data.dbPath}</p>
          </div>
          <Database size={22} />
        </div>
      </section>
    </div>
  );
}

function CharactersView({
  data,
  characterForm,
  setCharacterForm,
  selectedCharacterId,
  resetCharacterForm,
  editCharacter,
  rulesetName,
  openCompendium,
  busy,
  onSubmit
}: {
  data: AppData;
  characterForm: CharacterInput;
  setCharacterForm: (form: CharacterInput | ((form: CharacterInput) => CharacterInput)) => void;
  selectedCharacterId: string | null;
  resetCharacterForm: () => void;
  editCharacter: (character: Character) => void;
  rulesetName: (id: string) => string;
  openCompendium: () => void;
  busy: boolean;
  onSubmit: () => void;
}): ReactElement {
  const selectedCharacter = data.characters.find((character) => character.id === selectedCharacterId) ?? data.characters[0] ?? null;
  const assignedBuild = selectedCharacter ? data.builds.find((build) => build.id === selectedCharacter.buildId) ?? null : null;
  const assignedLevels = assignedBuild ? data.buildLevels.filter((level) => level.buildId === assignedBuild.id) : [];
  const assignedLevelIds = new Set(assignedLevels.map((level) => level.id));
  const assignedFeats = data.featSelections.filter((feat) => assignedLevelIds.has(feat.buildLevelId));
  const dossier = getCharacterDossier(selectedCharacter, assignedBuild, assignedLevels, assignedFeats);

  return (
    <div className="dossier-layout">
      <div className="stack">
        <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{selectedCharacterId ? 'Edit Character Record' : 'Create Character Record'}</h2>
            <p>Track an actual character instance and optionally assign a reusable Build Plan as its guide.</p>
          </div>
          {selectedCharacterId && (
            <button type="button" className="ghost" onClick={resetCharacterForm}>
              <Plus size={16} />
              New
            </button>
          )}
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Name">
            <input value={characterForm.name} onChange={(event) => setCharacterForm((form) => ({ ...form, name: event.target.value }))} required />
          </Field>
          <Field label="Ruleset">
            <select value={characterForm.rulesetId} onChange={(event) => setCharacterForm((form) => ({ ...form, rulesetId: event.target.value }))}>
              {data.rulesets.map((ruleset) => (
                <option key={ruleset.id} value={ruleset.id}>
                  {ruleset.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Server">
            <select
              value={characterForm.serverProfileId ?? ''}
              onChange={(event) => setCharacterForm((form) => ({ ...form, serverProfileId: maybeNull(event.target.value) }))}
            >
              <option value="">None</option>
              {data.serverProfiles.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned Guide">
            <select value={characterForm.buildId ?? ''} onChange={(event) => setCharacterForm((form) => ({ ...form, buildId: maybeNull(event.target.value) }))}>
              <option value="">None</option>
              {data.builds.map((build) => (
                <option key={build.id} value={build.id}>
                  {build.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Race/Species">
            <input value={characterForm.raceName} onChange={(event) => setCharacterForm((form) => ({ ...form, raceName: event.target.value }))} />
          </Field>
          <Field label="Subrace">
            <input value={characterForm.subraceName} onChange={(event) => setCharacterForm((form) => ({ ...form, subraceName: event.target.value }))} />
          </Field>
          <Field label="Class Split" wide>
            <input
              value={characterForm.classSummary}
              onChange={(event) => setCharacterForm((form) => ({ ...form, classSummary: event.target.value }))}
              placeholder="Fighter 12 / Weapon Master 7 / Rogue 1"
            />
          </Field>
          <Field label="Alignment">
            <input value={characterForm.alignment} onChange={(event) => setCharacterForm((form) => ({ ...form, alignment: event.target.value }))} />
          </Field>
          <Field label="Current Level">
            <input
              type="number"
              min={1}
              max={60}
              value={characterForm.currentLevel}
              onChange={(event) => setCharacterForm((form) => ({ ...form, currentLevel: Number(event.target.value) }))}
            />
          </Field>
          <Field label="Final Level">
            <input
              type="number"
              min={1}
              max={60}
              value={characterForm.plannedFinalLevel ?? ''}
              onChange={(event) =>
                setCharacterForm((form) => ({ ...form, plannedFinalLevel: event.target.value ? Number(event.target.value) : null }))
              }
            />
          </Field>
          <Field label="Status">
            <select value={characterForm.status} onChange={(event) => setCharacterForm((form) => ({ ...form, status: event.target.value as CharacterInput['status'] }))}>
              {['planned', 'active', 'paused', 'retired', 'archived'].map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ability Scores" wide>
            <div className="ability-grid">
              {abilityKeys.map((key) => (
                <label key={key}>
                  <span>{key.slice(0, 3).toUpperCase()}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={characterForm.abilityScores[key]}
                    onChange={(event) =>
                      setCharacterForm((form) => ({
                        ...form,
                        abilityScores: { ...form.abilityScores, [key]: Number(event.target.value) }
                      }))
                    }
                  />
                  <small>{calculateAbilityModifier(characterForm.abilityScores[key]) >= 0 ? '+' : ''}{calculateAbilityModifier(characterForm.abilityScores[key])}</small>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Notes" wide>
            <textarea value={characterForm.notes} onChange={(event) => setCharacterForm((form) => ({ ...form, notes: event.target.value }))} />
          </Field>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              <Save size={16} />
              {selectedCharacterId ? 'Save Character' : 'Create Character'}
            </button>
          </div>
        </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Character Records</h2>
          </div>
          <div className="character-card-list">
            {data.characters.length === 0 ? (
              <EmptyLine text="No characters created yet." />
            ) : (
              data.characters.map((character) => {
                const guideName = data.builds.find((build) => build.id === character.buildId)?.name ?? 'Unassigned';
                return (
                  <button
                    key={character.id}
                    type="button"
                    className={character.id === selectedCharacter?.id ? 'character-card active' : 'character-card'}
                    onClick={() => editCharacter(character)}
                  >
                    <span>
                      <strong>{character.name}</strong>
                      <small>{rulesetName(character.rulesetId)}</small>
                    </span>
                    <span>
                      <strong>Level {character.currentLevel}</strong>
                      <small>{guideName}</small>
                    </span>
                    <span className="status-pill">{formatLabel(character.status)}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      <CharacterDossierPanel
        character={selectedCharacter}
        dossier={dossier}
        assignedBuild={assignedBuild}
        assignedLevels={assignedLevels}
        assignedFeats={assignedFeats}
        openCompendium={openCompendium}
      />
    </div>
  );
}

function CharacterDossierPanel({
  character,
  dossier,
  assignedBuild,
  assignedLevels,
  assignedFeats,
  openCompendium
}: {
  character: Character | null;
  dossier: CharacterDossier | null;
  assignedBuild: Build | null;
  assignedLevels: BuildLevel[];
  assignedFeats: FeatSelection[];
  openCompendium: () => void;
}): ReactElement {
  if (!character || !dossier) {
    return (
      <aside className="panel character-dossier">
        <div className="panel-header">
          <h2>Character Dossier</h2>
        </div>
        <EmptyLine text="Create a Character Record to see its dossier." />
      </aside>
    );
  }

  return (
    <aside className="panel character-dossier">
      <div className="record-portrait">
        <img src={scribeEmblemUrl} alt="" />
      </div>
      <div className="record-title">
        <p className="eyebrow">{dossier.status}</p>
        <h2>{dossier.name}</h2>
        <span>{dossier.levelLabel}</span>
      </div>

      <div className="progress-block">
        <div className="progress-track inline">
          <div style={{ width: `${dossier.progressPercent}%` }} />
        </div>
        <span>{dossier.progressPercent}% of planned progression</span>
      </div>

      <div className="record-stat-grid">
        <StatTile label="Assigned Guide" value={dossier.assignedBuildName} />
        <StatTile label="Guide Levels" value={`${dossier.plannedLevelCount}/${assignedBuild?.levelCap ?? character.plannedFinalLevel ?? character.currentLevel}`} />
        <StatTile label="Guide Feats" value={dossier.featCount} />
        <StatTile label="Warnings" value={dossier.warningCount} tone={dossier.warningCount > 0 ? 'warn' : 'ok'} />
      </div>

      <section className="record-section">
        <h3>Next Step</h3>
        <p>{dossier.nextStep}</p>
      </section>

      <section className="record-section">
        <h3>Ability Scores</h3>
        <div className="ability-score-tiles">
          {abilityKeys.map((key) => {
            const modifier = calculateAbilityModifier(character.abilityScores[key]);
            return (
              <span key={key}>
                <strong>{key.slice(0, 3).toUpperCase()}</strong>
                <em>{character.abilityScores[key]}</em>
                <small>{modifier >= 0 ? '+' : ''}{modifier}</small>
              </span>
            );
          })}
        </div>
      </section>

      <section className="record-section">
        <h3>Guide Trace</h3>
        {dossier.deviations.length === 0 ? (
          <p>No recorded deviations from the assigned guide.</p>
        ) : (
          <ul className="validation-list">
            {dossier.deviations.map((deviation) => (
              <li className="validation-item warning" key={deviation}>
                <strong>Check</strong>
                <span>{deviation}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="record-section">
        <h3>Recent Guide Feats</h3>
        {assignedFeats.length === 0 ? (
          <p>No guide feats recorded yet.</p>
        ) : (
          <div className="chip-row">
            {assignedFeats.slice(0, 8).map((feat) => (
              <span className="chip passive source-chip" key={feat.id}>
                <SourceBadge source={feat.source} />
                {feat.featName}
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="button-row">
        <button type="button" className="ghost" onClick={openCompendium}>
          <BookOpen size={16} />
          Compendium
        </button>
        <span className="dossier-footnote">{assignedLevels.length} level entries linked</span>
      </div>
    </aside>
  );
}

function BuildsView({
  data,
  mode,
  selectedBuildId,
  setSelectedBuildId,
  selectedLevelNumber,
  setSelectedLevelNumber,
  buildForm,
  setBuildForm,
  buildTagsText,
  setBuildTagsText,
  resetBuildForm,
  editBuild,
  levelForm,
  setLevelForm,
  newFeat,
  setNewFeat,
  rulesetName,
  openCompendium,
  busy,
  onDeleteBuild,
  onBuildSubmit,
  onLevelSubmit
}: {
  data: AppData;
  mode: 'builds' | 'leveling';
  selectedBuildId: string | null;
  setSelectedBuildId: (id: string | null) => void;
  selectedLevelNumber: number;
  setSelectedLevelNumber: (level: number) => void;
  buildForm: BuildInput;
  setBuildForm: (form: BuildInput | ((form: BuildInput) => BuildInput)) => void;
  buildTagsText: string;
  setBuildTagsText: (value: string) => void;
  resetBuildForm: () => void;
  editBuild: (build: Build) => void;
  levelForm: BuildLevelInput;
  setLevelForm: (form: BuildLevelInput | ((form: BuildLevelInput) => BuildLevelInput)) => void;
  newFeat: FeatSelectionInput;
  setNewFeat: (feat: FeatSelectionInput) => void;
  rulesetName: (id: string) => string;
  openCompendium: () => void;
  busy: boolean;
  onDeleteBuild: (build: Build) => void;
  onBuildSubmit: () => void;
  onLevelSubmit: () => void;
}): ReactElement {
  const selectedBuild = data.builds.find((build) => build.id === selectedBuildId) ?? data.builds[0] ?? null;
  const plannedLevels = selectedBuild
    ? data.buildLevels.filter((level) => level.buildId === selectedBuild.id).sort((left, right) => left.levelNumber - right.levelNumber)
    : [];
  const selectedBuildLevelIds = new Set(plannedLevels.map((level) => level.id));
  const selectedBuildFeats = data.featSelections.filter((feat) => selectedBuildLevelIds.has(feat.buildLevelId));
  const selectedLevelEntity = plannedLevels.find((level) => level.levelNumber === selectedLevelNumber) ?? null;
  const selectedLevelFeats = selectedLevelEntity ? data.featSelections.filter((feat) => feat.buildLevelId === selectedLevelEntity.id) : levelForm.featSelections;
  const forgeSteps = getBuildForgeSteps(selectedBuild ?? buildForm, plannedLevels);
  const buildHealth = getBuildHealth(selectedBuild, plannedLevels, selectedBuildFeats);
  const guideSections = selectedBuild ? getBuildLevelGuideSections(selectedBuild.levelCap, plannedLevels, selectedBuildFeats) : [];
  const skillEstimate = estimateSkillPoints(levelForm, selectedBuild ?? buildForm);
  const [buildPane, setBuildPane] = useState<'library' | 'editor'>('library');
  const [activePicker, setActivePicker] = useState<'feat' | 'skill' | 'spell' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<(typeof spellSchools)[number]>('All');
  const [spellTraditionFilter, setSpellTraditionFilter] = useState<(typeof spellTraditions)[number]>('All');
  const filteredFeatOptions = useMemo(() => {
    const needle = pickerQuery.trim().toLowerCase();
    if (!needle) return nwnFeatOptions;
    return nwnFeatOptions.filter((feat) => `${feat.name} ${feat.category} ${feat.detail}`.toLowerCase().includes(needle));
  }, [pickerQuery]);
  const filteredSkillOptions = useMemo(() => {
    const needle = pickerQuery.trim().toLowerCase();
    if (!needle) return nwnSkillOptions;
    return nwnSkillOptions.filter((skill) => skill.toLowerCase().includes(needle));
  }, [pickerQuery]);
  const filteredSpellOptions = useMemo(() => {
    const needle = pickerQuery.trim().toLowerCase();
    return nwnSpellOptions.filter((spell) => {
      const matchesText = !needle || `${spell.name} ${spell.tradition} ${spell.school} ${spell.level} ${spell.detail}`.toLowerCase().includes(needle);
      const matchesTradition = spellTraditionFilter === 'All' || spell.tradition === spellTraditionFilter;
      const matchesSchool = spellSchoolFilter === 'All' || spell.school === spellSchoolFilter;
      return matchesText && matchesTradition && matchesSchool;
    });
  }, [pickerQuery, spellSchoolFilter, spellTraditionFilter]);
  const autoMetrics = useMemo(
    () => getAutoLevelMetrics(levelForm, selectedBuild ?? buildForm, plannedLevels.filter((level) => level.levelNumber !== levelForm.levelNumber)),
    [buildForm, levelForm, plannedLevels, selectedBuild]
  );

  function addFeat(): void {
    if (!newFeat.featName.trim()) return;
    addFeatByName(newFeat.featName);
  }

  function addFeatByName(featName: string): void {
    if (!featName.trim()) return;
    setLevelForm((form) => ({
      ...form,
      featSelections: [...form.featSelections, { ...newFeat, featName: featName.trim() }]
    }));
    setNewFeat({ featName: '', source: 'selected', notes: '' });
  }

  function openPicker(picker: 'feat' | 'skill' | 'spell'): void {
    setPickerQuery('');
    setActivePicker(picker);
  }

  function updateSkill(skillName: string, delta: number): void {
    setLevelForm((form) => ({
      ...form,
      skillAllocation: adjustSkillAllocation(form.skillAllocation, skillName, delta)
    }));
  }

  function clearSkill(skillName: string): void {
    const currentPoints = getSkillAllocationPoints(levelForm.skillAllocation, skillName);
    if (currentPoints <= 0) return;
    updateSkill(skillName, -currentPoints);
  }

  function applyAutoMetrics(className = levelForm.className): void {
    const nextLevel = { ...levelForm, className };
    const metrics = getAutoLevelMetrics(nextLevel, selectedBuild ?? buildForm, plannedLevels.filter((level) => level.levelNumber !== nextLevel.levelNumber));
    setLevelForm((form) => ({
      ...form,
      className,
      hitPointsGained: metrics.hitPointsGained,
      baseAttackBonus: metrics.baseAttackBonus,
      fortitudeSave: metrics.fortitudeSave,
      reflexSave: metrics.reflexSave,
      willSave: metrics.willSave,
      skillPointsAvailable: metrics.skillPointsAvailable
    }));
  }

  function addSpellSelection(spellName: string): void {
    setLevelForm((form) => {
      const existingSpells = form.spellSelections
        .split(/[,;]/)
        .map((spell) => spell.trim())
        .filter(Boolean);
      if (existingSpells.some((spell) => spell.toLowerCase() === spellName.toLowerCase())) {
        return form;
      }
      return {
        ...form,
        spellSelections: [...existingSpells, spellName].join(', ')
      };
    });
  }

  return (
    <>
    <div className="forge-shell build-forge-revamp">
      <BuildForgeRail steps={forgeSteps} />
      <div className="stack forge-main">
      {mode === 'builds' && (
        <section className="panel build-manager-panel">
          <div className="panel-header">
            <div>
              <h2>Build Plans</h2>
              <p>Keep the library separate from the active build editor.</p>
            </div>
            <div className="segmented-control" aria-label="Build plan mode">
              <button type="button" className={buildPane === 'library' ? 'active' : ''} onClick={() => setBuildPane('library')}>
                Library
              </button>
              <button type="button" className={buildPane === 'editor' ? 'active' : ''} onClick={() => setBuildPane('editor')}>
                Editor
              </button>
            </div>
          </div>

          {buildPane === 'library' ? (
            <>
              <div className="button-row">
                <button
                  type="button"
                  onClick={() => {
                    resetBuildForm();
                    setBuildPane('editor');
                  }}
                >
                  <Plus size={16} />
                  New Build Plan
                </button>
              </div>
              <DataTable
                headers={['Name', 'Ruleset', 'Role', 'Class Split', 'Level Path', 'Status', '']}
                empty="No build plans created yet."
                rows={data.builds.map((build) => [
                  build.name,
                  rulesetName(build.rulesetId),
                  build.intendedRole || 'Unspecified',
                  build.classSummary || 'Unplanned',
                  `${data.buildLevels.filter((level) => level.buildId === build.id).length}/${build.levelCap}`,
                  formatLabel(build.status),
                  <span className="table-actions" key={build.id}>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        editBuild(build);
                        setBuildPane('editor');
                      }}
                      title="Edit build"
                      aria-label={`Edit ${build.name}`}
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => {
                        if (window.confirm(`Delete "${build.name}" and its saved level path?`)) {
                          onDeleteBuild(build);
                        }
                      }}
                      title="Delete build"
                      aria-label={`Delete ${build.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                ])}
              />
            </>
          ) : (
            <>
            <div className="panel-header">
              <div>
                <h2>{selectedBuildId && data.builds.some((build) => build.id === selectedBuildId) ? 'Edit Build Plan' : 'Create Build Plan'}</h2>
                <p>A Build Plan is a reusable Leveling Guide that can be assigned to one or more Character Records.</p>
              </div>
              <button type="button" className="ghost" onClick={resetBuildForm}>
                <Plus size={16} />
                New
              </button>
            </div>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                onBuildSubmit();
              }}
            >
              <Field label="Plan Name">
                <input value={buildForm.name} onChange={(event) => setBuildForm((form) => ({ ...form, name: event.target.value }))} required />
              </Field>
              <Field label="Ruleset">
                <select value={buildForm.rulesetId} onChange={(event) => setBuildForm((form) => ({ ...form, rulesetId: event.target.value }))}>
                  {data.rulesets.map((ruleset) => (
                    <option key={ruleset.id} value={ruleset.id}>
                      {ruleset.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Server">
                <select value={buildForm.serverProfileId ?? ''} onChange={(event) => setBuildForm((form) => ({ ...form, serverProfileId: maybeNull(event.target.value) }))}>
                  <option value="">None</option>
                  {data.serverProfiles.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={buildForm.status} onChange={(event) => setBuildForm((form) => ({ ...form, status: event.target.value as BuildInput['status'] }))}>
                  {['draft', 'locked', 'archived'].map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Role">
                <input value={buildForm.intendedRole} onChange={(event) => setBuildForm((form) => ({ ...form, intendedRole: event.target.value }))} placeholder="Tank, DC Caster, PvE" />
              </Field>
              <Field label="Game/Server">
                <input value={buildForm.intendedGame} onChange={(event) => setBuildForm((form) => ({ ...form, intendedGame: event.target.value }))} />
              </Field>
              <Field label="Race/Species">
                <input value={buildForm.raceName} onChange={(event) => setBuildForm((form) => ({ ...form, raceName: event.target.value }))} />
              </Field>
              <Field label="Level Cap">
                <input type="number" min={1} max={60} value={buildForm.levelCap} onChange={(event) => setBuildForm((form) => ({ ...form, levelCap: Number(event.target.value) }))} />
              </Field>
              <Field label="Class Split" wide>
                <input value={buildForm.classSummary} onChange={(event) => setBuildForm((form) => ({ ...form, classSummary: event.target.value }))} />
              </Field>
              <Field label="Tags" wide>
                <input value={buildTagsText} onChange={(event) => setBuildTagsText(event.target.value)} placeholder="PvE, Solo, Weapon Master" />
              </Field>
              <Field label="Notes" wide>
                <textarea value={buildForm.notes} onChange={(event) => setBuildForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
              <div className="form-actions">
                <button type="submit" disabled={busy}>
                  <Save size={16} />
                  Save Build Plan
                </button>
              </div>
            </form>
            </>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Level Path</h2>
            <p>Plan each level inside the Build Plan and preserve feat/feature source labels.</p>
          </div>
          <div className="panel-actions">
            <button type="button" className="ghost" onClick={openCompendium}>
              <BookOpen size={16} />
              Reference
            </button>
            <select value={selectedBuild?.id ?? ''} onChange={(event) => setSelectedBuildId(event.target.value || null)} className="compact-select">
              <option value="">Select Build Plan</option>
              {data.builds.map((build) => (
                <option key={build.id} value={build.id}>
                  {build.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedBuild ? (
          <EmptyLine text="Create a Build Plan before adding level entries." />
        ) : (
          <div className="level-planner">
            <BuildLevelGuide sections={guideSections} selectedLevelNumber={selectedLevelNumber} onLevelSelect={setSelectedLevelNumber} />

            <form
              className="form-grid level-form level-up-console"
              onSubmit={(event) => {
                event.preventDefault();
                onLevelSubmit();
              }}
            >
              <div className="level-up-banner">
                <div>
                  <p className="eyebrow">NWN:EE Level-Up Flow</p>
                  <h3>Level {selectedLevelNumber}</h3>
                </div>
                <span>{selectedLevelEntity?.className ? `${selectedLevelEntity.className} recorded` : 'Awaiting class choice'}</span>
              </div>
              <Field label="Level">
                <input type="number" value={levelForm.levelNumber} min={1} max={selectedBuild.levelCap} readOnly />
              </Field>
              <Field label="Class Taken">
                <select value={levelForm.className} onChange={(event) => applyAutoMetrics(event.target.value)}>
                  <option value="">Choose class</option>
                  {levelForm.className && !nwnClassOptions.includes(levelForm.className) && <option value={levelForm.className}>{levelForm.className}</option>}
                  {nwnClassOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="HP Gained">
                <input
                  type="number"
                  min={0}
                  value={levelForm.hitPointsGained ?? ''}
                  readOnly
                />
              </Field>
              <Field label="BAB">
                <input
                  type="number"
                  min={0}
                  value={levelForm.baseAttackBonus ?? ''}
                  readOnly
                />
              </Field>
              <Field label="Fort">
                <input
                  type="number"
                  min={0}
                  value={levelForm.fortitudeSave ?? ''}
                  readOnly
                />
              </Field>
              <Field label="Ref">
                <input
                  type="number"
                  min={0}
                  value={levelForm.reflexSave ?? ''}
                  readOnly
                />
              </Field>
              <Field label="Will">
                <input
                  type="number"
                  min={0}
                  value={levelForm.willSave ?? ''}
                  readOnly
                />
              </Field>
              <Field label="Skill Points">
                <input
                  type="number"
                  min={0}
                  value={levelForm.skillPointsAvailable ?? ''}
                  readOnly
                />
              </Field>
              <div className="auto-metric-note">
                <span>{autoMetrics.note}</span>
                <button type="button" className="ghost" onClick={() => applyAutoMetrics()} disabled={!levelForm.className.trim()}>
                  <RefreshCw size={16} />
                  Recalculate
                </button>
              </div>
              <Field label="Ability Increase">
                <div className="ability-choice-row" role="group" aria-label="Ability increase">
                  {abilityIncreaseOptions.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={levelForm.abilityIncrease === option.value ? 'choice-pill selected' : 'choice-pill'}
                      onClick={() => setLevelForm((form) => ({ ...form, abilityIncrease: option.value }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Skill Allocation" wide>
                <div className="choice-action-row">
                  <input
                    value={levelForm.skillAllocation}
                    onChange={(event) => setLevelForm((form) => ({ ...form, skillAllocation: event.target.value }))}
                    placeholder="Discipline +4, Tumble +2"
                  />
                  <button type="button" className="ghost" onClick={() => openPicker('skill')}>
                    <Plus size={16} />
                    Skills
                  </button>
                </div>
              </Field>
              <div className="planner-status-grid">
                <StatTile label="Estimated Skill Points" value={skillEstimate.estimatedAvailable} />
                <StatTile label="Entered Skill Points" value={skillEstimate.enteredAvailable ?? 'Auto'} />
                <StatTile label="Spent" value={skillEstimate.spent} />
                <StatTile label="Remaining" value={skillEstimate.remaining ?? 'Auto'} tone={skillEstimate.remaining !== null && skillEstimate.remaining < 0 ? 'warn' : 'ok'} />
              </div>
              <Field label="Feat / Feature Source" wide>
                <div className="feat-editor choice-action-row">
                  <input value={newFeat.featName} onChange={(event) => setNewFeat({ ...newFeat, featName: event.target.value })} placeholder="Power Attack" />
                  <select value={newFeat.source} onChange={(event) => setNewFeat({ ...newFeat, source: event.target.value as FeatSource })}>
                    {featSources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                  <input value={newFeat.notes} onChange={(event) => setNewFeat({ ...newFeat, notes: event.target.value })} placeholder="Notes" />
                  <button type="button" className="icon-button" onClick={addFeat} title="Add feat source" aria-label="Add feat source">
                    <Plus size={16} />
                  </button>
                  <button type="button" className="ghost" onClick={() => openPicker('feat')}>
                    <Search size={16} />
                    Browse
                  </button>
                </div>
                {levelForm.featSelections.length > 0 && (
                  <div className="chip-row">
                    {levelForm.featSelections.map((feat, index) => (
                      <button
                        key={`${feat.featName}-${index}`}
                        type="button"
                        className="chip removable"
                        onClick={() =>
                          setLevelForm((form) => ({
                            ...form,
                            featSelections: form.featSelections.filter((_, featIndex) => featIndex !== index)
                          }))
                        }
                        title="Remove"
                      >
                        <SourceBadge source={feat.source} />
                        {feat.featName}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Spells" wide>
                <div className="choice-action-row">
                  <input value={levelForm.spellSelections} onChange={(event) => setLevelForm((form) => ({ ...form, spellSelections: event.target.value }))} />
                  <button type="button" className="ghost" onClick={() => openPicker('spell')}>
                    <Search size={16} />
                    Browse
                  </button>
                </div>
              </Field>
              <Field label="Notes" wide>
                <textarea value={levelForm.notes} onChange={(event) => setLevelForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
              <div className="form-actions">
                <button type="submit" disabled={busy}>
                  <Check size={16} />
                  Save Level
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
      </div>

      <div className="forge-record-stack">
        <BuildRecordPanel build={selectedBuild} plannedLevels={plannedLevels} selectedLevelNumber={selectedLevelNumber} rulesetName={rulesetName} />
        <BuildHealthPanel health={buildHealth} />
        <BuildReferencePanel
          selectedLevelNumber={selectedLevelNumber}
          selectedFeats={selectedLevelFeats}
          skillEstimate={skillEstimate}
          openCompendium={openCompendium}
        />
      </div>
    </div>
    {activePicker === 'feat' && (
      <BuildChoicePicker
        title="Feat / Feature Picker"
        query={pickerQuery}
        setQuery={setPickerQuery}
        onClose={() => setActivePicker(null)}
      >
        <div className="picker-controls">
          <Field label="Source">
            <select value={newFeat.source} onChange={(event) => setNewFeat({ ...newFeat, source: event.target.value as FeatSource })}>
              {featSources.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="picker-option-list">
          {filteredFeatOptions.map((feat) => (
            <button key={feat.name} type="button" className="picker-option" onClick={() => addFeatByName(feat.name)}>
              <span>
                <strong>{feat.name}</strong>
                <small>{feat.category}</small>
              </span>
              <em>{feat.detail}</em>
            </button>
          ))}
        </div>
      </BuildChoicePicker>
    )}
    {activePicker === 'skill' && (
      <BuildChoicePicker
        title="Skill Point Picker"
        query={pickerQuery}
        setQuery={setPickerQuery}
        onClose={() => setActivePicker(null)}
      >
        <div className="skill-picker-summary">
          <StatTile label="Available" value={skillEstimate.enteredAvailable ?? skillEstimate.estimatedAvailable} />
          <StatTile label="Spent" value={skillEstimate.spent} />
          <StatTile label="Remaining" value={skillEstimate.remaining ?? 'Auto'} tone={skillEstimate.remaining !== null && skillEstimate.remaining < 0 ? 'warn' : 'ok'} />
        </div>
        <div className="picker-option-list skill-picker-list">
          {filteredSkillOptions.map((skill) => {
            const points = getSkillAllocationPoints(levelForm.skillAllocation, skill);
            return (
              <div className="skill-picker-row" key={skill}>
                <span>
                  <strong>{skill}</strong>
                  <small>{points > 0 ? `${points} point${points === 1 ? '' : 's'} assigned` : 'No points assigned'}</small>
                </span>
                <div className="skill-stepper">
                  <button type="button" className="icon-button ghost" onClick={() => updateSkill(skill, -1)} disabled={points <= 0} aria-label={`Remove ${skill}`}>
                    <Minus size={16} />
                  </button>
                  <strong>{points}</strong>
                  <button type="button" className="icon-button" onClick={() => updateSkill(skill, 1)} aria-label={`Add ${skill}`}>
                    <Plus size={16} />
                  </button>
                  <button type="button" className="ghost" onClick={() => clearSkill(skill)} disabled={points <= 0}>
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </BuildChoicePicker>
    )}
    {activePicker === 'spell' && (
      <BuildChoicePicker
        title="Spell Picker"
        query={pickerQuery}
        setQuery={setPickerQuery}
        onClose={() => setActivePicker(null)}
      >
        <div className="picker-controls spell-filter-grid">
          <Field label="Tradition">
            <select value={spellTraditionFilter} onChange={(event) => setSpellTraditionFilter(event.target.value as (typeof spellTraditions)[number])}>
              {spellTraditions.map((tradition) => (
                <option key={tradition} value={tradition}>
                  {tradition}
                </option>
              ))}
            </select>
          </Field>
          <Field label="School">
            <select value={spellSchoolFilter} onChange={(event) => setSpellSchoolFilter(event.target.value as (typeof spellSchools)[number])}>
              {spellSchools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="picker-option-list">
          {filteredSpellOptions.map((spell) => (
            <button key={`${spell.tradition}-${spell.name}`} type="button" className="picker-option spell-option" onClick={() => addSpellSelection(spell.name)}>
              <span>
                <strong>{spell.name}</strong>
                <small>
                  {spell.tradition} - {spell.school} - Level {spell.level}
                </small>
              </span>
              <em>{spell.detail}</em>
            </button>
          ))}
        </div>
      </BuildChoicePicker>
    )}
    </>
  );
}

function BuildLevelGuide({
  sections,
  selectedLevelNumber,
  onLevelSelect
}: {
  sections: BuildLevelGuideSection[];
  selectedLevelNumber: number;
  onLevelSelect: (levelNumber: number) => void;
}): ReactElement {
  return (
    <section className="level-guide-panel" aria-label="Full level-by-level guide">
      <div className="level-guide-title">
        <div>
          <p className="eyebrow">Full Level-by-Level Guide</p>
          <h3>Levels 1-40</h3>
        </div>
        <span>Class, ability, feat source, and skill path</span>
      </div>
      {sections.length === 0 ? (
        <EmptyLine text="Select a Build Plan to see the guide table." />
      ) : (
        <div className="level-guide-scroll">
          {sections.map((section) => (
            <section className="level-guide-section" key={section.id}>
              <h4>{section.title}</h4>
              <table className="level-guide-table">
                <thead>
                  <tr>
                    <th>Lvl</th>
                    <th>Class</th>
                    <th>Ability</th>
                    <th>Feat / Feature</th>
                    <th>Source</th>
                    <th>Skills</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr
                      className={[
                        row.levelNumber === selectedLevelNumber ? 'selected' : '',
                        row.isPlanned ? 'planned' : 'empty',
                        row.hasWarning ? 'warning' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      key={row.id}
                    >
                      <td>
                        <button type="button" className="guide-level-button" onClick={() => onLevelSelect(row.levelNumber)}>
                          {row.levelNumber}
                        </button>
                      </td>
                      <td>{row.classLabel}</td>
                      <td>{row.abilityIncrease}</td>
                      <td>{row.choiceLabel}</td>
                      <td>{row.source ? <SourceBadge source={row.source} /> : <span className="guide-dash">--</span>}</td>
                      <td>{row.skills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function BuildChoicePicker({
  title,
  query,
  setQuery,
  onClose,
  children
}: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="picker-scrim" onClick={onClose} aria-label="Close picker backdrop" />
      <aside className="choice-picker">
        <div className="picker-header">
          <div>
            <p className="eyebrow">Level-Up Menu</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close picker" title="Close">
            <X size={16} />
          </button>
        </div>
        <div className="search-box picker-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter options" autoFocus />
        </div>
        {children}
      </aside>
    </div>
  );
}

function BuildForgeRail({ steps }: { steps: BuildForgeStep[] }): ReactElement {
  return (
    <aside className="panel forge-rail">
      <div className="panel-header">
        <div>
          <h2>Forge Path</h2>
          <p>Build Plans move from record setup to reusable guide.</p>
        </div>
      </div>
      <ol className="step-rail-list">
        {steps.map((step, index) => (
          <li className={`step-item ${step.state}`} key={step.key}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function BuildRecordPanel({
  build,
  plannedLevels,
  selectedLevelNumber,
  rulesetName
}: {
  build: Build | null;
  plannedLevels: BuildLevel[];
  selectedLevelNumber: number;
  rulesetName: (id: string) => string;
}): ReactElement {
  const selectedLevel = plannedLevels.find((level) => level.levelNumber === selectedLevelNumber) ?? null;
  const pathPreview = plannedLevels
    .slice(0, 12)
    .map((level) => classAbbreviation(level.className))
    .join(' / ');

  return (
    <aside className="panel record-panel">
      <div className="panel-header">
        <div>
          <h2>Build Record</h2>
          <p>{build ? rulesetName(build.rulesetId) : 'No Build Plan selected'}</p>
        </div>
        {build && <span className="status-pill">{formatLabel(build.status)}</span>}
      </div>
      {build ? (
        <div className="record-panel-body">
          <div className="record-title compact">
            <h3>{build.name}</h3>
            <span>{build.intendedRole || build.intendedGame || 'Role not set'}</span>
          </div>
          <div className="record-stat-grid">
            <StatTile label="Race" value={build.raceName || 'Unset'} />
            <StatTile label="Class Split" value={build.classSummary || 'Unset'} />
            <StatTile label="Level Cap" value={build.levelCap} />
            <StatTile label="Selected Level" value={selectedLevel ? `${selectedLevel.levelNumber} ${selectedLevel.className}` : selectedLevelNumber} />
          </div>
          <section className="record-section">
            <h3>Path Preview</h3>
            <p>{pathPreview || 'No level entries yet.'}</p>
          </section>
        </div>
      ) : (
        <EmptyLine text="Select or create a Build Plan to see its record." />
      )}
    </aside>
  );
}

function BuildHealthPanel({ health }: { health: BuildHealth }): ReactElement {
  return (
    <aside className="panel build-health">
      <div className="panel-header">
        <div>
          <h2>Build Progress</h2>
          <p>{health.plannedLevelCount}/{health.levelCap || 0} levels planned</p>
        </div>
        <strong>{health.completionPercent}%</strong>
      </div>
      <div className="progress-track inline">
        <div style={{ width: `${health.completionPercent}%` }} />
      </div>
      <div className="record-stat-grid">
        <StatTile label="Level Entries" value={health.plannedLevelCount} />
        <StatTile label="Feat Sources" value={health.featCount} />
        <StatTile label="Status" value={formatLabel(health.statusLabel)} />
      </div>
    </aside>
  );
}

function BuildReferencePanel({
  selectedLevelNumber,
  selectedFeats,
  skillEstimate,
  openCompendium
}: {
  selectedLevelNumber: number;
  selectedFeats: Array<FeatSelection | FeatSelectionInput>;
  skillEstimate: SkillPointEstimate;
  openCompendium: () => void;
}): ReactElement {
  return (
    <aside className="panel record-panel">
      <div className="panel-header">
        <div>
          <h2>Level {selectedLevelNumber} Choices</h2>
          <p>Review source labels before saving the level.</p>
        </div>
      </div>
      <div className="record-stat-grid">
        <StatTile label="Skill Base" value={skillEstimate.classBase} />
        <StatTile label="INT Mod" value={skillEstimate.intelligenceModifier >= 0 ? `+${skillEstimate.intelligenceModifier}` : skillEstimate.intelligenceModifier} />
        <StatTile label="Available" value={skillEstimate.enteredAvailable ?? skillEstimate.estimatedAvailable} />
        <StatTile label="Remaining" value={skillEstimate.remaining ?? 'Auto'} tone={skillEstimate.remaining !== null && skillEstimate.remaining < 0 ? 'warn' : 'ok'} />
      </div>
      <section className="record-section">
        <h3>Feat Sources</h3>
        {selectedFeats.length === 0 ? (
          <p>No feat or feature choices recorded for this level.</p>
        ) : (
          <div className="chip-row">
            {selectedFeats.map((feat, index) => (
              <span className="chip passive source-chip" key={`${feat.featName}-${index}`} title={formatFeatSourceLabel(feat.source)}>
                <SourceBadge source={feat.source} />
                {feat.featName}
              </span>
            ))}
          </div>
        )}
      </section>
      <button type="button" className="ghost" onClick={openCompendium}>
        <BookOpen size={16} />
        Search Compendium
      </button>
    </aside>
  );
}

function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' }): ReactElement {
  return (
    <span className={tone ? `stat-tile ${tone}` : 'stat-tile'}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function RulesView({
  data,
  contentForm,
  setContentForm,
  contentTagsText,
  setContentTagsText,
  rulesetName,
  sourceName,
  busy,
  onSubmit
}: {
  data: AppData;
  contentForm: ContentEntryInput;
  setContentForm: (form: ContentEntryInput | ((form: ContentEntryInput) => ContentEntryInput)) => void;
  contentTagsText: string;
  setContentTagsText: (value: string) => void;
  rulesetName: (id: string) => string;
  sourceName: (id: string | null) => string;
  busy: boolean;
  onSubmit: () => void;
}): ReactElement {
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add Server Rule or Reference Note</h2>
            <p>Every entry carries ruleset and source metadata from the beginning.</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Name">
            <input value={contentForm.name} onChange={(event) => setContentForm((form) => ({ ...form, name: event.target.value }))} required />
          </Field>
          <Field label="Type">
            <select value={contentForm.type} onChange={(event) => setContentForm((form) => ({ ...form, type: event.target.value as ContentEntryInput['type'] }))}>
              {contentTypes.map((type) => (
                <option key={type} value={type}>
                  {formatLabel(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ruleset">
            <select value={contentForm.rulesetId} onChange={(event) => setContentForm((form) => ({ ...form, rulesetId: event.target.value }))}>
              {data.rulesets.map((ruleset) => (
                <option key={ruleset.id} value={ruleset.id}>
                  {ruleset.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select value={contentForm.sourceId ?? ''} onChange={(event) => setContentForm((form) => ({ ...form, sourceId: maybeNull(event.target.value) }))}>
              <option value="">No source</option>
              {data.sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description" wide>
            <textarea value={contentForm.description} onChange={(event) => setContentForm((form) => ({ ...form, description: event.target.value }))} />
          </Field>
          <Field label="Mechanics" wide>
            <textarea value={contentForm.mechanics} onChange={(event) => setContentForm((form) => ({ ...form, mechanics: event.target.value }))} />
          </Field>
          <Field label="Prerequisites" wide>
            <input value={contentForm.prerequisites} onChange={(event) => setContentForm((form) => ({ ...form, prerequisites: event.target.value }))} />
          </Field>
          <Field label="Tags">
            <input value={contentTagsText} onChange={(event) => setContentTagsText(event.target.value)} />
          </Field>
          <Field label="Visibility">
            <select value={contentForm.visibility} onChange={(event) => setContentForm((form) => ({ ...form, visibility: event.target.value }))}>
              <option value="private">Private</option>
              <option value="server_profile_only">Server Profile Only</option>
              <option value="shareable">Shareable</option>
            </select>
          </Field>
          <label className="checkbox-field">
            <input type="checkbox" checked={contentForm.exportAllowed} onChange={(event) => setContentForm((form) => ({ ...form, exportAllowed: event.target.checked }))} />
            <span>Allow export</span>
          </label>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              <Plus size={16} />
              Add Entry
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Server Rules Library</h2>
        </div>
        <DataTable
          headers={['Name', 'Type', 'Ruleset', 'Source', 'Export', 'Updated']}
          empty="No rules entries yet."
          rows={data.contentEntries.map((entry) => [
            entry.name,
            formatLabel(entry.type),
            rulesetName(entry.rulesetId),
            sourceName(entry.sourceId),
            entry.exportAllowed ? 'Allowed' : 'Blocked',
            displayDate(entry.updatedAt)
          ])}
        />
      </section>
    </div>
  );
}

function WikiView({
  wikiSummary,
  wikiSearchQuery,
  setWikiSearchQuery,
  wikiSearchResults,
  selectedWikiPage,
  wikiBusy,
  wikiError,
  onWikiSearch,
  onWikiPageSelect
}: {
  wikiSummary: WikiLibrarySummary | null;
  wikiSearchQuery: string;
  setWikiSearchQuery: (value: string) => void;
  wikiSearchResults: WikiSearchResult[];
  selectedWikiPage: WikiPageDetail | null;
  wikiBusy: boolean;
  wikiError: string;
  onWikiSearch: () => void;
  onWikiPageSelect: (pageId: number) => void;
}): ReactElement {
  const hasLibrary = wikiSummary?.hasLibrary ?? false;

  return (
    <div className="stack">
      <section className="panel wiki-search-panel">
        <div className="panel-header">
          <div>
            <h2>Compendium</h2>
            <p>
              {hasLibrary
                ? `Search ${wikiSummary?.articleCount.toLocaleString() ?? '0'} built-in NWNWiki articles.`
                : 'The built-in wiki is not available in this build.'}
            </p>
          </div>
          {hasLibrary && <span className="status-pill ready">Built In</span>}
        </div>

        {wikiError && <div className="inline-error">{wikiError}</div>}

        <form
          className="wiki-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onWikiSearch();
          }}
        >
          <div className="search-box">
            <Search size={17} />
            <input
              value={wikiSearchQuery}
              onChange={(event) => setWikiSearchQuery(event.target.value)}
              placeholder="Search feats, classes, spells, items, rules"
              disabled={!hasLibrary}
            />
          </div>
          <button type="submit" disabled={!hasLibrary || wikiBusy}>
            <Search size={16} />
            Search
          </button>
        </form>

        {!hasLibrary && (
          <p className="empty-line">
            Install the latest SCRIBE release to use the built-in NWNWiki search.
          </p>
        )}
      </section>

      {hasLibrary && (
        <div className="wiki-search-layout">
          <div className="wiki-results" aria-label="NWNWiki search results">
            {wikiSearchResults.length === 0 ? (
              <EmptyLine text={wikiBusy ? 'Searching...' : wikiSearchQuery.trim().length >= 2 ? 'No wiki matches.' : 'Start typing to search.'} />
            ) : (
              wikiSearchResults.map((result) => (
                <button
                  key={result.pageId}
                  type="button"
                  className={selectedWikiPage?.pageId === result.pageId ? 'wiki-result active' : 'wiki-result'}
                  onClick={() => onWikiPageSelect(result.pageId)}
                >
                  <strong>{result.title}</strong>
                  <span>{result.snippet || 'No snippet available.'}</span>
                </button>
              ))
            )}
          </div>

          <article className="wiki-page">
            {selectedWikiPage ? (
              <>
                <div className="wiki-page-header">
                  <div>
                    <h3>{selectedWikiPage.title}</h3>
                    <p>
                      Revision {selectedWikiPage.revisionId} - Fetched {displayDate(selectedWikiPage.fetchedAt)}
                    </p>
                  </div>
                  <a href={selectedWikiPage.sourceUrl} target="_blank" rel="noreferrer">
                    Source
                  </a>
                </div>
                {selectedWikiPage.categories.length > 0 && (
                  <div className="chip-row">
                    {selectedWikiPage.categories.slice(0, 8).map((category) => (
                      <span className="chip passive" key={category}>
                        {category}
                      </span>
                    ))}
                  </div>
                )}
                <p className="license-note">
                  Text from {wikiSummary?.sourceName ?? 'NWNWiki'} under {selectedWikiPage.licenseName}.
                </p>
                <WikiArticle plainText={selectedWikiPage.plainText} />
              </>
            ) : (
              <EmptyLine text="Select a result to read the local article text." />
            )}
          </article>
        </div>
      )}
    </div>
  );
}

function CompendiumDrawer({
  open,
  onClose,
  wikiSummary,
  wikiSearchQuery,
  setWikiSearchQuery,
  wikiSearchResults,
  selectedWikiPage,
  wikiBusy,
  wikiError,
  onWikiSearch,
  onWikiPageSelect,
  onOpenFullCompendium
}: {
  open: boolean;
  onClose: () => void;
  wikiSummary: WikiLibrarySummary | null;
  wikiSearchQuery: string;
  setWikiSearchQuery: (value: string) => void;
  wikiSearchResults: WikiSearchResult[];
  selectedWikiPage: WikiPageDetail | null;
  wikiBusy: boolean;
  wikiError: string;
  onWikiSearch: () => void;
  onWikiPageSelect: (pageId: number) => void;
  onOpenFullCompendium: () => void;
}): ReactElement {
  const hasLibrary = wikiSummary?.hasLibrary ?? false;

  return (
    <>
      <button
        type="button"
        className={open ? 'drawer-scrim open' : 'drawer-scrim'}
        onClick={onClose}
        aria-label="Close Compendium drawer"
        tabIndex={open ? 0 : -1}
      />
      <aside className={open ? 'compendium-drawer open' : 'compendium-drawer'} aria-hidden={!open}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Reference</p>
            <h2>Compendium</h2>
            <span>{hasLibrary ? `${wikiSummary?.articleCount.toLocaleString() ?? '0'} local articles` : 'Library unavailable'}</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close Compendium drawer" title="Close">
            <Check size={16} />
          </button>
        </div>

        {wikiError && <div className="inline-error">{wikiError}</div>}

        <form
          className="wiki-search-form drawer-search"
          onSubmit={(event) => {
            event.preventDefault();
            onWikiSearch();
          }}
        >
          <div className="search-box">
            <Search size={17} />
            <input
              value={wikiSearchQuery}
              onChange={(event) => setWikiSearchQuery(event.target.value)}
              placeholder="Search classes, feats, spells"
              disabled={!hasLibrary}
            />
          </div>
          <button type="submit" disabled={!hasLibrary || wikiBusy}>
            <Search size={16} />
          </button>
        </form>

        <div className="drawer-body">
          <div className="wiki-results drawer-results" aria-label="Compendium drawer search results">
            {wikiSearchResults.length === 0 ? (
              <EmptyLine text={wikiBusy ? 'Searching...' : wikiSearchQuery.trim().length >= 2 ? 'No wiki matches.' : 'Search the local wiki.'} />
            ) : (
              wikiSearchResults.slice(0, 8).map((result) => (
                <button
                  key={result.pageId}
                  type="button"
                  className={selectedWikiPage?.pageId === result.pageId ? 'wiki-result active' : 'wiki-result'}
                  onClick={() => onWikiPageSelect(result.pageId)}
                >
                  <strong>{result.title}</strong>
                  <span>{result.snippet || 'No snippet available.'}</span>
                </button>
              ))
            )}
          </div>

          <article className="drawer-page">
            {selectedWikiPage ? (
              <>
                <div className="wiki-page-header compact">
                  <div>
                    <h3>{selectedWikiPage.title}</h3>
                    <p>Revision {selectedWikiPage.revisionId}</p>
                  </div>
                  <a href={selectedWikiPage.sourceUrl} target="_blank" rel="noreferrer">
                    Source
                  </a>
                </div>
                <WikiArticle compact plainText={selectedWikiPage.plainText} />
              </>
            ) : (
              <EmptyLine text="Select a result to preview the article." />
            )}
          </article>
        </div>

        <div className="drawer-footer">
          <button type="button" className="ghost" onClick={onOpenFullCompendium}>
            <BookOpen size={16} />
            Open Full Compendium
          </button>
        </div>
      </aside>
    </>
  );
}

function ServersView({
  data,
  serverForm,
  setServerForm,
  resourceForm,
  setResourceForm,
  resourceTagsText,
  setResourceTagsText,
  rulesetName,
  busy,
  onServerSubmit,
  onResourceSubmit
}: {
  data: AppData;
  serverForm: ServerProfileInput;
  setServerForm: (form: ServerProfileInput | ((form: ServerProfileInput) => ServerProfileInput)) => void;
  resourceForm: ResourceLinkInput;
  setResourceForm: (form: ResourceLinkInput | ((form: ResourceLinkInput) => ResourceLinkInput)) => void;
  resourceTagsText: string;
  setResourceTagsText: (value: string) => void;
  rulesetName: (id: string) => string;
  busy: boolean;
  onServerSubmit: () => void;
  onResourceSubmit: () => void;
}): ReactElement {
  return (
    <div className="stack">
      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Server / Campaign Profile</h2>
          </div>
          <form
            className="form-grid single"
            onSubmit={(event) => {
              event.preventDefault();
              onServerSubmit();
            }}
          >
            <Field label="Name">
              <input value={serverForm.name} onChange={(event) => setServerForm((form) => ({ ...form, name: event.target.value }))} required />
            </Field>
            <Field label="Ruleset">
              <select value={serverForm.rulesetId} onChange={(event) => setServerForm((form) => ({ ...form, rulesetId: event.target.value }))}>
                {data.rulesets.map((ruleset) => (
                  <option key={ruleset.id} value={ruleset.id}>
                    {ruleset.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Website">
              <input value={serverForm.website} onChange={(event) => setServerForm((form) => ({ ...form, website: event.target.value }))} />
            </Field>
            <Field label="Wiki">
              <input value={serverForm.wiki} onChange={(event) => setServerForm((form) => ({ ...form, wiki: event.target.value }))} />
            </Field>
            <Field label="Discord">
              <input value={serverForm.discord} onChange={(event) => setServerForm((form) => ({ ...form, discord: event.target.value }))} />
            </Field>
            <Field label="Level Cap">
              <input type="number" min={1} max={60} value={serverForm.levelCap} onChange={(event) => setServerForm((form) => ({ ...form, levelCap: Number(event.target.value) }))} />
            </Field>
            <Field label="Notes" wide>
              <textarea value={serverForm.notes} onChange={(event) => setServerForm((form) => ({ ...form, notes: event.target.value }))} />
            </Field>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                <Plus size={16} />
                Create Server
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Reference Link</h2>
          </div>
          <form
            className="form-grid single"
            onSubmit={(event) => {
              event.preventDefault();
              onResourceSubmit();
            }}
          >
            <Field label="Title">
              <input value={resourceForm.title} onChange={(event) => setResourceForm((form) => ({ ...form, title: event.target.value }))} required />
            </Field>
            <Field label="Server">
              <select value={resourceForm.serverProfileId ?? ''} onChange={(event) => setResourceForm((form) => ({ ...form, serverProfileId: maybeNull(event.target.value) }))}>
                <option value="">General</option>
                {data.serverProfiles.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL">
              <input value={resourceForm.url} onChange={(event) => setResourceForm((form) => ({ ...form, url: event.target.value }))} />
            </Field>
            <Field label="Category">
              <input value={resourceForm.category} onChange={(event) => setResourceForm((form) => ({ ...form, category: event.target.value }))} />
            </Field>
            <Field label="Tags">
              <input value={resourceTagsText} onChange={(event) => setResourceTagsText(event.target.value)} />
            </Field>
            <Field label="Related">
              <input value={resourceForm.relatedEntity} onChange={(event) => setResourceForm((form) => ({ ...form, relatedEntity: event.target.value }))} />
            </Field>
            <Field label="Summary" wide>
              <textarea value={resourceForm.summary} onChange={(event) => setResourceForm((form) => ({ ...form, summary: event.target.value }))} />
            </Field>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                <Plus size={16} />
                Store Link
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Profiles and Resources</h2>
        </div>
        <DataTable
          headers={['Name', 'Ruleset', 'Type', 'Level Cap', 'Updated']}
          empty="No server profiles yet."
          rows={data.serverProfiles.map((server) => [server.name, rulesetName(server.rulesetId), formatLabel(server.serverType), String(server.levelCap), displayDate(server.updatedAt)])}
        />
        <DataTable
          headers={['Title', 'Category', 'URL', 'Related', 'Updated']}
          empty="No resource links yet."
          rows={data.resourceLinks.map((link) => [link.title, link.category, link.url || 'No URL', link.relatedEntity || 'None', displayDate(link.updatedAt)])}
        />
      </section>
    </div>
  );
}

function CalculationsView({
  calcScores,
  setCalcScores,
  spellLevel,
  setSpellLevel,
  proficiencyBonus,
  setProficiencyBonus
}: {
  calcScores: typeof defaultAbilityScores;
  setCalcScores: (scores: typeof defaultAbilityScores | ((scores: typeof defaultAbilityScores) => typeof defaultAbilityScores)) => void;
  spellLevel: number;
  setSpellLevel: (value: number) => void;
  proficiencyBonus: number;
  setProficiencyBonus: (value: number) => void;
}): ReactElement {
  const nwnDc = calculateNwnSpellDc(spellLevel, calcScores.intelligence);
  const fiveEDc = calculateFiveESpellDc(proficiencyBonus, calcScores.charisma);
  const fortitude = calculateSavingThrow('Fortitude', 2, calcScores.constitution);

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Transparent Calculations</h2>
            <p>Early calculation helpers expose components so the later UI can expand every number.</p>
          </div>
        </div>
        <div className="ability-grid calc">
          {abilityKeys.map((key) => (
            <label key={key}>
              <span>{key.slice(0, 3).toUpperCase()}</span>
              <input
                type="number"
                min={1}
                max={99}
                value={calcScores[key]}
                onChange={(event) => setCalcScores((scores) => ({ ...scores, [key]: Number(event.target.value) }))}
              />
              <small>{calculateAbilityModifier(calcScores[key]) >= 0 ? '+' : ''}{calculateAbilityModifier(calcScores[key])}</small>
            </label>
          ))}
        </div>
        <div className="form-grid">
          <Field label="NWN Spell Level">
            <input type="number" min={0} max={9} value={spellLevel} onChange={(event) => setSpellLevel(Number(event.target.value))} />
          </Field>
          <Field label="5e Proficiency">
            <input type="number" min={2} max={6} value={proficiencyBonus} onChange={(event) => setProficiencyBonus(Number(event.target.value))} />
          </Field>
        </div>
      </section>

      <div className="three-column">
        <TracePanel trace={nwnDc} />
        <TracePanel trace={fiveEDc} />
        <TracePanel trace={fortitude} />
      </div>
    </div>
  );
}

function ExportView({
  data,
  exportBuildId,
  setExportBuildId,
  markdown,
  busy,
  previewMarkdown,
  saveMarkdown
}: {
  data: AppData;
  exportBuildId: string | null;
  setExportBuildId: (id: string | null) => void;
  markdown: string;
  busy: boolean;
  previewMarkdown: (buildId?: string | null) => Promise<void>;
  saveMarkdown: (buildId: string) => void;
}): ReactElement {
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Markdown Leveling Guide</h2>
            <p>Export a readable guide from the selected Build Plan and its level path.</p>
          </div>
          <select value={exportBuildId ?? ''} onChange={(event) => setExportBuildId(event.target.value || null)} className="compact-select">
            <option value="">Select Build Plan</option>
            {data.builds.map((build) => (
              <option key={build.id} value={build.id}>
                {build.name}
              </option>
            ))}
          </select>
        </div>
        <div className="button-row">
          <button type="button" disabled={!exportBuildId || busy} onClick={() => void previewMarkdown(exportBuildId)}>
            <FileText size={16} />
            Preview
          </button>
          <button type="button" disabled={!exportBuildId || busy} onClick={() => exportBuildId && saveMarkdown(exportBuildId)}>
            <Download size={16} />
            Save Markdown
          </button>
        </div>
      </section>
      <pre className="markdown-preview">{markdown || 'Select a Build Plan and generate a preview.'}</pre>
    </div>
  );
}

function HelpView({ setActiveView }: { setActiveView: (view: View) => void }): ReactElement {
  const helpDetails: Record<View, { summary: string; details: string }> = {
    dashboard: {
      summary: 'A command desk for recent work, planning counts, and fast entry into common actions.',
      details: 'Use it when opening SCRIBE to see what exists, what needs planning attention, and where the local database lives.'
    },
    characters: {
      summary: 'Stores actual character instances separately from reusable Build Plans.',
      details: 'Track race, class split, level, status, ability scores, assigned guide, server, and notes without overwriting planning records.'
    },
    builds: {
      summary: 'Opens Build Forge, where Build Plan metadata and the Level Path live together.',
      details: 'Use it for intended role, class split, level cap, tags, server context, level-by-level choices, and guide export readiness.'
    },
    leveling: {
      summary: 'Folded into Build Forge.',
      details: 'Leveling Guide work now belongs inside the Build Plan so the reusable guide is one artifact instead of a separate workspace.'
    },
    calculations: {
      summary: 'Shows transparent math for ability modifiers, spell DCs, and saving throw examples.',
      details: 'Use it as a visible calculator while planning Build Plans; later slices can expand these traces into deeper rules-aware comparisons.'
    },
    wiki: {
      summary: 'Searches the built-in NWNWiki library from inside SCRIBE.',
      details: 'Use this for vanilla NWN article lookup when you need classes, feats, spells, items, or rules information without leaving the app.'
    },
    rules: {
      summary: 'Keeps server profiles, resource links, and private rule notes together.',
      details: 'Use it for server context, overrides, formulas, house rules, and manual mechanics that affect Character Records or Build Plans.'
    },
    custom: {
      summary: 'Captures server-specific or homebrew material in the same structured library.',
      details: 'Use it for overrides, custom rules, private campaign content, and notes that should stay distinct from the built-in wiki library.'
    },
    equipment: {
      summary: 'Reserved for item records and gear planning.',
      details: 'The database foundation is in place; the next equipment slice should add item CRUD, gear sets, slot assignment, and stat impact traces.'
    },
    servers: {
      summary: 'Organizes server, campaign, and resource context.',
      details: 'Create profiles with site, wiki, Discord, level cap, and notes, then store related links so build decisions keep their source context.'
    },
    export: {
      summary: 'Builds readable Markdown Leveling Guides from saved Build Plans.',
      details: 'Select a Build Plan, preview the generated guide, and save it as a shareable document when the level path is ready.'
    },
    help: {
      summary: 'Explains SCRIBE’s workflow and each navigation area.',
      details: 'Start here when a screen name is unclear or when you want to understand how character planning, reference, and export fit together.'
    },
    settings: {
      summary: 'Shows workspace configuration and update status.',
      details: 'Use Settings to review the default ruleset, local SQLite workspace, source counts, and GitHub release update checks.'
    }
  };

  const workflowSteps = [
    { title: 'Plan', body: 'Use Build Forge to create one reusable Build Plan with metadata and a level-by-level path.' },
    { title: 'Reference', body: 'Search Compendium for vanilla NWN details and store private overrides in Server Rules.' },
    { title: 'Apply', body: 'Assign Build Plans to Character Records and keep server context nearby.' },
    { title: 'Share', body: 'Export a Markdown Leveling Guide once the Build Plan is ready to hand off or archive.' }
  ];

  return (
    <div className="stack help-view">
      <section className="panel help-hero">
        <div>
          <p className="eyebrow">How It Works</p>
          <h2>SCRIBE keeps planning, reference, and output in one local workspace.</h2>
          <p>
            SCRIBE is organized around three artifacts: Character Records, reusable Build Plans, and reference content. Build Forge is where the Leveling Guide
            and its level path live together.
          </p>
        </div>
        <div className="help-flow" aria-label="SCRIBE workflow">
          {workflowSteps.map((step, index) => (
            <div className="help-step" key={step.title}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="help-grid">
        {navGroups.map((group) => (
          <section className="panel help-section" key={group.label}>
            <div className="panel-header">
              <div>
                <h2>{group.label}</h2>
                <p>{group.items.length === 1 ? 'Primary workspace entry point.' : `${group.items.length} related tools grouped together.`}</p>
              </div>
            </div>
            <div className="help-link-list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const copy = helpDetails[item.id];
                return (
                  <button key={item.id} type="button" data-view={item.id} className="help-link-row" onClick={() => setActiveView(item.id)}>
                    <Icon size={18} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{copy.summary}</small>
                      <em>{copy.details}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SettingsView({
  data,
  defaultRulesetId,
  rulesetName,
  updateStatus,
  checkForUpdates,
  installUpdate
}: {
  data: AppData;
  defaultRulesetId: string;
  rulesetName: (id: string) => string;
  updateStatus: UpdateStatus;
  checkForUpdates: () => void;
  installUpdate: () => void;
}): ReactElement {
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Workspace Settings</h2>
            <p>Settings persistence is queued after the core CRUD workflows.</p>
          </div>
        </div>
        <div className="settings-grid">
          <Metric label="Default Ruleset" value={rulesetName(defaultRulesetId)} />
          <Metric label="Ruleset Profiles" value={data.rulesets.length} />
          <Metric label="Sources" value={data.sources.length} />
          <Metric label="Database" value="SQLite" />
        </div>
      </section>
      <section className="panel update-panel">
        <div className="panel-header">
          <div>
            <h2>Application Updates</h2>
            <p>{updateStatus.message}</p>
          </div>
          <span className={`status-pill ${updateStatus.state}`}>{formatLabel(updateStatus.state)}</span>
        </div>
        {typeof updateStatus.percent === 'number' && (
          <div className="progress-track" aria-label="Update download progress">
            <div style={{ width: `${Math.max(0, Math.min(100, updateStatus.percent))}%` }} />
          </div>
        )}
        <div className="button-row">
          <button type="button" onClick={checkForUpdates}>
            <RefreshCw size={16} />
            Check Updates
          </button>
          <button type="button" onClick={installUpdate} disabled={updateStatus.state !== 'downloaded'}>
            <Download size={16} />
            Restart And Install
          </button>
        </div>
      </section>
    </div>
  );
}

function PlaceholderView({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }): ReactElement {
  return (
    <section className="panel placeholder">
      <Icon size={30} />
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}

function TracePanel({ trace }: { trace: ReturnType<typeof calculateNwnSpellDc> }): ReactElement {
  return (
    <section className="panel trace">
      <div className="panel-header">
        <h2>{trace.target}</h2>
        <strong>{trace.finalValue}</strong>
      </div>
      <div className="list">
        {trace.components.map((component) => (
          <div className="list-row compact" key={`${component.label}-${component.value}`}>
            <span>{component.label}</span>
            <strong>{component.value >= 0 ? `+${component.value}` : component.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'warn' }): ReactElement {
  return (
    <section className={tone ? `metric ${tone}` : 'metric'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }): ReactElement {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyLine({ text }: { text: string }): ReactElement {
  return <p className="empty-line">{text}</p>;
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: Array<Array<ReactNode>>; empty: string }): ReactElement {
  if (rows.length === 0) {
    return <EmptyLine text={empty} />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
