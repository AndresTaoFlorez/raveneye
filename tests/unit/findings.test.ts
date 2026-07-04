import { describe, it, expect } from 'vitest';
import { generateFindings } from '../../apps/mission-runner/src/findings.js';
import type { FindingInputs } from '../../apps/mission-runner/src/findings.js';

const base: FindingInputs = {
  checks: [],
  console: [],
  pageErrors: [],
  network: [],
  inspections: [],
  actions: [],
  viewport: { width: 1440, height: 900 },
  currentUrl: 'http://target/',
};

describe('generateFindings', () => {
  it('returns nothing when evidence is clean', () => {
    expect(
      generateFindings({
        ...base,
        checks: [{ name: 'no_unhandled_page_errors', allow: [] }],
      }),
    ).toEqual([]);
  });

  it('emits high finding for page errors', () => {
    const out = generateFindings({
      ...base,
      checks: [{ name: 'no_unhandled_page_errors', allow: [] }],
      pageErrors: [
        { ts: 't', kind: 'page-error', level: 'error', text: 'boom', page_url: 'http://t/x' },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ severity: 'high', category: 'console', route: 'http://t/x' });
  });

  it('honors allow patterns including console location', () => {
    const out = generateFindings({
      ...base,
      checks: [{ name: 'no_critical_console_errors', allow: ['favicon.ico'] }],
      console: [
        {
          ts: 't',
          kind: 'console',
          level: 'error',
          text: 'Failed to load resource: 404',
          page_url: 'http://t/',
          location: 'http://t/favicon.ico:0',
        },
      ],
    });
    expect(out).toEqual([]);
  });

  it('grades 5xx/failures high and 4xx medium', () => {
    const out = generateFindings({
      ...base,
      checks: [{ name: 'no_unexpected_failed_requests', allow: [] }],
      network: [
        { ts: 't', method: 'GET', url: 'http://t/a', resource_type: 'fetch', status: 500, ok: false },
        { ts: 't', method: 'GET', url: 'http://t/b', resource_type: 'fetch', status: 404, ok: false },
        { ts: 't', method: 'GET', url: 'http://t/c', resource_type: 'fetch', failure: 'net::ERR_ABORTED' },
        { ts: 't', method: 'GET', url: 'http://t/ok', resource_type: 'fetch', status: 200, ok: true },
      ],
    });
    expect(out.map((f) => f.severity)).toEqual(['high', 'medium', 'high']);
  });

  it('emits functional finding for failed steps even without checks', () => {
    const out = generateFindings({
      ...base,
      actions: [
        {
          index: 3,
          action: 'click',
          params: { role: 'button' },
          started_at: 't',
          duration_ms: 5,
          status: 'error',
          detail: 'locator not found',
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ category: 'functional', severity: 'high' });
  });

  it('reports overflow findings from inspections', () => {
    const out = generateFindings({
      ...base,
      checks: [{ name: 'no_horizontal_overflow', allow: [] }],
      inspections: [
        {
          kind: 'horizontal-overflow',
          page_url: 'http://t/g',
          ts: 't',
          has_overflow: true,
          scroll_width: 1232,
          client_width: 375,
          offenders: [{ element: 'div.card', right: 1200, width: 1200 }],
        },
      ],
    });
    expect(out[0]).toMatchObject({
      category: 'responsive',
      suspected_component: 'div.card',
    });
  });
});
