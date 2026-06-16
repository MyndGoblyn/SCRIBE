import type { Build, BuildLevel, Character, FeatSelection } from '../../../shared/contracts';

export interface CharacterDossier {
  name: string;
  status: string;
  levelLabel: string;
  assignedBuildName: string;
  progressPercent: number;
  nextStep: string;
  plannedLevelCount: number;
  featCount: number;
  warningCount: number;
  deviations: string[];
}

export function getCharacterDossier(
  character: Character | null,
  build: Build | null,
  buildLevels: BuildLevel[],
  featSelections: FeatSelection[]
): CharacterDossier | null {
  if (!character) return null;

  const finalLevel = character.plannedFinalLevel ?? build?.levelCap ?? character.currentLevel;
  const progressPercent = finalLevel > 0 ? Math.min(100, Math.round((character.currentLevel / finalLevel) * 100)) : 0;
  const sortedLevels = [...buildLevels].sort((left, right) => left.levelNumber - right.levelNumber);
  const nextLevel = sortedLevels.find((level) => level.levelNumber > character.currentLevel);
  const warningCount = sortedLevels.reduce((total, level) => total + level.validationWarnings.length, 0);
  const deviations = collectDeviations(character, build, sortedLevels);

  return {
    name: character.name,
    status: character.status.replaceAll('_', ' '),
    levelLabel: `Level ${character.currentLevel}${finalLevel ? ` / ${finalLevel}` : ''}`,
    assignedBuildName: build?.name ?? 'No assigned guide',
    progressPercent,
    nextStep: nextLevel ? `Level ${nextLevel.levelNumber}: ${nextLevel.className || 'choose class'}` : 'No next guided level recorded.',
    plannedLevelCount: sortedLevels.length,
    featCount: featSelections.length,
    warningCount,
    deviations
  };
}

function collectDeviations(character: Character, build: Build | null, buildLevels: BuildLevel[]): string[] {
  const deviations: string[] = [];

  if (!build) {
    deviations.push('No Build Plan is assigned to this Character Record.');
    return deviations;
  }

  if (character.raceName && build.raceName && character.raceName.toLowerCase() !== build.raceName.toLowerCase()) {
    deviations.push(`Character race is ${character.raceName}; guide expects ${build.raceName}.`);
  }

  if (character.classSummary && build.classSummary && character.classSummary.toLowerCase() !== build.classSummary.toLowerCase()) {
    deviations.push('Character class split differs from the assigned guide summary.');
  }

  if (character.currentLevel > build.levelCap) {
    deviations.push(`Character level is above the assigned guide cap of ${build.levelCap}.`);
  }

  if (buildLevels.length < Math.min(character.currentLevel, build.levelCap)) {
    deviations.push('The assigned guide has fewer planned levels than the character has taken.');
  }

  return deviations;
}
