import { describe, it, expect } from 'vitest';
import { missionSchema, normalizeChecks } from '../../apps/mission-runner/src/schema.js';

const valid = {
  name: 'demo-mission',
  description: 'test',
  steps: [
    { action: 'goto', path: '/' },
    { action: 'click', role: 'button', name: 'Open dialog' },
    { action: 'screenshot', name: 'home' },
  ],
  checks: ['no_unhandled_page_errors', { name: 'no_critical_console_errors', allow: ['favicon'] }],
};

describe('missionSchema', () => {
  it('accepts a valid mission and applies defaults', () => {
    const m = missionSchema.parse(valid);
    expect(m.viewport).toEqual({ width: 1440, height: 900 });
    expect(m.steps).toHaveLength(3);
  });

  it('rejects unknown actions', () => {
    expect(() => missionSchema.parse({ ...valid, steps: [{ action: 'teleport' }] })).toThrow();
  });

  it('rejects unknown checks', () => {
    expect(() => missionSchema.parse({ ...valid, checks: ['definitely_not_a_check'] })).toThrow();
  });

  it('rejects steps with unknown extra fields', () => {
    expect(() =>
      missionSchema.parse({ ...valid, steps: [{ action: 'reload', bogus: 1 }] }),
    ).toThrow();
  });

  it('requires a locator for click', () => {
    expect(() => missionSchema.parse({ ...valid, steps: [{ action: 'click' }] })).toThrow();
  });

  it('requires kebab-case names', () => {
    expect(() => missionSchema.parse({ ...valid, name: 'Bad Name' })).toThrow();
  });

  it('rejects empty step lists', () => {
    expect(() => missionSchema.parse({ ...valid, steps: [] })).toThrow();
  });
});

describe('normalizeChecks', () => {
  it('normalizes strings and objects to one shape', () => {
    const m = missionSchema.parse(valid);
    expect(normalizeChecks(m.checks)).toEqual([
      { name: 'no_unhandled_page_errors', allow: [] },
      { name: 'no_critical_console_errors', allow: ['favicon'] },
    ]);
  });
});
