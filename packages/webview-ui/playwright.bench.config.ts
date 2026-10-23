import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';

const chromium = { ...devices['Desktop Chrome'], trace: 'off' } as const;

const projects = [{ name: 'chromium', use: chromium }];

const benchOptions = { outputFile: '.bench/results.json' };

const reporter: ReporterDescription[] = [['list'], ['./e2e/bench/bench-reporter.ts', benchOptions]];

export default defineConfig({
  fullyParallel: false,
  projects,
  reporter,
  retries: 0,
  testDir: './e2e',
  testMatch: '**/*.perf.ts',
  timeout: 300_000,
  workers: 1
});
