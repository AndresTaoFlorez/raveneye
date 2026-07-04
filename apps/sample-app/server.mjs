// Generic sample application used to validate ui-observer.
// Zero dependencies: plain node:http + inline templates.
// Every route exists to exercise one observable behavior (loading state,
// controlled error, overflow, console error, failed request, ...).
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const root = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(join(root, 'public', 'styles.css'), 'utf8');

const nav = `
  <header class="site-header">
    <a class="brand" href="/">Meridian Notes</a>
    <nav aria-label="Main">
      <a href="/">Home</a>
      <a href="/articles">Articles</a>
      <a href="/form">Sign up</a>
      <a href="/long-content">Archive</a>
      <a href="/responsive">Gallery</a>
    </nav>
  </header>`;

function layout(title, body, extraHead = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Meridian Notes</title>
<style>${styles}</style>
${extraHead}
</head>
<body>
${nav}
<main id="main">
${body}
</main>
<footer class="site-footer">Meridian Notes — sample application for ui-observer validation</footer>
</body>
</html>`;
}

const pages = {
  '/': () =>
    layout(
      'Home',
      `
      <h1>Welcome to Meridian Notes</h1>
      <p>A small note-keeping demo used to validate browser observation tooling.</p>
      <div class="card-grid">
        <article class="card"><h2>Quick capture</h2><p>Write down ideas before they escape.</p></article>
        <article class="card"><h2>Collections</h2><p>Group related notes into collections.</p></article>
        <article class="card"><h2>Review</h2><p>Resurface old notes on a schedule.</p></article>
      </div>
      <button id="open-dialog" class="btn">Open dialog</button>
      <dialog id="demo-dialog" aria-labelledby="dialog-title">
        <h2 id="dialog-title">Keyboard shortcuts</h2>
        <p>Press <kbd>n</kbd> for a new note, <kbd>/</kbd> to search.</p>
        <button id="close-dialog" class="btn">Close</button>
      </dialog>
      <script>
        const dlg = document.getElementById('demo-dialog');
        document.getElementById('open-dialog').addEventListener('click', () => dlg.showModal());
        document.getElementById('close-dialog').addEventListener('click', () => dlg.close());
      </script>`,
    ),

  '/articles': () =>
    layout(
      'Articles',
      `
      <h1>Articles</h1>
      <ul class="article-list">
        <li><a href="/articles/1">How note-taking changes thinking</a></li>
        <li><a href="/articles/2">Collections versus tags</a></li>
        <li><a href="/articles/3">A gentle review workflow</a></li>
      </ul>`,
    ),

  '/loading': () =>
    layout(
      'Loading demo',
      `
      <h1>Recent notes</h1>
      <div id="list" aria-busy="true">
        <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
      </div>
      <script>
        fetch('/api/items')
          .then((r) => r.json())
          .then((items) => {
            const el = document.getElementById('list');
            el.removeAttribute('aria-busy');
            el.innerHTML = '<ul>' + items.map((i) => '<li>' + i + '</li>').join('') + '</ul>';
          });
      </script>`,
    ),

  '/error-page': () =>
    layout(
      'Error demo',
      `
      <h1>Your collections</h1>
      <div id="content"><p>Loading collections…</p></div>
      <script>
        fetch('/api/broken')
          .then((r) => {
            if (!r.ok) throw new Error('server returned ' + r.status);
            return r.json();
          })
          .catch((err) => {
            document.getElementById('content').innerHTML =
              '<div class="error-box" role="alert"><strong>Could not load collections.</strong> ' +
              err.message + '. <button class="btn" onclick="location.reload()">Retry</button></div>';
          });
      </script>`,
    ),

  '/long-content': (url) => {
    const overflow = url.searchParams.get('overflow') === '1';
    const paragraphs = Array.from(
      { length: 40 },
      (_, i) =>
        `<p><strong>Entry ${i + 1}.</strong> Notes accumulate over time and the archive grows long. This paragraph exists to force vertical scrolling so scroll behavior can be observed and measured.</p>`,
    ).join('\n');
    const wide = overflow
      ? `<pre class="wide-block">${'wide-unbreakable-content-'.repeat(30)}</pre>`
      : '';
    return layout('Archive', `<h1>Archive</h1>${wide}${paragraphs}`);
  },

  '/responsive': (url) => {
    const broken = url.searchParams.get('broken') === '1';
    const items = Array.from(
      { length: 6 },
      (_, i) => `<figure class="tile"><div class="ph"></div><figcaption>Sketch ${i + 1}</figcaption></figure>`,
    ).join('');
    const brokenBlock = broken
      ? '<div style="width:1200px" class="card">This element has a fixed 1200px width and breaks small viewports on purpose.</div>'
      : '';
    return layout('Gallery', `<h1>Gallery</h1>${brokenBlock}<div class="tile-grid">${items}</div>`);
  },

  '/form': () =>
    layout(
      'Sign up',
      `
      <h1>Create an account</h1>
      <form method="post" action="/api/echo" id="signup">
        <div class="field">
          <label for="name">Full name</label>
          <input id="name" name="name" required>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" required>
        </div>
        <div class="field">
          <!-- Intentionally unlabeled: accessibility inspection should flag it. -->
          <input name="nickname" placeholder="Nickname">
        </div>
        <div class="field">
          <label for="plan">Plan</label>
          <select id="plan" name="plan">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div class="field">
          <label><input type="checkbox" name="updates" value="yes"> Send me product updates</label>
        </div>
        <button type="submit" class="btn">Sign up</button>
      </form>`,
    ),

  '/console-error': () =>
    layout(
      'Console error demo',
      `
      <h1>Diagnostics page</h1>
      <p>This page intentionally produces console output and an uncaught exception.</p>
      <script>
        console.warn('sample-app: low disk space warning (intentional)');
        console.error('sample-app: failed to initialize widget (intentional)');
        setTimeout(() => {
          throw new Error('sample-app: intentional uncaught exception');
        }, 100);
      </script>`,
    ),

  '/network-fail': () =>
    layout(
      'Network failure demo',
      `
      <h1>Sync status</h1>
      <ul id="results"></ul>
      <script>
        const log = (msg) => {
          const li = document.createElement('li');
          li.textContent = msg;
          document.getElementById('results').appendChild(li);
        };
        fetch('/api/missing').then((r) => log('/api/missing -> ' + r.status));
        fetch('/api/broken').then((r) => log('/api/broken -> ' + r.status));
        fetch('/api/secure-data', { headers: { Authorization: 'Bearer sample-secret-token-12345' } })
          .then((r) => log('/api/secure-data -> ' + r.status));
        const ctl = new AbortController();
        fetch('/api/slow', { signal: ctl.signal }).catch(() => log('/api/slow -> aborted'));
        setTimeout(() => ctl.abort(), 300);
      </script>`,
    ),
};

function articlePage(id) {
  const titles = {
    1: 'How note-taking changes thinking',
    2: 'Collections versus tags',
    3: 'A gentle review workflow',
  };
  const title = titles[id];
  if (!title) return null;
  return layout(
    title,
    `<h1>${title}</h1>
     <p>Article body for demonstration of navigation, history, and back/forward behavior.</p>
     <p><a href="/articles">← Back to articles</a></p>`,
  );
}

const api = {
  'GET /api/items': (_req, res) => {
    setTimeout(() => {
      json(res, 200, ['Groceries for the week', 'Sketch for the garden', 'Call with Dana — notes']);
    }, 2500);
  },
  'GET /api/broken': (_req, res) => json(res, 500, { error: 'intentional internal error' }),
  'GET /api/slow': (_req, res) => {
    setTimeout(() => json(res, 200, { ok: true, delayed_ms: 3000 }), 3000);
  },
  'GET /api/secure-data': (_req, res) => json(res, 403, { error: 'forbidden (intentional)' }),
  'POST /api/echo': (req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(
        layout(
          'Submitted',
          `<h1>Thanks for signing up</h1><p>We received your details.</p><p><a href="/">Back home</a></p>`,
        ),
      );
    });
  },
  'GET /healthz': (_req, res) => json(res, 200, { status: 'ok' }),
};

function json(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const apiHandler = api[`${req.method} ${url.pathname}`];
  if (apiHandler) return apiHandler(req, res);

  if (req.method !== 'GET') {
    res.writeHead(405).end('method not allowed');
    return;
  }

  const articleMatch = url.pathname.match(/^\/articles\/(\d+)$/);
  if (articleMatch) {
    const page = articlePage(Number(articleMatch[1]));
    if (page) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page);
      return;
    }
  }

  const pageFn = pages[url.pathname];
  if (pageFn) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(pageFn(url));
    return;
  }

  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end(layout('Not found', '<h1>Page not found</h1><p><a href="/">Back home</a></p>'));
});

server.listen(PORT, HOST, () => {
  console.log(`sample-app listening on http://${HOST}:${PORT}`);
});
