import type { AbilityScores } from './contracts';

export type AbilityKey = keyof AbilityScores;

export interface CalculationComponent {
  label: string;
  value: number;
  sourceType: 'ability' | 'class' | 'race' | 'feat' | 'item' | 'spell' | 'server_rule' | 'custom';
  sourceId?: string;
}

export interface CalculationTrace {
  target: string;
  finalValue: number;
  components: CalculationComponent[];
}

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateNwnSpellDc(
  spellLevel: number,
  castingAbilityScore: number,
  bonuses: CalculationComponent[] = []
): CalculationTrace {
  const abilityMod = calculateAbilityModifier(castingAbilityScore);
  const components: CalculationComponent[] = [
    { label: 'Base spell DC', value: 10, sourceType: 'custom' },
    { label: `Spell level ${spellLevel}`, value: spellLevel, sourceType: 'spell' },
    { label: 'Casting ability modifier', value: abilityMod, sourceType: 'ability' },
    ...bonuses
  ];

  return {
    target: 'NWN/3.5e Spell DC',
    finalValue: components.reduce((total, component) => total + component.value, 0),
    components
  };
}

export function calculateFiveESpellDc(
  proficiencyBonus: number,
  castingAbilityScore: number,
  bonuses: CalculationComponent[] = []
): CalculationTrace {
  const abilityMod = calculateAbilityModifier(castingAbilityScore);
  const components: CalculationComponent[] = [
    { label: 'Base spell DC', value: 8, sourceType: 'custom' },
    { label: 'Proficiency bonus', value: proficiencyBonus, sourceType: 'class' },
    { label: 'Casting ability modifier', value: abilityMod, sourceType: 'ability' },
    ...bonuses
  ];

  return {
    target: '5e Spell Save DC',
    finalValue: components.reduce((total, component) => total + component.value, 0),
    components
  };
}

export function calculateSavingThrow(
  target: string,
  baseSave: number,
  abilityScore: number,
  bonuses: CalculationComponent[] = []
): CalculationTrace {
  const abilityMod = calculateAbilityModifier(abilityScore);
  const components: CalculationComponent[] = [
    { label: 'Base save', value: baseSave, sourceType: 'class' },
    { label: 'Ability modifier', value: abilityMod, sourceType: 'ability' },
    ...bonuses
  ];

  return {
    target,
    finalValue: components.reduce((total, component) => total + component.value, 0),
    components
  };
}
