import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { parseWikiArticleText, type WikiArticleBlock } from '../features/wikiArticleModel';

export function WikiArticle({ compact = false, plainText }: { compact?: boolean; plainText: string }): ReactElement {
  const article = useMemo(() => parseWikiArticleText(plainText), [plainText]);

  if (article.blocks.length === 0) {
    return <p className="empty-line">No article text available.</p>;
  }

  return (
    <div className={compact ? 'wiki-article compact' : 'wiki-article'}>
      {!compact && (
        <div className="wiki-article-metrics" aria-label="Article structure">
          <ArticleMetric count={article.wordCount} singularLabel="word" />
          <ArticleMetric count={article.headingCount} singularLabel="section" />
          <ArticleMetric count={article.tableCount} singularLabel="table" />
        </div>
      )}
      {article.blocks.map((block, index) => renderArticleBlock(block, index))}
    </div>
  );
}

function ArticleMetric({ count, singularLabel }: { count: number; singularLabel: string }): ReactElement {
  return (
    <span>
      <strong>{count.toLocaleString()}</strong> {count === 1 ? singularLabel : `${singularLabel}s`}
    </span>
  );
}

function renderArticleBlock(block: WikiArticleBlock, index: number): ReactElement {
  switch (block.type) {
    case 'heading':
      return (
        <h4 className={`wiki-article-heading level-${block.level}`} id={block.id} key={`${block.id}-${index}`}>
          {block.text}
        </h4>
      );
    case 'list':
      return (
        <ul className="wiki-article-list" key={`list-${index}`}>
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    case 'table':
      return <WikiArticleTable block={block} index={index} key={`table-${index}`} />;
    case 'paragraph':
    default:
      return <p key={`paragraph-${index}`}>{block.text}</p>;
  }
}

function WikiArticleTable({ block, index }: { block: Extract<WikiArticleBlock, { type: 'table' }>; index: number }): ReactElement {
  const headerRows = block.rows.slice(0, block.headerRowCount);
  const bodyRows = block.rows.slice(block.headerRowCount);

  return (
    <div className="wiki-table-wrap" key={`table-wrap-${index}`}>
      <table className="wiki-data-table">
        {headerRows.length > 0 && (
          <thead>
            {headerRows.map((row, rowIndex) => (
              <tr key={`header-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <th key={`${cell}-${cellIndex}`}>{cell}</th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
