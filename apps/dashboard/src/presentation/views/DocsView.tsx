import { createElement, type ReactNode, useEffect, useMemo, useState } from 'react';
import styles from './DocsView.module.css';

interface DocEntry {
  slug: string;
  title: string;
  path: string;
}

interface DocPage extends DocEntry {
  content: string;
}

interface RenderContext {
  docs: DocEntry[];
  currentDoc: DocPage;
  openDoc: (slug: string) => void;
}

const externalHref = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);

const decodePath = (value: string) =>
  value
    .split('/')
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join('/');

function normalizeSegments(parts: string[]): string[] {
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack;
}

function resolveDocHref(href: string, currentDoc: DocPage, docs: DocEntry[]): DocEntry | null {
  if (!href || externalHref(href) || href.startsWith('#')) return null;
  const cleanHref = decodePath(href.split('#')[0] ?? '').replace(/\.md$/i, '');
  const currentDir = currentDoc.path.split('/').slice(0, -1);
  const candidate = cleanHref.startsWith('/')
    ? normalizeSegments(cleanHref.slice(1).split('/')).join('/')
    : normalizeSegments([...currentDir, ...cleanHref.split('/')]).join('/');
  const normalized = candidate.toLowerCase();
  const loose = cleanHref.toLowerCase();
  return (
    docs.find((doc) => doc.slug.toLowerCase() === normalized) ??
    docs.find((doc) => doc.path.replace(/\.md$/i, '').toLowerCase() === normalized) ??
    docs.find((doc) => doc.slug.toLowerCase() === loose || doc.title.toLowerCase() === loose) ??
    null
  );
}

function slugFromLocation(): string {
  const prefix = '/docs/';
  if (!window.location.pathname.startsWith(prefix)) return 'Index';
  const raw = window.location.pathname.slice(prefix.length);
  if (!raw) return 'Index';
  return decodePath(raw).replace(/\.md$/i, '');
}

function docPath(slug: string): string {
  return `/docs/${slug.split('/').map(encodeURIComponent).join('/')}`;
}

function renderInline(text: string, context: RenderContext, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyPrefix}-${start}`;

    if (token.startsWith('`')) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const label = match[2] ?? '';
      const href = match[3] ?? '';
      const target = resolveDocHref(href, context.currentDoc, context.docs);
      if (target) {
        parts.push(
          <button
            className={styles.docLink}
            key={key}
            type="button"
            onClick={() => context.openDoc(target.slug)}
          >
            {label}
          </button>,
        );
      } else {
        parts.push(
          <a
            key={key}
            href={href}
            target={externalHref(href) ? '_blank' : undefined}
            rel="noreferrer"
          >
            {label}
          </a>,
        );
      }
    }
    last = start + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  return end >= 0 ? normalized.slice(end + 5) : normalized;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableStart(lines: string[], index: number): boolean {
  const current = lines[index]?.trim() ?? '';
  const next = lines[index + 1]?.trim() ?? '';
  return current.includes('|') && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? '';
  return (
    !line.trim() ||
    line.startsWith('```') ||
    /^#{1,6}\s+/.test(line) ||
    /^---+$/.test(line.trim()) ||
    /^>\s?/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    isTableStart(lines, index)
  );
}

function renderMarkdown(content: string, context: RenderContext) {
  const lines = stripFrontmatter(content).split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;
  let skippedTitle = false;

  const inline = (text: string, key: string) => renderInline(text, context, key);

  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').startsWith('```')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      nodes.push(
        <pre key={`code-${index}`} data-language={language || undefined}>
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const text = heading[2] ?? '';
      index += 1;
      if (!skippedTitle && level === 1 && text.trim() === context.currentDoc.title) {
        skippedTitle = true;
        continue;
      }
      nodes.push(
        createElement(
          `h${Math.min(level, 6)}`,
          { key: `heading-${index}` },
          inline(text, `heading-${index}`),
        ),
      );
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const headers = splitTableRow(lines[index] ?? '');
      index += 2;
      const rows: string[][] = [];
      while (
        index < lines.length &&
        (lines[index] ?? '').includes('|') &&
        (lines[index] ?? '').trim()
      ) {
        rows.push(splitTableRow(lines[index] ?? ''));
        index += 1;
      }
      nodes.push(
        <div className={styles.tableWrap} key={`table-${index}`}>
          <table>
            <thead>
              <tr>
                {headers.map((cell, cellIndex) => (
                  <th key={cellIndex}>{inline(cell, `th-${index}-${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{inline(cell, `td-${index}-${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const orderedList = Boolean(ordered);
      const items: string[] = [];
      const matcher = orderedList ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/;
      while (index < lines.length) {
        const item = (lines[index] ?? '').match(matcher);
        if (!item) break;
        items.push(item[1] ?? '');
        index += 1;
      }
      const ListTag = orderedList ? 'ol' : 'ul';
      nodes.push(
        <ListTag key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item, `li-${index}-${itemIndex}`)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }
      nodes.push(
        <blockquote key={`quote-${index}`}>{inline(quote.join(' '), `quote-${index}`)}</blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push((lines[index] ?? '').trim());
      index += 1;
    }
    nodes.push(<p key={`p-${index}`}>{inline(paragraph.join(' '), `p-${index}`)}</p>);
  }

  return nodes;
}

export function DocsView() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [activeSlug, setActiveSlug] = useState(() => slugFromLocation());
  const [activeDoc, setActiveDoc] = useState<DocPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDoc = (slug: string) => {
    setActiveSlug(slug);
    const nextPath = docPath(slug);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  useEffect(() => {
    void fetch('/api/docs')
      .then((res) => res.json())
      .then((data: { docs: DocEntry[] }) => setDocs(data.docs))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const handlePopState = () => setActiveSlug(slugFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    void fetch(`/api/docs/${encodeURIComponent(activeSlug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Doc not found: ${activeSlug}`);
        return (await res.json()) as { doc: DocPage };
      })
      .then((data) => {
        setActiveDoc(data.doc);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [activeSlug]);

  const content = useMemo(
    () =>
      activeDoc
        ? renderMarkdown(activeDoc.content, { docs, currentDoc: activeDoc, openDoc })
        : null,
    [activeDoc, docs],
  );

  return (
    <section className={styles.view}>
      <div className={styles.heading}>
        <div>
          <p>Project documentation</p>
          <h2>Docs Vault</h2>
        </div>
        <span>{docs.length} notes</span>
      </div>
      <div className={styles.layout}>
        <aside className={styles.index} aria-label="Docs index">
          <div className={styles.indexHeader}>
            <strong>Vault index</strong>
            <small>{activeDoc?.path ?? activeSlug}</small>
          </div>
          <nav>
            {docs.map((doc) => (
              <button
                className={doc.slug === activeSlug ? styles.active : ''}
                key={doc.slug}
                type="button"
                onClick={() => openDoc(doc.slug)}
              >
                {doc.title}
                <small>{doc.path}</small>
              </button>
            ))}
          </nav>
        </aside>
        <article className={styles.page}>
          <header className={styles.pageHeader}>
            <p>{activeDoc?.path ?? 'Loading document'}</p>
            <h1>{activeDoc?.title ?? activeSlug}</h1>
          </header>
          <div className={styles.markdown}>
            {error && <p className={styles.missing}>{error}</p>}
            {!error && content}
          </div>
        </article>
      </div>
    </section>
  );
}
