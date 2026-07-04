import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { readdir } from 'node:fs/promises';
import { API, CDP, requireStack } from './stack.js';

let browser: Browser;

beforeAll(async () => {
  await requireStack();
  browser = await chromium.connectOverCDP(CDP);
});

afterAll(async () => {
  await browser?.close();
});

describe('shared browser control (real Chromium over CDP)', () => {
  it('attaches to the shared context and drives the visible page', async () => {
    const context = browser.contexts()[0];
    expect(context, 'shared persistent context').toBeDefined();
    const page = context!.pages()[0] ?? (await context!.newPage());
    await page.goto('http://sample-app:3000/');
    await expect
      .poll(async () => page.title())
      .toContain('Meridian Notes');
    await page.getByRole('button', { name: 'Open dialog' }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
  });
});

describe('control API (real stack)', () => {
  it('rejects file: and unlisted hosts via URL policy', async () => {
    for (const url of ['file:///etc/passwd', 'https://example.com/']) {
      const res = await fetch(`${API}/navigate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      expect(res.status, url).toBe(422);
    }
  });

  it('takes screenshots into the artifacts mount', async () => {
    const res = await fetch(`${API}/screenshot`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'integration-test' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const files = await readdir('artifacts/screenshots');
    expect(files.some((f) => f === String(body.path).split('/').pop())).toBe(true);
  });

  it('captures console and network evidence', async () => {
    await fetch(`${API}/navigate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'http://sample-app:3000/network-fail' }),
    });
    await new Promise((r) => setTimeout(r, 2500));
    const network = await (await fetch(`${API}/network?problems=1`)).json();
    const urls = network.entries.map((e: { url: string }) => e.url).join(' ');
    expect(urls).toContain('/api/broken');
    const secure = network.entries.find((e: { url: string }) => e.url.includes('secure-data'));
    expect(secure?.request_headers?.authorization).toBe('[REDACTED]');
  });
});
