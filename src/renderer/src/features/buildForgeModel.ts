import type {
  AbilityScores,
  Build,
  BuildInput,
  BuildLevel,
  BuildLevelInput,
  FeatSelection,
  FeatSelectionInput,
  FeatSource
} from '../../../shared/contracts';
import { calculateAbilityModifier } from '../../../shared/calculations';

export type BuildForgeStepState = 'complete' | 'current' | 'warning' | 'locked';

export interface BuildForgeStep {
  key: string;
  label: string;
  detail: string;
  state: BuildForgeStepState;
}

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'server_override' | 'manual_override';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  label: string;
  detail: string;
}

export interface BuildHealth {
  completionPercent: number;
  plannedLevelCount: number;
  levelCap: number;
  warningCount: number;
  featCount: number;
  automaticFeatureCount: number;
  statusLabel: string;
}

export interface SkillPointEstimate {
  classBase: number;
  intelligenceModifier: number;
  estimatedAvailable: number;
  enteredAvailable: number | null;
  spent: number;
  remaining: number | null;
}

export interface LevelCellView {
  classAbbreviation: string;
  hasFeat: boolean;
  hasAbilityIncrease: boolean;
  hasWarning: boolean;
  isComplete: boolean;
}

export type SourceBadgeTone = 'selected' | 'automatic' | 'server' | 'custom' | 'override';

const classSkillBases: Record<string, number> = {
  assassin: 4,
  barbarian: 4,
  bard: 4,
  blackguard: 2,
  champion: 2,
  cleric: 2,
  defender: 2,
  druid: 4,
  fighter: 2,
  harper: 4,
  monk: 4,
  paladin: 2,
  ranger: 4,
  rogue: 8,
  shadowdancer: 6,
  shifter: 4,
  sorcerer: 2,
  weapon: 2,
  wizard: 2
};

const sourceLabels: Record<FeatSource, string> = {
  selected: 'Selected',
  human_bonus: 'Human',
  racial_grant: 'Race',
  class_bonus: 'Class Bonus',
  class_grant: 'Class Grant',
  epic_bonus: 'Epic',
  server_grant: 'Server',
  custom: 'Custom',
  homebrew_grant: 'Homebrew',
  manual_override: 'Manual'
};

export function formatFeatSourceLabel(source: FeatSource): string {
  return sourceLabels[source] ?? source;
}

export function getSourceBadgeTone(source: FeatSource): SourceBadgeTone {
  if (source === 'server_grant') return 'server';
  if (source === 'manual_override') return 'override';
  if (source === 'custom' || source === 'homebrew_grant') return 'custom';
  if (source === 'class_grant' || source === 'racial_grant') return 'automatic';
  return 'selected';
}

export function getBuildForgeSteps(build: Build | BuildInput | null, levels: BuildLevel[]): BuildForgeStep[] {
  const hasShell = Boolean(build?.name.trim() && build.rulesetId);
  const hasIdentity = Boolean(build?.raceName.trim() && build.classSummary.trim());
  const hasLevels = levels.length > 0;
  const hasWarnings = levels.some((level) => level.validationWarnings.length > 0);
  const isLocked = build?.status === 'locked';

  return [
    {
      key: 'shell',
      label: 'Build Record',
      detail: hasShell ? 'Name and ruleset are set.' : 'Name the plan and choose a ruleset.',
      state: hasShell ? 'complete' : 'current'
    },
    {
      key: 'identity',
      label: 'Race and Class',
      detail: hasIdentity ? 'Core concept is documented.' : 'Add race/species and class split.',
      state: hasIdentity ? 'complete' : hasShell ? 'current' : 'locked'
    },
    {
      key: 'path',
      label: 'Level Path',
      detail: hasLevels ? `${levels.length} level entries planned.` : 'Start adding level entries.',
      state: hasLevels ? 'complete' : hasIdentity ? 'current' : 'locked'
    },
    {
      key: 'validation',
      label: 'Validation',
      detail: hasWarnings ? 'Review warnings before locking.' : 'No level warnings recorded.',
      state: hasWarnings ? 'warning' : hasLevels ? 'complete' : 'locked'
    },
    {
      key: 'publish',
      label: 'Lock Guide',
      detail: isLocked ? 'Guide is locked for reuse.' : 'Lock when the guide is ready.',
      state: isLocked ? 'complete' : hasLevels && !hasWarnings ? 'current' : 'locked'
    }
  ];
}

export function getBuildHealth(build: Build | null, levels: BuildLevel[], featSelections: FeatSelection[]): BuildHealth {
  const levelCap = build?.levelCap ?? 0;
  const plannedLevelCount = levels.length;
  const completionPercent = levelCap > 0 ? Math.min(100, Math.round((plannedLevelCount / levelCap) * 100)) : 0;
  const warningCount = levels.reduce((total, level) => total + level.validationWarnings.length, 0);
  const automaticFeatureCount = levels.reduce((total, level) => total + splitFeatureNotes(level.classFeatureNotes).length, 0);

  return {
    completionPercent,
    plannedLevelCount,
    levelCap,
    warningCount,
    featCount: featSelections.length,
    automaticFeatureCount,
    statusLabel: build ? build.status.replaceAll('_', ' ') : 'No build selected'
  };
}

export function validateBuildPlan(
  build: Build | BuildInput | null,
  levels: Array<BuildLevel | BuildLevelInput>,
  featSelections: Array<FeatSelection | FeatSelectionInput>,
  levelCap?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cap = levelCap ?? build?.levelCap ?? 0;
  const persistedLevels = levels.filter((level) => Boolean(level.className.trim() || level.notes.trim() || getInlineFeatCount(level)));

  if (!build || !build.name.trim()) {
    issues.push({
      id: 'missing-name',
      severity: 'error',
      label: 'Missing Build Record',
      detail: 'Create or select a Build Plan before relying on validation.'
    });
  }

  if (build && !build.raceName.trim()) {
    issues.push({
      id: 'missing-race',
      severity: 'warning',
      label: 'Race not set',
      detail: 'Race/species affects bonus feats, favored class assumptions, and prerequisites.'
    });
  }

  if (build && !build.classSummary.trim()) {
    issues.push({
      id: 'missing-class-summary',
      severity: 'warning',
      label: 'Class split not set',
      detail: 'Add the intended class split so level choices can be compared against the guide.'
    });
  }

  if (cap > 0 && persistedLevels.length === 0) {
    issues.push({
      id: 'no-levels',
      severity: 'warning',
      label: 'No level path',
      detail: 'Add at least one level entry to start the Build Forge path.'
    });
  }

  if (cap > 0 && persistedLevels.length > 0 && persistedLevels.length < cap) {
    issues.push({
      id: 'incomplete-level-path',
      severity: 'warning',
      label: 'Incomplete level path',
      detail: `${persistedLevels.length} of ${cap} levels are currently planned.`
    });
  }

  for (const level of levels) {
    const warnings = 'validationWarnings' in level ? level.validationWarnings : [];
    for (const [index, warning] of warnings.entries()) {
      issues.push({
        id: `level-${level.levelNumber}-warning-${index}`,
        severity: 'warning',
        label: `Level ${level.levelNumber}`,
        detail: warning
      });
    }

    const estimate = estimateSkillPoints(level, build);
    if (estimate.remaining !== null && estimate.remaining < 0) {
      issues.push({
        id: `level-${level.levelNumber}-skill-over`,
        severity: 'warning',
        label: `Level ${level.levelNumber} skills`,
        detail: `Skill allocation appears to spend ${Math.abs(estimate.remaining)} more point(s) than available.`
      });
    }
  }

  if (build?.serverProfileId || featSelections.some((feat) => feat.source === 'server_grant')) {
    issues.push({
      id: 'server-overrides',
      severity: 'server_override',
      label: 'Server-aware guide',
      detail: 'Server rules or server-granted features are part of this plan.'
    });
  }

  if (featSelections.some((feat) => feat.source === 'manual_override')) {
    issues.push({
      id: 'manual-overrides',
      severity: 'manual_override',
      label: 'Manual override',
      detail: 'One or more choices were intentionally entered outside automatic rules.'
    });
  }

  if (build?.status === 'locked') {
    issues.push({
      id: 'locked',
      severity: 'info',
      label: 'Locked guide',
      detail: 'This Build Plan is marked ready for assignment.'
    });
  }

  return issues;
}

export function classAbbreviation(className: string): string {
  const cleanName = className.trim();
  if (!cleanName) return '--';

  const known: Record<string, string> = {
    barbarian: 'Brb',
    bard: 'Brd',
    cleric: 'Clr',
    druid: 'Drd',
    fighter: 'Ftr',
    monk: 'Mnk',
    paladin: 'Pal',
    ranger: 'Rgr',
    rogue: 'Rog',
    sorcerer: 'Sor',
    wizard: 'Wiz',
    blackguard: 'BG',
    'weapon master': 'WM',
    shadowdancer: 'SD',
    assassin: 'Asn',
    'pale master': 'PM',
    shifter: 'Shf',
    'arcane archer': 'AA',
    'red dragon disciple': 'RDD',
    harper: 'Har',
    champion: 'CoT',
    defender: 'DD'
  };

  const lowerName = cleanName.toLowerCase();
  const exactMatch = known[lowerName];
  if (exactMatch) return exactMatch;

  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((word) => word.charAt(0).toUpperCase()).join('').slice(0, 4);
  }

  return cleanName.slice(0, 3).replace(/^./, (letter) => letter.toUpperCase());
}

export function getLevelCellView(
  levelNumber: number,
  level: BuildLevel | null,
  featSelections: Array<FeatSelection | FeatSelectionInput>
): LevelCellView {
  return {
    classAbbreviation: level ? classAbbreviation(level.className) : String(levelNumber),
    hasFeat: featSelections.length > 0,
    hasAbilityIncrease: Boolean(level?.abilityIncrease.trim()),
    hasWarning: Boolean(level?.validationWarnings.length),
    isComplete: Boolean(level?.className.trim())
  };
}

export function estimateSkillPoints(
  level: BuildLevel | BuildLevelInput,
  build: Build | BuildInput | null,
  abilityScores?: AbilityScores
): SkillPointEstimate {
  const classBase = getClassSkillBase(level.className || build?.classSummary || '');
  const intelligenceModifier = abilityScores ? calculateAbilityModifier(abilityScores.intelligence) : 0;
  const multiplier = level.levelNumber === 1 ? 4 : 1;
  const estimatedAvailable = Math.max(1, classBase + intelligenceModifier) * multiplier;
  const enteredAvailable = level.skillPointsAvailable ?? null;
  const spent = parseSpentSkillPoints(level.skillAllocation);
  const available = enteredAvailable ?? estimatedAvailable;

  return {
    classBase,
    intelligenceModifier,
    estimatedAvailable,
    enteredAvailable,
    spent,
    remaining: level.skillAllocation.trim() ? available - spent : available
  };
}

export function parseSpentSkillPoints(skillAllocation: string): number {
  const matches = skillAllocation.match(/[+-]\s*(\d+)/g) ?? [];
  return matches.reduce((total, match) => total + Number(match.replace(/\D/g, '')), 0);
}

export function splitFeatureNotes(value: string): string[] {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getClassSkillBase(className: string): number {
  const lowerName = className.toLowerCase();
  const foundKey = Object.keys(classSkillBases).find((key) => lowerName.includes(key));
  return foundKey ? classSkillBases[foundKey] : 2;
}

function getInlineFeatCount(level: BuildLevel | BuildLevelInput): number {
  return 'featSelections' in level ? level.featSelections.length : 0;
}
