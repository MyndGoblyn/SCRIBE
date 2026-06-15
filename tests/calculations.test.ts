import { describe, expect, it } from 'vitest';
import { calculateAbilityModifier, calculateFiveESpellDc, calculateNwnSpellDc, calculateSavingThrow } from '../src/shared/calculations';

describe('calculation engine helpers', () => {
  it('uses the standard ability modifier formula', () => {
    expect(calculateAbilityModifier(8)).toBe(-1);
    expect(calculateAbilityModifier(10)).toBe(0);
    expect(calculateAbilityModifier(18)).toBe(4);
    expect(calculateAbilityModifier(25)).toBe(7);
  });

  it('calculates NWN and 3.5e spell DC with trace components', () => {
    const trace = calculateNwnSpellDc(9, 26, [{ label: 'Epic Spell Focus', value: 6, sourceType: 'feat' }]);
    expect(trace.finalValue).toBe(33);
    expect(trace.components.map((component) => component.label)).toContain('Casting ability modifier');
  });

  it('calculates 5e spell save DC', () => {
    const trace = calculateFiveESpellDc(4, 18);
    expect(trace.finalValue).toBe(16);
  });

  it('calculates saving throws from base save, ability, and bonuses', () => {
    const trace = calculateSavingThrow('Fortitude', 12, 16, [{ label: 'Cloak', value: 3, sourceType: 'item' }]);
    expect(trace.finalValue).toBe(18);
  });
});
