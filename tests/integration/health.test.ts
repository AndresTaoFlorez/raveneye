import { describe, it, expect, beforeAll } from 'vitest';
import { API, NOVNC, requireStack } from './stack.js';

beforeAll(requireStack);

describe('observer health (real stack)', () => {
  it('reports every component healthy', async () => {
    const res = await fetch(`${API}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    const names = body.components.map((c: { component: string }) => c.component).sort();
    expect(names).toEqual(
      [
        'artifacts-dir',
        'cdp',
        'chromium-playwright',
        'novnc',
        'window-manager',
        'x11vnc',
        'xvfb',
      ].sort(),
    );
    for (const c of body.components) expect(c.ok, c.component).toBe(true);
  });

  it('serves noVNC on loopback', async () => {
    const res = await fetch(NOVNC);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('vnc.html');
  });
});
