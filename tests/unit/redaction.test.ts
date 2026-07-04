import { describe, it, expect } from 'vitest';
import {
  REDACTED,
  redactHeaders,
  redactUrl,
  redactText,
  redactObject,
} from '../../apps/shared/src/redaction.js';

describe('redactHeaders', () => {
  it('redacts authorization, cookies and api keys, keeps the rest', () => {
    const out = redactHeaders({
      Authorization: 'Bearer abc123',
      Cookie: 'session=xyz',
      'Set-Cookie': 'sid=1',
      'X-Api-Key': 'k',
      'Content-Type': 'application/json',
    });
    expect(out.Authorization).toBe(REDACTED);
    expect(out.Cookie).toBe(REDACTED);
    expect(out['Set-Cookie']).toBe(REDACTED);
    expect(out['X-Api-Key']).toBe(REDACTED);
    expect(out['Content-Type']).toBe('application/json');
  });
});

describe('redactUrl', () => {
  it('redacts sensitive query parameters only', () => {
    const out = redactUrl('http://h/p?access_token=secret&page=2&api_key=k');
    expect(out).toContain(`access_token=${encodeURIComponent(REDACTED)}`);
    expect(out).toContain(`api_key=${encodeURIComponent(REDACTED)}`);
    expect(out).toContain('page=2');
  });

  it('redacts userinfo passwords', () => {
    expect(redactUrl('http://user:hunter2@h/')).not.toContain('hunter2');
  });

  it('leaves non-URLs untouched', () => {
    expect(redactUrl('nope')).toBe('nope');
  });
});

describe('redactText', () => {
  it('redacts bearer credentials embedded in text', () => {
    const out = redactText('failed with Bearer sample-secret-token-12345 attached');
    expect(out).not.toContain('sample-secret-token-12345');
    expect(out).toContain(REDACTED);
  });
});

describe('redactObject', () => {
  it('walks nested structures and redacts sensitive keys', () => {
    const out = redactObject({
      user: 'ada',
      password: 'pw',
      nested: [{ apiKey: 'k', note: 'fine' }],
    });
    expect(out.password).toBe(REDACTED);
    expect(out.nested[0].apiKey).toBe(REDACTED);
    expect(out.user).toBe('ada');
    expect(out.nested[0].note).toBe('fine');
  });
});
