export const OBSERVER_VERSION = '0.1.0';
export { evaluateTargetUrl, parseAllowedHosts } from './url-policy.js';
export type { UrlPolicy, UrlDecision } from './url-policy.js';
export { REDACTED, redactHeaders, redactUrl, redactText, redactObject } from './redaction.js';
export { isNetworkProblem } from './evidence-types.js';
export type { ConsoleEntry, NetworkEntry } from './evidence-types.js';
