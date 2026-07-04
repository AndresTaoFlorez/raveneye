export interface UrlPolicy {
  allowedHosts: string[];
}

export type UrlDecision = { allowed: true; url: URL } | { allowed: false; reason: string };

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Decide whether the observer may navigate to the given URL.
 * Only http(s) to explicitly allowed hostnames is permitted — the observer
 * must never become an unrestricted proxy or read local files.
 */
export function evaluateTargetUrl(raw: string, policy: UrlPolicy): UrlDecision {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { allowed: false, reason: `not a valid absolute URL: ${raw}` };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { allowed: false, reason: `scheme "${url.protocol}" is not allowed (only http/https)` };
  }

  const host = url.hostname.toLowerCase();
  const allowed = policy.allowedHosts.map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(host)) {
    return {
      allowed: false,
      reason: `host "${host}" is not in RAVENEYE_ALLOWED_HOSTS (${allowed.join(', ')})`,
    };
  }

  return { allowed: true, url };
}

export function parseAllowedHosts(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
}
