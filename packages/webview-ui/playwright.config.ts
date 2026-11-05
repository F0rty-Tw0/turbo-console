import { defineConfig, devices } from '@playwright/test';

const chromium = { ...devices['Desktop Chrome'] };

const TRIPWIRES = '**/*.tripwire.e2e.ts';

/**
 * Tripwires time the page against a wall-clock budget, so they run alone after the rest of the suite: beside nine other
 * workers and a full turbo gate their first frame came in 2.3x slower than alone. Run them without the rest of the suite
 * with `pnpm tripwires [file]` (`--project tripwire --no-deps`).
 */
const tripwire = { name: 'tripwire', use: chromium, testMatch: TRIPWIRES, dependencies: ['chromium'], workers: 1 };

const projects = [{ name: 'chromium', use: chromium, testIgnore: TRIPWIRES }, tripwire];

const use = { trace: 'retain-on-failure' } as const;

export default defineConfig({
  projects,
  reporter: 'list',
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use
});
