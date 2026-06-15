import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  Archive,
  BookOpen,
  Calculator,
  Check,
  ClipboardList,
  Database,
  Download,
  FileText,
  Home,
  Layers3,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  UserRound
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  abilityKeys,
  type AppData,
  type Build,
  type BuildInput,
  type BuildLevelInput,
  type Character,
  type CharacterInput,
  type ContentEntryInput,
  type FeatSelectionInput,
  type FeatSource,
  type ResourceLinkInput,
  type ServerProfileInput,
  type UpdateStatus,
  type WikiImportSummary,
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
import scribeEmblemUrl from './assets/scribe-emblem.png';
import scribeLogoUrl from './assets/scribe-logo.png';

const scribeApi = getScribeApi();

type View =
  | 'dashboard'
  | 'characters'
  | 'builds'
  | 'leveling'
  | 'rules'
  | 'equipment'
  | 'servers'
  | 'custom'
  | 'calculations'
  | 'export'
  | 'settings';

const navItems: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'characters', label: 'Characters', icon: UserRound },
  { id: 'builds', label: 'Builds', icon: Layers3 },
  { id: 'leveling', label: 'Leveling Guides', icon: ClipboardList },
  { id: 'rules', label: 'Rules Library', icon: BookOpen },
  { id: 'equipment', label: 'Equipment', icon: Shield },
  { id: 'servers', label: 'Servers & Campaigns', icon: LinkIcon },
  { id: 'custom', label: 'Custom Content', icon: Sparkles },
  { id: 'calculations', label: 'Calculations', icon: Calculator },
  { id: 'export', label: 'Import / Export', icon: Download },
  { id: 'settings', label: 'Settings', icon: Settings }
];

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
  const [wikiSummary, setWikiSummary] = useState<WikiImportSummary | null>(null);
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiSearchResults, setWikiSearchResults] = useState<WikiSearchResult[]>([]);
  const [selectedWikiPage, setSelectedWikiPage] = useState<WikiPageDetail | null>(null);
  const [wikiBusy, setWikiBusy] = useState(false);
  const [wikiError, setWikiError] = useState('');

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
        type: 'Build',
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
        setWikiError('NWNWiki page not found in the local data pack.');
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

  return (
    <div className="app-shell">
      {showSplash && <SplashScreen />}
      <aside className="sidebar">
        <div className="brand">
          <img src={scribeEmblemUrl} alt="" />
          <div>
            <strong>SCRIBE</strong>
            <span>Build workshop</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first NWN:EE MVP</p>
            <h1>{navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
          <div className="search-box">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search characters, builds, rules, resources" />
          </div>
          <button className="icon-button" type="button" onClick={() => void refresh()} title="Refresh workspace" aria-label="Refresh workspace">
            <RefreshCw size={18} />
          </button>
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

          {(activeView === 'builds' || activeView === 'leveling') && (
            <BuildsView
              data={data}
              mode={activeView}
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
                }, selectedBuildId ? 'Build saved.' : 'Build created.')
              }
              onLevelSubmit={() =>
                runAction(async () => {
                  await scribeApi.upsertBuildLevel(levelForm);
                }, `Level ${levelForm.levelNumber} saved.`)
              }
            />
          )}

          {(activeView === 'rules' || activeView === 'custom') && (
            <RulesView
              data={data}
              contentForm={contentForm}
              setContentForm={setContentForm}
              contentTagsText={contentTagsText}
              setContentTagsText={setContentTagsText}
              rulesetName={rulesetName}
              sourceName={sourceName}
              wikiSummary={wikiSummary}
              wikiSearchQuery={wikiSearchQuery}
              setWikiSearchQuery={setWikiSearchQuery}
              wikiSearchResults={wikiSearchResults}
              selectedWikiPage={selectedWikiPage}
              wikiBusy={wikiBusy}
              wikiError={wikiError}
              onWikiSearch={() => void searchNwnWiki()}
              onWikiPageSelect={(pageId) => void openWikiPage(pageId)}
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
                }, 'Rules entry added.')
              }
            />
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
        <Metric label="Builds" value={data.builds.length} />
        <Metric label="Open Levels" value={incompleteLevelCount} />
        <Metric label="Warnings" value={warningCount} tone={warningCount > 0 ? 'warn' : 'ok'} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Quick Create</h2>
            <p>Start from the workflows the PDD marks as MVP-critical.</p>
          </div>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => setActiveView('characters')}>
            <Plus size={16} />
            Character
          </button>
          <button type="button" onClick={() => setActiveView('builds')}>
            <Plus size={16} />
            Build
          </button>
          <button type="button" onClick={() => setActiveView('leveling')}>
            <ClipboardList size={16} />
            Level Plan
          </button>
          <button type="button" onClick={() => setActiveView('servers')}>
            <LinkIcon size={16} />
            Resource
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
            <h2>Active Builds</h2>
          </div>
          <div className="list">
            {data.builds.length === 0 ? (
              <EmptyLine text="No builds yet." />
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
  busy: boolean;
  onSubmit: () => void;
}): ReactElement {
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{selectedCharacterId ? 'Edit Character' : 'Create Character'}</h2>
            <p>Track planned and actual state without forcing either one to overwrite the other.</p>
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
          <Field label="Assigned Build">
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
          <h2>Character Database</h2>
        </div>
        <DataTable
          headers={['Name', 'Ruleset', 'Level', 'Build', 'Status', 'Updated', '']}
          empty="No characters created yet."
          rows={data.characters.map((character) => [
            character.name,
            rulesetName(character.rulesetId),
            String(character.currentLevel),
            data.builds.find((build) => build.id === character.buildId)?.name ?? 'Unassigned',
            formatLabel(character.status),
            displayDate(character.updatedAt),
            <button key={character.id} type="button" className="icon-button" onClick={() => editCharacter(character)} title="Edit character" aria-label={`Edit ${character.name}`}>
              <FileText size={16} />
            </button>
          ])}
        />
      </section>
    </div>
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
  busy: boolean;
  onBuildSubmit: () => void;
  onLevelSubmit: () => void;
}): ReactElement {
  const selectedBuild = data.builds.find((build) => build.id === selectedBuildId) ?? data.builds[0] ?? null;
  const plannedLevels = selectedBuild ? data.buildLevels.filter((level) => level.buildId === selectedBuild.id) : [];
  const levels = selectedBuild ? Array.from({ length: selectedBuild.levelCap }, (_, index) => index + 1) : [];

  function addFeat(): void {
    if (!newFeat.featName.trim()) return;
    setLevelForm((form) => ({
      ...form,
      featSelections: [...form.featSelections, { ...newFeat, featName: newFeat.featName.trim() }]
    }));
    setNewFeat({ featName: '', source: 'selected', notes: '' });
  }

  return (
    <div className="stack">
      {mode === 'builds' && (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>{selectedBuildId && data.builds.some((build) => build.id === selectedBuildId) ? 'Edit Build' : 'Create Build'}</h2>
                <p>Reusable plans stay separate from actual characters, matching the PDD model.</p>
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
              <Field label="Build Name">
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
                  Save Build
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Build Library</h2>
            </div>
            <DataTable
              headers={['Name', 'Ruleset', 'Role', 'Class Split', 'Levels', 'Status', '']}
              empty="No builds created yet."
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
            <h2>Leveling Guide Builder</h2>
            <p>Plan each level and preserve feat/feature source labels.</p>
          </div>
          <select value={selectedBuild?.id ?? ''} onChange={(event) => setSelectedBuildId(event.target.value || null)} className="compact-select">
            <option value="">Select build</option>
            {data.builds.map((build) => (
              <option key={build.id} value={build.id}>
                {build.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedBuild ? (
          <EmptyLine text="Create a build before adding level entries." />
        ) : (
          <div className="level-planner">
            <div className="level-grid" aria-label="Build levels">
              {levels.map((levelNumber) => {
                const planned = plannedLevels.some((level) => level.levelNumber === levelNumber);
                return (
                  <button
                    key={levelNumber}
                    type="button"
                    className={selectedLevelNumber === levelNumber ? 'level-cell selected' : planned ? 'level-cell planned' : 'level-cell'}
                    onClick={() => setSelectedLevelNumber(levelNumber)}
                    title={`Level ${levelNumber}`}
                  >
                    {levelNumber}
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
                        {featSources.find((source) => source.value === feat.source)?.label}: {feat.featName}
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
  wikiSummary,
  wikiSearchQuery,
  setWikiSearchQuery,
  wikiSearchResults,
  selectedWikiPage,
  wikiBusy,
  wikiError,
  onWikiSearch,
  onWikiPageSelect,
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
  wikiSummary: WikiImportSummary | null;
  wikiSearchQuery: string;
  setWikiSearchQuery: (value: string) => void;
  wikiSearchResults: WikiSearchResult[];
  selectedWikiPage: WikiPageDetail | null;
  wikiBusy: boolean;
  wikiError: string;
  onWikiSearch: () => void;
  onWikiPageSelect: (pageId: number) => void;
  busy: boolean;
  onSubmit: () => void;
}): ReactElement {
  return (
    <div className="stack">
      <NwnWikiReferencePanel
        wikiSummary={wikiSummary}
        wikiSearchQuery={wikiSearchQuery}
        setWikiSearchQuery={setWikiSearchQuery}
        wikiSearchResults={wikiSearchResults}
        selectedWikiPage={selectedWikiPage}
        wikiBusy={wikiBusy}
        wikiError={wikiError}
        onWikiSearch={onWikiSearch}
        onWikiPageSelect={onWikiPageSelect}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add Rules or Custom Content</h2>
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
          <h2>Rules Library</h2>
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

function NwnWikiReferencePanel({
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
  wikiSummary: WikiImportSummary | null;
  wikiSearchQuery: string;
  setWikiSearchQuery: (value: string) => void;
  wikiSearchResults: WikiSearchResult[];
  selectedWikiPage: WikiPageDetail | null;
  wikiBusy: boolean;
  wikiError: string;
  onWikiSearch: () => void;
  onWikiPageSelect: (pageId: number) => void;
}): ReactElement {
  return (
    <section className="panel wiki-reference">
      <div className="panel-header">
        <div>
          <h2>NWNWiki Offline Reference</h2>
          <p>{wikiSummary?.hasDataPack ? `${wikiSummary.pageCount.toLocaleString()} pages indexed from ${wikiSummary.sourceName}.` : 'No local wiki data pack is installed yet.'}</p>
        </div>
        <span className={wikiSummary?.hasDataPack ? 'status-pill not_available' : 'status-pill'}>
          {wikiSummary?.hasDataPack ? 'Ready' : 'Empty'}
        </span>
      </div>

      <div className="wiki-pack-meta">
        <div>
          <span>Pages</span>
          <strong>{wikiSummary?.pageCount.toLocaleString() ?? '0'}</strong>
        </div>
        <div>
          <span>Indexed</span>
          <strong>{wikiSummary?.indexedPageCount.toLocaleString() ?? '0'}</strong>
        </div>
        <div>
          <span>Imported</span>
          <strong>{wikiSummary?.importedAt ? displayDate(wikiSummary.importedAt) : 'Not yet'}</strong>
        </div>
        <div>
          <span>Pack</span>
          <strong>{wikiSummary?.dbPath ?? 'Loading'}</strong>
        </div>
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
            placeholder="Search the local NWNWiki archive"
            disabled={!wikiSummary?.hasDataPack}
          />
        </div>
        <button type="submit" disabled={!wikiSummary?.hasDataPack || wikiBusy}>
          <Search size={16} />
          Search
        </button>
      </form>

      {!wikiSummary?.hasDataPack ? (
        <p className="empty-line">
          Build a local pack with <code>pnpm import:nwnwiki -- --limit 25</code> for a smoke test, or omit the limit for a full archive.
        </p>
      ) : (
        <div className="wiki-search-layout">
          <div className="wiki-results" aria-label="NWNWiki search results">
            {wikiSearchResults.length === 0 ? (
              <EmptyLine text={wikiSearchQuery.trim().length >= 2 ? 'No local wiki matches.' : 'Enter a search above.'} />
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
                  Text attribution: {selectedWikiPage.licenseName}. Local copy sourced from {wikiSummary?.sourceName ?? 'NWNWiki'}.
                </p>
                <pre>{selectedWikiPage.plainText}</pre>
              </>
            ) : (
              <EmptyLine text="Select a result to read the local article text." />
            )}
          </article>
        </div>
      )}
    </section>
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
            <h2>Server Profile</h2>
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
            <h2>Resource Link</h2>
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
            <h2>Markdown Build Guide</h2>
            <p>The first export path focuses on readable build guides, which the PDD marks as MVP.</p>
          </div>
          <select value={exportBuildId ?? ''} onChange={(event) => setExportBuildId(event.target.value || null)} className="compact-select">
            <option value="">Select build</option>
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
      <pre className="markdown-preview">{markdown || 'Select a build and generate a preview.'}</pre>
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
