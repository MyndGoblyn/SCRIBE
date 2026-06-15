import { describe, expect, it } from 'vitest';
import { rankWikiSearchDocuments, type WikiSearchDocument } from '../src/shared/wikiSearch';

const documents: WikiSearchDocument[] = [
  {
    pageId: 1,
    title: 'Arelith monk robes',
    plainText: 'A robe page that mentions monk in passing.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 2,
    title: 'Monk',
    plainText: 'Monks are versatile unarmed combatants with special class abilities.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 3,
    title: 'Rogue',
    plainText: 'Rogues specialize in sneak attacks, traps, and skills.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 4,
    title: 'Ranger',
    plainText: 'Rangers combine martial ability with favored enemy and divine spells.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 5,
    title: 'Spell Focus',
    plainText: 'Spell Focus increases the difficulty class for spells from a chosen school.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 6,
    title: 'Spell focus',
    plainText: 'Spell focus appears many times. Spell focus improves spell focus search noise.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 7,
    title: 'Epic Spell Focus',
    plainText: 'Epic Spell Focus improves spell difficulty class further.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 8,
    title: 'Greater Spell Focus',
    plainText: 'Greater Spell Focus requires Spell Focus.',
    sourceUrl: '',
    touchedAt: ''
  },
  {
    pageId: 9,
    title: 'Armor',
    plainText: 'Armor articles may mention monk, rogue, ranger, and spell focus but are not the target pages.',
    sourceUrl: '',
    touchedAt: ''
  }
];

describe('NWNWiki search relevance', () => {
  it.each(['Monk', 'Rogue', 'Ranger'])('ranks exact class title first for %s', (query) => {
    const results = rankWikiSearchDocuments(query, documents, 5);
    expect(results[0]?.title).toBe(query);
  });

  it('ranks exact multi-word title before related pages', () => {
    const results = rankWikiSearchDocuments('Spell Focus', documents, 5);
    expect(results[0]?.title).toBe('Spell Focus');
    expect(results.map((result) => result.title).slice(1, 4).sort()).toEqual([
      'Epic Spell Focus',
      'Greater Spell Focus',
      'Spell focus'
    ]);
  });

  it('does not return alphabetical body matches ahead of title matches', () => {
    const results = rankWikiSearchDocuments('monk', documents, 5);
    expect(results[0]?.title).toBe('Monk');
    expect(results.findIndex((result) => result.title === 'Armor')).toBeGreaterThan(0);
  });
});
