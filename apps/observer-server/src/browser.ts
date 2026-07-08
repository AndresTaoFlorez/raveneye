// Legacy helpers retained for the existing public API. The active browser
// lives inside the SessionManager; these thin wrappers just keep the
// historical surface small while the dashboard and CLI migrate.

export function _unused(): never {
  throw new Error('browser.ts is a stub — use SessionManager');
}
