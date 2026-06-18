import { describe, expect, it } from 'vitest';
import type { BuildInput, BuildLevel, BuildLevelInput, FeatSelection } from '../src/shared/contracts';
import {
  adjustSkillAllocation,
  classAbbreviation,
  estimateSkillPoints,
  formatFeatSourceLabel,
  getAutoLevelMetrics,
  getBuildLevelGuideSections,
  getSkillAllocationPoints,
  getLevelCellView,
  validateBuildPlan
} from '../src/renderer/src/features/buildForgeModel';

const build: BuildInput = {
  name: 'Monk Guide',
  rulesetId: 'ruleset-1',
  serverProfileId: null,
  intendedRole: 'Skirmisher',
  intendedGame: 'Neverwinter Nights',
  raceName: 'Human',
  classSummary: 'Monk 20',
  levelCap: 20,
  status: 'draft',
  tags: [],
  notes: ''
};

function level(overrides: Partial<BuildLevelInput> = {}): BuildLevelInput {
  return {
    buildId: 'build-1',
    levelNumber: 1,
    className: 'Monk',
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
    featSelections: [],
    ...overrides
  };
}

describe('Build Forge model helpers', () => {
  it('estimates first-level skill points from class base and intelligence modifier', () => {
    const estimate = estimateSkillPoints(level({ skillAllocation: 'Discipline +4, Tumble +4' }), build, {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 14,
      wisdom: 10,
      charisma: 10
    });

    expect(estimate.classBase).toBe(4);
    expect(estimate.estimatedAvailable).toBe(28);
    expect(estimate.spent).toBe(8);
    expect(estimate.remaining).toBe(20);
  });

  it('surfaces incomplete paths, level warnings, and source override notes', () => {
    const issues = validateBuildPlan(
      { ...build, serverProfileId: 'server-1' },
      [level({ validationWarnings: ['Weapon Master requirements not met'] })],
      [{ featName: 'Server feat', source: 'server_grant', notes: '' }],
      20
    );

    expect(issues.map((issue) => issue.id)).toContain('incomplete-level-path');
    expect(issues.map((issue) => issue.detail)).toContain('Weapon Master requirements not met');
    expect(issues.some((issue) => issue.severity === 'server_override')).toBe(true);
  });

  it('formats level cells and source labels for compact planner display', () => {
    expect(classAbbreviation('Weapon Master')).toBe('WM');
    expect(formatFeatSourceLabel('human_bonus')).toBe('Human');
    expect(
      getLevelCellView(3, null, [{ featName: 'Cleave', source: 'selected', notes: '' }])
    ).toMatchObject({ classAbbreviation: '3', hasFeat: true, isComplete: false });
  });

  it('builds screenshot-style guide sections from level entries and feat sources', () => {
    const levels: BuildLevel[] = [
      persistedLevel({ id: 'level-1', levelNumber: 1, className: 'Druid', skillAllocation: 'Concentration +4', classFeatureNotes: 'Animal companion' }),
      persistedLevel({ id: 'level-2', levelNumber: 2, className: 'Druid', skillAllocation: 'Concentration +1' }),
      persistedLevel({ id: 'level-3', levelNumber: 3, className: 'Fighter', abilityIncrease: '+STR', skillAllocation: 'Discipline +2' })
    ];
    const feats: FeatSelection[] = [
      persistedFeat({ buildLevelId: 'level-1', featName: 'Alertness', source: 'selected' }),
      persistedFeat({ buildLevelId: 'level-1', featName: 'Dodge', source: 'human_bonus' }),
      persistedFeat({ buildLevelId: 'level-3', featName: 'Weapon Focus', source: 'class_bonus' })
    ];

    const sections = getBuildLevelGuideSections(4, levels, feats);

    expect(sections.map((section) => section.title)).toEqual(['Levels 1-2: Druid 2', 'Level 3: Fighter 1', 'Level 4: Unplanned']);
    expect(sections[0].rows.map((row) => row.choiceLabel)).toEqual(['Alertness', 'Dodge', 'Animal companion', '--']);
    expect(sections[0].rows[1]).toMatchObject({ levelNumber: 1, classLabel: 'Druid 1', sourceLabel: 'Human', skills: 'Same' });
    expect(sections[1].rows[0]).toMatchObject({ abilityIncrease: '+STR', classLabel: 'Fighter 1', sourceLabel: 'Class Bonus' });
  });

  it('adjusts skill allocation text for picker controls', () => {
    expect(adjustSkillAllocation('Discipline +4, Tumble +2', 'Discipline', 1)).toBe('Discipline +5, Tumble +2');
    expect(adjustSkillAllocation('Discipline +4, Tumble +2', 'Tumble', -2)).toBe('Discipline +4');
    expect(adjustSkillAllocation('Discipline +4', 'Spellcraft', 1)).toBe('Discipline +4, Spellcraft +1');
    expect(getSkillAllocationPoints('Discipline +4, Spellcraft +2', 'spellcraft')).toBe(2);
  });

  it('calculates class-derived NWN metrics for level planning', () => {
    const rogueStart = level({ levelNumber: 1, className: 'Rogue' });
    const fighterPatch = level({ levelNumber: 2, className: 'Fighter' });

    expect(getAutoLevelMetrics(rogueStart, { ...build, raceName: 'Human' }, [rogueStart])).toMatchObject({
      hitPointsGained: 6,
      baseAttackBonus: 0,
      fortitudeSave: 0,
      reflexSave: 2,
      willSave: 0,
      skillPointsAvailable: 36,
      hitDie: 6,
      skillBase: 8
    });

    expect(getAutoLevelMetrics(fighterPatch, build, [rogueStart, fighterPatch])).toMatchObject({
      hitPointsGained: 10,
      baseAttackBonus: 1,
      fortitudeSave: 2,
      reflexSave: 2,
      willSave: 0,
      skillPointsAvailable: 3,
      hitDie: 10,
      skillBase: 2
    });
  });
});

function persistedLevel(overrides: Partial<BuildLevel>): BuildLevel {
  return {
    id: 'level-id',
    buildId: 'build-1',
    levelNumber: 1,
    className: 'Monk',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function persistedFeat(overrides: Partial<FeatSelection>): FeatSelection {
  return {
    id: 'feat-id',
    buildLevelId: 'level-id',
    featName: 'Power Attack',
    source: 'selected',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}
