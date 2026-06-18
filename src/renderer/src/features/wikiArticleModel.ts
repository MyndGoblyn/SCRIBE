export type WikiArticleBlock =
  | { type: 'heading'; id: string; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][]; headerRowCount: number; columnCount: number };

export interface WikiArticleViewModel {
  blocks: WikiArticleBlock[];
  headingCount: number;
  summary: string;
  tableCount: number;
  wordCount: number;
}

const knownHeaderGroups = new Map<string, number>([
  ['saves', 3],
  ['saving throws', 3],
  ['unarmed damage', 2],
  ['damage', 2]
]);

const listHeadingPattern = /\b(?:requirement|prerequisite|feat|skill|proficien|special|notes?|use|benefit|penalt|class features?)\b/i;

export function parseWikiArticleText(plainText: string): WikiArticleViewModel {
  const blocks: WikiArticleBlock[] = [];
  const usedHeadingIds = new Map<string, number>();
  let previousHeading = '';

  for (const textBlock of splitTextBlocks(plainText)) {
    const lines = textBlock
      .split('\n')
      .map((line) => normalizeLine(line))
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const table = parseTableBlock(lines);
    if (table) {
      blocks.push(table);
      previousHeading = '';
      continue;
    }

    if (isListBlock(lines, previousHeading)) {
      blocks.push({
        type: 'list',
        items: lines.map((line) => line.replace(/^[-*#]\s+/, '').trim()).filter(Boolean)
      });
      previousHeading = '';
      continue;
    }

    if (lines.length === 1 && isHeadingCandidate(lines[0])) {
      const text = lines[0];
      previousHeading = text;
      blocks.push({ type: 'heading', id: uniqueHeadingId(text, usedHeadingIds), level: 2, text });
      continue;
    }

    blocks.push({ type: 'paragraph', text: lines.join(' ') });
    previousHeading = '';
  }

  const paragraphs = blocks.filter((block): block is Extract<WikiArticleBlock, { type: 'paragraph' }> => block.type === 'paragraph');
  const tableCount = blocks.filter((block) => block.type === 'table').length;
  const headingCount = blocks.filter((block) => block.type === 'heading').length;
  const fullText = blocks
    .map((block) => {
      if (block.type === 'paragraph') return block.text;
      if (block.type === 'heading') return block.text;
      if (block.type === 'list') return block.items.join(' ');
      return block.rows.flat().join(' ');
    })
    .join(' ');

  return {
    blocks,
    headingCount,
    summary: summarize(paragraphs[0]?.text ?? ''),
    tableCount,
    wordCount: countWords(fullText)
  };
}

function splitTextBlocks(plainText: string): string[] {
  return String(plainText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function normalizeLine(line: string): string {
  return line.replace(/[ \t]{2,}/g, ' ').trim();
}

function parseTableBlock(lines: string[]): Extract<WikiArticleBlock, { type: 'table' }> | null {
  const rows = lines.map(parseTableRow);
  const tableRows = rows.filter((row) => row.length >= 2);

  if (lines.length < 2 || tableRows.length < 2 || tableRows.length !== rows.length) {
    return null;
  }

  const normalizedRows = normalizeTableHeaderRows(rows);
  const columnCount = Math.max(...normalizedRows.map((row) => row.length));
  const paddedRows = normalizedRows.map((row) => row.concat(Array.from({ length: Math.max(columnCount - row.length, 0) }, () => '')));

  return {
    type: 'table',
    rows: paddedRows,
    headerRowCount: detectHeaderRowCount(paddedRows),
    columnCount
  };
}

function parseTableRow(line: string): string[] {
  return line
    .split(/\s+\|\s+|\|/)
    .map((cell) => normalizeLine(cell))
    .filter((cell) => cell.length > 0);
}

function normalizeTableHeaderRows(rows: string[][]): string[][] {
  if (rows.length < 3) {
    return rows;
  }

  const [firstRow, secondRow, ...restRows] = rows;
  const widestBodyRow = Math.max(...restRows.map((row) => row.length), firstRow.length, secondRow.length);

  if (firstRow.length >= widestBodyRow || !isHeaderLikeRow(firstRow) || !isHeaderLikeRow(secondRow)) {
    return rows;
  }

  const expandedHeader: string[] = [];
  let secondRowIndex = 0;
  let expanded = false;

  for (const cell of firstRow) {
    const groupSize = knownHeaderGroups.get(normalizeHeaderKey(cell));
    if (groupSize && secondRowIndex + groupSize <= secondRow.length) {
      expandedHeader.push(...secondRow.slice(secondRowIndex, secondRowIndex + groupSize));
      secondRowIndex += groupSize;
      expanded = true;
      continue;
    }

    expandedHeader.push(cell);
  }

  if (expanded && secondRowIndex === secondRow.length && expandedHeader.length === widestBodyRow) {
    return [expandedHeader, ...restRows];
  }

  return rows;
}

function normalizeHeaderKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectHeaderRowCount(rows: string[][]): number {
  const firstDataRowIndex = rows.findIndex((row) => looksLikeDataRow(row));
  if (firstDataRowIndex <= 0) {
    return isHeaderLikeRow(rows[0] ?? []) ? 1 : 0;
  }
  return Math.min(firstDataRowIndex, 2);
}

function looksLikeDataRow(row: string[]): boolean {
  const meaningfulCells = row.filter(Boolean);
  if (meaningfulCells.length === 0) {
    return false;
  }

  const firstCell = meaningfulCells[0] ?? '';
  return isNumericLike(firstCell) || /^\d+(?:st|nd|rd|th)$/i.test(firstCell) || /^\+\d/.test(firstCell);
}

function isHeaderLikeRow(row: string[]): boolean {
  const meaningfulCells = row.filter(Boolean);
  if (meaningfulCells.length === 0) {
    return false;
  }

  const nonNumericCells = meaningfulCells.filter((cell) => !isNumericLike(cell)).length;
  return nonNumericCells / meaningfulCells.length >= 0.65;
}

function isNumericLike(value: string): boolean {
  const normalized = value.trim();
  return /^[-+]?\d/.test(normalized) || /^\d+d\d+/i.test(normalized) || /^-+$/.test(normalized);
}

function isListBlock(lines: string[], previousHeading: string): boolean {
  if (lines.length < 2) {
    return false;
  }

  if (lines.every((line) => /^[-*#]\s+/.test(line))) {
    return true;
  }

  if (listHeadingPattern.test(previousHeading)) {
    return lines.every((line) => line.length <= 180);
  }

  return lines.length <= 8 && lines.every((line) => wordCountForLine(line) <= 12 && !line.includes('|'));
}

function isHeadingCandidate(line: string): boolean {
  if (line.length > 90 || line.includes('|')) {
    return false;
  }

  if (/[.!?]$/.test(line)) {
    return false;
  }

  const words = line.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 8;
}

function uniqueHeadingId(text: string, usedHeadingIds: Map<string, number>): string {
  const baseId = slugify(text) || 'section';
  const nextIndex = usedHeadingIds.get(baseId) ?? 0;
  usedHeadingIds.set(baseId, nextIndex + 1);
  return nextIndex === 0 ? baseId : `${baseId}-${nextIndex + 1}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function summarize(text: string): string {
  if (text.length <= 260) {
    return text;
  }

  return `${text.slice(0, 257).trim()}...`;
}

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function wordCountForLine(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}
