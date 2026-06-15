import { describe, expect, it } from 'vitest';
import { wikiTextToPlainText } from '../scripts/wiki-text.mjs';

describe('NWNWiki wikitext cleanup', () => {
  it('converts common wiki markup into searchable plain text', () => {
    const text = wikiTextToPlainText(`
== Weapon master ==
'''Weapon master''' is a [[prestige class]].
{{main|Critical hit|Weapon focus}}
* Requires [[Weapon Focus|weapon focus]]
<ref>Hidden citation</ref>
[[Category:Prestige classes]]
`);

    expect(text).toContain('Weapon master');
    expect(text).toContain('prestige class');
    expect(text).toContain('weapon focus');
    expect(text).toContain('Prestige classes');
    expect(text).not.toContain('Hidden citation');
    expect(text).not.toContain('[[');
  });

  it('keeps useful table and external link text', () => {
    const text = wikiTextToPlainText(`
{| class="wikitable"
! Feat !! Requirement
|-
| [[Cleave]] || Strength 13
|}
[https://example.test More details]
`);

    expect(text).toContain('Feat');
    expect(text).toContain('Requirement');
    expect(text).toContain('Cleave');
    expect(text).toContain('Strength 13');
    expect(text).toContain('More details');
  });
});
