export interface WikiSearchDocument {
  pageId: number;
  title: string;
  plainText: string;
  sourceUrl: string;
  touchedAt: string;
}

export interface RankedWikiSearchDocument extends WikiSearchDocument {
  score: number;
  snippet: string;
}

const stopWords = new Set(['a', 'an', 'and', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

export function rankWikiSearchDocuments(query: string, documents: WikiSearchDocument[], limit: number): RankedWikiSearchDocument[] {
  const parsedQuery = parseWikiSearchQuery(query);
  if (!parsedQuery) {
    return [];
  }

  return documents
    .map((document) => {
      let score = scoreWikiSearchDocument(parsedQuery, document.title, document.plainText);
      if (document.title.trim() === query.trim()) {
        score += 2500;
      }
      return {
        ...document,
        score,
        snippet: createWikiSearchSnippet(document.plainText, parsedQuery)
      };
    })
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}

export function parseWikiSearchQuery(query: string): { phrase: string; terms: string[] } | null {
  const phrase = normalizeSearchText(query);
  if (phrase.length < 2) {
    return null;
  }

  const terms = [...new Set(phrase.split(' ').filter((term) => term.length >= 2 && !stopWords.has(term)))];
  return {
    phrase,
    terms: terms.length > 0 ? terms : [phrase]
  };
}

export function scoreWikiSearchDocument(
  parsedQuery: { phrase: string; terms: string[] },
  title: string,
  plainText: string
): number {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedText = normalizeSearchText(plainText);
  const { phrase, terms } = parsedQuery;
  let score = 0;

  if (normalizedTitle === phrase) {
    score += 10000;
  } else if (normalizedTitle.startsWith(`${phrase} `) || normalizedTitle.startsWith(phrase)) {
    score += 8000;
  } else if (containsWholePhrase(normalizedTitle, phrase)) {
    score += 6000;
  }

  if (terms.every((term) => containsWholeWord(normalizedTitle, term))) {
    score += 3500;
  }

  if (containsWholePhrase(normalizedText, phrase)) {
    score += 900;
  }

  if (terms.every((term) => containsWholeWord(normalizedText, term))) {
    score += 450;
  }

  for (const term of terms) {
    if (normalizedTitle === term) {
      score += 4500;
    } else if (normalizedTitle.startsWith(`${term} `) || normalizedTitle.startsWith(term)) {
      score += 2500;
    } else if (containsWholeWord(normalizedTitle, term)) {
      score += 1800;
    } else if (normalizedTitle.includes(term)) {
      score += 900;
    }

    const wholeTextCount = countWholeWord(normalizedText, term);
    if (wholeTextCount > 0) {
      score += Math.min(wholeTextCount, 12) * 40;
    } else if (normalizedText.includes(term)) {
      score += 20;
    }
  }

  if (score > 0) {
    score += Math.max(0, 120 - normalizedTitle.length);
  }

  return score;
}

export function createWikiSearchSnippet(plainText: string, parsedQuery: { phrase: string; terms: string[] }): string {
  const normalizedText = normalizeSearchText(plainText);
  const needles = [parsedQuery.phrase, ...parsedQuery.terms].filter((needle) => needle.length > 0);
  let index = -1;
  let needleLength = 0;

  for (const needle of needles) {
    index = normalizedText.indexOf(needle);
    if (index >= 0) {
      needleLength = needle.length;
      break;
    }
  }

  if (index < 0) {
    return plainText.slice(0, 240);
  }

  const start = Math.max(0, index - 90);
  const end = Math.min(plainText.length, index + needleLength + 150);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < plainText.length ? '...' : '';
  return `${prefix}${plainText.slice(start, end)}${suffix}`;
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9'\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWholePhrase(value: string, phrase: string): boolean {
  if (!phrase.includes(' ')) {
    return containsWholeWord(value, phrase);
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}($|[^a-z0-9])`, 'i').test(value);
}

function containsWholeWord(value: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`, 'i').test(value);
}

function countWholeWord(value: string, term: string): number {
  return Array.from(value.matchAll(new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`, 'gi'))).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
