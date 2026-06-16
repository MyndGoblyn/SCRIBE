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

  text = convertWikiTables(text);
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

function convertWikiTables(text) {
  const lines = String(text).split(/\r?\n/);
  const output = [];
  let inTable = false;
  let currentRow = [];

  const flushRow = () => {
    const cells = currentRow.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length > 0) {
      output.push(cells.join(' | '));
    }
    currentRow = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inTable && trimmed.startsWith('{|')) {
      inTable = true;
      currentRow = [];
      output.push('');
      continue;
    }

    if (!inTable) {
      output.push(line);
      continue;
    }

    if (trimmed.startsWith('|}')) {
      flushRow();
      inTable = false;
      output.push('');
      continue;
    }

    if (trimmed.startsWith('|-')) {
      flushRow();
      continue;
    }

    if (trimmed.startsWith('!') || trimmed.startsWith('|')) {
      const marker = trimmed.charAt(0);
      const delimiter = marker === '!' ? '!!' : '||';
      const cells = splitTableCells(trimmed.slice(1), delimiter)
        .map(cleanTableCell)
        .filter(Boolean);
      currentRow.push(...cells);
      continue;
    }

    if (trimmed.length > 0 && currentRow.length > 0) {
      currentRow[currentRow.length - 1] = `${currentRow[currentRow.length - 1]} ${trimmed}`;
    }
  }

  if (inTable) {
    flushRow();
  }

  return output.join('\n');
}

function splitTableCells(value, delimiter) {
  const cells = [];
  let start = 0;
  let linkDepth = 0;
  let templateDepth = 0;
  const source = String(value);

  for (let index = 0; index < source.length; index += 1) {
    if (source.startsWith('[[', index)) {
      linkDepth += 1;
      index += 1;
      continue;
    }
    if (source.startsWith(']]', index) && linkDepth > 0) {
      linkDepth -= 1;
      index += 1;
      continue;
    }
    if (source.startsWith('{{', index)) {
      templateDepth += 1;
      index += 1;
      continue;
    }
    if (source.startsWith('}}', index) && templateDepth > 0) {
      templateDepth -= 1;
      index += 1;
      continue;
    }
    if (linkDepth === 0 && templateDepth === 0 && source.startsWith(delimiter, index)) {
      cells.push(source.slice(start, index));
      start = index + delimiter.length;
      index += delimiter.length - 1;
    }
  }

  cells.push(source.slice(start));
  return cells;
}

function cleanTableCell(cell) {
  const rawValue = String(cell);
  const hadNonBreakingSpace = /&nbsp;/i.test(rawValue);
  let value = rawValue.replace(/&nbsp;/gi, ' ').trim();
  const attributeDelimiter = findTableAttributeDelimiter(value);
  if (attributeDelimiter >= 0) {
    value = value.slice(attributeDelimiter + 1).trim();
  }
  value = value.replace(/[ \t]{2,}/g, ' ').trim();
  if (!value) {
    return hadNonBreakingSpace ? '' : '-';
  }
  return value;
}

function findTableAttributeDelimiter(value) {
  let linkDepth = 0;
  let templateDepth = 0;
  let quote = '';

  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);

    if (quote) {
      if (character === quote) {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (value.startsWith('[[', index)) {
      linkDepth += 1;
      index += 1;
      continue;
    }
    if (value.startsWith(']]', index) && linkDepth > 0) {
      linkDepth -= 1;
      index += 1;
      continue;
    }
    if (value.startsWith('{{', index)) {
      templateDepth += 1;
      index += 1;
      continue;
    }
    if (value.startsWith('}}', index) && templateDepth > 0) {
      templateDepth -= 1;
      index += 1;
      continue;
    }

    if (character === '|' && linkDepth === 0 && templateDepth === 0) {
      const prefix = value.slice(0, index).trim();
      return isTableAttributePrefix(prefix) ? index : -1;
    }
  }

  return -1;
}

function isTableAttributePrefix(prefix) {
  if (!prefix) {
    return false;
  }

  const attributePattern = /^(?:[a-z][\w:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|]+))?\s*)+$/i;
  const knownTableAttribute =
    /(?:^|\s)(?:abbr|align|bgcolor|class|colspan|data-[\w:-]+|height|id|lang|rowspan|scope|style|title|valign|width)\b/i;
  return attributePattern.test(prefix) && knownTableAttribute.test(prefix);
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
