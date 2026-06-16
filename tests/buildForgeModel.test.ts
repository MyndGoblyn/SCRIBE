import { describe, expect, it } from 'vitest';
import type { BuildInput, BuildLevelInput } from '../src/shared/contracts';
import {
  classAbbreviation,
  estimateSkillPoints,
  formatFeatSourceLabel,
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
    expect(estimate.estimatedAvailable).toBe(24);
    expect(estimate.spent).toBe(8);
    expect(estimate.remaining).toBe(16);
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
});
