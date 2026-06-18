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
  featCount: number;
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

export interface AutoLevelMetrics {
  hitPointsGained: number | null;
  baseAttackBonus: number | null;
  fortitudeSave: number | null;
  reflexSave: number | null;
  willSave: number | null;
  skillPointsAvailable: number | null;
  classRank: number;
  hitDie: number | null;
  skillBase: number | null;
  note: string;
}

export interface LevelCellView {
  classAbbreviation: string;
  hasFeat: boolean;
  hasAbilityIncrease: boolean;
  hasWarning: boolean;
  isComplete: boolean;
}

export interface BuildLevelGuideRow {
  id: string;
  levelNumber: number;
  className: string;
  classRank: number | null;
  classLabel: string;
  abilityIncrease: string;
  choiceLabel: string;
  source: FeatSource | null;
  sourceLabel: string;
  skills: string;
  isPlanned: boolean;
  hasWarning: boolean;
  isDuplicateChoice: boolean;
}

export interface BuildLevelGuideSection {
  id: string;
  title: string;
  rows: BuildLevelGuideRow[];
}

export type SourceBadgeTone = 'selected' | 'automatic' | 'server' | 'custom' | 'override';

type BabProgression = 'full' | 'threeQuarter' | 'half';
type SaveProgression = 'good' | 'poor';

interface NwnClassRule {
  aliases: string[];
  hitDie: number;
  skillBase: number;
  bab: BabProgression;
  fortitude: SaveProgression;
  reflex: SaveProgression;
  will: SaveProgression;
}

const nwnClassRules: Record<string, NwnClassRule> = {
  barbarian: { aliases: ['barbarian'], hitDie: 12, skillBase: 4, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  bard: { aliases: ['bard'], hitDie: 6, skillBase: 4, bab: 'threeQuarter', fortitude: 'poor', reflex: 'good', will: 'good' },
  cleric: { aliases: ['cleric'], hitDie: 8, skillBase: 2, bab: 'threeQuarter', fortitude: 'good', reflex: 'poor', will: 'good' },
  druid: { aliases: ['druid'], hitDie: 8, skillBase: 4, bab: 'threeQuarter', fortitude: 'good', reflex: 'poor', will: 'good' },
  fighter: { aliases: ['fighter'], hitDie: 10, skillBase: 2, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  monk: { aliases: ['monk'], hitDie: 8, skillBase: 4, bab: 'threeQuarter', fortitude: 'good', reflex: 'good', will: 'good' },
  paladin: { aliases: ['paladin'], hitDie: 10, skillBase: 2, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  ranger: { aliases: ['ranger'], hitDie: 10, skillBase: 4, bab: 'full', fortitude: 'good', reflex: 'good', will: 'poor' },
  rogue: { aliases: ['rogue'], hitDie: 6, skillBase: 8, bab: 'threeQuarter', fortitude: 'poor', reflex: 'good', will: 'poor' },
  sorcerer: { aliases: ['sorcerer'], hitDie: 4, skillBase: 2, bab: 'half', fortitude: 'poor', reflex: 'poor', will: 'good' },
  wizard: { aliases: ['wizard'], hitDie: 4, skillBase: 2, bab: 'half', fortitude: 'poor', reflex: 'poor', will: 'good' },
  arcaneArcher: { aliases: ['arcane archer'], hitDie: 8, skillBase: 4, bab: 'full', fortitude: 'poor', reflex: 'good', will: 'poor' },
  assassin: { aliases: ['assassin'], hitDie: 6, skillBase: 4, bab: 'threeQuarter', fortitude: 'poor', reflex: 'good', will: 'poor' },
  blackguard: { aliases: ['blackguard'], hitDie: 10, skillBase: 2, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  champion: { aliases: ['champion of torm', 'champion'], hitDie: 10, skillBase: 2, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  defender: { aliases: ['dwarven defender', 'defender'], hitDie: 12, skillBase: 2, bab: 'full', fortitude: 'good', reflex: 'poor', will: 'poor' },
  harper: { aliases: ['harper scout', 'harper'], hitDie: 6, skillBase: 4, bab: 'threeQuarter', fortitude: 'poor', reflex: 'good', will: 'good' },
  paleMaster: { aliases: ['pale master'], hitDie: 6, skillBase: 2, bab: 'half', fortitude: 'poor', reflex: 'poor', will: 'good' },
  redDragonDisciple: { aliases: ['red dragon disciple'], hitDie: 12, skillBase: 2, bab: 'threeQuarter', fortitude: 'good', reflex: 'poor', will: 'good' },
  shadowdancer: { aliases: ['shadowdancer'], hitDie: 8, skillBase: 6, bab: 'threeQuarter', fortitude: 'poor', reflex: 'good', will: 'poor' },
  shifter: { aliases: ['shifter'], hitDie: 8, skillBase: 4, bab: 'threeQuarter', fortitude: 'good', reflex: 'poor', will: 'good' },
  weaponMaster: { aliases: ['weapon master'], hitDie: 10, skillBase: 2, bab: 'full', fortitude: 'poor', reflex: 'poor', will: 'good' }
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
      detail: hasWarnings ? 'Review level notes before locking.' : 'No level issues recorded.',
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

  return {
    completionPercent,
    plannedLevelCount,
    levelCap,
    featCount: featSelections.length,
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

export function getBuildLevelGuideSections(
  levelCap: number,
  levels: BuildLevel[],
  featSelections: FeatSelection[]
): BuildLevelGuideSection[] {
  const normalizedLevelCap = Math.max(0, Math.min(60, levelCap));
  const sortedLevels = [...levels].sort((left, right) => left.levelNumber - right.levelNumber);
  const levelsByNumber = new Map(sortedLevels.map((level) => [level.levelNumber, level]));
  const featsByLevelId = new Map<string, FeatSelection[]>();
  const classRanksByLevel = new Map<number, number>();
  const classCounts = new Map<string, number>();

  for (const feat of featSelections) {
    featsByLevelId.set(feat.buildLevelId, [...(featsByLevelId.get(feat.buildLevelId) ?? []), feat]);
  }

  for (const level of sortedLevels) {
    const className = level.className.trim();
    if (!className) continue;
    const classKey = className.toLowerCase();
    const nextRank = (classCounts.get(classKey) ?? 0) + 1;
    classCounts.set(classKey, nextRank);
    classRanksByLevel.set(level.levelNumber, nextRank);
  }

  const rows: BuildLevelGuideRow[] = [];

  for (let levelNumber = 1; levelNumber <= normalizedLevelCap; levelNumber += 1) {
    const level = levelsByNumber.get(levelNumber) ?? null;
    const className = level?.className.trim() ?? '';
    const classRank = level ? classRanksByLevel.get(level.levelNumber) ?? null : null;
    const choices = getGuideChoices(level, featsByLevelId.get(level?.id ?? '') ?? []);
    const renderedChoices = choices.length > 0 ? choices : [{ label: '--', source: null }];

    for (const [choiceIndex, choice] of renderedChoices.entries()) {
      const isDuplicateChoice = choiceIndex > 0;
      rows.push({
        id: `${levelNumber}-${choiceIndex}`,
        levelNumber,
        className,
        classRank,
        classLabel: className && classRank ? `${className} ${classRank}` : className || '--',
        abilityIncrease: !isDuplicateChoice && level?.abilityIncrease.trim() ? level.abilityIncrease.trim() : '--',
        choiceLabel: choice.label,
        source: choice.source,
        sourceLabel: choice.source ? formatFeatSourceLabel(choice.source) : '--',
        skills: isDuplicateChoice ? (level?.skillAllocation.trim() ? 'Same' : '--') : level?.skillAllocation.trim() || '--',
        isPlanned: Boolean(className || level?.skillAllocation.trim() || level?.abilityIncrease.trim() || level?.classFeatureNotes.trim()),
        hasWarning: Boolean(level?.validationWarnings.length),
        isDuplicateChoice
      });
    }
  }

  return groupGuideRowsIntoSections(rows);
}

export function getAutoLevelMetrics(
  level: BuildLevel | BuildLevelInput,
  build: Build | BuildInput | null,
  levels: Array<BuildLevel | BuildLevelInput>,
  abilityScores?: AbilityScores
): AutoLevelMetrics {
  const classRule = getClassRule(level.className);
  const classRank = getClassRankAtLevel(level, levels);
  const constitutionModifier = abilityScores ? calculateAbilityModifier(abilityScores.constitution) : 0;
  const intelligenceModifier = abilityScores ? calculateAbilityModifier(abilityScores.intelligence) : 0;

  if (!classRule || !level.className.trim()) {
    return {
      hitPointsGained: null,
      baseAttackBonus: null,
      fortitudeSave: null,
      reflexSave: null,
      willSave: null,
      skillPointsAvailable: null,
      classRank,
      hitDie: null,
      skillBase: null,
      note: 'Choose a class to calculate NWN metrics.'
    };
  }

  const projectedLevels = getProjectedLevels(level, levels);
  const raceName = build?.raceName ?? '';
  const isHuman = /\bhuman\b/i.test(raceName);
  const multiplier = level.levelNumber === 1 ? 4 : 1;
  const humanSkillBonus = isHuman ? (level.levelNumber === 1 ? 4 : 1) : 0;
  const skillPointsAvailable = Math.max(1, classRule.skillBase + intelligenceModifier) * multiplier + humanSkillBonus;
  const hitPointsGained = Math.max(1, classRule.hitDie + constitutionModifier);

  return {
    hitPointsGained,
    baseAttackBonus: getCumulativeBab(projectedLevels),
    fortitudeSave: getCumulativeSave(projectedLevels, 'fortitude'),
    reflexSave: getCumulativeSave(projectedLevels, 'reflex'),
    willSave: getCumulativeSave(projectedLevels, 'will'),
    skillPointsAvailable,
    classRank,
    hitDie: classRule.hitDie,
    skillBase: classRule.skillBase,
    note: abilityScores
      ? 'Calculated from class progression and ability modifiers.'
      : 'Calculated from class progression. Ability modifiers will apply once Build Plans store ability scores.'
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
  const humanSkillBonus = build?.raceName && /\bhuman\b/i.test(build.raceName) ? (level.levelNumber === 1 ? 4 : 1) : 0;
  const estimatedAvailable = Math.max(1, classBase + intelligenceModifier) * multiplier + humanSkillBonus;
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

export function getSkillAllocationPoints(skillAllocation: string, skillName: string): number {
  const entry = parseSkillAllocationEntries(skillAllocation).find((item) => normalizeSkillName(item.skillName) === normalizeSkillName(skillName));
  return entry?.points ?? 0;
}

export function adjustSkillAllocation(skillAllocation: string, skillName: string, delta: number): string {
  const normalizedTarget = normalizeSkillName(skillName);
  const entries = splitSkillAllocation(skillAllocation);
  let found = false;

  const nextEntries = entries
    .map((entry) => {
      const parsed = parseSkillAllocationEntry(entry);
      if (!parsed || normalizeSkillName(parsed.skillName) !== normalizedTarget) {
        return entry;
      }

      found = true;
      const nextPoints = Math.max(0, parsed.points + delta);
      return nextPoints > 0 ? `${parsed.skillName} +${nextPoints}` : '';
    })
    .filter(Boolean);

  if (!found && delta > 0) {
    nextEntries.push(`${skillName} +${delta}`);
  }

  return nextEntries.join(', ');
}

export function splitFeatureNotes(value: string): string[] {
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getGuideChoices(level: BuildLevel | null, featSelections: FeatSelection[]): Array<{ label: string; source: FeatSource | null }> {
  if (!level) {
    return [];
  }

  return [
    ...featSelections.map((feat) => ({ label: feat.featName, source: feat.source })),
    ...splitFeatureNotes(level.classFeatureNotes).map((feature) => ({ label: feature, source: 'class_grant' as FeatSource }))
  ];
}

function getProjectedLevels(
  currentLevel: BuildLevel | BuildLevelInput,
  levels: Array<BuildLevel | BuildLevelInput>
): Array<BuildLevel | BuildLevelInput> {
  const projected = new Map<number, BuildLevel | BuildLevelInput>();

  for (const level of levels) {
    if (level.levelNumber <= currentLevel.levelNumber) {
      projected.set(level.levelNumber, level);
    }
  }

  projected.set(currentLevel.levelNumber, currentLevel);
  return [...projected.values()].sort((left, right) => left.levelNumber - right.levelNumber);
}

function getClassRankAtLevel(currentLevel: BuildLevel | BuildLevelInput, levels: Array<BuildLevel | BuildLevelInput>): number {
  const className = currentLevel.className.trim();
  if (!className) {
    return 0;
  }

  const projectedLevels = getProjectedLevels(currentLevel, levels);
  const normalizedClassName = normalizeClassName(className);
  return projectedLevels.filter((level) => level.levelNumber <= currentLevel.levelNumber && normalizeClassName(level.className) === normalizedClassName).length;
}

function getCumulativeBab(levels: Array<BuildLevel | BuildLevelInput>): number {
  const classCounts = new Map<string, number>();
  let total = 0;

  for (const level of levels) {
    const classRule = getClassRule(level.className);
    if (!classRule) continue;
    const classKey = getClassRuleKey(level.className) ?? normalizeClassName(level.className);
    const previousRank = classCounts.get(classKey) ?? 0;
    const nextRank = previousRank + 1;
    classCounts.set(classKey, nextRank);
    total += getBabAtClassLevel(classRule.bab, nextRank) - getBabAtClassLevel(classRule.bab, previousRank);
  }

  return total;
}

function getCumulativeSave(levels: Array<BuildLevel | BuildLevelInput>, save: 'fortitude' | 'reflex' | 'will'): number {
  const classCounts = new Map<string, number>();
  let total = 0;

  for (const level of levels) {
    const classRule = getClassRule(level.className);
    if (!classRule) continue;
    const classKey = getClassRuleKey(level.className) ?? normalizeClassName(level.className);
    const previousRank = classCounts.get(classKey) ?? 0;
    const nextRank = previousRank + 1;
    classCounts.set(classKey, nextRank);
    const progression = classRule[save];
    total += getSaveAtClassLevel(progression, nextRank) - getSaveAtClassLevel(progression, previousRank);
  }

  return total;
}

function getBabAtClassLevel(progression: BabProgression, classLevel: number): number {
  if (classLevel <= 0) return 0;
  if (progression === 'full') return classLevel;
  if (progression === 'threeQuarter') return Math.floor(classLevel * 0.75);
  return Math.floor(classLevel * 0.5);
}

function getSaveAtClassLevel(progression: SaveProgression, classLevel: number): number {
  if (classLevel <= 0) return 0;
  return progression === 'good' ? 2 + Math.floor(classLevel / 2) : Math.floor(classLevel / 3);
}

function groupGuideRowsIntoSections(rows: BuildLevelGuideRow[]): BuildLevelGuideSection[] {
  const sections: BuildLevelGuideSection[] = [];
  let currentStart = 0;

  while (currentStart < rows.length) {
    const firstRow = rows[currentStart];
    const className = firstRow.className || 'Unplanned';
    let currentEnd = currentStart;

    while (currentEnd + 1 < rows.length) {
      const nextRow = rows[currentEnd + 1];
      const previousRow = rows[currentEnd];
      const nextClassName = nextRow.className || 'Unplanned';
      if (nextRow.levelNumber !== previousRow.levelNumber && nextClassName !== className) {
        break;
      }
      currentEnd += 1;
    }

    const sectionRows = rows.slice(currentStart, currentEnd + 1);
    const levelNumbers = [...new Set(sectionRows.map((row) => row.levelNumber))];
    const startLevel = levelNumbers[0];
    const endLevel = levelNumbers[levelNumbers.length - 1];
    const levelLabel = startLevel === endLevel ? `Level ${startLevel}` : `Levels ${startLevel}-${endLevel}`;
    const classLabel = className === 'Unplanned' ? className : `${className} ${levelNumbers.length}`;

    sections.push({
      id: `${startLevel}-${endLevel}-${className.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: `${levelLabel}: ${classLabel}`,
      rows: sectionRows
    });

    currentStart = currentEnd + 1;
  }

  return sections;
}

function splitSkillAllocation(skillAllocation: string): string[] {
  return skillAllocation
    .split(/[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSkillAllocationEntries(skillAllocation: string): Array<{ skillName: string; points: number }> {
  return splitSkillAllocation(skillAllocation)
    .map(parseSkillAllocationEntry)
    .filter((entry): entry is { skillName: string; points: number } => Boolean(entry));
}

function parseSkillAllocationEntry(entry: string): { skillName: string; points: number } | null {
  const match = entry.match(/^(.+?)\s*([+-])\s*(\d+)$/);
  if (!match) {
    return null;
  }

  const [, skillName, sign, value] = match;
  const points = Number(value) * (sign === '-' ? -1 : 1);
  return { skillName: skillName.trim(), points };
}

function normalizeSkillName(skillName: string): string {
  return skillName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getClassSkillBase(className: string): number {
  return getClassRule(className)?.skillBase ?? 2;
}

function getClassRule(className: string): NwnClassRule | null {
  const key = getClassRuleKey(className);
  return key ? nwnClassRules[key] : null;
}

function getClassRuleKey(className: string): string | null {
  const normalized = normalizeClassName(className);
  if (!normalized) {
    return null;
  }

  for (const [key, rule] of Object.entries(nwnClassRules)) {
    if (rule.aliases.some((alias) => normalized.includes(normalizeClassName(alias)))) {
      return key;
    }
  }

  return null;
}

function normalizeClassName(className: string): string {
  return className.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getInlineFeatCount(level: BuildLevel | BuildLevelInput): number {
  return 'featSelections' in level ? level.featSelections.length : 0;
}
