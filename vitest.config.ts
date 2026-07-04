import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration and e2e tests talk to the real containerized Chromium and
    // need generous timeouts; unit tests finish long before these limits.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
