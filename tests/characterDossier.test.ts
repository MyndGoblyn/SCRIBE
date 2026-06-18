import { describe, expect, it } from 'vitest';
import type { Build, Character } from '../src/shared/contracts';
import { getCharacterDossier } from '../src/renderer/src/features/characterDossier';

const character: Character = {
  id: 'character-1',
  name: 'Ari',
  rulesetId: 'ruleset-1',
  serverProfileId: null,
  campaignProfileId: null,
  buildId: 'build-1',
  raceName: 'Elf',
  subraceName: '',
  classSummary: 'Rogue 5',
  alignment: '',
  deity: '',
  background: '',
  currentLevel: 3,
  plannedFinalLevel: 5,
  status: 'active',
  abilityScores: {
    strength: 10,
    dexterity: 16,
    constitution: 12,
    intelligence: 14,
    wisdom: 10,
    charisma: 10
  },
  notes: '',
  createdAt: '',
  updatedAt: ''
};

const build: Build = {
  id: 'build-1',
  name: 'Rogue Path',
  rulesetId: 'ruleset-1',
  serverProfileId: null,
  intendedRole: 'Scout',
  intendedGame: 'Neverwinter Nights',
  raceName: 'Human',
  classSummary: 'Rogue 5',
  abilityScores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  levelCap: 5,
  status: 'draft',
  tags: [],
  notes: '',
  createdAt: '',
  updatedAt: ''
};

describe('character dossier model', () => {
  it('summarizes assigned guide progress and deviations', () => {
    const dossier = getCharacterDossier(
      character,
      build,
      [
        {
          id: 'level-1',
          buildId: 'build-1',
          levelNumber: 1,
          className: 'Rogue',
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
          createdAt: '',
          updatedAt: ''
        }
      ],
      []
    );

    expect(dossier?.progressPercent).toBe(60);
    expect(dossier?.assignedBuildName).toBe('Rogue Path');
    expect(dossier?.deviations).toContain('Character race is Elf; guide expects Human.');
  });
});
