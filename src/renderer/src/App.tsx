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
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  UserRound
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
import scribeEmblemUrl from './assets/scribe-emblem.png';
import scribeLogoUrl from './assets/scribe-logo.png';
import {
  classAbbreviation,
  estimateSkillPoints,
  formatFeatSourceLabel,
  getBuildForgeSteps,
  getBuildHealth,
  getLevelCellView,
  splitFeatureNotes,
  validateBuildPlan,
  type BuildForgeStep,
  type BuildHealth,
  type SkillPointEstimate,
  type ValidationIssue
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
  onBuildSubmit: () => void;
  onLevelSubmit: () => void;
}): ReactElement {
  const selectedBuild = data.builds.find((build) => build.id === selectedBuildId) ?? data.builds[0] ?? null;
  const plannedLevels = selectedBuild
    ? data.buildLevels.filter((level) => level.buildId === selectedBuild.id).sort((left, right) => left.levelNumber - right.levelNumber)
    : [];
  const levels = selectedBuild ? Array.from({ length: selectedBuild.levelCap }, (_, index) => index + 1) : [];
  const selectedBuildLevelIds = new Set(plannedLevels.map((level) => level.id));
  const selectedBuildFeats = data.featSelections.filter((feat) => selectedBuildLevelIds.has(feat.buildLevelId));
  const selectedLevelEntity = plannedLevels.find((level) => level.levelNumber === selectedLevelNumber) ?? null;
  const selectedLevelFeats = selectedLevelEntity ? data.featSelections.filter((feat) => feat.buildLevelId === selectedLevelEntity.id) : levelForm.featSelections;
  const forgeSteps = getBuildForgeSteps(selectedBuild ?? buildForm, plannedLevels);
  const buildHealth = getBuildHealth(selectedBuild, plannedLevels, selectedBuildFeats);
  const validationIssues = validateBuildPlan(
    selectedBuild ?? buildForm,
    plannedLevels.length > 0 ? plannedLevels : [levelForm],
    selectedBuildFeats.length > 0 ? selectedBuildFeats : levelForm.featSelections,
    selectedBuild?.levelCap ?? buildForm.levelCap
  );
  const skillEstimate = estimateSkillPoints(levelForm, selectedBuild ?? buildForm);
  const featureNotes = splitFeatureNotes(levelForm.classFeatureNotes);

  function addFeat(): void {
    if (!newFeat.featName.trim()) return;
    setLevelForm((form) => ({
      ...form,
      featSelections: [...form.featSelections, { ...newFeat, featName: newFeat.featName.trim() }]
    }));
    setNewFeat({ featName: '', source: 'selected', notes: '' });
  }

  return (
    <div className="forge-shell">
      <BuildForgeRail steps={forgeSteps} />
      <div className="stack forge-main">
      {mode === 'builds' && (
        <>
          <section className="panel">
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
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Build Plan Library</h2>
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
                <button key={build.id} type="button" className="icon-button" onClick={() => editBuild(build)} title="Edit build" aria-label={`Edit ${build.name}`}>
                  <FileText size={16} />
                </button>
              ])}
            />
          </section>
        </>
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
            <div className="level-grid" aria-label="Build Plan levels">
              {levels.map((levelNumber) => {
                const level = plannedLevels.find((entry) => entry.levelNumber === levelNumber) ?? null;
                const levelFeats = level ? data.featSelections.filter((feat) => feat.buildLevelId === level.id) : [];
                const cell = getLevelCellView(levelNumber, level, levelFeats);
                const className = [
                  'level-cell',
                  selectedLevelNumber === levelNumber ? 'selected' : '',
                  cell.isComplete ? 'planned' : '',
                  cell.hasWarning ? 'warning' : '',
                  cell.hasFeat ? 'has-feat' : ''
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={levelNumber}
                    type="button"
                    className={className}
                    onClick={() => setSelectedLevelNumber(levelNumber)}
                    title={`Level ${levelNumber}${level?.className ? `: ${level.className}` : ''}`}
                  >
                    <span className="level-number">{levelNumber}</span>
                    <span className="level-class">{cell.classAbbreviation}</span>
                    <span className="level-markers" aria-hidden="true">
                      {cell.hasFeat && <span className="marker feat-marker" />}
                      {cell.hasAbilityIncrease && <span className="marker ability-marker" />}
                      {cell.hasWarning && <span className="marker warning-marker" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <form
              className="form-grid level-form"
              onSubmit={(event) => {
                event.preventDefault();
                onLevelSubmit();
              }}
            >
              <Field label="Level">
                <input type="number" value={levelForm.levelNumber} min={1} max={selectedBuild.levelCap} readOnly />
              </Field>
              <Field label="Class Taken">
                <input value={levelForm.className} onChange={(event) => setLevelForm((form) => ({ ...form, className: event.target.value }))} />
              </Field>
              <Field label="HP Gained">
                <input
                  type="number"
                  min={0}
                  value={levelForm.hitPointsGained ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, hitPointsGained: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="BAB">
                <input
                  type="number"
                  min={0}
                  value={levelForm.baseAttackBonus ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, baseAttackBonus: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="Fort">
                <input
                  type="number"
                  min={0}
                  value={levelForm.fortitudeSave ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, fortitudeSave: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="Ref">
                <input
                  type="number"
                  min={0}
                  value={levelForm.reflexSave ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, reflexSave: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="Will">
                <input
                  type="number"
                  min={0}
                  value={levelForm.willSave ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, willSave: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="Skill Points">
                <input
                  type="number"
                  min={0}
                  value={levelForm.skillPointsAvailable ?? ''}
                  onChange={(event) => setLevelForm((form) => ({ ...form, skillPointsAvailable: event.target.value ? Number(event.target.value) : null }))}
                />
              </Field>
              <Field label="Ability Increase">
                <input value={levelForm.abilityIncrease} onChange={(event) => setLevelForm((form) => ({ ...form, abilityIncrease: event.target.value }))} />
              </Field>
              <Field label="Skill Allocation" wide>
                <input
                  value={levelForm.skillAllocation}
                  onChange={(event) => setLevelForm((form) => ({ ...form, skillAllocation: event.target.value }))}
                  placeholder="Discipline +4, Tumble +2"
                />
              </Field>
              <div className="planner-status-grid">
                <StatTile label="Estimated Skill Points" value={skillEstimate.estimatedAvailable} />
                <StatTile label="Entered Skill Points" value={skillEstimate.enteredAvailable ?? 'Auto'} />
                <StatTile label="Spent" value={skillEstimate.spent} />
                <StatTile label="Remaining" value={skillEstimate.remaining ?? 'Auto'} tone={skillEstimate.remaining !== null && skillEstimate.remaining < 0 ? 'warn' : 'ok'} />
              </div>
              <Field label="Feat / Feature Source" wide>
                <div className="feat-editor">
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
                <input value={levelForm.spellSelections} onChange={(event) => setLevelForm((form) => ({ ...form, spellSelections: event.target.value }))} />
              </Field>
              <Field label="Equipment" wide>
                <input
                  value={levelForm.equipmentRecommendation}
                  onChange={(event) => setLevelForm((form) => ({ ...form, equipmentRecommendation: event.target.value }))}
                />
              </Field>
              <Field label="Automatic Features" wide>
                <textarea value={levelForm.classFeatureNotes} onChange={(event) => setLevelForm((form) => ({ ...form, classFeatureNotes: event.target.value }))} />
                {featureNotes.length > 0 && (
                  <div className="chip-row">
                    {featureNotes.map((feature) => (
                      <span className="chip passive feature-chip" key={feature}>
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Warnings" wide>
                <input
                  value={levelForm.validationWarnings.join('; ')}
                  onChange={(event) =>
                    setLevelForm((form) => ({ ...form, validationWarnings: event.target.value.split(';').map((item) => item.trim()).filter(Boolean) }))
                  }
                  placeholder="Weapon Master requirements not yet met"
                />
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
        <BuildHealthPanel health={buildHealth} issues={validationIssues} />
        <BuildReferencePanel
          selectedLevelNumber={selectedLevelNumber}
          selectedFeats={selectedLevelFeats}
          featureNotes={featureNotes}
          skillEstimate={skillEstimate}
          openCompendium={openCompendium}
        />
      </div>
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

function BuildHealthPanel({ health, issues }: { health: BuildHealth; issues: ValidationIssue[] }): ReactElement {
  return (
    <aside className="panel build-health">
      <div className="panel-header">
        <div>
          <h2>Build Health</h2>
          <p>{health.plannedLevelCount}/{health.levelCap || 0} levels planned</p>
        </div>
        <strong>{health.completionPercent}%</strong>
      </div>
      <div className="progress-track inline">
        <div style={{ width: `${health.completionPercent}%` }} />
      </div>
      <div className="record-stat-grid">
        <StatTile label="Feat Sources" value={health.featCount} />
        <StatTile label="Auto Features" value={health.automaticFeatureCount} />
        <StatTile label="Warnings" value={health.warningCount} tone={health.warningCount > 0 ? 'warn' : 'ok'} />
        <StatTile label="Status" value={formatLabel(health.statusLabel)} />
      </div>
      <ul className="validation-list">
        {issues.length === 0 ? (
          <li className="validation-item info">
            <strong>Ready</strong>
            <span>No validation issues recorded.</span>
          </li>
        ) : (
          issues.slice(0, 7).map((issue) => (
            <li className={`validation-item ${issue.severity}`} key={issue.id}>
              <strong>{issue.label}</strong>
              <span>{issue.detail}</span>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}

function BuildReferencePanel({
  selectedLevelNumber,
  selectedFeats,
  featureNotes,
  skillEstimate,
  openCompendium
}: {
  selectedLevelNumber: number;
  selectedFeats: Array<FeatSelection | FeatSelectionInput>;
  featureNotes: string[];
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
      <section className="record-section">
        <h3>Automatic Features</h3>
        {featureNotes.length === 0 ? (
          <p>No automatic class features entered yet.</p>
        ) : (
          <div className="chip-row">
            {featureNotes.map((feature) => (
              <span className="chip passive feature-chip" key={feature}>
                {feature}
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
                <pre>{selectedWikiPage.plainText}</pre>
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
                <pre>{selectedWikiPage.plainText}</pre>
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
      summary: 'A command desk for recent work, counts, warnings, and fast entry into common actions.',
      details: 'Use it when opening SCRIBE to see what exists, what needs planning attention, and where the local database lives.'
    },
    characters: {
      summary: 'Stores actual character instances separately from reusable Build Plans.',
      details: 'Track race, class split, level, status, ability scores, assigned guide, server, and notes without overwriting planning records.'
    },
    builds: {
      summary: 'Opens Build Forge, where Build Plan metadata and the Level Path live together.',
      details: 'Use it for intended role, class split, level cap, tags, server context, level-by-level choices, warnings, and guide export readiness.'
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
