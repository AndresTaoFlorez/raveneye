import { describe, it, expect } from 'vitest';
import { evaluateTargetUrl, parseAllowedHosts } from '../../apps/shared/src/url-policy.js';

const policy = { allowedHosts: ['sample-app', 'host.docker.internal', 'localhost', '127.0.0.1'] };

describe('evaluateTargetUrl', () => {
  it('allows http to an allowed host', () => {
    const d = evaluateTargetUrl('http://sample-app:3000/form', policy);
    expect(d.allowed).toBe(true);
  });

  it('allows https to an allowed host', () => {
    expect(evaluateTargetUrl('https://localhost:8443/', policy).allowed).toBe(true);
  });

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,<b>x</b>'])(
    'rejects dangerous scheme %s',
    (url) => {
      const d = evaluateTargetUrl(url, policy);
      expect(d.allowed).toBe(false);
      if (!d.allowed) expect(d.reason).toContain('scheme');
    },
  );

  it('rejects hosts outside the allowlist', () => {
    const d = evaluateTargetUrl('https://example.com/', policy);
    expect(d.allowed).toBe(false);
    if (!d.allowed) expect(d.reason).toContain('example.com');
  });

  it('is case-insensitive for hostnames', () => {
    expect(evaluateTargetUrl('http://SAMPLE-APP:3000/', policy).allowed).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(evaluateTargetUrl('not a url', policy).allowed).toBe(false);
  });
});

describe('parseAllowedHosts', () => {
  it('splits, trims and drops empties', () => {
    expect(parseAllowedHosts(' a, b ,,c ')).toEqual(['a', 'b', 'c']);
    expect(parseAllowedHosts(undefined)).toEqual([]);
  });
});
