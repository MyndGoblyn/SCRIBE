import { describe, expect, it } from 'vitest';
import { parseWikiArticleText } from '../src/renderer/src/features/wikiArticleModel';

describe('wiki article presentation model', () => {
  it('parses headings, paragraphs, and compact fact lists', () => {
    const article = parseWikiArticleText(`
Weapon master is a prestige class focused on melee critical hits.

Requirements

Base attack bonus +5
Weapon Focus in chosen weapon
Whirlwind Attack
`);

    expect(article.blocks[0]).toMatchObject({ type: 'paragraph' });
    expect(article.blocks[1]).toMatchObject({ type: 'heading', text: 'Requirements', id: 'requirements' });
    expect(article.blocks[2]).toMatchObject({
      type: 'list',
      items: ['Base attack bonus +5', 'Weapon Focus in chosen weapon', 'Whirlwind Attack']
    });
    expect(article.summary).toBe('Weapon master is a prestige class focused on melee critical hits.');
    expect(article.headingCount).toBe(1);
  });

  it('does not promote ordinary short sentences to headings', () => {
    const article = parseWikiArticleText(`
Monk.

Monks fight unarmed.
`);

    expect(article.blocks).toEqual([
      { type: 'paragraph', text: 'Monk.' },
      { type: 'paragraph', text: 'Monks fight unarmed.' }
    ]);
  });

  it('turns pipe-delimited progression text into a rendered table model', () => {
    const article = parseWikiArticleText(`
Level progression

Lvl | BAB | Saves | Feats | HP range | Unarmed AB | Flurry of blows AB | Unarmed damage | AC bonus | Speed bonus
Fort | Ref | Will | Medium | Small
1st | +0 | +2 | +2 | +2 | cleave, monk AC bonus, flurry of blows, improved unarmed strike | 4-8 | +0 | -2/-2 | 1d6 | 1d4 | - | -
4th | +3 | +4 | +4 | +4 | - | 16-32 | +3 | +1/+1 | 1d8 | 1d6 | - | +10%
`);

    const table = article.blocks.find((block) => block.type === 'table');

    expect(article.tableCount).toBe(1);
    expect(table).toMatchObject({
      type: 'table',
      headerRowCount: 1,
      columnCount: 13
    });
    expect(table?.rows[0]).toEqual([
      'Lvl',
      'BAB',
      'Fort',
      'Ref',
      'Will',
      'Feats',
      'HP range',
      'Unarmed AB',
      'Flurry of blows AB',
      'Medium',
      'Small',
      'AC bonus',
      'Speed bonus'
    ]);
    expect(table?.rows[1][0]).toBe('1st');
    expect(table?.rows[2][12]).toBe('+10%');
  });
});
