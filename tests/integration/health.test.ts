import { describe, it, expect, beforeAll } from 'vitest';
import { API, currentNovnc, requireStack } from './stack.js';

beforeAll(requireStack);

describe('observer health (real stack)', () => {
  it('reports every component healthy', async () => {
    const res = await fetch(`${API}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    const names = body.components.map((c: { component: string }) => c.component).sort();
    expect(names).toContain('artifacts-dir');
    for (const suffix of [':cdp', ':chromium', ':novnc', ':x11vnc', ':xvfb']) {
      expect(
        names.some((name: string) => name.endsWith(suffix)),
        suffix,
      ).toBe(true);
    }
    for (const c of body.components) expect(c.ok, c.component).toBe(true);
  });

  it('serves noVNC on loopback', async () => {
    const res = await fetch(await currentNovnc());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('noVNC');
  });
});
