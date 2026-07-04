/**
 * Secret redaction for captured evidence. Everything the observer records
 * (network entries, console lines, reports) must pass through these helpers
 * before being written to disk or returned over the API.
 */

export const REDACTED = '[REDACTED]';

const SENSITIVE_HEADERS = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-auth-token|x-csrf-token)$/i;

const SENSITIVE_PARAMS = /(token|secret|password|passwd|api[-_]?key|auth|session|credential|bearer)/i;

/** Values that look like bearer/base64 credentials inside free text. */
const BEARER_IN_TEXT = /\b(bearer|basic)\s+[a-z0-9._~+/=-]{8,}/gi;

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    out[name] = SENSITIVE_HEADERS.test(name) ? REDACTED : value;
  }
  return out;
}

export function redactUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.password) url.password = REDACTED;
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_PARAMS.test(key)) url.searchParams.set(key, REDACTED);
  }
  return url.toString();
}

export function redactText(text: string): string {
  return text.replace(BEARER_IN_TEXT, (m) => m.split(/\s+/)[0] + ' ' + REDACTED);
}

/** Redact string values of sensitive keys anywhere in a JSON-like structure. */
export function redactObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => redactObject(v)) as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_PARAMS.test(k) && typeof v === 'string' ? REDACTED : redactObject(v);
    }
    return out as T;
  }
  if (typeof value === 'string') {
    return redactText(value) as T;
  }
  return value;
}
