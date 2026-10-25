import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';

const chromium = { ...devices['Desktop Chrome'], trace: 'off' } as const;

const projects = [{ name: 'chromium', use: chromium }];

const benchOptions = { outputFile: '.bench/stretch.json' };

const reporter: ReporterDescription[] = [['list'], ['./e2e/bench/bench-reporter.ts', benchOptions]];

/** The stretch suite: local only, one worker, never part of the default run or the CI bench job. */
export default defineConfig({
  fullyParallel: false,
  projects,
  reporter,
  retries: 0,
  testDir: './e2e',
  testMatch: '**/*.stretch.ts',
  timeout: 600_000,
  workers: 1
});
