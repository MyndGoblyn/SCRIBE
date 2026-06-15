const entityMap = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' ']
]);

export function wikiTextToPlainText(wikitext) {
  let text = String(wikitext ?? '');

  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, ' ');
  text = text.replace(/<ref\b[^/]*\/>/gi, ' ');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  for (let index = 0; index < 10; index += 1) {
    const next = text.replace(/\{\{([^{}]*)\}\}/g, (_match, body) => {
      const parts = String(body)
        .split('|')
        .map((part) => part.replace(/^[^=|]+=/, '').trim())
        .filter(Boolean);
      return parts.slice(1).join(' ');
    });
    if (next === text) break;
    text = next;
  }

  text = text.replace(/^\{\|.*$/gm, ' ');
  text = text.replace(/^\|\}.*$/gm, ' ');
  text = text.replace(/^\|-.*$/gm, ' ');
  text = text.replace(/^[!|]\s*/gm, ' ');

  text = text.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, ' ');
  text = text.replace(/\[\[Category:([^\]|]+)(?:\|[^\]]*)?\]\]/gi, '$1');
  text = text.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  text = text.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/gi, '$1');
  text = text.replace(/\[https?:\/\/[^\]]+\]/gi, ' ');

  text = text.replace(/={2,}\s*([^=]+?)\s*={2,}/g, '\n$1\n');
  text = text.replace(/'''?/g, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/^[:*#;]+/gm, ' ');
  text = text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity) => decodeEntity(entity));
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}

function decodeEntity(entity) {
  const normalized = String(entity).toLowerCase();
  if (normalized.startsWith('#x')) {
    return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
  }
  if (normalized.startsWith('#')) {
    return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
  }
  return entityMap.get(normalized) ?? `&${entity};`;
}
