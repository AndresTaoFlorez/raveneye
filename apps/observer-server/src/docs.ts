import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';

export interface DocEntry {
  slug: string;
  title: string;
  path: string;
}

export interface DocPage extends DocEntry {
  content: string;
}

function titleFromMarkdown(path: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading ?? basename(path, '.md');
}

function isInside(root: string, file: string): boolean {
  const rel = relative(root, file);
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel));
}

async function collectMarkdownFiles(root: string, dir = root): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(root, path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    }),
  );
  return files.flat();
}

export async function listDocs(docsVaultDir: string): Promise<DocEntry[]> {
  const root = resolve(docsVaultDir);
  const files = await collectMarkdownFiles(root);
  const docs = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const rel = relative(root, file).replaceAll('\\', '/');
      return {
        slug: rel.replace(/\.md$/, ''),
        title: titleFromMarkdown(file, content),
        path: rel,
      };
    }),
  );
  return docs.sort((a, b) => a.path.localeCompare(b.path));
}

export async function readDoc(docsVaultDir: string, slug = 'Index'): Promise<DocPage | null> {
  const root = resolve(docsVaultDir);
  const normalizedSlug = slug.replaceAll('\\', '/').replace(/\.md$/, '');
  const file = resolve(root, `${normalizedSlug}.md`);
  if (!isInside(root, file)) return null;

  try {
    const s = await stat(file);
    if (!s.isFile()) return null;
    const content = await readFile(file, 'utf8');
    const rel = relative(root, file).replaceAll('\\', '/');
    return {
      slug: rel.replace(/\.md$/, ''),
      title: titleFromMarkdown(file, content),
      path: rel,
      content,
    };
  } catch {
    return null;
  }
}
