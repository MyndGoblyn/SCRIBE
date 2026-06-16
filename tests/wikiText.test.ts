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

    expect(text).toContain('Feat | Requirement');
    expect(text).toContain('Cleave | Strength 13');
    expect(text).toContain('Feat');
    expect(text).toContain('Requirement');
    expect(text).toContain('Cleave');
    expect(text).toContain('Strength 13');
    expect(text).toContain('More details');
  });

  it('converts MediaWiki table attributes into readable progression rows', () => {
    const text = wikiTextToPlainText(`
== Level progression ==

{|border="2" style="background:#efefef; color:#000000; border-collapse:collapse"
|-style="background:#c0c0c0"
!rowspan=2|Lvl
!rowspan=2|BAB
!colspan="3"|Saves
!rowspan=2|Feats
!rowspan=2|HP range
!style="background:#ffffff" rowspan="22"|&nbsp;
!rowspan=2|Unarmed AB
!rowspan=2|Flurry of blows AB
!colspan="2"|Unarmed damage
!rowspan=2|AC bonus
!rowspan=2|Speed bonus
|-style="background:#c0c0c0"
!Fort
!Ref
!Will
!Medium
!Small
|-valign="top" align="center"
|1st
| +0
| +2
| +2
| +2
|align="left"|[[cleave]], [[monk AC bonus]],<br />[[flurry of blows]], [[improved unarmed strike]]
|4-8
| +0
| -2/-2
|1d6
|1d4
| -
| -
|-align="center"
|4th
| +3
| +4
| +4
| +4
|align="left"|
|16-32
| +3
| +1/+1
|1d8
|1d6
| -
| +10%
|}
`);

    expect(text).toContain('Lvl | BAB | Saves | Feats | HP range | Unarmed AB | Flurry of blows AB | Unarmed damage | AC bonus | Speed bonus');
    expect(text).toContain('Fort | Ref | Will | Medium | Small');
    expect(text).toContain(
      '1st | +0 | +2 | +2 | +2 | cleave, monk AC bonus, flurry of blows, improved unarmed strike | 4-8 | +0 | -2/-2 | 1d6 | 1d4 | - | -'
    );
    expect(text).toContain('4th | +3 | +4 | +4 | +4 | - | 16-32 | +3 | +1/+1 | 1d8 | 1d6 | - | +10%');
    expect(text).not.toContain('rowspan');
    expect(text).not.toContain('colspan');
    expect(text).not.toContain('align=');
    expect(text).not.toContain('style=');
  });
});
